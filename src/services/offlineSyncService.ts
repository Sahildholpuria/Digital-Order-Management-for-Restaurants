/**
 * Offline Sync Service (IndexedDB + Background Resilient Drain)
 * 
 * Manages queued KOTs and database mutations for basement dining halls
 * and weak/dropped Wi-Fi zones, automatically synchronizing once connection resumes.
 */

import { dbService } from './database';
import { networkHealthService } from './networkHealthService';
import { indexedDBQueue, OfflineKOTRecord } from './indexedDBQueue';
import { RestaurantOrder, RestaurantNotification } from '../types';

export interface QueuedMutation {
  id: string;
  type: 'save_order' | 'save_table' | 'update_table_status' | 'save_food_item' | 'save_payment';
  restaurantId: string;
  payload: any;
  timestamp: number;
}

const SYNC_QUEUE_KEY = 'restaurants_os_sync_queue';

class OfflineSyncService {
  private queue: QueuedMutation[] = [];
  private isSyncing: boolean = false;
  private syncListeners: Set<(isSyncing: boolean) => void> = new Set();

  constructor() {
    this.loadLegacyQueue();
    if (typeof window !== 'undefined') {
      // Auto-drain when device comes back online
      networkHealthService.subscribe((status) => {
        if (status.isOnline) {
          this.processQueue();
        }
      });

      window.addEventListener('online', () => {
        this.processQueue();
      });

      // Periodic retry every 15 seconds if online
      setInterval(() => {
        if (navigator.onLine) {
          this.processQueue();
        }
      }, 15000);
    }
  }

  private loadLegacyQueue() {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (_) {
      this.queue = [];
    }
  }

  private saveLegacyQueue() {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (_) {}
  }

  /**
   * Enqueue a punched KOT directly to durable IndexedDB storage
   */
  public async enqueueKOT(restaurantId: string, order: RestaurantOrder): Promise<OfflineKOTRecord> {
    const isTakeaway = order.orderType === 'takeaway';
    const record: OfflineKOTRecord = {
      id: `kot_sync_${order.id}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      restaurantId,
      tableId: isTakeaway ? 'takeaway' : order.tableId,
      tableName: order.tableName,
      orderType: isTakeaway ? 'takeaway' : 'dine_in',
      order: {
        ...order,
        isOfflineQueued: true,
      },
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await indexedDBQueue.enqueueKOT(record);

    // Also mirror to legacy in-memory queue for components that query synchronous getPendingCount
    this.enqueue('save_order', restaurantId, record.order);

    // If online, immediately attempt background sync
    if (navigator.onLine) {
      setTimeout(() => this.processQueue(), 500);
    }

    return record;
  }

  public enqueue(type: QueuedMutation['type'], restaurantId: string, payload: any) {
    const mutation: QueuedMutation = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      restaurantId,
      payload,
      timestamp: Date.now(),
    };

    // Deduplicate pending mutations for the exact same entity
    if (type === 'save_order') {
      const orderId = payload.id;
      this.queue = this.queue.filter(m => !(m.type === 'save_order' && m.payload.id === orderId));
    } else if (type === 'update_table_status') {
      const tableId = payload.tableId;
      this.queue = this.queue.filter(m => !(m.type === 'update_table_status' && m.payload.tableId === tableId));
    }

    this.queue.push(mutation);
    this.saveLegacyQueue();

    if (navigator.onLine) {
      this.processQueue();
    }
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public async getPendingKOTs(restaurantId?: string): Promise<OfflineKOTRecord[]> {
    return indexedDBQueue.getPendingKOTs(restaurantId);
  }

  public async getPendingKOTCount(restaurantId?: string): Promise<number> {
    return indexedDBQueue.getPendingCount(restaurantId);
  }

  public subscribeToSyncStatus(callback: (isSyncing: boolean) => void): () => void {
    this.syncListeners.add(callback);
    callback(this.isSyncing);
    return () => {
      this.syncListeners.delete(callback);
    };
  }

  private setSyncing(status: boolean) {
    this.isSyncing = status;
    this.syncListeners.forEach(cb => cb(status));
  }

  /**
   * Manual or automatic trigger to synchronize all queued KOTs and mutations
   */
  public async processQueue(): Promise<{ syncedCount: number; errors: number }> {
    if (this.isSyncing || !navigator.onLine) {
      return { syncedCount: 0, errors: 0 };
    }

    this.setSyncing(true);
    let syncedCount = 0;
    let errors = 0;

    try {
      // 1. Process Durable IndexedDB Offline KOTs First (Highest Priority for Kitchen)
      const pendingKOTs = await indexedDBQueue.getPendingKOTs();

      if (pendingKOTs.length > 0) {
        console.info(`[OfflineSync] Processing ${pendingKOTs.length} durable IndexedDB KOTs...`);

        for (const kot of pendingKOTs) {
          try {
            await indexedDBQueue.markSyncing(kot.id);

            // Clean clean offline marker before saving to DB
            const orderToSave: RestaurantOrder = {
              ...kot.order,
              isOfflineQueued: false,
            };

            // 1. Save order to remote DB
            await dbService.saveOrder(kot.restaurantId, orderToSave);

            // 2. If table order, update table to occupied
            if (kot.orderType === 'dine_in' && kot.tableId && kot.tableId !== 'takeaway') {
              try {
                await dbService.updateTableStatus(kot.restaurantId, kot.tableId, 'occupied');
              } catch (_) {}
            }

            // 3. Dispatch kitchen alert notification
            try {
              const notification: RestaurantNotification = {
                id: `notify-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                type: 'new_order',
                tableId: kot.tableId,
                tableName: kot.tableName,
                orderId: kot.orderId,
                message: `Synced KOT #${kot.orderNumber} for ${kot.tableName} (punched offline).`,
                isRead: false,
                createdAt: new Date().toISOString(),
              };
              await dbService.addNotification(kot.restaurantId, notification);
            } catch (_) {}

            // Remove synced KOT from IndexedDB
            await indexedDBQueue.removeKOT(kot.id);

            // Also clean from legacy queue if present
            this.queue = this.queue.filter(q => !(q.type === 'save_order' && q.payload?.id === kot.orderId));
            this.saveLegacyQueue();

            syncedCount++;

            // Dispatch global event so Waiter Console and KDS update immediately
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('offline-kot-synced', {
                detail: {
                  orderId: kot.orderId,
                  orderNumber: kot.orderNumber,
                  tableName: kot.tableName,
                }
              }));
            }
          } catch (err: any) {
            console.warn(`[OfflineSync] Failed to sync KOT ${kot.orderNumber}, will retry:`, err);
            errors++;
            await indexedDBQueue.markFailed(kot.id, err?.message || 'Network error');
            // Stop processing if connection was severed mid-drain
            if (!navigator.onLine) break;
          }
        }
      }

      // 2. Process any remaining legacy queued mutations
      const itemsToProcess = [...this.queue];
      for (const item of itemsToProcess) {
        try {
          if (item.type === 'save_order') {
            await dbService.saveOrder(item.restaurantId, item.payload);
          } else if (item.type === 'save_table') {
            await dbService.saveTable(item.restaurantId, item.payload);
          } else if (item.type === 'update_table_status') {
            await dbService.updateTableStatus(item.restaurantId, item.payload.tableId, item.payload.status);
          } else if (item.type === 'save_food_item') {
            await dbService.saveFoodItem(item.restaurantId, item.payload);
          } else if (item.type === 'save_payment') {
            await dbService.addPayment(item.restaurantId, item.payload);
          }

          this.queue = this.queue.filter(q => q.id !== item.id);
          this.saveLegacyQueue();
          syncedCount++;
        } catch (err) {
          console.warn(`[OfflineSync] Retrying legacy ${item.type} later:`, err);
          errors++;
          break;
        }
      }
    } finally {
      this.setSyncing(false);
    }

    return { syncedCount, errors };
  }
}

export const offlineSyncService = new OfflineSyncService();

/**
 * Offline Sync Service
 * Manages queued mutations for slow and offline networks, auto-draining when online.
 */

import { dbService } from './database';
import { networkHealthService } from './networkHealthService';

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

  constructor() {
    this.loadQueue();
    if (typeof window !== 'undefined') {
      networkHealthService.subscribe((status) => {
        if (status.isOnline && this.queue.length > 0) {
          this.processQueue();
        }
      });

      // Periodically attempt queue drain every 20 seconds if online
      setInterval(() => {
        if (navigator.onLine && this.queue.length > 0) {
          this.processQueue();
        }
      }, 20000);
    }
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (_) {
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (_) {}
  }

  public enqueue(type: QueuedMutation['type'], restaurantId: string, payload: any) {
    const mutation: QueuedMutation = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type,
      restaurantId,
      payload,
      timestamp: Date.now(),
    };

    // Replace older pending updates for the exact same entity to keep queue compact
    if (type === 'save_order') {
      const orderId = payload.id;
      this.queue = this.queue.filter(m => !(m.type === 'save_order' && m.payload.id === orderId));
    } else if (type === 'update_table_status') {
      const tableId = payload.tableId;
      this.queue = this.queue.filter(m => !(m.type === 'update_table_status' && m.payload.tableId === tableId));
    }

    this.queue.push(mutation);
    this.saveQueue();
    console.info(`[OfflineSync] Queued ${type} for background sync (queue length: ${this.queue.length})`);

    if (navigator.onLine) {
      this.processQueue();
    }
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public async processQueue() {
    if (this.isSyncing || this.queue.length === 0 || !navigator.onLine) return;
    this.isSyncing = true;

    try {
      console.info(`[OfflineSync] Processing ${this.queue.length} pending offline mutations...`);
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

          // Remove successful item from queue
          this.queue = this.queue.filter(q => q.id !== item.id);
          this.saveQueue();
        } catch (err) {
          console.warn(`[OfflineSync] Retrying ${item.type} later:`, err);
          // If a request fails due to offline/network, stop processing remaining for now
          break;
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }
}

export const offlineSyncService = new OfflineSyncService();

/**
 * IndexedDB Offline KOT & Mutation Queue Service
 * 
 * Provides resilient, multi-gigabyte offline-first storage for punched KOTs
 * in basement dining halls, dead zones, and weak Wi-Fi environments.
 * Falls back gracefully to memory/localStorage if IndexedDB is blocked.
 */

import { RestaurantOrder } from '../types/index';

export interface OfflineKOTRecord {
  id: string;               // Unique mutation ID, e.g. kot_sync_${orderId}
  orderId: string;          // Target order ID
  orderNumber: string;      // Human-readable KOT number (e.g. KOT-1024-X8F)
  restaurantId: string;     // Tenant restaurant ID
  tableId: string;          // Table ID or 'takeaway'
  tableName: string;        // 'Table 4', 'Takeaway • TK-01'
  orderType: 'dine_in' | 'takeaway';
  order: RestaurantOrder;   // Full punched order payload
  timestamp: number;        // Epoch ms when punched
  retryCount: number;       // Number of sync attempts
  status: 'pending' | 'syncing' | 'failed';
  lastError?: string;
}

const DB_NAME = 'RestaurantsOS_OfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_kots';

class IndexedDBQueueService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryFallback: Map<string, OfflineKOTRecord> = new Map();
  private isFallbackMode: boolean = false;
  private listeners: Set<(count: number, records: OfflineKOTRecord[]) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB();
    }
  }

  /**
   * Initializes the IndexedDB database connection with error recovery
   */
  private async initDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      if (typeof window === 'undefined' || !('indexedDB' in window)) {
        this.isFallbackMode = true;
        this.loadLocalStorageFallback();
        return resolve(null);
      }

      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('restaurantId', 'restaurantId', { unique: false });
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('tableId', 'tableId', { unique: false });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (err) => {
          console.warn('[IndexedDBQueue] IndexedDB open error, switching to memory fallback:', err);
          this.isFallbackMode = true;
          this.loadLocalStorageFallback();
          resolve(null);
        };
      } catch (err) {
        console.warn('[IndexedDBQueue] Fatal IndexedDB error:', err);
        this.isFallbackMode = true;
        this.loadLocalStorageFallback();
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  private loadLocalStorageFallback() {
    try {
      const stored = localStorage.getItem('restaurantsos_offline_kots_fallback');
      if (stored) {
        const list: OfflineKOTRecord[] = JSON.parse(stored);
        list.forEach(item => this.memoryFallback.set(item.id, item));
      }
    } catch (_) {}
  }

  private saveLocalStorageFallback() {
    try {
      const list = Array.from(this.memoryFallback.values());
      localStorage.setItem('restaurantsos_offline_kots_fallback', JSON.stringify(list));
    } catch (_) {}
  }

  /**
   * Enqueue a punched KOT into durable IndexedDB storage
   */
  public async enqueueKOT(record: OfflineKOTRecord): Promise<void> {
    try {
      const db = await this.initDB();
      if (!db || this.isFallbackMode) {
        this.memoryFallback.set(record.id, record);
        this.saveLocalStorageFallback();
      } else {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(record);

          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }

      console.info();
      this.notifyListeners();
    } catch (err) {
      console.warn('[IndexedDBQueue] Failed to put in IndexedDB, fallback to memory:', err);
      this.memoryFallback.set(record.id, record);
      this.saveLocalStorageFallback();
      this.notifyListeners();
    }
  }

  /**
   * Retrieve all pending KOTs waiting to be synchronized
   */
  public async getPendingKOTs(restaurantId?: string): Promise<OfflineKOTRecord[]> {
    try {
      const db = await this.initDB();
      if (!db || this.isFallbackMode) {
        const all = Array.from(this.memoryFallback.values());
        const filtered = restaurantId ? all.filter(k => k.restaurantId === restaurantId) : all;
        return filtered.filter(k => k.status !== 'syncing').sort((a, b) => a.timestamp - b.timestamp);
      }

      return new Promise<OfflineKOTRecord[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const all: OfflineKOTRecord[] = req.result || [];
          const filtered = restaurantId ? all.filter(k => k.restaurantId === restaurantId) : all;
          resolve(filtered.sort((a, b) => a.timestamp - b.timestamp));
        };

        req.onerror = () => {
          resolve(Array.from(this.memoryFallback.values()));
        };
      });
    } catch (_) {
      return Array.from(this.memoryFallback.values());
    }
  }

  /**
   * Fast count of pending offline KOTs
   */
  public async getPendingCount(restaurantId?: string): Promise<number> {
    const list = await this.getPendingKOTs(restaurantId);
    return list.length;
  }

  /**
   * Mark record as actively syncing to prevent duplicate concurrent network dispatches
   */
  public async markSyncing(id: string): Promise<void> {
    try {
      const db = await this.initDB();
      if (!db || this.isFallbackMode) {
        const item = this.memoryFallback.get(id);
        if (item) {
          item.status = 'syncing';
          this.memoryFallback.set(id, item);
          this.saveLocalStorageFallback();
        }
        return;
      }

      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);

        getReq.onsuccess = () => {
          const item: OfflineKOTRecord = getReq.result;
          if (item) {
            item.status = 'syncing';
            item.retryCount = (item.retryCount || 0) + 1;
            store.put(item);
          }
          resolve();
        };
        getReq.onerror = () => resolve();
      });
    } catch (_) {}
  }

  /**
   * Mark record as failed with reason, reverting status to 'pending' so it can retry
   */
  public async markFailed(id: string, error: string): Promise<void> {
    try {
      const db = await this.initDB();
      if (!db || this.isFallbackMode) {
        const item = this.memoryFallback.get(id);
        if (item) {
          item.status = 'pending';
          item.lastError = error;
          this.memoryFallback.set(id, item);
          this.saveLocalStorageFallback();
        }
        return;
      }

      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);

        getReq.onsuccess = () => {
          const item: OfflineKOTRecord = getReq.result;
          if (item) {
            item.status = 'pending';
            item.lastError = error;
            store.put(item);
          }
          resolve();
        };
        getReq.onerror = () => resolve();
      });
    } catch (_) {}
  }

  /**
   * Delete successfully synchronized KOT from the queue
   */
  public async removeKOT(id: string): Promise<void> {
    try {
      this.memoryFallback.delete(id);
      this.saveLocalStorageFallback();

      const db = await this.initDB();
      if (db && !this.isFallbackMode) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });
      }

      this.notifyListeners();
    } catch (_) {
      this.notifyListeners();
    }
  }

  /**
   * Subscribe to queue status changes for reactive UI updates
   */
  public subscribe(callback: (count: number, records: OfflineKOTRecord[]) => void): () => void {
    this.listeners.add(callback);
    // Emit initial snapshot
    this.getPendingKOTs().then(records => {
      callback(records.length, records);
    });

    return () => {
      this.listeners.delete(callback);
    };
  }

  private async notifyListeners() {
    try {
      const records = await this.getPendingKOTs();
      this.listeners.forEach(cb => {
        try {
          cb(records.length, records);
        } catch (e) {
          console.warn('[IndexedDBQueue] Listener callback error:', e);
        }
      });

      // Dispatch global window event for cross-component synchronization
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-kot-queue-change', {
          detail: { count: records.length, records }
        }));
      }
    } catch (_) {}
  }
}

export const indexedDBQueue = new IndexedDBQueueService();

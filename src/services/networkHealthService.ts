/**
 * Network Health & Connectivity Service
 * Provides real-time network status, slow-data detection, and offline sync triggers.
 */

export type ConnectionQuality = 'fast' | 'slow' | 'offline';

class NetworkHealthService {
  private isOnlineState: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private connectionQuality: ConnectionQuality = 'fast';
  private listeners: Set<(status: { isOnline: boolean; quality: ConnectionQuality }) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());

      // Monitor Network Information API if available (Chrome, Android, modern browsers)
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        this.updateFromConnection(conn);
        conn.addEventListener('change', () => this.updateFromConnection(conn));
      }
    }
  }

  private handleOnline() {
    this.isOnlineState = true;
    this.checkConnectionLatency();
  }

  private handleOffline() {
    this.isOnlineState = false;
    this.connectionQuality = 'offline';
    this.notify();
  }

  private updateFromConnection(conn: any) {
    if (!this.isOnlineState) {
      this.connectionQuality = 'offline';
    } else if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.saveData) {
      this.connectionQuality = 'slow';
    } else {
      this.connectionQuality = 'fast';
    }
    this.notify();
  }

  public async checkConnectionLatency(): Promise<ConnectionQuality> {
    if (!navigator.onLine) {
      this.connectionQuality = 'offline';
      this.notify();
      return 'offline';
    }

    const start = Date.now();
    try {
      // Fast lightweight ping (1x1 transparent favicon or head check)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      await fetch('/favicon.ico?' + start, { 
        method: 'HEAD', 
        cache: 'no-store',
        signal: controller.signal 
      });
      clearTimeout(timeoutId);

      const elapsed = Date.now() - start;
      if (elapsed > 1800) {
        this.connectionQuality = 'slow';
      } else {
        this.connectionQuality = 'fast';
      }
    } catch (_) {
      // If ping timed out or failed while navigator says online, consider it slow/degraded
      this.connectionQuality = 'slow';
    }

    this.notify();
    return this.connectionQuality;
  }

  public getStatus() {
    return {
      isOnline: this.isOnlineState,
      quality: this.connectionQuality,
    };
  }

  public subscribe(callback: (status: { isOnline: boolean; quality: ConnectionQuality }) => void) {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach(cb => {
      try {
        cb(status);
      } catch (e) {
        console.error('[NetworkHealthService] Listener error:', e);
      }
    });
  }
}

export const networkHealthService = new NetworkHealthService();

import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { networkHealthService, ConnectionQuality } from '../../services/networkHealthService';
import { offlineSyncService } from '../../services/offlineSyncService';
import { indexedDBQueue } from '../../services/indexedDBQueue';

export const NetworkStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [quality, setQuality] = useState<ConnectionQuality>('fast');
  const [showReconnected, setShowReconnected] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState(0);

  useEffect(() => {
    let wasOffline = false;

    const unsubscribe = networkHealthService.subscribe((status) => {
      if (!status.isOnline) {
        wasOffline = true;
        setIsOnline(false);
        setQuality('offline');
      } else {
        setIsOnline(true);
        setQuality(status.quality);
        if (wasOffline) {
          setShowReconnected(true);
          wasOffline = false;
          setTimeout(() => setShowReconnected(false), 3500);
        }
      }
      setPendingSyncs(offlineSyncService.getPendingCount());
    });

    const unsubQueue = indexedDBQueue.subscribe((count) => {
      setPendingSyncs(count + offlineSyncService.getPendingCount());
    });

    const syncInterval = setInterval(async () => {
      const kotCount = await indexedDBQueue.getPendingCount();
      setPendingSyncs(kotCount + offlineSyncService.getPendingCount());
    }, 4000);

    return () => {
      unsubscribe();
      unsubQueue();
      clearInterval(syncInterval);
    };
  }, []);

  // If online and fast and no pending syncs, stay completely hidden to preserve full screen real-estate
  if (isOnline && quality === 'fast' && !showReconnected && pendingSyncs === 0) {
    return null;
  }

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none transition-all duration-300 animate-fade-in max-w-[92vw] sm:max-w-md">
      {/* 1. Offline Banner */}
      {!isOnline && (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-amber-600/95 text-white shadow-lg backdrop-blur-md text-xs font-bold border border-amber-400/40">
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
          <span>Offline Mode — Local Cache Active {pendingSyncs > 0 ? `(${pendingSyncs} queued to sync)` : ''}</span>
        </div>
      )}

      {/* 2. Reconnected Notice */}
      {isOnline && showReconnected && (
        <div className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600/95 text-white shadow-lg backdrop-blur-md text-xs font-bold border border-emerald-400/40 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
          <span>✓ Back Online — Sync Complete</span>
        </div>
      )}

      {/* 3. Slow Data Network Notice */}
      {isOnline && !showReconnected && quality === 'slow' && (
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-900/90 text-amber-300 shadow-md backdrop-blur-md text-[11px] font-semibold border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>Slow Connection — High-Speed Offline Cache Active</span>
        </div>
      )}

      {/* 4. Active Background Sync Notice */}
      {isOnline && !showReconnected && quality === 'fast' && pendingSyncs > 0 && (
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-brand-700/90 text-white shadow-md backdrop-blur-md text-[11px] font-bold border border-brand-400/30">
          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin text-brand-200" />
          <span>Syncing {pendingSyncs} offline {pendingSyncs === 1 ? 'change' : 'changes'}...</span>
        </div>
      )}
    </div>
  );
};

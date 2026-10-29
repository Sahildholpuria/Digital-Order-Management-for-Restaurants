import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  ShieldCheck, 
  X, 
  ArrowRight,
  HardDrive
} from "lucide-react";
import { APP_VERSION } from "../../config/appVersion";
import electronService from "../../services/electronService";
import { UpdateStatusPayload } from "../../types/electron";

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStatus?: UpdateStatusPayload | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, initialStatus }) => {
  const [updateState, setUpdateState] = useState<UpdateStatusPayload>(() => {
    return initialStatus || { status: 'checking' };
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const isDesktop = electronService.isElectron();
  const platform = electronService.getPlatform();

  // Listen to live auto-updater events from Electron main process
  useEffect(() => {
    if (!isOpen) return;

    if (initialStatus) {
      setUpdateState(initialStatus);
    } else {
      triggerCheck();
    }

    const unsubStatus = electronService.onUpdateStatusChange((payload) => {
      setUpdateState(payload);
      if (payload.status === 'downloading') {
        setIsDownloading(true);
      } else if (payload.status === 'downloaded' || payload.status === 'error') {
        setIsDownloading(false);
      }
    });

    return () => {
      unsubStatus();
    };
  }, [isOpen, initialStatus]);

  const triggerCheck = async () => {
    setUpdateState({ status: 'checking' });
    setIsDownloading(false);
    try {
      const res = await electronService.checkForUpdates();
      if (!res.success) {
        setUpdateState({
          status: 'error',
          error: res.error || 'Failed to check update server.',
        });
      } else if (!res.isNewer && !res.info) {
        setUpdateState({
          status: 'not-available',
          info: { version: APP_VERSION },
        });
      }
    } catch (err: any) {
      setUpdateState({
        status: 'error',
        error: err?.message || 'Network error while checking updates',
      });
    }
  };

  const handleStartDownload = async () => {
    setIsDownloading(true);
    setUpdateState(prev => ({ ...prev, status: 'downloading', progress: { percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 } }));

    if (isDesktop) {
      const res = await electronService.startDownloadUpdate();
      if (!res.success) {
        setIsDownloading(false);
        setUpdateState(prev => ({
          ...prev,
          status: 'error',
          error: res.error || 'Download failed. You can download the latest installer from GitHub Releases.',
        }));
      }
    } else {
      // In web browser mode: open download release link
      const downloadUrl = updateState.info?.downloadUrl || 'https://github.com/Sahildholpuria/Digital-Order-Management-for-Restaurants/releases';
      electronService.openExternal(downloadUrl);
      setIsDownloading(false);
    }
  };

  const handleInstallNow = () => {
    electronService.quitAndInstallUpdate();
  };

  if (!isOpen) return null;

  const currentPlatformLabel = 
    platform === 'win32' ? 'Windows Desktop POS (64-bit)' :
    platform === 'darwin' ? 'macOS Native App' :
    platform === 'linux' ? 'Linux App' : 'Cloud Web Application';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl max-w-md w-full animate-scale-in z-10 font-sans">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
            {updateState.status === 'checking' && <RefreshCw className="w-6 h-6 animate-spin" />}
            {updateState.status === 'available' && <Sparkles className="w-6 h-6 animate-pulse" />}
            {updateState.status === 'not-available' && <CheckCircle2 className="w-6 h-6" />}
            {updateState.status === 'downloading' && <Download className="w-6 h-6 animate-bounce" />}
            {updateState.status === 'downloaded' && <HardDrive className="w-6 h-6 text-emerald-500" />}
            {updateState.status === 'error' && <AlertCircle className="w-6 h-6 text-amber-500" />}
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
              {updateState.status === 'checking' && 'Checking for Updates...'}
              {updateState.status === 'available' && 'New Version Available!'}
              {updateState.status === 'not-available' && 'You Are on the Latest Version'}
              {updateState.status === 'downloading' && 'Downloading Update...'}
              {updateState.status === 'downloaded' && 'Update Ready to Install!'}
              {updateState.status === 'error' && 'Check for Updates'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {currentPlatformLabel} &bull; Current: <span className="font-mono font-bold">v{APP_VERSION}</span>
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* BODY CONTENT BY STATE                                         */}
        {/* ============================================================== */}

        {/* 1. CHECKING */}
        {updateState.status === 'checking' && (
          <div className="py-6 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
              Contacting update repository for latest release notes & binaries...
            </p>
          </div>
        )}

        {/* 2. UP TO DATE */}
        {updateState.status === 'not-available' && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs leading-relaxed">
              <div className="flex items-center gap-2 font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Everything is up to date</span>
              </div>
              RestaurantsOS <span className="font-mono font-black">v{APP_VERSION}</span> is the newest release. All POS features, printer drivers, and real-time syncing are running the latest optimizations.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={triggerCheck}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check Again</span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* 3. NEW UPDATE AVAILABLE */}
        {updateState.status === 'available' && (
          <div className="space-y-4 py-1">
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Target Version</span>
                <p className="text-base font-black text-slate-900 dark:text-slate-100 font-mono">
                  v{updateState.info?.version}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                NEW RELEASE
              </span>
            </div>

            {/* Zero Data Loss Guarantee */}
            <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 flex items-start gap-2.5 text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">100% Safe Update Guarantee:</strong> Your active restaurant settings, saved printer selections, table configurations, and offline data are stored independently in your system profile and will remain completely intact.
              </div>
            </div>

            {/* Release notes if present */}
            {updateState.info?.releaseNotes && (
              <div className="max-h-32 overflow-y-auto p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1 font-mono">
                <div className="text-[10px] font-bold text-slate-400 uppercase font-sans mb-1">What's New:</div>
                <div className="whitespace-pre-wrap">{String(updateState.info.releaseNotes)}</div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Later
              </button>
              <button
                onClick={handleStartDownload}
                disabled={isDownloading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>{isDesktop ? 'Download & Update' : 'Download from GitHub'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. DOWNLOADING */}
        {updateState.status === 'downloading' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <span>Downloading update...</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {updateState.progress?.percent || 0}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${Math.max(4, Math.min(100, updateState.progress?.percent || 0))}%` }}
                />
              </div>

              {updateState.progress?.transferred && updateState.progress?.total ? (
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>
                    {(updateState.progress.transferred / (1024 * 1024)).toFixed(1)} MB / {(updateState.progress.total / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  {updateState.progress?.bytesPerSecond ? (
                    <span>{(updateState.progress.bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
              You can keep taking orders while the update downloads in the background.
            </p>
          </div>
        )}

        {/* 5. DOWNLOADED / READY TO INSTALL */}
        {updateState.status === 'downloaded' && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Update Download Complete</span>
              </div>
              <p>
                RestaurantsOS <strong className="font-mono">v{updateState.info?.version}</strong> is ready. Click below to restart and switch immediately without losing any data.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Install on Next Exit
              </button>
              <button
                onClick={handleInstallNow}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Restart & Apply Now</span>
              </button>
            </div>
          </div>
        )}

        {/* 6. ERROR / NOTICE */}
        {updateState.status === 'error' && (
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400 mb-1">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Update Status Notice</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {updateState.error || 'Could not connect to update servers. Check your internet connection.'}
              </p>
            </div>

            <div className="flex justify-between items-center gap-2 pt-2">
              <button
                onClick={triggerCheck}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>

              <button
                onClick={() => electronService.openExternal('https://github.com/Sahildholpuria/Digital-Order-Management-for-Restaurants/releases')}
                className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>GitHub Releases</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
export default UpdateModal;

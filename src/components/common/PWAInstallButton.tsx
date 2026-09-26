import React, { useState } from 'react';
import { Download, Check, Share, X, Monitor, Smartphone, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'sidebar' | 'header' | 'banner' | 'icon-only';
  onInstalled?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'sidebar',
  onInstalled
}) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIosModal, setShowIosModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running inside standalone desktop/mobile app window, don't show prompt
  if (isInstalled && !justInstalled) {
    return null;
  }

  const handleClick = async () => {
    const res = await promptInstall();
    if (res === 'accepted') {
      setJustInstalled(true);
      if (onInstalled) onInstalled();
    } else if (res === 'ios') {
      setShowIosModal(true);
    }
  };

  // Header pill variant (similar to Chrome address bar button)
  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 animate-pulse-short ${className}`}
          title="Install RestaurantsOS as Desktop / Mobile App"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {showIosModal && (
          <IosInstallModal onClose={() => setShowIosModal(false)} />
        )}
      </>
    );
  }

  // Sidebar widget variant
  if (variant === 'sidebar') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer text-left shadow-sm group hover:shadow-md ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black block text-slate-900 dark:text-white truncate">
                Install App
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                Desktop & Mobile POS
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm shrink-0">
            Free
          </span>
        </button>

        {showIosModal && (
          <IosInstallModal onClose={() => setShowIosModal(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>Install Application</span>
      </button>

      {showIosModal && (
        <IosInstallModal onClose={() => setShowIosModal(false)} />
      )}
    </>
  );
};

const IosInstallModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-center animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <Smartphone className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Install on iPhone / iPad
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Install RestaurantsOS directly on your home screen with zero App Store download:
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs text-left space-y-2.5">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
              1
            </span>
            <span>Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline text-emerald-500" /> in Safari</span>
          </div>

          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
              2
            </span>
            <span>Scroll down and tap <strong>'Add to Home Screen'</strong></span>
          </div>

          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
              3
            </span>
            <span>Tap <strong>Add</strong> in the top right corner</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md"
        >
          Got It
        </button>
      </div>
    </div>
  );
};

export default PWAInstallButton;

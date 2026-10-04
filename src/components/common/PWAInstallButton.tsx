import React, { useState } from 'react';
import { Download, Check, Share, X, Monitor, Smartphone, Sparkles, PlusCircle } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'sidebar' | 'header' | 'banner' | 'icon-only' | 'menu';
  onInstalled?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'sidebar',
  onInstalled
}) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIosModal, setShowIosModal] = useState(false);
  const [showDesktopModal, setShowDesktopModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running inside standalone desktop/mobile app window, hide widget
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
    } else if (res === 'fallback') {
      setShowDesktopModal(true);
    }
  };

    // Profile Dropdown Menu item variant
  if (variant === "menu") {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer ${className}`}
          title="Install RestaurantsOS as Desktop or Mobile App"
        >
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Install App</span>
          </div>
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            PWA
          </span>
        </button>

        {showIosModal && <IosInstallModal onClose={() => setShowIosModal(false)} />}
        {showDesktopModal && <DesktopInstallModal onClose={() => setShowDesktopModal(false)} />}
      </>
    );
  }

  // Header pill variant (similar to Chrome address bar button)
  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${className}`}
          title="Install RestaurantsOS as Desktop / Mobile App"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {showIosModal && <IosInstallModal onClose={() => setShowIosModal(false)} />}
        {showDesktopModal && <DesktopInstallModal onClose={() => setShowDesktopModal(false)} />}
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
          className={`w-full flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer text-left shadow-xs group hover:shadow-md ${className}`}
          title="Install RestaurantsOS App for POS Billing & Offline Access"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black block text-slate-900 dark:text-white truncate">
                Install App
              </span>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                Desktop & Mobile POS
              </span>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs shrink-0">
            FREE
          </span>
        </button>

        {showIosModal && <IosInstallModal onClose={() => setShowIosModal(false)} />}
        {showDesktopModal && <DesktopInstallModal onClose={() => setShowDesktopModal(false)} />}
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

      {showIosModal && <IosInstallModal onClose={() => setShowIosModal(false)} />}
      {showDesktopModal && <DesktopInstallModal onClose={() => setShowDesktopModal(false)} />}
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
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
};

const DesktopInstallModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-center animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <Monitor className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Install Desktop / Mobile App
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Run RestaurantsOS in a dedicated fullscreen desktop app with instant offline POS billing:
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs text-left space-y-3">
          <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div>
              <p className="font-bold">Check the Browser Address Bar (Top Right)</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Click the <strong>Install App</strong> icon <Download className="w-3 h-3 inline text-emerald-500" /> at the end of the URL address bar.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div>
              <p className="font-bold">Or via Browser Settings Menu</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Click the Chrome/Edge menu (<strong>⋮</strong>) &rarr; <strong>Cast, save, and share</strong> &rarr; <strong>'Install Restaurants OS...'</strong>
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md cursor-pointer"
        >
          Got It, Thanks!
        </button>
      </div>
    </div>
  );
};

export default PWAInstallButton;

import React from 'react';
import { ChefHat, Sparkles } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
  subtext?: string;
  fullScreen?: boolean;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  message = "SYNCHRONIZING RESTAURANT DATA...",
  subtext = "Please wait a moment while we load live menus & orders",
  fullScreen = false,
  compact = false,
  size = 'md'
}) => {
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9'
  };

  const containerSizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-24 h-24'
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center animate-fade-in transition-all ${
      fullScreen ? 'fixed inset-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl text-slate-900 dark:text-white p-8' : 
      compact ? 'py-10 px-4 w-full' : 'min-h-[45vh] w-full p-8'
    }`}>
      {/* Top Animated Progress Bar for fullscreen */}
      {fullScreen && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-600 via-slate-900 to-black dark:from-brand-400 dark:via-white dark:to-slate-200 animate-loading-bar z-50"></div>
      )}

      <div className="relative mb-5">
        {/* Outer Pulsing Ambient Glow */}
        <div className="absolute -inset-4 rounded-full bg-brand-500/20 dark:bg-white/10 blur-2xl animate-pulse"></div>

        {/* Dual Ring Spinning Loader */}
        <div className={`relative ${containerSizes[size]} flex items-center justify-center`}>
          <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-2 border-brand-500 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-full shadow-xl border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white">
            <ChefHat className={`${iconSizes[size]} animate-bounce`} />
          </div>
        </div>
      </div>

      {message && (
        <div className="space-y-1.5 max-w-sm">
          <h3 className="text-xs font-black tracking-widest text-slate-800 dark:text-slate-100 uppercase flex items-center justify-center gap-1.5">
            <span>{message}</span>
            <Sparkles className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
          </h3>
          {subtext && (
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
              {subtext}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PageLoader;

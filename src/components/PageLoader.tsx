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
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const containerSizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-24 h-24'
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center animate-fade-in transition-all ${
      fullScreen ? 'fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md text-white p-8' : 
      compact ? 'py-12 px-4 w-full' : 'min-h-[45vh] w-full p-8'
    }`}>
      {/* Top Animated Progress Bar for fullscreen */}
      {fullScreen && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-amber-400 to-brand-600 animate-loading-bar z-50"></div>
      )}

      <div className="relative mb-4">
        {/* Outer Pulsing Glow */}
        <div className="absolute -inset-3 rounded-full bg-brand-500/20 dark:bg-brand-500/30 blur-xl animate-pulse"></div>

        {/* Dual Ring Spinning Loader */}
        <div className={`relative ${containerSizes[size]} flex items-center justify-center`}>
          <div className="absolute inset-0 border-4 border-brand-500/20 dark:border-brand-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-brand-500 border-t-transparent border-r-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-1.5 border-2 border-amber-400/80 border-b-transparent border-l-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.75s' }}></div>

          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-full shadow-lg border border-slate-100 dark:border-slate-800 text-brand-600 dark:text-brand-400">
            <ChefHat className={`${iconSizes[size]} animate-bounce`} />
          </div>
        </div>
      </div>

      {message && (
        <div className="space-y-1 max-w-sm">
          <h3 className="text-xs font-black tracking-widest text-slate-700 dark:text-slate-200 uppercase flex items-center justify-center gap-1.5">
            <span>{message}</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          </h3>
          {subtext && (
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-relaxed">
              {subtext}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PageLoader;

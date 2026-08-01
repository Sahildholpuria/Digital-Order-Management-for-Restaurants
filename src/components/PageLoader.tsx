import React from 'react';
import { Sparkles } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
  subtext?: string;
  fullScreen?: boolean;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  message = "PREPARING LIVE GOURMET EXPERIENCE...",
  subtext = "Syncing live restaurant menus & active orders",
  fullScreen = false,
  compact = false,
  size = 'md'
}) => {
  const loaderSizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center animate-fade-in transition-all ${
      fullScreen ? 'fixed inset-0 z-50 bg-slate-50/95 dark:bg-slate-955/95 backdrop-blur-xl text-slate-900 dark:text-white p-8' : 
      compact ? 'py-10 px-4 w-full' : 'min-h-[45vh] w-full p-8'
    }`}>
      {/* Top Animated Progress Bar for fullscreen */}
      {fullScreen && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-800 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-600 animate-loading-bar z-50"></div>
      )}

      <div className="relative mb-6">
        {/* Outer Pulsing Glow */}
        <div className="absolute -inset-6 rounded-full bg-emerald-500/20 dark:bg-emerald-400/15 blur-3xl animate-pulse"></div>

        {/* Gourmet Cloche Lifting + Steam SVG Animation */}
        <div className={`relative ${loaderSizes[size]} flex items-center justify-center`}>
          <svg viewBox="0 0 100 100" className="w-full h-full text-emerald-600 dark:text-emerald-400 drop-shadow-md">
            {/* Rising Steam Lines */}
            <g>
              <path d="M 40 38 Q 37 32 40 26 Q 43 20 40 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" className="animate-steam-1" />
              <path d="M 50 35 Q 47 29 50 23 Q 53 17 50 11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.8" className="animate-steam-2" />
              <path d="M 60 38 Q 57 32 60 26 Q 63 20 60 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" className="animate-steam-3" />
            </g>

            {/* Cloche Dome & Knob (Lifting Up & Down Motion) */}
            <g className="animate-cloche-lift">
              {/* Handle Knob */}
              <circle cx="50" cy="41" r="3.5" fill="currentColor" />
              {/* Main Dome */}
              <path d="M 22 68 C 22 46 78 46 78 68 Z" fill="currentColor" />
              {/* Rim Line */}
              <path d="M 18 68 L 82 68 C 82 70 80 71.5 78 71.5 L 22 71.5 C 20 71.5 18 70 18 68 Z" fill="currentColor" opacity="0.9" />
            </g>

            {/* Bottom Serving Platter Base Plate */}
            <path d="M 12 77 L 88 77 C 90 77 92 78.5 91 80 L 85 84 C 84 85 82 85.5 80 85.5 L 20 85.5 C 18 85.5 16 85 15 84 L 9 80 C 8 78.5 10 77 12 77 Z" fill="currentColor" />
            <rect x="25" y="87" width="50" height="2.5" rx="1.2" fill="currentColor" opacity="0.4" />
          </svg>
        </div>
      </div>

      {message && (
        <div className="space-y-1.5 max-w-sm">
          <h3 className="text-xs font-black tracking-widest text-slate-900 dark:text-slate-100 uppercase flex items-center justify-center gap-1.5">
            <span>{message}</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          </h3>
          {subtext && (
            <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 leading-relaxed">
              {subtext}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PageLoader;

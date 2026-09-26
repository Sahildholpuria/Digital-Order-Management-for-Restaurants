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
  message = "LOADING RESTAURANTS OS...",
  subtext = "Syncing live cloud orders & kitchen status",
  fullScreen = false,
  compact = false,
  size = 'md'
}) => {
  const sizeConfig = {
    sm: { box: 'w-12 h-12', icon: 26, ring1: 'w-16 h-16', ring2: 'w-20 h-20' },
    md: { box: 'w-16 h-16', icon: 34, ring1: 'w-24 h-24', ring2: 'w-32 h-32' },
    lg: { box: 'w-20 h-20', icon: 42, ring1: 'w-28 h-28', ring2: 'w-36 h-36' }
  };

  const current = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center animate-fade-in transition-all font-sans select-none ${
      fullScreen 
        ? 'fixed inset-0 z-50 bg-[#070B14]/95 dark:bg-[#070B14]/98 backdrop-blur-2xl text-white p-8' 
        : compact 
          ? 'py-8 px-4 w-full text-slate-800 dark:text-white' 
          : 'min-h-[45vh] w-full p-8 text-slate-800 dark:text-white'
    }`}>
      {/* Top Animated Laser Line for fullscreen mode */}
      {fullScreen && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-[#0B1120] overflow-hidden z-50">
          <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-400 animate-loading-bar shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
        </div>
      )}

      {/* Center Radar + QR Scan Animation Container */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Ambient Emerald Glow Behind Loader */}
        <div className="absolute w-36 h-36 rounded-full bg-emerald-500/20 dark:bg-emerald-400/25 blur-3xl pointer-events-none animate-pulse"></div>

        {/* Outer Expanding Radar Rings */}
        <div 
          className={`absolute ${current.ring2} rounded-full border border-emerald-400/20 dark:border-emerald-400/30 pointer-events-none`}
          style={{ animation: 'radar-ring 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite' }}
        ></div>
        <div 
          className={`absolute ${current.ring1} rounded-full border border-emerald-400/40 pointer-events-none`}
          style={{ animation: 'radar-ring 2.4s cubic-bezier(0.16, 1, 0.3, 1) 0.8s infinite' }}
        ></div>

        {/* Central Restaurants OS Icon Box */}
        <div 
          className={`relative ${current.box} rounded-2xl bg-gradient-to-br from-[#065f46] via-[#047857] to-[#059669] border border-emerald-400/50 flex items-center justify-center text-white shadow-[0_0_30px_rgba(16,185,129,0.45)] overflow-hidden z-10`}
        >
          {/* Sweeping Laser Scanner Bar */}
          <div 
            className="absolute left-1.5 right-1.5 h-0.5 bg-gradient-to-r from-transparent via-emerald-200 to-transparent shadow-[0_0_8px_#34d399] z-20 pointer-events-none"
            style={{ animation: 'scan-sweep 2s ease-in-out infinite' }}
          ></div>

          {/* Authentic Restaurants OS Cutlery QR Glyphs */}
          <svg 
            width={current.icon} 
            height={current.icon} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="drop-shadow-sm"
          >
            {/* Top-Left QR Anchor */}
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#34D399" />
            <rect x="5.5" y="5.5" width="2" height="2" rx="0.5" fill="#34D399" />

            {/* Top-Right QR Anchor */}
            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#34D399" />
            <rect x="16.5" y="5.5" width="2" height="2" rx="0.5" fill="#34D399" />

            {/* Bottom-Left QR Anchor */}
            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#34D399" />
            <rect x="5.5" y="16.5" width="2" height="2" rx="0.5" fill="#34D399" />

            {/* Bottom-Right Cutlery & Lightning Signal */}
            <path d="M14 14h3v3h-3z" fill="#34D399" stroke="#34D399" />
            <path d="M20 14v7" stroke="#FFFFFF" />
            <path d="M17 21h4" stroke="#FFFFFF" />
          </svg>
        </div>
      </div>

      {/* Brand & Loading Message */}
      <div className="space-y-2 max-w-sm px-4">
        {/* Brand Stamp */}
        <div className="flex items-center justify-center gap-1.5 leading-none">
          <span className="text-xs font-black font-sans tracking-tight text-white uppercase">
            Restaurants <span className="text-emerald-400">OS</span>
          </span>
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping"></span>
        </div>

        {/* Main Status Text */}
        {message && (
          <h3 className="text-[11px] sm:text-xs font-mono font-black tracking-widest text-emerald-300 dark:text-emerald-300 uppercase flex items-center justify-center gap-1.5 drop-shadow-sm">
            <span>{message}</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
          </h3>
        )}

        {/* Descriptive Subtext */}
        {subtext && (
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 leading-relaxed font-sans">
            {subtext}
          </p>
        )}

        {/* Micro Linear Progress Track */}
        <div className="w-32 h-1 bg-slate-800/80 rounded-full overflow-hidden relative mx-auto mt-3 border border-white/5 shadow-inner">
          <div className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-400 rounded-full animate-loading-bar shadow-[0_0_8px_rgba(52,211,153,0.7)]"></div>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;

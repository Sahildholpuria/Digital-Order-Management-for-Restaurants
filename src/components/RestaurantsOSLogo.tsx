import React from 'react';

interface RestaurantsOSLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  className?: string;
  iconOnly?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  textColor?: string;
}

export const RestaurantsOSLogo: React.FC<RestaurantsOSLogoProps> = ({
  size = 'md',
  showText = true,
  subtitle,
  className = '',
  iconOnly = false,
  theme = 'auto',
  textColor,
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7 rounded-lg', icon: 16, text: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'w-9 h-9 rounded-xl', icon: 20, text: 'text-base', sub: 'text-[10px]' },
    lg: { box: 'w-12 h-12 rounded-2xl', icon: 26, text: 'text-xl', sub: 'text-xs' },
    xl: { box: 'w-16 h-16 rounded-2xl', icon: 34, text: 'text-2xl', sub: 'text-xs' },
  };

  const current = sizeMap[size];

  // Resolve text color based on explicit prop or theme mode
  const titleColor = textColor 
    ? textColor 
    : theme === 'dark' 
      ? 'text-white' 
      : theme === 'light' 
        ? 'text-slate-900' 
        : 'text-slate-900 dark:text-white';

  const subColor = theme === 'dark' 
    ? 'text-emerald-300' 
    : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Brand Icon Box matching restaurantsos.in */}
      <div 
        className={`${current.box} bg-gradient-to-br from-[#065f46] via-[#047857] to-[#059669] border border-emerald-400/40 flex items-center justify-center text-white shadow-[0_0_16px_rgba(16,185,129,0.35)] shrink-0 transition-transform duration-200 hover:scale-105`}
      >
        <svg 
          width={current.icon} 
          height={current.icon} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {/* Cutlery QR Glyphs */}
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <path d="M14 14h3v3h-3z" />
          <path d="M20 14v7" />
          <path d="M17 21h4" />
        </svg>
      </div>

      {/* Brand Text */}
      {showText && !iconOnly && (
        <div className="flex flex-col leading-tight text-left">
          <span className={`font-black font-sans tracking-tight ${titleColor} ${current.text}`}>
            Restaurants <span className="text-emerald-400">OS</span>
          </span>
          {subtitle && (
            <span className={`font-extrabold tracking-wider uppercase ${subColor} ${current.sub}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

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
        ? 'text-neutral-900' 
        : 'text-neutral-900 dark:text-white';

  const subColor = theme === 'dark' 
    ? 'text-neutral-400' 
    : 'text-neutral-500 dark:text-neutral-400';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Brand Icon Box: ChaiUI style with subtle warm outline and orange accent */}
      <div 
        className={`${current.box} bg-neutral-900/90 dark:bg-black/90 border border-orange-50/20 dark:border-orange-50/15 flex items-center justify-center text-white shrink-0 transition-transform duration-200 hover:scale-105 relative overflow-hidden`}
      >
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500/80 blur-[2px] pointer-events-none" />
        <svg 
          width={current.icon} 
          height={current.icon} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="text-neutral-200"
        >
          {/* Cutlery QR Glyphs */}
          <rect x="3" y="3" width="7" height="7" rx="1.5" className="stroke-white" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" className="stroke-white" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" className="stroke-white" />
          <path d="M14 14h3v3h-3z" className="stroke-orange-400 fill-orange-400/40" />
          <path d="M20 14v7" className="stroke-orange-400" />
          <path d="M17 21h4" className="stroke-orange-400" />
        </svg>
      </div>

      {/* Brand Text: Onest font for the wordmark as specified by ChaiUI */}
      {showText && !iconOnly && (
        <div className="flex flex-col leading-tight text-left">
          <span className={`font-brand font-semibold tracking-tight ${titleColor} ${current.text}`}>
            Restaurants <span className="text-orange-500 dark:text-brand font-bold">OS</span>
          </span>
          {subtitle && (
            <span className={`font-montserrat tracking-wide ${subColor} ${current.sub}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

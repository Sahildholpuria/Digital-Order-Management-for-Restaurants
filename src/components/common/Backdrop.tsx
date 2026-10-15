import React from 'react';

/**
 * ChaiUI Backdrop Component
 * Displays an ambient, subtle warm hexagon glow pinned to the top of the viewport.
 * Uses a smooth radial mask to completely blend into the background with zero hard edges or cutoffs.
 */
export const Backdrop: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div 
      aria-hidden="true" 
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      <img
        data-chai-backdrop=""
        src="/chaiui/background.svg"
        alt=""
        fetchPriority="high"
        decoding="async"
        className={`pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[2400px] max-w-none opacity-30 dark:opacity-40 select-none [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,black_20%,transparent_90%)] invert hue-rotate-180 dark:invert-0 dark:hue-rotate-0 transition-opacity duration-500 ${className}`}
      />
    </div>
  );
};

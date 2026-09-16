import React from 'react';
import { DietaryType } from '../types';

export interface FSSAIIndicatorProps {
  /**
   * Dietary classification: 'veg' (Vegetarian), 'non_veg' (Non-Vegetarian), or 'egg' (Eggitarian).
   * Also accepts legacy strings 'vegetarian' | 'non-vegetarian'.
   */
  type?: DietaryType | 'veg' | 'non_veg' | 'egg' | 'vegetarian' | 'non-vegetarian';
  /**
   * Fallback boolean if type is not provided.
   */
  isVeg?: boolean;
  /**
   * Predefined sizes or numeric pixel dimension.
   * xs: 12px, sm: 14px, md: 16px (default), lg: 20px, xl: 24px
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  /**
   * Background fill of the icon square:
   * 'auto' uses white in light mode and dark slate in dark mode.
   * 'white' forces clean white background (ideal over photography).
   * 'transparent' has no fill.
   */
  bg?: 'auto' | 'white' | 'transparent';
  /**
   * If true, displays a badge with the icon followed by text (e.g., "Veg" or "Non-Veg").
   */
  showLabel?: boolean;
  /**
   * Optional custom text label override when showLabel is true.
   */
  label?: string;
  /**
   * Additional CSS classes for the outer SVG icon.
   */
  className?: string;
  /**
   * Additional CSS classes for the wrapper when showLabel is true.
   */
  badgeClassName?: string;
}

const sizeMap: Record<string, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
};

/**
 * Standard Indian FSSAI Food Indicator
 * - Vegetarian: Green square outline with centered filled green circle.
 * - Non-Vegetarian: Brown/red square outline with centered filled upward triangle.
 * - Egg: Amber square outline with centered filled upward triangle.
 */
export const FSSAIIndicator: React.FC<FSSAIIndicatorProps> = ({
  type,
  isVeg,
  size = 'md',
  bg = 'auto',
  showLabel = false,
  label,
  className = '',
  badgeClassName = '',
}) => {
  // Normalize dietary type
  let resolved: DietaryType = 'veg';
  if (type) {
    if (type === 'non_veg' || type === 'non-vegetarian') resolved = 'non_veg';
    else if (type === 'egg') resolved = 'egg';
    else resolved = 'veg';
  } else if (isVeg !== undefined) {
    resolved = isVeg ? 'veg' : 'non_veg';
  }

  const dimension = typeof size === 'number' ? size : (sizeMap[size] || 16);

  // Styling and metadata based on Indian FSSAI food packaging standard
  const config = {
    veg: {
      color: '#16a34a', // Emerald/green-600
      textColor: 'text-emerald-700 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/50',
      defaultLabel: 'Veg',
      accessibleName: 'Vegetarian (FSSAI Green Dot)',
    },
    non_veg: {
      color: '#dc2626', // Red-600 / Indian non-veg standard
      textColor: 'text-red-700 dark:text-red-400',
      badgeBg: 'bg-red-50/90 dark:bg-red-950/40 border-red-200/80 dark:border-red-900/50',
      defaultLabel: 'Non-Veg',
      accessibleName: 'Non-Vegetarian (FSSAI Red Triangle)',
    },
    egg: {
      color: '#d97706', // Amber-600
      textColor: 'text-amber-700 dark:text-amber-400',
      badgeBg: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/50',
      defaultLabel: 'Egg',
      accessibleName: 'Contains Egg (FSSAI Amber Indicator)',
    },
  }[resolved];

  const displayLabel = label || config.defaultLabel;

  // Render SVG Icon
  const icon = (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 inline-block align-middle transition-transform ${className}`}
      role="img"
      aria-label={config.accessibleName}
    >
      <title>{config.accessibleName}</title>
      {/* Outer Square with standard FSSAI border & rounded corners */}
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="3.5"
        stroke={config.color}
        strokeWidth="2.5"
        className={
          bg === 'white'
            ? 'fill-white'
            : bg === 'transparent'
            ? 'fill-none'
            : 'fill-white dark:fill-slate-900'
        }
      />

      {resolved === 'veg' ? (
        /* Vegetarian: Centered filled green circle */
        <circle cx="12" cy="12" r="5.5" fill={config.color} />
      ) : (
        /* Non-Veg & Egg: Centered filled upward triangle */
        <polygon
          points="12,6.5 17.5,16.5 6.5,16.5"
          fill={config.color}
          stroke={config.color}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );

  if (!showLabel) {
    return (
      <span className="inline-flex items-center leading-none" title={config.accessibleName}>
        {icon}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-black uppercase tracking-wider text-[10px] shadow-sm select-none ${config.badgeBg} ${config.textColor} ${badgeClassName}`}
      title={config.accessibleName}
    >
      {icon}
      <span>{displayLabel}</span>
    </span>
  );
};

export default FSSAIIndicator;

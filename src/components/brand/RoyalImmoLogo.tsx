import React from 'react';
import { cn } from '../../utils/cn';

interface RoyalImmoLogoProps {
  variant?: 'default' | 'light' | 'compact';
  className?: string;
}

export const RoyalImmoLogo: React.FC<RoyalImmoLogoProps> = ({ variant = 'default', className }) => {
  const isLight = variant === 'light';
  return (
    <span className={cn('inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none', className)}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Architectural Midnight Shield */}
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="8"
          fill={isLight ? '#0B1633' : '#1B3B8C'}
          stroke="#C89B3C"
          strokeWidth="1.5"
        />
        {/* Royal Crown */}
        <path
          d="M11 16L14.5 10L20 14.5L25.5 10L29 16H11Z"
          fill="#C89B3C"
        />
        {/* Architectural Roof & Pillar */}
        <path
          d="M10 22L20 15.5L30 22"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.5 21.5V29.5H26.5V21.5"
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="18" y="23.5" width="4" height="6" rx="0.5" fill="#C89B3C" />
      </svg>
      {variant !== 'compact' && (
        <span className="font-display text-xl font-bold tracking-tight">
          <span className={isLight ? 'text-white' : 'text-[#0B1633] dark:text-white'}>ROYAL</span>{' '}
          <span className="text-[#C89B3C]">IMMO</span>
        </span>
      )}
    </span>
  );
};

import * as React from 'react';
import { cn } from '../../utils/cn';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={cn(
      'rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-[#0E172E] dark:text-slate-100',
      className
    )}
    {...props}
  />
);

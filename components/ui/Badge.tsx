import type { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeColor =
  | 'violet'
  | 'blue'
  | 'indigo'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'slate';

export type BadgeProps = {
  color?: BadgeColor;
  /** Use the soft tinted style (default) or a solid filled style. */
  variant?: 'soft' | 'solid' | 'outline';
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

const SOFT: Record<BadgeColor, string> = {
  violet: 'bg-violet-50 text-violet-700',
  blue: 'bg-blue-50 text-blue-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-600',
};

const SOLID: Record<BadgeColor, string> = {
  violet: 'bg-violet-600 text-white',
  blue: 'bg-blue-600 text-white',
  indigo: 'bg-indigo-600 text-white',
  emerald: 'bg-emerald-500 text-white',
  amber: 'bg-amber-500 text-white',
  rose: 'bg-rose-500 text-white',
  slate: 'bg-slate-600 text-white',
};

const OUTLINE: Record<BadgeColor, string> = {
  violet: 'border border-violet-200 text-violet-700',
  blue: 'border border-blue-200 text-blue-700',
  indigo: 'border border-indigo-200 text-indigo-700',
  emerald: 'border border-emerald-200 text-emerald-700',
  amber: 'border border-amber-200 text-amber-700',
  rose: 'border border-rose-200 text-rose-700',
  slate: 'border border-slate-200 text-slate-600',
};

export function Badge({
  color = 'violet',
  variant = 'soft',
  icon,
  className,
  children,
}: BadgeProps) {
  const palette =
    variant === 'solid' ? SOLID : variant === 'outline' ? OUTLINE : SOFT;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        palette[color],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

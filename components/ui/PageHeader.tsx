import type { ReactNode } from 'react';
import clsx from 'clsx';

export type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Optional right-aligned action area (buttons, etc.). */
  action?: ReactNode;
  /** Optional element rendered above the title (e.g. a badge/eyebrow). */
  eyebrow?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && <div className="mb-1">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

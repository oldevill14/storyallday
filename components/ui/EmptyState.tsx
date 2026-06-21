import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import clsx from 'clsx';

export type EmptyStateProps = {
  /** A lucide icon component, e.g. `Inbox`. */
  icon: ComponentType<LucideProps>;
  title: ReactNode;
  description?: ReactNode;
  /** Optional action (usually a <Button/>). */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center',
        className
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-500">
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-base font-semibold text-slate-800">{title}</div>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

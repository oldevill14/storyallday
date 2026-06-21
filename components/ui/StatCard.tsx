import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import clsx from 'clsx';
import { Card } from './Card';

export type StatColor = 'violet' | 'blue' | 'emerald' | 'amber' | 'indigo' | 'rose';

export type StatCardProps = {
  /** A lucide icon component, e.g. `Calendar`. */
  icon: ComponentType<LucideProps>;
  value: ReactNode;
  label: ReactNode;
  /** Optional small caption under the value (e.g. "ใน 7 วัน"). */
  caption?: ReactNode;
  color?: StatColor;
  className?: string;
};

const ICON_BG: Record<StatColor, string> = {
  violet: 'bg-violet-50 text-violet-600',
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  rose: 'bg-rose-50 text-rose-600',
};

export function StatCard({
  icon: Icon,
  value,
  label,
  caption,
  color = 'violet',
  className,
}: StatCardProps) {
  return (
    <Card className={clsx('flex items-start gap-3', className)}>
      <div
        className={clsx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          ICON_BG[color]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="text-2xl font-bold leading-tight text-slate-900">
          {value}
        </div>
        {caption && (
          <div className="text-xs text-slate-400">{caption}</div>
        )}
      </div>
    </Card>
  );
}

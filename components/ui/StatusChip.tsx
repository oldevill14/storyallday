import clsx from 'clsx';
import { Clock, CalendarClock, CircleCheck, FileText } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import type { PostStatus } from '@/lib/types';

type StatusMeta = {
  label: string;
  className: string;
  icon: ComponentType<LucideProps>;
};

/** Maps a PostStatus to its Thai label, color, and icon. */
export const STATUS_META: Record<PostStatus, StatusMeta> = {
  pending: {
    label: 'รออนุมัติ',
    className: 'bg-amber-50 text-amber-700',
    icon: Clock,
  },
  scheduled: {
    label: 'ลงตารางแล้ว',
    className: 'bg-emerald-50 text-emerald-700',
    icon: CalendarClock,
  },
  published: {
    label: 'เผยแพร่แล้ว',
    className: 'bg-blue-50 text-blue-700',
    icon: CircleCheck,
  },
  draft: {
    label: 'ฉบับร่าง',
    className: 'bg-slate-100 text-slate-600',
    icon: FileText,
  },
};

export type StatusChipProps = {
  status: PostStatus;
  /** Hide the icon. */
  hideIcon?: boolean;
  className?: string;
};

export function StatusChip({ status, hideIcon = false, className }: StatusChipProps) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        meta.className,
        className
      )}
    >
      {!hideIcon && <Icon className="h-3.5 w-3.5" />}
      {meta.label}
    </span>
  );
}

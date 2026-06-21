'use client';

import { Sparkles } from 'lucide-react';
import { PlatformIcons, StatusChip } from '@/components/ui';
import type { Post } from '@/lib/types';
import { isPrimeTimeSlot, postDate, timeLabel } from './dateUtils';

// A small gradient "thumbnail" per platform mix — we don't have real images, so
// we fake a friendly cover (matching the reference screenshots' colored covers).
const COVER_GRADIENTS: string[] = [
  'from-violet-500 to-blue-500',
  'from-blue-500 to-cyan-500',
  'from-fuchsia-500 to-violet-600',
  'from-amber-400 to-rose-500',
  'from-emerald-400 to-teal-500',
  'from-indigo-500 to-purple-600',
];

function coverFor(post: Post): string {
  // Stable pick from the id so a post keeps the same cover across renders.
  let sum = 0;
  for (const ch of post.id) sum = (sum + ch.charCodeAt(0)) % 997;
  return COVER_GRADIENTS[sum % COVER_GRADIENTS.length];
}

export type CalendarPostCardProps = {
  post: Post;
  onClick?: (post: Post) => void;
};

/** A single scheduled post tile inside a day column. */
export function CalendarPostCard({ post, onClick }: CalendarPostCardProps) {
  const date = postDate(post);
  const prime = isPrimeTimeSlot(date);

  return (
    <button
      type="button"
      onClick={() => onClick?.(post)}
      className="group w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm shadow-slate-200/50 transition-shadow hover:border-violet-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
    >
      {/* Cover with time badge + platforms */}
      <div
        className={`relative flex h-20 items-end bg-gradient-to-br ${coverFor(post)} p-2`}
      >
        <span
          className="absolute left-2 top-2 rounded-md bg-black/35 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm"
          title={prime ? 'อยู่ในช่วงเวลาทองของเพจไทย' : undefined}
        >
          {timeLabel(date)}
        </span>
        {prime && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-md bg-white/85 px-1 py-0.5 text-[10px] font-semibold text-violet-700 shadow-sm">
            <Sparkles className="h-2.5 w-2.5" />
            เวลาทอง
          </span>
        )}
        <PlatformIcons
          platforms={post.platforms}
          size={16}
          className="rounded-full bg-white/85 px-1 py-0.5 shadow-sm"
        />
      </div>

      {/* Title + status */}
      <div className="space-y-2 p-2.5">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-800">
          {post.title}
        </p>
        <StatusChip status={post.status} />
      </div>
    </button>
  );
}

'use client';

import { Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { Spinner } from '@/components/ui';
import type { Post } from '@/lib/types';
import { CalendarPostCard } from './CalendarPostCard';
import { thaiDayMonth, thaiWeekday } from './dateUtils';

export type DayColumnProps = {
  day: Date;
  posts: Post[];
  isToday: boolean;
  /** Fill an empty day with an AI-suggested post. */
  onFill: (day: Date) => void;
  /** True while AI is generating a fill for THIS day. */
  filling?: boolean;
  /** Disable the fill action (e.g. no API key) but still show the prompt. */
  fillDisabled?: boolean;
  onPostClick?: (post: Post) => void;
};

/** One day's column: header (weekday + date + count) and its post stack. */
export function DayColumn({
  day,
  posts,
  isToday,
  onFill,
  filling = false,
  fillDisabled = false,
  onPostClick,
}: DayColumnProps) {
  const empty = posts.length === 0;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Header */}
      <div
        className={clsx(
          'rounded-2xl border px-3 py-3 text-center',
          isToday
            ? 'border-transparent bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-sm shadow-violet-600/30'
            : 'border-slate-200 bg-white text-slate-700'
        )}
      >
        <div className="text-sm font-bold">{thaiWeekday(day)}</div>
        <div
          className={clsx(
            'text-xs',
            isToday ? 'text-white/85' : 'text-slate-400'
          )}
        >
          {thaiDayMonth(day)}
        </div>
        <div
          className={clsx(
            'mt-0.5 text-xs font-medium',
            isToday ? 'text-white/90' : 'text-violet-600'
          )}
        >
          {posts.length} โพสต์
        </div>
      </div>

      {/* Posts or empty slot */}
      <div className="flex flex-col gap-2.5">
        {empty ? (
          <button
            type="button"
            onClick={() => !fillDisabled && onFill(day)}
            disabled={filling || fillDisabled}
            className={clsx(
              'flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-3 py-6 text-center transition-colors',
              fillDisabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-50/40'
                : 'border-slate-200 bg-slate-50/50 hover:border-violet-300 hover:bg-violet-50/50',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40'
            )}
          >
            {filling ? (
              <Spinner size={18} label="AI กำลังเติม…" />
            ) : (
              <>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium leading-snug text-slate-500">
                  ให้ <span className="font-bold text-violet-600">AI</span>{' '}
                  เติมโพสต์ในช่องว่าง
                </span>
              </>
            )}
          </button>
        ) : (
          posts.map((p) => (
            <CalendarPostCard key={p.id} post={p} onClick={onPostClick} />
          ))
        )}
      </div>
    </div>
  );
}

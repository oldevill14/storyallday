// components/calendar/dateUtils.ts — date-fns helpers for the calendar week view.
// Pure helpers (no "use client" needed) shared by the calendar page + cards.

import {
  addDays,
  addWeeks,
  endOfDay,
  format,
  isSameDay,
  isWithinInterval,
  startOfDay,
} from 'date-fns';
import { th } from 'date-fns/locale';
import type { Post } from '@/lib/types';

/** Effective date for placing a post on the calendar: scheduledAt ?? createdAt. */
export function postDate(post: Post): Date {
  return new Date(post.scheduledAt ?? post.createdAt);
}

/** The 7 consecutive days starting at `start` (00:00). */
export function weekDays(start: Date): Date[] {
  const base = startOfDay(start);
  return Array.from({ length: 7 }, (_, i) => addDays(base, i));
}

/** Move the week window by `delta` weeks. */
export function shiftWeek(start: Date, delta: number): Date {
  return startOfDay(addWeeks(start, delta));
}

/** Posts that fall on a given day, sorted by time ascending. */
export function postsForDay(posts: Post[], day: Date): Post[] {
  return posts
    .filter((p) => isSameDay(postDate(p), day))
    .sort((a, b) => postDate(a).getTime() - postDate(b).getTime());
}

/** Posts whose effective date is within the 7-day window [start, start+6]. */
export function postsInWeek(posts: Post[], start: Date): Post[] {
  const from = startOfDay(start);
  const to = endOfDay(addDays(from, 6));
  return posts.filter((p) =>
    isWithinInterval(postDate(p), { start: from, end: to })
  );
}

/** Thai weekday label, e.g. "ศุกร์". */
export function thaiWeekday(day: Date): string {
  return format(day, 'EEEE', { locale: th });
}

/** Thai short day label, e.g. "19 มิ.ย." */
export function thaiDayMonth(day: Date): string {
  return format(day, 'd MMM', { locale: th });
}

/** Time label, e.g. "05:00". */
export function timeLabel(d: Date): string {
  return format(d, 'HH:mm');
}

/** Range header label, e.g. "19 – 25 มิ.ย. 2569". */
export function weekRangeLabel(start: Date): string {
  const from = startOfDay(start);
  const to = addDays(from, 6);
  const sameMonth = from.getMonth() === to.getMonth();
  const left = format(from, sameMonth ? 'd' : 'd MMM', { locale: th });
  const right = format(to, 'd MMM yyyy', { locale: th });
  return `${left} – ${right}`;
}

/**
 * Thai "good-to-post" windows (verified prime times for TH pages):
 * morning 09:00–11:00 and evening 19:00–21:00. Used to flag posts/slots.
 */
export function isPrimeTimeSlot(d: Date): boolean {
  const h = d.getHours();
  return (h >= 9 && h < 11) || (h >= 19 && h < 21);
}

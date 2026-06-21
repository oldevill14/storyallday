// components/approvals/scheduling.ts
// Small date/time helpers for the Approvals page. Pure functions — no React.

import { format } from 'date-fns';
import { th } from 'date-fns/locale';

/** Format an ISO string for display, e.g. "21 มิ.ย. 2569 12:00". (Thai/Buddhist) */
export function formatThaiDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return format(d, 'd MMM yyyy HH:mm', { locale: th });
}

/** Convert an ISO string to the value expected by <input type="datetime-local">. */
export function isoToLocalInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return localInputFromDate(new Date());
  return localInputFromDate(d);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function localInputFromDate(d: Date): string {
  // "YYYY-MM-DDTHH:mm" in local time (what the input control expects).
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** Convert a datetime-local input value back to a full ISO string. */
export function localInputToISO(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

/**
 * A sensible default schedule slot: the next "good" posting window.
 * Thai pages perform best ~09:00-11:00 & 19:00-21:00 (per the calendar tip),
 * so we pick the next 10:00 or 19:00 that is still in the future.
 */
export function nextDefaultSlot(now: Date = new Date()): string {
  const candidate = new Date(now);
  const slots = [10, 19]; // good posting hours
  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    for (const hour of slots) {
      candidate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
      candidate.setHours(hour, 0, 0, 0);
      if (candidate.getTime() > now.getTime() + 5 * 60 * 1000) {
        return localInputFromDate(candidate);
      }
    }
  }
  // Fallback: +1 hour from now.
  const fallback = new Date(now.getTime() + 60 * 60 * 1000);
  return localInputFromDate(fallback);
}

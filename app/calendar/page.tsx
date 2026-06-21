'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  KeyRound,
  Lightbulb,
  Sparkles,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { startOfDay, isSameDay } from 'date-fns';
import { useStore, useHydrated } from '@/lib/store';
import { draftPost, suggestAngles } from '@/lib/ai';
import {
  Badge,
  Button,
  Card,
  PageHeader,
  PlatformIcon,
  Spinner,
  StatCard,
  StatusChip,
} from '@/components/ui';
import type { Platform, Post } from '@/lib/types';
import { DayColumn } from '@/components/calendar/DayColumn';
import {
  postsForDay,
  postsInWeek,
  shiftWeek,
  timeLabel,
  postDate,
  weekDays,
  weekRangeLabel,
} from '@/components/calendar/dateUtils';

type PlatformTab = 'all' | Platform;

const PLATFORM_TABS: { id: PlatformTab; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'line', label: 'LINE' },
];

/** First day of the seed window (ศุกร์ 19 มิ.ย.) so the demo opens on real data. */
const DEFAULT_WEEK_START = startOfDay(new Date('2026-06-19T00:00:00+07:00'));

export default function CalendarPage() {
  const hydrated = useHydrated();
  const posts = useStore((s) => s.posts);
  const settings = useStore((s) => s.settings);
  const brand = useStore((s) => s.brand);
  const addPost = useStore((s) => s.addPost);

  const [tab, setTab] = useState<PlatformTab>('all');
  const [weekStart, setWeekStart] = useState<Date>(DEFAULT_WEEK_START);
  const [fillingDay, setFillingDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Post | null>(null);

  const hasKey = settings.apiKey.trim().length > 0;

  // Filter by platform tab.
  const filtered = useMemo(
    () =>
      tab === 'all'
        ? posts
        : posts.filter((p) => p.platforms.includes(tab)),
    [posts, tab]
  );

  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const weekPosts = useMemo(
    () => postsInWeek(filtered, weekStart),
    [filtered, weekStart]
  );

  // Top stats — computed over the current 7-day window (matches reference).
  const stats = useMemo(() => {
    const total = weekPosts.length;
    const planned = weekPosts.filter(
      (p) => p.status === 'scheduled' || p.status === 'published'
    ).length;
    const pending = weekPosts.filter((p) => p.status === 'pending').length;
    const emptyDays = days.filter(
      (d) => postsForDay(filtered, d).length === 0
    ).length;
    return { total, planned, pending, emptyDays };
  }, [weekPosts, days, filtered]);

  async function handleFill(day: Date) {
    if (!hasKey) return;
    setError(null);
    setFillingDay(day.toISOString());
    try {
      // One AI strategist call → pick the strongest angle → draft a full post.
      const angles = await suggestAngles(brand, settings);
      const angle =
        [...angles].sort((a, b) => b.confidence - a.confidence)[0] ?? null;
      if (!angle) {
        throw new Error('AI ไม่ได้เสนอมุมคอนเทนต์ ลองอีกครั้ง');
      }
      const draft = await draftPost(angle, brand, settings);

      // Schedule into a Thai prime-time slot (10:00) on the chosen day.
      const scheduled = new Date(day);
      scheduled.setHours(10, 0, 0, 0);

      const id = `post-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

      const newPost: Post = {
        id,
        title: angle.title,
        caption: draft.caption,
        hashtags: draft.hashtags,
        platforms: tab === 'all' ? ['facebook', 'instagram'] : [tab],
        status: 'pending',
        scheduledAt: scheduled.toISOString(),
        createdAt: new Date().toISOString(),
        angleId: angle.id,
        imageIdea: draft.imageIdea,
      };
      addPost(newPost);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการเรียก AI');
    } finally {
      setFillingDay(null);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="กำลังโหลดปฏิทิน…" />
      </div>
    );
  }

  const today = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Badge color="violet" icon={<Calendar className="h-3.5 w-3.5" />}>
            ปฏิทินโพสต์
          </Badge>
        }
        title="วางแผนโพสต์ทั้งสัปดาห์"
        subtitle="ดูโพสต์ที่จัดตารางไว้ตามวัน เวลา และแพลตฟอร์ม — ช่องไหนว่าง ให้ AI เติมให้ได้เลย"
        action={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              aria-label="สัปดาห์ก่อนหน้า"
              icon={<ChevronLeft className="h-4 w-4" />}
              onClick={() => setWeekStart((w) => shiftWeek(w, -1))}
            />
            <span className="min-w-[150px] text-center text-sm font-semibold tabular-nums text-slate-700">
              {weekRangeLabel(weekStart)}
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-label="สัปดาห์ถัดไป"
              icon={<ChevronRight className="h-4 w-4" />}
              onClick={() => setWeekStart((w) => shiftWeek(w, 1))}
            />
          </div>
        }
      />

      {/* Stats ×4 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Calendar}
          color="violet"
          value={stats.total}
          label="โพสต์ทั้งหมด"
          caption="ใน 7 วัน"
        />
        <StatCard
          icon={CircleCheck}
          color="emerald"
          value={stats.planned}
          label="อยู่ในแผนโพสต์"
          caption="พร้อมโพสต์เอง"
        />
        <StatCard
          icon={Clock}
          color="amber"
          value={stats.pending}
          label="รออนุมัติ"
          caption="ควรตรวจต่อ"
        />
        <StatCard
          icon={Sparkles}
          color="indigo"
          value={stats.emptyDays}
          label="ช่องว่าง"
          caption="ให้ AI เติมได้"
        />
      </div>

      {/* Tabs + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PLATFORM_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm shadow-violet-600/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                )}
              >
                {t.id !== 'all' && (
                  <PlatformIcon platform={t.id} size={16} />
                )}
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            มุมมองสัปดาห์
          </span>
          <button
            type="button"
            onClick={() => setWeekStart(DEFAULT_WEEK_START)}
            className="rounded-full px-3 py-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
            title="กลับไปสัปดาห์เริ่มต้น"
          >
            สัปดาห์นี้
          </button>
        </div>
      </div>

      {/* No-API-key prompt */}
      {!hasKey && (
        <Card className="flex flex-col items-start gap-3 border-violet-200 bg-violet-50/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-800">
                ยังไม่ได้เชื่อมต่อ AI
              </div>
              <p className="text-sm text-slate-500">
                ใส่ API key ในหน้าตั้งค่าก่อน เพื่อให้ AI เติมโพสต์ในช่องว่างให้อัตโนมัติ
              </p>
            </div>
          </div>
          <Link href="/settings" className="shrink-0">
            <Button
              size="sm"
              icon={<KeyRound className="h-4 w-4" />}
            >
              ไปที่ตั้งค่า
            </Button>
          </Link>
        </Card>
      )}

      {/* Error banner */}
      {error && (
        <Card className="flex items-start gap-3 border-rose-200 bg-rose-50/50">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-rose-700">
              เติมโพสต์ไม่สำเร็จ
            </div>
            <p className="break-words text-sm text-rose-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded-full p-1 text-rose-400 transition-colors hover:bg-rose-100"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        </Card>
      )}

      {/* Week grid: 7 columns (scrolls on small screens) */}
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="grid min-w-[1040px] grid-cols-7 gap-3">
          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              isToday={isSameDay(day, today)}
              posts={postsForDay(filtered, day)}
              filling={fillingDay === day.toISOString()}
              fillDisabled={!hasKey || fillingDay !== null}
              onFill={handleFill}
              onPostClick={setSelected}
            />
          ))}
        </div>
      </div>

      {/* Thai prime-time tip */}
      <Card className="flex items-center gap-3 border-amber-200 bg-amber-50/50">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Lightbulb className="h-5 w-5" />
        </span>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">เคล็ดลับเวลาโพสต์: </span>
          ช่วง{' '}
          <span className="font-semibold text-amber-700">09:00–11:00 น.</span> และ{' '}
          <span className="font-semibold text-amber-700">19:00–21:00 น.</span>{' '}
          มักเป็นเวลาทองที่เพจไทยมียอดเข้าถึงและ engagement สูงสุด ลองจัดโพสต์สำคัญไว้ช่วงนี้
        </p>
      </Card>

      {/* Quick-peek post drawer (read-only) */}
      {selected && (
        <PostPeek post={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

/** Lightweight read-only modal showing a post's details. */
function PostPeek({ post, onClose }: { post: Post; onClose: () => void }) {
  const date = postDate(post);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <Card
        className="w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CalendarClock className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                {weekRangeLabelDay(date)} · {timeLabel(date)} น.
              </span>
            </div>
            <h3 className="mt-1 text-lg font-bold text-slate-900">
              {post.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
            aria-label="ปิด"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusChip status={post.status} />
          {post.platforms.map((p) => (
            <PlatformIcon key={p} platform={p} size={18} />
          ))}
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {post.caption}
        </p>

        {post.hashtags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.hashtags.map((h) => (
              <Badge key={h} color="blue" variant="soft">
                {h}
              </Badge>
            ))}
          </div>
        )}

        {post.imageIdea && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">ไอเดียภาพ: </span>
            {post.imageIdea}
          </div>
        )}
      </Card>
    </div>
  );
}

// Inline single-day label for the peek modal (avoids exporting a one-off util).
function weekRangeLabelDay(d: Date): string {
  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d);
}

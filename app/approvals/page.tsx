'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  CalendarCheck,
  CheckCheck,
  Inbox,
  Sparkles,
  Trash2,
  X,
  KeyRound,
  Layers,
} from 'lucide-react';
import type { Post } from '@/lib/types';
import { useStore, useHydrated } from '@/lib/store';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  StatCard,
  Spinner,
  EmptyState,
  Mascot,
} from '@/components/ui';
import { ApprovalCard } from '@/components/approvals/ApprovalCard';
import { nextDefaultSlot, localInputToISO } from '@/components/approvals/scheduling';

export default function ApprovalsPage() {
  const hydrated = useHydrated();

  const posts = useStore((s) => s.posts);
  const settings = useStore((s) => s.settings);
  const updatePost = useStore((s) => s.updatePost);
  const removePost = useStore((s) => s.removePost);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const pending = useMemo(
    () =>
      posts
        .filter((p) => p.status === 'pending')
        .sort((a, b) => {
          // Soonest scheduledAt first; undated posts last.
          const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
          const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
          return ta - tb;
        }),
    [posts]
  );

  const scheduledCount = useMemo(
    () => posts.filter((p) => p.status === 'scheduled').length,
    [posts]
  );

  const platformReach = useMemo(() => {
    const set = new Set<string>();
    pending.forEach((p) => p.platforms.forEach((pl) => set.add(pl)));
    return set.size;
  }, [pending]);

  // --- actions ---------------------------------------------------------------

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function approveOne(id: string, scheduledAt: string) {
    updatePost(id, { status: 'scheduled', scheduledAt });
    setSelected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function removeOne(id: string) {
    removePost(id);
    setSelected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const selectedPending = pending.filter((p) => selected.has(p.id));

  function selectAll() {
    setSelected(new Set(pending.map((p) => p.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function approveSelected() {
    // Stagger each approved post into the next good posting slot so they don't
    // all land at the exact same minute.
    let cursor = new Date();
    selectedPending.forEach((p: Post) => {
      const slotISO = localInputToISO(nextDefaultSlot(cursor));
      updatePost(p.id, { status: 'scheduled', scheduledAt: slotISO });
      // advance the cursor a few hours past the chosen slot for the next one
      cursor = new Date(new Date(slotISO).getTime() + 3 * 60 * 60 * 1000);
    });
    clearSelection();
  }

  function removeSelected() {
    selectedPending.forEach((p) => removePost(p.id));
    clearSelection();
  }

  // --- render ----------------------------------------------------------------

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="กำลังโหลดรายการรออนุมัติ…" />
      </div>
    );
  }

  const hasKey = Boolean(settings.apiKey?.trim());

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Badge color="amber" icon={<Clock className="h-3.5 w-3.5" />}>
            รออนุมัติ
          </Badge>
        }
        title="รออนุมัติ"
        subtitle="โพสต์ที่ AI เตรียมไว้ — ตรวจ แก้ไข แล้วอนุมัติเพื่อจัดลงตาราง"
        action={
          pending.length > 0 ? (
            <Button
              variant={
                selected.size === pending.length ? 'soft' : 'outline'
              }
              size="md"
              icon={<CheckCheck className="h-4 w-4" />}
              onClick={
                selected.size === pending.length ? clearSelection : selectAll
              }
            >
              {selected.size === pending.length
                ? 'ยกเลิกเลือกทั้งหมด'
                : 'เลือกทั้งหมด'}
            </Button>
          ) : undefined
        }
      />

      {/* Stat counters */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Clock}
          color="amber"
          value={pending.length}
          label="รออนุมัติ"
          caption="ควรตรวจก่อนเผยแพร่"
        />
        <StatCard
          icon={CalendarCheck}
          color="emerald"
          value={scheduledCount}
          label="ลงตารางแล้ว"
          caption="พร้อมเผยแพร่อัตโนมัติ"
        />
        <StatCard
          icon={Layers}
          color="violet"
          value={platformReach}
          label="แพลตฟอร์มที่ครอบคลุม"
          caption="จากโพสต์ที่รออนุมัติ"
        />
      </div>

      {/* No-API-key gentle prompt (AI involved on the AI-แนะนำ flow) */}
      {!hasKey && (
        <Card className="flex flex-col items-start gap-3 border-violet-100 bg-violet-50/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Mascot size={40} />
            <div>
              <p className="text-sm font-semibold text-slate-800">
                ยังไม่ได้เชื่อมต่อ AI
              </p>
              <p className="text-sm text-slate-500">
                อนุมัติและจัดตารางได้ตามปกติ — แต่ถ้าอยากให้ AI ช่วยคิดและร่างโพสต์ใหม่
                ใส่ API key ก่อนนะ
              </p>
            </div>
          </div>
          <Link href="/settings" className="shrink-0">
            <Button
              variant="soft"
              size="sm"
              icon={<KeyRound className="h-4 w-4" />}
            >
              ไปที่ตั้งค่า
            </Button>
          </Link>
        </Card>
      )}

      {/* Batch toolbar */}
      {selected.size > 0 && (
        <Card
          padded={false}
          className="flex flex-col items-stretch gap-3 border-violet-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-2 px-1 text-sm font-medium text-slate-700">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-violet-600 px-1.5 text-xs font-semibold text-white">
              {selected.size}
            </span>
            เลือกอยู่ {selected.size} โพสต์
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              icon={<X className="h-4 w-4" />}
              onClick={clearSelection}
            >
              ล้างการเลือก
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-rose-600 hover:bg-rose-50 hover:border-rose-200"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={removeSelected}
            >
              ลบที่เลือก
            </Button>
            <Button
              size="sm"
              variant="gradient"
              icon={<CheckCheck className="h-4 w-4" />}
              onClick={approveSelected}
            >
              อนุมัติ &amp; จัดตาราง ({selected.size})
            </Button>
          </div>
        </Card>
      )}

      {/* List or empty state */}
      {pending.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="ไม่มีโพสต์รออนุมัติแล้ว 🎉"
          description="เคลียร์หมดทุกโพสต์! ให้ AI ช่วยคิดมุมคอนเทนต์และร่างโพสต์ใหม่ได้จากหน้าแรก"
          action={
            <Link href="/">
              <Button icon={<Sparkles className="h-4 w-4" />}>
                ให้ AI แนะนำโพสต์ใหม่
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {pending.map((post) => (
            <ApprovalCard
              key={post.id}
              post={post}
              selected={selected.has(post.id)}
              onToggleSelect={toggleSelect}
              onUpdate={updatePost}
              onApprove={approveOne}
              onRemove={removeOne}
            />
          ))}
        </div>
      )}
    </div>
  );
}

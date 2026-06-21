'use client';

import { useMemo, useState } from 'react';
import { Library, Search, LayoutGrid, Inbox, FolderOpen } from 'lucide-react';
import type { Post, PostStatus } from '@/lib/types';
import { useStore, useHydrated } from '@/lib/store';
import {
  PageHeader,
  Card,
  Spinner,
  EmptyState,
  Badge,
  Button,
} from '@/components/ui';
import { PostCard } from '@/components/library/PostCard';
import { PostModal } from '@/components/library/PostModal';

type TabKey = 'pending' | 'scheduled' | 'published' | 'all';

const TABS: { key: TabKey; label: string; status?: PostStatus }[] = [
  { key: 'pending', label: 'รออนุมัติ', status: 'pending' },
  { key: 'scheduled', label: 'ลงตารางแล้ว', status: 'scheduled' },
  { key: 'published', label: 'เผยแพร่แล้ว', status: 'published' },
  { key: 'all', label: 'ทั้งหมด' },
];

export default function LibraryPage() {
  const hydrated = useHydrated();
  const posts = useStore((s) => s.posts);

  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Post | null>(null);

  // Per-status counts (computed from the store).
  const counts = useMemo(() => {
    const c = { pending: 0, scheduled: 0, published: 0, all: posts.length };
    for (const p of posts) {
      if (p.status === 'pending') c.pending++;
      else if (p.status === 'scheduled') c.scheduled++;
      else if (p.status === 'published') c.published++;
    }
    return c;
  }, [posts]);

  // Apply tab + search filter (the filter "works from the store").
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const tabMatch = tab === 'all' ? true : p.status === tab;
      if (!tabMatch) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.caption.toLowerCase().includes(q) ||
        p.hashtags.some((h) => h.toLowerCase().includes(q))
      );
    });
  }, [posts, tab, query]);

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="กำลังโหลดคลังโพสต์…" />
      </div>
    );
  }

  // Keep the modal in sync with the live store (e.g. after regenerate/approve).
  const activeLive = active ? posts.find((p) => p.id === active.id) ?? null : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Badge color="violet" icon={<Library className="h-3 w-3" />}>
            คลังโพสต์
          </Badge>
        }
        title="คลังโพสต์ทั้งหมด"
        subtitle="ดูและจัดการโพสต์ทุกชิ้นในที่เดียว — กรองตามสถานะ ค้นหา และเปิดดูรายละเอียดได้"
        action={
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3.5 py-1.5 text-sm font-semibold text-violet-700">
            <LayoutGrid className="h-4 w-4" />
            {counts.all} โพสต์
          </div>
        }
      />

      {/* Tabs + counts + search */}
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const isActive = tab === t.key;
              const n = counts[t.key];
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ' +
                    (isActive
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm shadow-violet-600/20'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100')
                  }
                >
                  <span>{t.label}</span>
                  <span
                    className={
                      'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ' +
                      (isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-white text-slate-500')
                    }
                  >
                    {n}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อโพสต์ แคปชั่น หรือแฮชแท็ก…"
              className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        </div>

        {/* Result line */}
        <div className="text-xs text-slate-400">
          แสดง {filtered.length} จาก {counts.all} โพสต์
          {query.trim() && <> · ผลการค้นหา “{query.trim()}”</>}
        </div>
      </Card>

      {/* Grid */}
      {filtered.length === 0 ? (
        query.trim() ? (
          <EmptyState
            icon={Search}
            title="ไม่พบโพสต์ที่ตรงกับการค้นหา"
            description={`ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูโพสต์ทั้งหมด`}
            action={
              <Button variant="soft" onClick={() => setQuery('')}>
                ล้างการค้นหา
              </Button>
            }
          />
        ) : tab === 'all' ? (
          <EmptyState
            icon={FolderOpen}
            title="ยังไม่มีโพสต์ในคลัง"
            description="เริ่มสร้างคอนเทนต์ชิ้นแรกของคุณ แล้วโพสต์จะมาปรากฏที่นี่"
          />
        ) : (
          <EmptyState
            icon={Inbox}
            title="ยังไม่มีโพสต์ในหมวดนี้"
            description="ลองดูหมวด “ทั้งหมด” เพื่อเห็นโพสต์ทุกชิ้น"
            action={
              <Button variant="soft" onClick={() => setTab('all')}>
                ดูทั้งหมด
              </Button>
            }
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} onView={setActive} />
          ))}
        </div>
      )}

      {/* Detail modal */}
      <PostModal post={activeLive} onClose={() => setActive(null)} />
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { CalendarClock, Eye, ImageIcon } from 'lucide-react';
import type { Post } from '@/lib/types';
import { Button, Card, StatusChip, PlatformIcons, Mascot } from '@/components/ui';

export type PostCardProps = {
  post: Post;
  onView: (post: Post) => void;
};

/** Deterministic soft gradient for the card "thumbnail" so each post looks distinct. */
const THUMBS = [
  'from-violet-100 via-violet-50 to-blue-100',
  'from-blue-100 via-indigo-50 to-violet-100',
  'from-emerald-100 via-teal-50 to-blue-100',
  'from-amber-100 via-orange-50 to-rose-100',
  'from-rose-100 via-pink-50 to-violet-100',
  'from-indigo-100 via-blue-50 to-cyan-100',
];

function thumbFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return THUMBS[hash % THUMBS.length];
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'd MMM yyyy · HH:mm น.', { locale: th });
  } catch {
    return '—';
  }
}

export function PostCard({ post, onView }: PostCardProps) {
  const thumb = useMemo(() => thumbFor(post.id), [post.id]);
  const dateIso = post.scheduledAt ?? post.createdAt;

  return (
    <Card
      padded={false}
      hoverable
      className="group flex flex-col overflow-hidden"
    >
      {/* Thumbnail / cover */}
      <div
        className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${thumb}`}
      >
        <Mascot size={48} />
        {/* Status overlay (top-right) */}
        <div className="absolute right-2.5 top-2.5">
          <StatusChip status={post.status} className="bg-white/80 backdrop-blur-sm" />
        </div>
        {/* Platforms overlay (bottom-left) */}
        <div className="absolute bottom-2.5 left-2.5 rounded-full bg-white/80 px-1.5 py-1 backdrop-blur-sm">
          <PlatformIcons platforms={post.platforms} size={16} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
          {post.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {post.caption}
        </p>

        {/* Hashtags preview */}
        {post.hashtags.length > 0 && (
          <p className="mt-2 line-clamp-1 text-xs font-medium text-violet-600">
            {post.hashtags.slice(0, 3).join(' ')}
          </p>
        )}

        <div className="mt-auto pt-3">
          <div className="mb-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <CalendarClock className="h-3.5 w-3.5" />
            <span className="truncate">{fmtDate(dateIso)}</span>
            {post.imageIdea && (
              <span className="ml-auto inline-flex items-center gap-1 text-slate-400">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>มีไอเดียภาพ</span>
              </span>
            )}
          </div>
          <Button
            variant="soft"
            size="sm"
            className="w-full"
            icon={<Eye className="h-4 w-4" />}
            onClick={() => onView(post)}
          >
            ดูโพสต์
          </Button>
        </div>
      </div>
    </Card>
  );
}

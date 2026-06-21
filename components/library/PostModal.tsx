'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  X,
  CalendarClock,
  CalendarPlus,
  Image as ImageIcon,
  Sparkles,
  Copy,
  Check,
  Send,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import Link from 'next/link';
import type { Post } from '@/lib/types';
import { useStore } from '@/lib/store';
import { draftPost } from '@/lib/ai';
import {
  Button,
  StatusChip,
  PlatformIcons,
  Mascot,
  Badge,
} from '@/components/ui';

export type PostModalProps = {
  post: Post | null;
  onClose: () => void;
};

function fmtFull(iso?: string): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'EEEE d MMMM yyyy · HH:mm น.', { locale: th });
  } catch {
    return '—';
  }
}

export function PostModal({ post, onClose }: PostModalProps) {
  const settings = useStore((s) => s.settings);
  const brand = useStore((s) => s.brand);
  const angles = useStore((s) => s.angles);
  const updatePost = useStore((s) => s.updatePost);

  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset transient UI when switching posts — the React-recommended
  // "adjust state during render" pattern (no effect, no cascading renders).
  const [prevPostId, setPrevPostId] = useState(post?.id);
  if (post?.id !== prevPostId) {
    setPrevPostId(post?.id);
    setCopied(false);
    setError(null);
    setRegenerating(false);
  }

  // Close on Escape.
  useEffect(() => {
    if (!post) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // Lock body scroll while open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [post, onClose]);

  if (!post) return null;

  const sourceAngle = post.angleId
    ? angles.find((a) => a.id === post.angleId)
    : undefined;

  const hasKey = settings.apiKey.trim().length > 0;

  const handleCopy = async () => {
    const text = [post.caption, '', post.hashtags.join(' ')]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('คัดลอกไม่สำเร็จ ลองคัดลอกด้วยมืออีกครั้ง');
    }
  };

  const handleRegenerate = async () => {
    setError(null);
    if (!hasKey) {
      setError('ยังไม่ได้ตั้งค่า API key — ไปที่หน้าตั้งค่าก่อนนะ');
      return;
    }
    // Build an angle context: use the source angle if available, else synthesize
    // a lightweight one from the post itself so the copywriter has direction.
    const angle = sourceAngle ?? {
      id: post.angleId ?? 'adhoc',
      title: post.title,
      category: 'สำหรับคุณ',
      confidence: 80,
      rationale: post.caption.slice(0, 120),
      format: 'ภาพเดี่ยว',
      createdAt: post.createdAt,
    };
    setRegenerating(true);
    try {
      const draft = await draftPost(angle, brand, settings);
      updatePost(post.id, {
        caption: draft.caption,
        hashtags: draft.hashtags.length ? draft.hashtags : post.hashtags,
        imageIdea: draft.imageIdea || post.imageIdea,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สร้างแคปชั่นใหม่ไม่สำเร็จ');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`รายละเอียดโพสต์: ${post.title}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-slate-100 p-5">
          <Mascot size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={post.status} />
              {sourceAngle && (
                <Badge color="violet" icon={<Sparkles className="h-3 w-3" />}>
                  จาก AI แนะนำ
                </Badge>
              )}
            </div>
            <h2 className="mt-2 text-lg font-bold leading-snug text-slate-900">
              {post.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Meta row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <CalendarClock className="h-3.5 w-3.5" />
                {post.status === 'published' ? 'เผยแพร่เมื่อ' : 'กำหนดเผยแพร่'}
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {fmtFull(post.scheduledAt)}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <CalendarPlus className="h-3.5 w-3.5" />
                สร้างเมื่อ
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {fmtFull(post.createdAt)}
              </div>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <div className="mb-1.5 text-xs font-medium text-slate-500">
              แพลตฟอร์ม
            </div>
            <div className="flex items-center gap-2">
              <PlatformIcons platforms={post.platforms} size={22} />
              <span className="text-sm text-slate-600">
                {post.platforms.length} ช่องทาง
              </span>
            </div>
          </div>

          {/* Caption */}
          <div>
            <div className="mb-1.5 text-xs font-medium text-slate-500">แคปชั่น</div>
            <div className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-white p-4 text-sm leading-relaxed text-slate-700">
              {post.caption}
            </div>
          </div>

          {/* Hashtags */}
          {post.hashtags.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-medium text-slate-500">
                แฮชแท็ก
              </div>
              <div className="flex flex-wrap gap-1.5">
                {post.hashtags.map((tag) => (
                  <Badge key={tag} color="blue">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Image idea */}
          {post.imageIdea && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <ImageIcon className="h-3.5 w-3.5" />
                ไอเดียภาพประกอบ
              </div>
              <div className="rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 p-3 text-sm leading-relaxed text-slate-700">
                {post.imageIdea}
              </div>
            </div>
          )}

          {/* AI key prompt / error */}
          {!hasKey && (
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 transition-colors hover:bg-amber-100"
            >
              <KeyRound className="h-4 w-4 shrink-0" />
              <span>
                ยังไม่ได้ตั้งค่า API key — ตั้งค่าก่อนเพื่อให้ AI สร้างแคปชั่นใหม่ได้
              </span>
            </Link>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 p-4">
          <Button
            variant="outline"
            icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            onClick={handleCopy}
          >
            {copied ? 'คัดลอกแล้ว' : 'คัดลอกแคปชั่น'}
          </Button>
          <Button
            variant="soft"
            icon={<Sparkles className="h-4 w-4" />}
            loading={regenerating}
            disabled={!hasKey}
            onClick={handleRegenerate}
          >
            {regenerating ? 'กำลังสร้าง…' : 'สร้างแคปชั่นใหม่ด้วย AI'}
          </Button>
          {post.status === 'pending' && (
            <Button
              className="ml-auto"
              icon={<Send className="h-4 w-4" />}
              onClick={() => {
                updatePost(post.id, { status: 'scheduled' });
              }}
            >
              อนุมัติ & ลงตาราง
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

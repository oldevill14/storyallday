'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Pencil,
  Trash2,
  X,
  CalendarClock,
  Hash,
  Sparkles,
  Square,
  CheckSquare,
  Save,
} from 'lucide-react';
import clsx from 'clsx';
import type { Post } from '@/lib/types';
import { Button, Card, StatusChip, PlatformIcons } from '@/components/ui';
import {
  formatThaiDateTime,
  isoToLocalInput,
  localInputToISO,
  nextDefaultSlot,
} from './scheduling';

export type ApprovalCardProps = {
  post: Post;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Post>) => void;
  onApprove: (id: string, scheduledAt: string) => void;
  onRemove: (id: string) => void;
};

export function ApprovalCard({
  post,
  selected,
  onToggleSelect,
  onUpdate,
  onApprove,
  onRemove,
}: ApprovalCardProps) {
  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Inline-edit draft state.
  const [draftCaption, setDraftCaption] = useState(post.caption);
  const [draftTitle, setDraftTitle] = useState(post.title);
  const [draftHashtags, setDraftHashtags] = useState(post.hashtags.join(' '));

  // Schedule draft (datetime-local value).
  const [slot, setSlot] = useState(() =>
    post.scheduledAt ? isoToLocalInput(post.scheduledAt) : nextDefaultSlot()
  );

  const captionRef = useRef<HTMLTextAreaElement>(null);

  // Enter edit mode: sync drafts from the (possibly updated) post in the event
  // handler (not an effect), so there are no cascading renders.
  function startEdit() {
    setDraftCaption(post.caption);
    setDraftTitle(post.title);
    setDraftHashtags(post.hashtags.join(' '));
    setEditing(true);
  }

  // Focus + place caret once the textarea has mounted. Focusing the DOM is a
  // legitimate effect (synchronizing React state with an external system).
  useEffect(() => {
    if (!editing) return;
    const el = captionRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  function saveEdit() {
    const hashtags = draftHashtags
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));
    onUpdate(post.id, {
      title: draftTitle.trim() || post.title,
      caption: draftCaption.trim() || post.caption,
      hashtags,
    });
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function approve() {
    onApprove(post.id, localInputToISO(slot));
    setScheduling(false);
  }

  return (
    <Card
      padded={false}
      className={clsx(
        'flex flex-col overflow-hidden transition-shadow',
        selected
          ? 'border-violet-300 ring-2 ring-violet-200'
          : 'hover:shadow-md hover:border-slate-300'
      )}
    >
      {/* Visual header band — mascot/image-idea placeholder, matches reference cards */}
      <div className="relative flex items-start justify-between gap-2 bg-gradient-to-br from-violet-50 via-slate-50 to-blue-50 px-4 pb-3 pt-4">
        <button
          type="button"
          onClick={() => onToggleSelect(post.id)}
          aria-pressed={selected}
          aria-label={selected ? 'ยกเลิกการเลือก' : 'เลือกโพสต์นี้'}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
            selected
              ? 'bg-violet-600 text-white'
              : 'bg-white/80 text-slate-500 hover:bg-white hover:text-violet-600'
          )}
        >
          {selected ? (
            <CheckSquare className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
          {selected ? 'เลือกแล้ว' : 'เลือก'}
        </button>
        <StatusChip status="pending" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Title + AI badge */}
        {editing ? (
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="ชื่อโพสต์"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        ) : (
          <div className="flex items-start gap-2">
            <h3 className="line-clamp-2 flex-1 text-base font-bold leading-snug text-slate-900">
              {post.title}
            </h3>
            {post.angleId && (
              <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-600">
                <Sparkles className="h-3 w-3" />
                AI สร้าง
              </span>
            )}
          </div>
        )}

        {/* Caption — inline editable */}
        {editing ? (
          <textarea
            ref={captionRef}
            value={draftCaption}
            onChange={(e) => setDraftCaption(e.target.value)}
            rows={5}
            placeholder="แคปชั่นโพสต์…"
            className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        ) : (
          <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {post.caption}
          </p>
        )}

        {/* Hashtags */}
        {editing ? (
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
              <Hash className="h-3.5 w-3.5" />
              แฮชแท็ก (คั่นด้วยเว้นวรรค)
            </label>
            <input
              value={draftHashtags}
              onChange={(e) => setDraftHashtags(e.target.value)}
              placeholder="#คาเฟ่ #สุขภาพ"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        ) : (
          post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.hashtags.map((tag, i) => (
                <span
                  key={`${tag}-${i}`}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )
        )}

        {/* Image idea hint */}
        {!editing && post.imageIdea && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
            <span className="font-medium text-slate-500">ไอเดียภาพ: </span>
            {post.imageIdea}
          </p>
        )}

        {/* Meta: platforms + scheduled hint */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <PlatformIcons platforms={post.platforms} size={20} />
          {post.scheduledAt && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatThaiDateTime(post.scheduledAt)}
            </span>
          )}
        </div>

        {/* Scheduling drawer */}
        {scheduling && (
          <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-violet-700">
              <CalendarClock className="h-3.5 w-3.5" />
              ตั้งเวลาลงโพสต์
            </label>
            <input
              type="datetime-local"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <div className="mt-2.5 flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                icon={<X className="h-4 w-4" />}
                onClick={() => setScheduling(false)}
              >
                ยกเลิก
              </Button>
              <Button
                size="sm"
                variant="gradient"
                icon={<Check className="h-4 w-4" />}
                onClick={approve}
              >
                ยืนยันจัดตาราง
              </Button>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3 text-sm text-rose-700">
            <p className="mb-2 font-medium">ลบโพสต์นี้ถาวร?</p>
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
              >
                ไม่ลบ
              </Button>
              <Button
                size="sm"
                variant="gradient"
                className="from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/20"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => onRemove(post.id)}
              >
                ลบเลย
              </Button>
            </div>
          </div>
        )}

        {/* Action bar */}
        {!scheduling && !confirmDelete && (
          <div className="flex items-center gap-2 pt-1">
            {editing ? (
              <>
                <Button
                  size="sm"
                  variant="gradient"
                  className="flex-1"
                  icon={<Save className="h-4 w-4" />}
                  onClick={saveEdit}
                >
                  บันทึก
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<X className="h-4 w-4" />}
                  onClick={cancelEdit}
                >
                  ยกเลิก
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="gradient"
                  className="flex-1"
                  icon={<Check className="h-4 w-4" />}
                  onClick={() => setScheduling(true)}
                >
                  อนุมัติ &amp; จัดตาราง
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Pencil className="h-4 w-4" />}
                  onClick={startEdit}
                >
                  แก้ไข
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="ลบโพสต์"
                  className="text-rose-500 hover:bg-rose-50"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setConfirmDelete(true)}
                />
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

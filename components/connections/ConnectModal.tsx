'use client';

import { useEffect } from 'react';
import type { Platform } from '@/lib/types';
import { Button, Mascot, PlatformIcon, Badge } from '@/components/ui';
import { X, Sparkles, ShieldCheck, Rocket } from 'lucide-react';

const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  line: 'LINE',
};

export type ConnectModalProps = {
  /** The platform being connected, or null when the modal is closed. */
  platform: Platform | null;
  /** Whether this platform is currently connected (mock state). */
  connected: boolean;
  onClose: () => void;
  /** Toggle the mock connection (MVP demo). */
  onToggle: (platform: Platform) => void;
};

/**
 * "Coming soon" connect dialog. Real OAuth lands in the next version — for the
 * MVP this explains what will happen and offers a mock toggle so the rest of
 * the flow can be demoed end-to-end.
 */
export function ConnectModal({
  platform,
  connected,
  onClose,
  onToggle,
}: ConnectModalProps) {
  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!platform) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [platform, onClose]);

  if (!platform) return null;
  const label = PLATFORM_LABEL[platform];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`เชื่อมต่อ ${label}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div className="relative bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-7 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <PlatformIcon platform={platform} size={32} />
            </span>
            <div>
              <div className="text-xs font-medium text-white/80">เชื่อมต่อกับ</div>
              <h3 className="text-xl font-bold leading-tight">{label}</h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-6">
          <div className="flex items-start gap-3">
            <Mascot size={40} />
            <div className="min-w-0 flex-1">
              <div className="mb-1">
                <Badge color="amber" icon={<Sparkles className="h-3 w-3" />}>
                  เร็วๆ นี้ในเวอร์ชันถัดไป
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                การเชื่อมต่อ {label} แบบเป็นทางการ (OAuth) กำลังจะมาในเวอร์ชันถัดไป
                เมื่อพร้อมแล้ว Story AI จะ <span className="font-semibold text-slate-800">โพสต์ให้อัตโนมัติ</span> ตามตารางที่คุณจัดไว้
                โดยไม่ต้องก๊อปวางเอง
              </p>
            </div>
          </div>

          <ul className="space-y-2.5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <li className="flex items-start gap-2.5">
              <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              <span>โพสต์ที่อนุมัติแล้วถูกส่งขึ้น {label} ตามเวลาที่ตั้งไว้โดยอัตโนมัติ</span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span>เชื่อมต่ออย่างปลอดภัยผ่านระบบยืนยันตัวตนทางการ — เพิกถอนสิทธิ์ได้ทุกเมื่อ</span>
            </li>
          </ul>

          {/* MVP mock toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <div className="min-w-0 pr-3">
              <div className="text-sm font-semibold text-slate-800">โหมดทดลอง (Demo)</div>
              <div className="text-xs text-slate-500">
                จำลองการเชื่อมต่อเพื่อทดลองใช้งานทั้งโฟลว์
              </div>
            </div>
            <Button
              variant={connected ? 'outline' : 'soft'}
              size="sm"
              onClick={() => onToggle(platform)}
            >
              {connected ? 'ยกเลิกการจำลอง' : 'จำลองการเชื่อมต่อ'}
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="md" onClick={onClose}>
              ปิด
            </Button>
            <Button
              variant="gradient"
              size="md"
              icon={<Sparkles className="h-4 w-4" />}
              onClick={onClose}
            >
              รับทราบ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

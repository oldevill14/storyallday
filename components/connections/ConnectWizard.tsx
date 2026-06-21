'use client';

// components/connections/ConnectWizard.tsx — dead-simple "กดถัดไปไปเรื่อยๆ →
// เชื่อมต่อสำเร็จ" wizard. Designed for non-technical users: one clear action
// per step, big buttons, progress dots, no jargon.

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LogIn, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { ChannelIcon, type ChannelMeta } from './channels';

export function ConnectWizard({
  channel,
  onClose,
  onConnected,
}: {
  channel: ChannelMeta | null;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [step, setStep] = useState(0);

  // Reset to first step whenever a new channel opens.
  useEffect(() => {
    if (channel) setStep(0);
  }, [channel]);

  // Esc to close.
  useEffect(() => {
    if (!channel) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [channel, onClose]);

  if (!channel) return null;

  const steps = [
    {
      icon: <Sparkles className="h-7 w-7" />,
      title: `เชื่อมต่อ ${channel.name}`,
      body: `ทำตามแค่ 3 ขั้นตอนง่ายๆ เพียงกด “ถัดไป” ไปเรื่อยๆ ก็เชื่อมต่อเสร็จ — ไม่ต้องมีความรู้ทางเทคนิค`,
      cta: 'เริ่มเลย',
    },
    {
      icon: <LogIn className="h-7 w-7" />,
      title: `ขั้นที่ 1 · เข้าสู่ระบบ ${channel.name}`,
      body: `กดปุ่มด้านล่างเพื่อเข้าสู่ระบบบัญชี ${channel.name} ของคุณ แล้วกลับมาที่หน้านี้`,
      cta: `เข้าสู่ระบบ ${channel.name}`,
    },
    {
      icon: <ShieldCheck className="h-7 w-7" />,
      title: 'ขั้นที่ 2 · อนุญาตสิทธิ์',
      body: 'อนุญาตให้ Story AI ทำสิ่งเหล่านี้แทนคุณ:',
      checklist: [
        `โพสต์/อัปโหลดคอนเทนต์ขึ้น ${channel.name} ตามตารางที่คุณตั้งไว้`,
        'อ่านสถิติเบื้องต้นเพื่อแนะนำเวลาที่ดีที่สุด',
      ],
      cta: 'อนุญาตและเชื่อมต่อ',
    },
    {
      icon: <Check className="h-7 w-7" />,
      title: 'เชื่อมต่อสำเร็จ! 🎉',
      body: `เยี่ยมมาก! ตอนนี้ Story AI พร้อมโพสต์ขึ้น ${channel.name} ให้อัตโนมัติตามตารางในปฏิทินโพสต์แล้ว`,
      cta: 'เสร็จสิ้น',
      done: true,
    },
  ];

  const cur = steps[step];
  const last = step === steps.length - 1;

  const next = () => {
    if (last) {
      onConnected();
      onClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`relative bg-gradient-to-r ${channel.gradient} px-6 py-6 text-white`}>
          <button
            onClick={onClose}
            aria-label="ปิด"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/25">
              <ChannelIcon id={channel.id} size={30} />
            </span>
            <div>
              <div className="text-xs font-medium text-white/85">ตัวช่วยเชื่อมต่อ</div>
              <h3 className="text-lg font-bold leading-tight">{channel.name}</h3>
            </div>
          </div>
          {/* progress dots */}
          <div className="mt-4 flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <div className="flex flex-col items-center text-center">
            <span
              className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${
                cur.done ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'
              }`}
            >
              {cur.icon}
            </span>
            <h4 className="text-base font-bold text-slate-900">{cur.title}</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{cur.body}</p>
          </div>

          {cur.checklist && (
            <ul className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              {cur.checklist.map((c) => (
                <li key={c} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center gap-2">
            {step > 0 && !cur.done && (
              <Button
                variant="ghost"
                icon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                ย้อนกลับ
              </Button>
            )}
            <Button
              className="flex-1"
              variant={cur.done ? 'gradient' : 'gradient'}
              icon={cur.done ? <Check className="h-4 w-4" /> : undefined}
              onClick={next}
            >
              {cur.cta}
              {!cur.done && <ArrowRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>

          {step === 0 && (
            <p className="mt-3 text-center text-[11px] text-slate-400">
              การเผยแพร่จริงจะเริ่มทำงานหลังบัญชีผ่านการยืนยันกับแพลตฟอร์ม
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Bell, ChevronDown, Plus, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-600">
          <Sparkles className="h-3.5 w-3.5" />
          BETA
        </span>
        <span className="hidden text-sm text-slate-400 sm:inline">
          ผู้ช่วยคอนเทนต์ประจำวัน สำหรับเจ้าของเพจ
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/">
          <Button size="md" icon={<Plus className="h-4 w-4" />}>
            สร้างโพสต์ใหม่
          </Button>
        </Link>

        <button
          type="button"
          aria-label="การแจ้งเตือน"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2 text-left hover:bg-slate-50"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-white">
            <User className="h-4 w-4" />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-xs text-slate-400">เจ้าของเพจ</span>
            <span className="block text-sm font-medium text-slate-700">Test</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </header>
  );
}

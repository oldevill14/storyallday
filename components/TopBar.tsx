'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, Plus, Sparkles, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';

export function TopBar() {
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account menu on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const email = user?.email ?? '';
  const displayName = user?.displayName ?? email.split('@')[0] ?? 'ผู้ใช้งาน';
  const photoURL = user?.photoURL ?? null;

  async function handleSignOut() {
    setOpen(false);
    try {
      await signOutUser();
      router.replace('/login');
    } catch {
      // signOut rarely fails; the AuthGate will also redirect on state change.
    }
  }

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

        {/* Account menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2 text-left hover:bg-slate-50"
          >
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoURL}
                alt={displayName}
                className="h-7 w-7 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-white">
                <User className="h-4 w-4" />
              </span>
            )}
            <span className="hidden max-w-[160px] leading-tight sm:block">
              <span className="block truncate text-sm font-medium text-slate-700">
                {displayName}
              </span>
              <span className="block truncate text-xs text-slate-400">{email}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="truncate text-sm font-medium text-slate-700">
                  {displayName}
                </div>
                <div className="truncate text-xs text-slate-400">{email}</div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

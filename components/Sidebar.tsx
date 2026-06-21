'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  Home,
  Sparkles,
  Clock,
  CalendarDays,
  Library,
  Tag,
  Plug,
  Settings2,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useStore } from '@/lib/store';
import { Mascot } from '@/components/ui/Mascot';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<LucideProps>;
  /** Which live count to show as a badge, if any. */
  badge?: 'total' | 'pending';
};

const NAV: NavItem[] = [
  { href: '/', label: 'หน้าแรก / AI แนะนำ', icon: Home, badge: 'total' },
  { href: '/approvals', label: 'รออนุมัติ', icon: Clock, badge: 'pending' },
  { href: '/calendar', label: 'ปฏิทินโพสต์', icon: CalendarDays },
  { href: '/library', label: 'คลังโพสต์', icon: Library },
  { href: '/brand', label: 'แบรนด์ของฉัน', icon: Tag },
  { href: '/connections', label: 'การเชื่อมต่อ', icon: Plug },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings2 },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export function Sidebar() {
  const pathname = usePathname();
  const posts = useStore((s) => s.posts);

  const totalCount = posts.length;
  const pendingCount = posts.filter((p) => p.status === 'pending').length;

  const badgeValue = (item: NavItem): number | null => {
    if (item.badge === 'total') return totalCount;
    if (item.badge === 'pending') return pendingCount;
    return null;
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <Mascot size={40} />
        <div>
          <div className="text-lg font-bold leading-tight">
            <span className="text-slate-900">Story</span>{' '}
            <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              AI
            </span>
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
            <Sparkles className="h-3 w-3" />
            ช่วงเปิดตัว · BETA
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          const count = badgeValue(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-gradient-to-r from-violet-50 to-blue-50 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon
                className={clsx(
                  'h-[18px] w-[18px] shrink-0',
                  active ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {count !== null && count > 0 && (
                <span
                  className={clsx(
                    'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                    active
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 px-5 py-4">
        <p className="text-[11px] leading-relaxed text-slate-400">
          ผู้ช่วยคอนเทนต์ AI สำหรับเจ้าของเพจ
        </p>
      </div>
    </aside>
  );
}

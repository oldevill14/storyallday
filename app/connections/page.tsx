'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Platform } from '@/lib/types';
import { useStore, useHydrated } from '@/lib/store';
import {
  PageHeader,
  Card,
  Badge,
  Button,
  StatCard,
  Mascot,
  Spinner,
} from '@/components/ui';
import { PlatformCard } from '@/components/connections/PlatformCard';
import { ConnectModal } from '@/components/connections/ConnectModal';
import {
  Link2,
  Sparkles,
  CalendarClock,
  Send,
  ShieldCheck,
  PlugZap,
  Clock3,
  CheckCheck,
} from 'lucide-react';

type PlatformDef = {
  platform: Platform;
  name: string;
  description: string;
  benefits: string[];
};

const PLATFORMS: PlatformDef[] = [
  {
    platform: 'facebook',
    name: 'Facebook',
    description:
      'เชื่อมต่อเพจ Facebook เพื่อให้ Story AI โพสต์คอนเทนต์ที่อนุมัติแล้วขึ้นเพจให้อัตโนมัติตามตารางที่จัดไว้',
    benefits: [
      'โพสต์ขึ้นเพจตามเวลาที่ตั้งไว้ ไม่ต้องก๊อปวางเอง',
      'รองรับรูปภาพและแคปชั่นพร้อมแฮชแท็ก',
    ],
  },
  {
    platform: 'instagram',
    name: 'Instagram',
    description:
      'เชื่อมต่อบัญชี Instagram (Business) เพื่อเผยแพร่ฟีดและภาพคารูเซลที่ Story AI สร้างให้โดยอัตโนมัติ',
    benefits: [
      'เผยแพร่ฟีด/คารูเซลตามแผนคอนเทนต์',
      'จัดคิวโพสต์ในช่วงเวลาที่คนไทยมีปฏิสัมพันธ์สูง',
    ],
  },
  {
    platform: 'line',
    name: 'LINE',
    description:
      'เชื่อมต่อ LINE Official Account เพื่อส่งบรอดแคสต์คอนเทนต์ถึงผู้ติดตามได้อย่างสะดวกในที่เดียว',
    benefits: [
      'ส่งบรอดแคสต์ถึงผู้ติดตามได้ทันที',
      'จัดการคอนเทนต์ทุกแพลตฟอร์มจากหน้าจอเดียว',
    ],
  },
];

export default function ConnectionsPage() {
  const hydrated = useHydrated();
  const posts = useStore((s) => s.posts);

  // MVP: connection status is mock-only (not in the persisted schema).
  const [connections, setConnections] = useState<Record<Platform, boolean>>({
    facebook: false,
    instagram: false,
    line: false,
  });
  const [modalPlatform, setModalPlatform] = useState<Platform | null>(null);

  const connectedCount = useMemo(
    () => Object.values(connections).filter(Boolean).length,
    [connections]
  );

  // Posts waiting to go out once a real connection exists.
  const queuedCount = useMemo(
    () =>
      posts.filter((p) => p.status === 'scheduled' || p.status === 'pending')
        .length,
    [posts]
  );

  const openConnect = (platform: Platform) => setModalPlatform(platform);

  const disconnect = (platform: Platform) =>
    setConnections((c) => ({ ...c, [platform]: false }));

  const toggleMock = (platform: Platform) =>
    setConnections((c) => ({ ...c, [platform]: !c[platform] }));

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="กำลังโหลด…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Badge color="violet" icon={<PlugZap className="h-3 w-3" />}>
            การเชื่อมต่อแพลตฟอร์ม
          </Badge>
        }
        title="การเชื่อมต่อแพลตฟอร์ม"
        subtitle="เชื่อมต่อช่องทางโซเชียลของคุณ แล้วให้ Story AI โพสต์ให้อัตโนมัติตามตารางที่จัดไว้"
        action={
          <Button variant="outline" icon={<ShieldCheck className="h-4 w-4" />} disabled>
            จัดการสิทธิ์ (เร็วๆ นี้)
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Link2}
          color="violet"
          value={`${connectedCount}/3`}
          label="ช่องทางที่เชื่อมต่อ"
          caption="Facebook · Instagram · LINE"
        />
        <StatCard
          icon={CalendarClock}
          color="amber"
          value={queuedCount}
          label="โพสต์รอเผยแพร่"
          caption="รออนุมัติ + ลงตารางแล้ว"
        />
        <StatCard
          icon={Send}
          color="emerald"
          value={connectedCount > 0 ? 'พร้อม' : 'ปิดอยู่'}
          label="โพสต์อัตโนมัติ"
          caption={connectedCount > 0 ? 'มีช่องทางพร้อมใช้งาน' : 'ยังไม่ได้เชื่อมต่อ'}
        />
      </div>

      {/* Mascot banner — explains auto-posting */}
      <Card className="overflow-hidden bg-gradient-to-r from-violet-50 to-blue-50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Mascot size={56} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                เชื่อมแล้วโพสต์ได้อัตโนมัติ
              </h2>
              <Badge color="blue" icon={<Sparkles className="h-3 w-3" />}>
                ออโต้
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              เมื่อเชื่อมต่อช่องทางแล้ว โพสต์ที่คุณกด “อนุมัติ” จะถูกส่งขึ้นแพลตฟอร์มตามวันและเวลาที่จัดไว้ในปฏิทินโพสต์โดยอัตโนมัติ
              — ไม่ต้องก๊อปวางเอง ไม่พลาดช่วงเวลาทอง
            </p>
          </div>
          <Link href="/calendar" className="shrink-0">
            <Button variant="soft" icon={<CalendarClock className="h-4 w-4" />}>
              ดูปฏิทินโพสต์
            </Button>
          </Link>
        </div>
      </Card>

      {/* Platform cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLATFORMS.map((p) => (
          <PlatformCard
            key={p.platform}
            platform={p.platform}
            name={p.name}
            description={p.description}
            benefits={p.benefits}
            connected={connections[p.platform]}
            onConnect={openConnect}
            onDisconnect={disconnect}
          />
        ))}
      </div>

      {/* How auto-posting works */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <h3 className="text-base font-bold text-slate-900">
            โพสต์อัตโนมัติทำงานอย่างไร
          </h3>
        </div>
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Step
            n={1}
            icon={<Link2 className="h-4 w-4" />}
            title="เชื่อมต่อช่องทาง"
            desc="กด “เชื่อมต่อ” แล้วยืนยันสิทธิ์กับแพลตฟอร์ม (เปิดให้ใช้งานเวอร์ชันถัดไป)"
          />
          <Step
            n={2}
            icon={<CheckCheck className="h-4 w-4" />}
            title="อนุมัติคอนเทนต์"
            desc="ตรวจและกดอนุมัติโพสต์ที่ Story AI ร่างให้ในหน้า “รออนุมัติ”"
          />
          <Step
            n={3}
            icon={<Clock3 className="h-4 w-4" />}
            title="ระบบโพสต์ให้เอง"
            desc="โพสต์ถูกส่งขึ้นแพลตฟอร์มตามวัน-เวลาในปฏิทินโดยอัตโนมัติ"
          />
        </ol>
      </Card>

      <ConnectModal
        platform={modalPlatform}
        connected={modalPlatform ? connections[modalPlatform] : false}
        onClose={() => setModalPlatform(null)}
        onToggle={toggleMock}
      />
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  desc,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-blue-600 text-xs font-bold text-white">
          {n}
        </span>
        <span className="text-violet-600">{icon}</span>
      </div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
    </li>
  );
}

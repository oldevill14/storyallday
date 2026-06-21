'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useStore, useHydrated } from '@/lib/store';
import { useConnections, type ChannelId } from '@/lib/connections';
import {
  PageHeader,
  Card,
  Badge,
  Button,
  StatCard,
  Mascot,
  Spinner,
} from '@/components/ui';
import { CHANNELS, ChannelIcon, getChannel } from '@/components/connections/channels';
import { ConnectWizard } from '@/components/connections/ConnectWizard';
import {
  Link2,
  Sparkles,
  CalendarClock,
  Send,
  PlugZap,
  CheckCircle2,
  Circle,
  Unlink,
  MousePointerClick,
} from 'lucide-react';

export default function ConnectionsPage() {
  const hydrated = useHydrated();
  const posts = useStore((s) => s.posts);
  const connected = useConnections((s) => s.connected);
  const connect = useConnections((s) => s.connect);
  const disconnect = useConnections((s) => s.disconnect);

  // localStorage-backed connections resolve on the client only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [wizard, setWizard] = useState<ChannelId | null>(null);

  const connectedCount = useMemo(
    () => CHANNELS.filter((c) => connected[c.id]).length,
    [connected]
  );
  const queuedCount = useMemo(
    () => posts.filter((p) => p.status === 'scheduled' || p.status === 'pending').length,
    [posts]
  );

  if (!hydrated || !mounted) {
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
        subtitle="เชื่อมต่อช่องทางของคุณแบบกด “ถัดไป” ไปเรื่อยๆ — ใช้ง่าย ไม่ต้องมีความรู้ทางเทคนิค"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Link2}
          color="violet"
          value={`${connectedCount}/${CHANNELS.length}`}
          label="ช่องทางที่เชื่อมต่อ"
          caption="FB · IG · LINE · TikTok · YouTube · Shopee"
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

      {/* Banner */}
      <Card className="overflow-hidden bg-gradient-to-r from-violet-50 to-blue-50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Mascot size={56} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">เชื่อมง่ายแค่กด “ถัดไป”</h2>
              <Badge color="blue" icon={<MousePointerClick className="h-3 w-3" />}>
                3 ขั้นตอน
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              เลือกช่องทางแล้วกด “เชื่อมต่อ” ระบบจะพาคุณทีละขั้น — เข้าสู่ระบบ → อนุญาตสิทธิ์ → เสร็จ
              จากนั้นโพสต์ที่อนุมัติแล้วจะถูกส่งขึ้นช่องทางตามตารางให้อัตโนมัติ
            </p>
          </div>
          <Link href="/calendar" className="shrink-0">
            <Button variant="soft" icon={<CalendarClock className="h-4 w-4" />}>
              ดูปฏิทินโพสต์
            </Button>
          </Link>
        </div>
      </Card>

      {/* Channel cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHANNELS.map((c) => {
          const isOn = !!connected[c.id];
          return (
            <Card key={c.id} hoverable className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${c.iconBg} ring-1 ring-slate-100`}>
                  <ChannelIcon id={c.id} size={32} />
                </span>
                <div>
                  <div className="text-base font-bold text-slate-900">{c.name}</div>
                  {isOn ? (
                    <Badge color="emerald" icon={<CheckCircle2 className="h-3 w-3" />}>
                      เชื่อมต่อแล้ว
                    </Badge>
                  ) : (
                    <Badge color="slate" icon={<Circle className="h-3 w-3" />}>
                      ยังไม่เชื่อมต่อ
                    </Badge>
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm font-medium text-slate-700">{c.tagline}</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                {c.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 pt-1">
                {isOn ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    icon={<Unlink className="h-4 w-4" />}
                    onClick={() => disconnect(c.id)}
                  >
                    ตัดการเชื่อมต่อ
                  </Button>
                ) : (
                  <Button
                    variant="gradient"
                    className="w-full"
                    icon={<Link2 className="h-4 w-4" />}
                    onClick={() => setWizard(c.id)}
                  >
                    เชื่อมต่อ
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <ConnectWizard
        channel={wizard ? getChannel(wizard) : null}
        onClose={() => setWizard(null)}
        onConnected={() => wizard && connect(wizard)}
      />
    </div>
  );
}

'use client';

import Link from 'next/link';
import {
  Newspaper,
  Building2,
  ThumbsUp,
  CheckCheck,
  Radio,
  Plus,
  ChevronRight,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Card } from '@/components/ui';
import type { Brand } from '@/lib/types';

type SourceRow = {
  icon: ComponentType<LucideProps>;
  title: string;
  note: string;
  cta: string;
  href: string;
};

export type AnalysisPanelProps = {
  brand: Brand;
  /** Count of posts that performed well (published) for the social-proof line. */
  publishedCount: number;
  /** Count of approval decisions observed (pending + scheduled + published). */
  decisionCount: number;
};

/** Right-column summary: the data sources the AI uses to reason. */
export function AnalysisPanel({ brand, publishedCount, decisionCount }: AnalysisPanelProps) {
  const rows: SourceRow[] = [
    {
      icon: Newspaper,
      title: 'เทรนด์ & ข่าวสาร',
      note: 'อัปเดตทุกวันจากกระแสโซเชียลและข่าวที่เกี่ยวกับธุรกิจคุณ',
      cta: 'อัปเดตล่าสุด',
      href: '/connections',
    },
    {
      icon: Building2,
      title: 'ข้อมูลธุรกิจคุณ',
      note: `${brand.name} · ${brand.business}`,
      cta: 'ปรับข้อมูลแบรนด์',
      href: '/brand',
    },
    {
      icon: ThumbsUp,
      title: 'โพสต์ที่เคยลงผลดี',
      note:
        publishedCount > 0
          ? `เรียนรู้จาก ${publishedCount} โพสต์ที่เผยแพร่แล้ว ว่าแบบไหนได้ผล`
          : 'ยังไม่มีโพสต์ที่เผยแพร่ — AI จะเรียนรู้เพิ่มเมื่อเริ่มลงโพสต์',
      cta: 'ดูโพสต์ที่ลงแล้ว',
      href: '/library',
    },
    {
      icon: CheckCheck,
      title: 'พฤติกรรมการอนุมัติของคุณ',
      note:
        decisionCount > 0
          ? `วิเคราะห์จาก ${decisionCount} การตัดสินใจ เพื่อเสนอมุมที่คุณมักอนุมัติ`
          : 'AI จะเรียนรู้สไตล์ที่คุณชอบจากการอนุมัติของคุณ',
      cta: 'ดูที่รออนุมัติ',
      href: '/approvals',
    },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Radio className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">ข้อมูลที่ AI ใช้วิเคราะห์</h2>
            <p className="text-xs text-slate-400">4 แหล่งข้อมูลที่ทำให้คำแนะนำแม่นยำขึ้น</p>
          </div>
        </div>

        <ul className="space-y-1">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <li key={row.title}>
                <Link
                  href={row.href}
                  className="group flex gap-3 rounded-xl p-2.5 transition-colors hover:bg-slate-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-violet-50 group-hover:text-violet-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">{row.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      {row.note}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-violet-600">
                      {row.cta}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* News sources card — matches the "แหล่งข่าวของเพจ" tile in the reference. */}
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Newspaper className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">แหล่งข่าวของเพจ</h2>
              <p className="text-xs text-slate-400">ใช้อยู่ 5 แหล่ง</p>
            </div>
          </div>
          <Link
            href="/connections"
            aria-label="เพิ่มแหล่งข่าว"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-violet-600"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          เพิ่มเพจ/เว็บที่คุณติดตาม เพื่อให้ AI เกาะกระแสและเสนอมุมที่สดใหม่ตรงกับกลุ่มเป้าหมายของคุณ
        </p>
      </Card>
    </div>
  );
}

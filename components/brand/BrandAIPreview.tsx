'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Lightbulb,
  KeyRound,
  AlertCircle,
  Wand2,
  CheckCircle2,
} from 'lucide-react';
import type { Brand } from '@/lib/types';
import { useStore } from '@/lib/store';
import { suggestAngles } from '@/lib/ai';
import {
  Card,
  Button,
  Badge,
  Mascot,
  ConfidenceBar,
  Spinner,
} from '@/components/ui';

export type BrandAIPreviewProps = {
  /** The live (possibly unsaved) brand draft to preview. */
  brand: Brand;
  /** Whether the form has unsaved edits — shown as a hint. */
  dirty?: boolean;
};

/**
 * Shows how the brand profile is turned into the prompt block the AI receives,
 * and lets the user run a live `suggestAngles` test using store settings.
 */
export function BrandAIPreview({ brand, dirty = false }: BrandAIPreviewProps) {
  const settings = useStore((s) => s.settings);
  const addAngles = useStore((s) => s.addAngles);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<
    { title: string; category: string; confidence: number }[] | null
  >(null);

  const hasKey = settings.apiKey.trim().length > 0;

  const promptLines: { label: string; value: string }[] = [
    { label: 'ชื่อแบรนด์', value: brand.name || '—' },
    { label: 'ธุรกิจ', value: brand.business || '—' },
    { label: 'โทนเสียง', value: brand.tone || '—' },
    { label: 'ภาษา', value: brand.language || '—' },
    { label: 'กลุ่มเป้าหมาย', value: brand.audience || '—' },
    {
      label: 'คีย์เวิร์ด',
      value: brand.keywords.length ? brand.keywords.join(', ') : '—',
    },
  ];

  async function runPreview() {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const angles = await suggestAngles(brand, settings);
      // store the freshly generated angles so they show up on the dashboard…
      addAngles(angles);
      // …and keep a light copy for the inline preview.
      setPreview(
        angles.map((a) => ({
          title: a.title,
          category: a.category,
          confidence: a.confidence,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด ลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* How the AI reads the brand */}
      <Card className="space-y-4">
        <div className="flex items-start gap-3">
          <Mascot size={44} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                AI จะใช้ข้อมูลนี้ยังไง
              </h3>
              <Badge color="violet" icon={<Sparkles className="h-3 w-3" />}>
                พรอมต์
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              ทุกครั้งที่ให้ AI คิดมุมหรือเขียนแคปชั่น ระบบจะแนบโปรไฟล์แบรนด์นี้ไปด้วย
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            ข้อมูลที่แนบไปกับ AI
          </div>
          <dl className="space-y-1.5">
            {promptLines.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[7rem_1fr] gap-2 text-sm"
              >
                <dt className="text-slate-400">{row.label}</dt>
                <dd className="min-w-0 break-words font-medium text-slate-700">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-slate-600">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              ใช้ตอน{' '}
              <span className="font-medium text-slate-800">แนะนำมุมคอนเทนต์</span>{' '}
              เพื่อเลือกหัวข้อที่ตรงกลุ่มเป้าหมายและเกาะเทรนด์
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm text-slate-600">
            <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
            <span>
              ใช้ตอน{' '}
              <span className="font-medium text-slate-800">ร่างโพสต์</span>{' '}
              เพื่อคุมโทนเสียง ภาษา และเลือกคำให้เข้ากับแบรนด์
            </span>
          </li>
        </ul>
      </Card>

      {/* Live test */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">
              ลองให้ AI แนะนำมุม
            </h3>
            <p className="text-sm text-slate-500">
              ทดสอบจากข้อมูลแบรนด์ {dirty ? '(ฉบับที่กำลังแก้)' : 'ที่บันทึกไว้'}
            </p>
          </div>
          {hasKey && (
            <Button
              size="sm"
              onClick={runPreview}
              loading={loading}
              icon={<Sparkles className="h-4 w-4" />}
            >
              {loading ? 'กำลังคิด…' : 'ลองเลย'}
            </Button>
          )}
        </div>

        {!hasKey && (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                ยังไม่ได้ตั้งค่า API key — เพิ่มกุญแจก่อนเพื่อให้ AI ทำงานได้
              </p>
            </div>
            <Link href="/settings" className="shrink-0">
              <Button size="sm" variant="soft">
                ไปที่ตั้งค่า
              </Button>
            </Link>
          </div>
        )}

        {hasKey && loading && (
          <div className="flex justify-center py-6">
            <Spinner label="AI กำลังคิดมุมคอนเทนต์…" />
          </div>
        )}

        {hasKey && error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <div className="text-sm text-rose-700">
              <div className="font-medium">เรียก AI ไม่สำเร็จ</div>
              <div className="text-rose-600">{error}</div>
            </div>
          </div>
        )}

        {hasKey && !loading && preview && preview.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              ได้ {preview.length} มุม — เพิ่มเข้าหน้า “AI แนะนำ” แล้ว
            </div>
            {preview.map((a, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-3.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-slate-800">
                    {a.title}
                  </span>
                  <Badge color="blue">{a.category}</Badge>
                </div>
                <ConfidenceBar value={a.confidence} />
              </div>
            ))}
          </div>
        )}

        {hasKey && !loading && !preview && !error && (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            กด“ลองเลย” เพื่อให้ AI สร้างมุมคอนเทนต์ตัวอย่างจากแบรนด์ของคุณ
          </p>
        )}
      </Card>
    </div>
  );
}

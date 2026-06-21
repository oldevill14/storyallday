'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Store,
  Briefcase,
  Smile,
  Languages,
  Users,
  Tag,
  Save,
  RotateCcw,
  CheckCircle2,
  BadgeCheck,
} from 'lucide-react';
import type { Brand } from '@/lib/types';
import { useStore, useHydrated } from '@/lib/store';
import { PageHeader, Card, Button, Badge, Spinner } from '@/components/ui';
import { Field, TextField, TextAreaField } from '@/components/brand/Field';
import { KeywordInput } from '@/components/brand/KeywordInput';
import { BrandAIPreview } from '@/components/brand/BrandAIPreview';

function brandsEqual(a: Brand, b: Brand): boolean {
  return (
    a.name === b.name &&
    a.business === b.business &&
    a.tone === b.tone &&
    a.language === b.language &&
    a.audience === b.audience &&
    a.keywords.length === b.keywords.length &&
    a.keywords.every((k, i) => k === b.keywords[i])
  );
}

export default function BrandPage() {
  const hydrated = useHydrated();
  const brand = useStore((s) => s.brand);
  const setBrand = useStore((s) => s.setBrand);

  // Local draft so edits don't write to the store until "บันทึก".
  const [draft, setDraft] = useState<Brand>(brand);
  const [saved, setSaved] = useState(false);

  // Re-seed the draft from the store the moment persisted state hydrates in.
  // Adjusting state during render (with a prev-value tracker) avoids the
  // cascading renders that a setState-in-effect would cause.
  const [seededHydrated, setSeededHydrated] = useState(hydrated);
  if (hydrated && !seededHydrated) {
    setSeededHydrated(true);
    setDraft(brand);
  }

  const dirty = useMemo(() => !brandsEqual(draft, brand), [draft, brand]);

  function update<K extends keyof Brand>(key: K, value: Brand[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setBrand(draft);
    setSaved(true);
  }

  function handleReset() {
    setDraft(brand);
    setSaved(false);
  }

  // Clear the "saved" flash after a moment.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="กำลังโหลดโปรไฟล์แบรนด์…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Badge color="violet" icon={<BadgeCheck className="h-3 w-3" />}>
            โปรไฟล์แบรนด์
          </Badge>
        }
        title="แบรนด์ของฉัน"
        subtitle="ตั้งค่าตัวตนของเพจ เพื่อให้ AI คิดมุมและเขียนแคปชั่นได้ตรงใจมากขึ้น"
        action={
          <>
            <Button
              variant="outline"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={handleReset}
              disabled={!dirty}
            >
              ยกเลิก
            </Button>
            <Button
              icon={<Save className="h-4 w-4" />}
              onClick={handleSave}
              disabled={!dirty}
            >
              บันทึก
            </Button>
          </>
        }
      />

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          บันทึกโปรไฟล์แบรนด์เรียบร้อยแล้ว — AI จะใช้ข้อมูลนี้ตั้งแต่ตอนนี้
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Form */}
        <Card className="space-y-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              ข้อมูลแบรนด์
            </h2>
            {dirty && (
              <Badge color="amber">มีการแก้ไขที่ยังไม่บันทึก</Badge>
            )}
          </div>

          <Field
            label="ชื่อแบรนด์"
            htmlFor="brand-name"
            icon={<Store className="h-4 w-4" />}
            required
            hint="ชื่อเพจหรือร้านที่ลูกค้าเห็น"
          >
            <TextField
              id="brand-name"
              value={draft.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="เช่น คาเฟ่ใบเตย"
            />
          </Field>

          <Field
            label="ประเภทธุรกิจ"
            htmlFor="brand-business"
            icon={<Briefcase className="h-4 w-4" />}
            hint="คุณขายอะไร / ทำธุรกิจแบบไหน"
          >
            <TextField
              id="brand-business"
              value={draft.business}
              onChange={(e) => update('business', e.target.value)}
              placeholder="เช่น ร้านกาแฟและเครื่องดื่มเพื่อสุขภาพ (SME)"
            />
          </Field>

          <Field
            label="โทน / บุคลิกของแบรนด์"
            htmlFor="brand-tone"
            icon={<Smile className="h-4 w-4" />}
            hint="น้ำเสียงที่อยากให้คอนเทนต์ออกมา"
          >
            <TextField
              id="brand-tone"
              value={draft.tone}
              onChange={(e) => update('tone', e.target.value)}
              placeholder="เช่น เป็นกันเอง อบอุ่น ใส่ใจสุขภาพ"
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="ภาษา"
              htmlFor="brand-language"
              icon={<Languages className="h-4 w-4" />}
            >
              <TextField
                id="brand-language"
                value={draft.language}
                onChange={(e) => update('language', e.target.value)}
                placeholder="เช่น ไทย"
              />
            </Field>
          </div>

          <Field
            label="กลุ่มเป้าหมาย"
            htmlFor="brand-audience"
            icon={<Users className="h-4 w-4" />}
            hint="ใครคือลูกค้าหลักที่อยากสื่อสารด้วย"
          >
            <TextAreaField
              id="brand-audience"
              rows={3}
              value={draft.audience}
              onChange={(e) => update('audience', e.target.value)}
              placeholder="เช่น คนทำงานวัย 25-40 ในเมือง ที่รักสุขภาพและชอบคาเฟ่"
            />
          </Field>

          <Field
            label="คีย์เวิร์ด"
            icon={<Tag className="h-4 w-4" />}
          >
            <KeywordInput
              value={draft.keywords}
              onChange={(next) => update('keywords', next)}
            />
          </Field>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              variant="ghost"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={handleReset}
              disabled={!dirty}
            >
              ยกเลิก
            </Button>
            <Button
              icon={<Save className="h-4 w-4" />}
              onClick={handleSave}
              disabled={!dirty}
            >
              บันทึกแบรนด์
            </Button>
          </div>
        </Card>

        {/* AI preview — uses the live draft so users see the effect before saving */}
        <div className="lg:col-span-2">
          <BrandAIPreview brand={draft} dirty={dirty} />
        </div>
      </div>
    </div>
  );
}

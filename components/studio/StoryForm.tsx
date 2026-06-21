'use client';

import Link from 'next/link';
import {
  Clapperboard,
  ImageIcon,
  Megaphone,
  Package,
  Sparkles,
  Upload,
  Users,
  Wand2,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { fileToResizedDataUrl } from '@/lib/image';
import {
  SALES_STYLES,
  SALES_STYLE_META,
  STYLE_LABELS,
  VISUAL_STYLES,
  type SalesStyle,
  type StudioForm,
  type VisualStyle,
} from './types';

export type CastOption = { id: string; name: string; style?: string };

type Props = {
  form: StudioForm;
  onChange: (patch: Partial<StudioForm>) => void;
  onGenerate: () => void;
  generating: boolean;
  /** Whether an AI key is configured (gates the generate button + shows notice). */
  hasKey: boolean;
  /** Ask the AI to draft the topic/concept (from the title). */
  onAutoTopic: () => void;
  autoTopicLoading: boolean;
  /** Sales mode shows product + selling-style + cast; drama mode hides them. */
  salesMode: boolean;
  /** Reusable characters to pick from (from /characters). */
  characters: CastOption[];
  selectedIds: string[];
  onToggleCharacter: (id: string) => void;
};

const COUNT_OPTS: Array<1 | 3 | 5> = [1, 3, 5];

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 ' +
  'focus:ring-violet-200 transition-colors';

function CountPicker({
  label,
  value,
  onPick,
}: {
  label: string;
  value: 1 | 3 | 5;
  onPick: (v: 1 | 3 | 5) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        {COUNT_OPTS.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onPick(n)}
              className={
                'min-w-[3rem] rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ' +
                (active
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700')
              }
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StoryForm({
  form,
  onChange,
  onGenerate,
  generating,
  hasKey,
  onAutoTopic,
  autoTopicLoading,
  salesMode,
  characters,
  selectedIds,
  onToggleCharacter,
}: Props) {
  const canGenerate = hasKey && form.topic.trim().length > 0 && !generating;

  return (
    <Card className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white">
          <Clapperboard className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">ตั้งค่าเรื่อง</h2>
          <p className="text-xs text-slate-500">
            กำหนดหัวข้อ จำนวนตอน/ฉาก และสไตล์ภาพ แล้วให้ AI แตกเป็นบท + prompt
          </p>
        </div>
      </div>

      {/* Title + topic */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label htmlFor="drama-title" className="mb-1.5 block text-sm font-medium text-slate-700">
            ชื่อเรื่อง <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
          </label>
          <input
            id="drama-title"
            type="text"
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="เช่น รักในร้านกาแฟริมทาง"
            className={inputBase}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="drama-topic" className="block text-sm font-medium text-slate-700">
              หัวข้อ / แนวคิด <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={onAutoTopic}
              disabled={!hasKey || autoTopicLoading}
              title={!hasKey ? 'ตั้งค่า API Key ก่อน' : 'ให้ AI คิดหัวข้อจากชื่อเรื่อง'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50"
            >
              {autoTopicLoading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
                  กำลังคิด…
                </>
              ) : (
                <>
                  <Wand2 className="h-3.5 w-3.5" /> ให้ AI คิดให้
                </>
              )}
            </button>
          </div>
          <textarea
            id="drama-topic"
            rows={4}
            value={form.topic}
            onChange={(e) => onChange({ topic: e.target.value })}
            placeholder="อธิบายเรื่องที่อยากเล่า เช่น พนักงานออฟฟิศวัย 28 ค้นพบว่าเจ้านายคือรักเก่าสมัยมหาลัย…"
            className={inputBase + ' resize-y leading-relaxed'}
          />
          <p className="mt-1.5 text-xs text-slate-400">
            ยิ่งระบุละเอียด (ตัวละคร อารมณ์ ฉากจบ) บทที่ได้ยิ่งตรงใจ
          </p>
        </div>
      </div>

      {salesMode && (
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        {/* Product to sell */}
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Package className="h-4 w-4 text-violet-600" /> สินค้าที่จะขาย{' '}
          <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
        </label>
        <input
          type="text"
          value={form.productName}
          onChange={(e) => onChange({ productName: e.target.value })}
          placeholder="เช่น เซรั่มบำรุงผิวหน้า Glow Booster"
          className={inputBase}
        />
        <textarea
          rows={2}
          value={form.productDetail}
          onChange={(e) => onChange({ productDetail: e.target.value })}
          placeholder="จุดเด่น / ราคา / โปรโมชัน เช่น ลดเลือนริ้วรอยใน 7 วัน · ขวดละ 590฿ · ซื้อ 2 แถม 1"
          className={inputBase + ' mt-2 resize-y leading-relaxed'}
        />
        <p className="mt-1.5 text-xs text-slate-400">
          ระบบจะร้อยสินค้านี้เข้าไปในทุกฉาก + พรอมต์ภาพ/วิดีโอให้อัตโนมัติ
        </p>

        {/* Product image (vision: ให้ AI คิดหัวข้อจากรูป) */}
        <div className="mt-3">
          <span className="mb-1 block text-xs font-medium text-slate-500">
            รูปสินค้า (ไม่บังคับ) — ใช้ให้ AI “เห็น” แล้วคิดหัวข้อจากรูปได้
          </span>
          <div className="flex items-center gap-3">
            {form.productImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.productImage}
                alt="product"
                className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-300">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            <div className="flex flex-col items-start gap-1.5">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                {form.productImage ? 'เปลี่ยนรูป' : 'อัปโหลดรูปสินค้า'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      try {
                        onChange({ productImage: await fileToResizedDataUrl(f) });
                      } catch {
                        /* ignore decode errors */
                      }
                    }
                    e.target.value = '';
                  }}
                />
              </label>
              {form.productImage && (
                <button
                  type="button"
                  onClick={() => onChange({ productImage: undefined })}
                  className="text-xs font-medium text-rose-600 hover:underline"
                >
                  ลบรูป
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sales style */}
        <div className="mt-4 border-t border-slate-200/70 pt-3">
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Megaphone className="h-4 w-4 text-violet-600" /> สไตล์การขาย
          </label>
          <div className="flex flex-wrap gap-2">
            {SALES_STYLES.map((s: SalesStyle) => {
              const meta = SALES_STYLE_META[s];
              const active = form.salesStyle === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ salesStyle: s })}
                  className={
                    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors ' +
                    (active
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-violet-50 hover:text-violet-700')
                  }
                >
                  {meta.emoji} {meta.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {SALES_STYLE_META[form.salesStyle].instruction}
          </p>
        </div>
      </div>
      )}

      {/* Cast (reusable characters) — available in both โหมด */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Users className="h-4 w-4 text-violet-600" /> ตัวละครในคลิป{' '}
            <span className="font-normal text-slate-400">(เลือกได้หลายตัว)</span>
          </label>
          <Link href="/characters" className="text-xs font-medium text-violet-600 hover:underline">
            + จัดการตัวละคร
          </Link>
        </div>
        {characters.length === 0 ? (
          <p className="text-sm text-slate-400">
            ยังไม่มีตัวละคร —{' '}
            <Link href="/characters" className="font-medium text-violet-600 hover:underline">
              ไปสร้างตัวละคร
            </Link>{' '}
            แล้วกลับมาเลือกใช้ได้เลย
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {characters.map((c) => {
              const active = selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggleCharacter(c.id)}
                  className={
                    'rounded-full px-3 py-1.5 text-sm font-medium transition-colors ' +
                    (active
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-violet-50 hover:text-violet-700')
                  }
                >
                  {active ? '✓ ' : ''}
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Counts */}
      <div className="flex flex-wrap gap-6">
        <CountPicker
          label="จำนวนตอน"
          value={form.episodeCount}
          onPick={(v) => onChange({ episodeCount: v })}
        />
        <CountPicker
          label="ฉากต่อตอน"
          value={form.scenesPerEpisode}
          onPick={(v) => onChange({ scenesPerEpisode: v })}
        />
      </div>

      {/* Style */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">สไตล์ภาพ</label>
        <div className="flex flex-wrap gap-2">
          {VISUAL_STYLES.map((s: VisualStyle) => {
            const active = form.style === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onChange({ style: s })}
                className={
                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ' +
                  (active
                    ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700')
                }
              >
                {STYLE_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Aspect ratio */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">อัตราส่วน</label>
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {([
            ['9:16', 'แนวตั้ง', 'h-4 w-[9px]'],
            ['16:9', 'แนวนอน', 'h-[9px] w-4'],
          ] as const).map(([r, label, box]) => {
            const active = form.aspectRatio === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onChange({ aspectRatio: r })}
                className={
                  'inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ' +
                  (active ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')
                }
              >
                <span className={`inline-block rounded-sm border-2 ${box} ${active ? 'border-violet-500' : 'border-slate-400'}`} />
                {r} {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* No-key notice */}
      {!hasKey && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-800">
            ยังไม่ได้ตั้งค่า API Key ของ AI —{' '}
            <a href="/settings" className="font-semibold text-amber-900 underline hover:text-amber-950">
              ไปที่หน้าตั้งค่า
            </a>{' '}
            เพื่อเชื่อมต่อก่อนสร้างเรื่อง
          </p>
        </div>
      )}

      <div className="flex justify-end border-t border-slate-100 pt-5">
        <Button
          size="lg"
          icon={<Wand2 className="h-4 w-4" />}
          loading={generating}
          disabled={!canGenerate}
          onClick={onGenerate}
        >
          {generating ? 'กำลังสร้างเรื่อง…' : 'สร้างเรื่อง'}
        </Button>
      </div>
    </Card>
  );
}

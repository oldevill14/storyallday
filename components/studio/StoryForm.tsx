'use client';

import { Clapperboard, Sparkles, Wand2 } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import {
  STYLE_LABELS,
  VISUAL_STYLES,
  type StudioForm,
  type VisualStyle,
} from './types';

type Props = {
  form: StudioForm;
  onChange: (patch: Partial<StudioForm>) => void;
  onGenerate: () => void;
  generating: boolean;
  /** Whether an AI key is configured (gates the generate button + shows notice). */
  hasKey: boolean;
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

export function StoryForm({ form, onChange, onGenerate, generating, hasKey }: Props) {
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
          <label htmlFor="drama-topic" className="mb-1.5 block text-sm font-medium text-slate-700">
            หัวข้อ / แนวคิด <span className="text-rose-500">*</span>
          </label>
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

      {/* Aspect ratio (fixed 9:16) */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700">อัตราส่วน</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          <span className="inline-block h-4 w-[9px] rounded-sm border-2 border-slate-400" />
          9:16 แนวตั้ง
        </span>
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

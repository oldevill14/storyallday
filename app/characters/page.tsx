'use client';

// app/characters/page.tsx — manage reusable "ตัวละคร" for sales clips.

import { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Sparkles,
  X,
  Check,
  Drama,
  ImageIcon,
  Upload,
  Copy,
  LayoutGrid,
  ExternalLink,
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, Spinner, EmptyState } from '@/components/ui';
import { useCharacters, buildCharacterSheetPrompt, type Character } from '@/lib/characters';

/** Read an image File, downscale to maxDim, return a compact JPEG data URL. */
async function fileToResizedDataUrl(file: File, maxDim = 768, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

const STYLES = [
  'Photorealistic',
  '3D Pixar',
  'Ghibli',
  'Anime Shinkai',
  'Cinematic',
  'Vintage Film',
];

type Draft = Omit<Character, 'id' | 'createdAt'>;
const EMPTY: Draft = {
  name: '',
  gender: 'หญิง',
  age: '',
  appearance: '',
  outfit: '',
  style: 'Photorealistic',
  distinctive: '',
  nationality: 'Thai',
  note: '',
};

export default function CharactersPage() {
  const items = useCharacters((s) => s.items);
  const add = useCharacters((s) => s.add);
  const update = useCharacters((s) => s.update);
  const remove = useCharacters((s) => s.remove);

  // Hydration guard — localStorage-backed store only resolves on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [editing, setEditing] = useState<Character | 'new' | null>(null);
  const [sheetFor, setSheetFor] = useState<Character | null>(null);

  if (!mounted) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="กำลังโหลดตัวละคร…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Badge color="violet" icon={<Users className="h-3 w-3" />}>
            ตัวละคร
          </Badge>
        }
        title="สร้างตัวละคร"
        subtitle="กำหนดตัวละครที่ใช้ซ้ำได้ เพื่อให้หน้าตา/สไตล์คงเส้นคงวาในทุกคลิปขายของ"
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>
            เพิ่มตัวละคร
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Drama}
          title="ยังไม่มีตัวละคร"
          description="สร้างตัวละครตัวแรก แล้วนำไปใช้สร้างคลิปขายของได้เลย — ระบบจะคัดลอกลักษณะตัวละครไปใส่ในพรอมต์ภาพ/วิดีโอให้คงที่ทุกฉาก"
          action={
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>
              เพิ่มตัวละคร
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {c.refImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.refImage}
                        alt={c.name}
                        className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-sm font-bold text-white">
                        {c.name.slice(0, 1) || '?'}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">{c.name}</div>
                      <div className="truncate text-xs text-slate-400">
                        {c.gender} · {c.age || 'ผู้ใหญ่'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditing(c)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="แก้ไข"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="ลบ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {c.appearance && (
                <p className="line-clamp-2 text-sm text-slate-600">{c.appearance}</p>
              )}
              <div className="mt-auto flex flex-wrap gap-1.5">
                <Badge color="violet" variant="soft">
                  {c.style}
                </Badge>
                {c.nationality && (
                  <Badge color="slate" variant="soft">
                    {c.nationality}
                  </Badge>
                )}
                {c.distinctive && (
                  <Badge color="amber" variant="soft">
                    {c.distinctive.slice(0, 18)}
                  </Badge>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSheetFor(c)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> สร้าง Character Sheet
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* hint */}
      <Card className="border-violet-100 bg-gradient-to-br from-violet-50/60 to-blue-50/40">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <p className="text-sm leading-relaxed text-slate-600">
            ตัวละครที่สร้างไว้เลือกใช้ได้ทั้งหน้า{' '}
            <span className="font-semibold text-slate-800">สตูดิโอละครสั้น</span> และ{' '}
            <span className="font-semibold text-slate-800">สร้างคลิปขายของ</span> — ระบบจะคัดลอกลักษณะตัวละคร
            ไปใส่ในพรอมต์ภาพ/วิดีโอให้คงหน้าตาเดิมทุกฉาก
            <span className="text-slate-500">
              {' '}(เฉพาะหน้าสร้างคลิปขายของ จะรวมกับสินค้า + สไตล์การขายให้อัตโนมัติด้วย)
            </span>
          </p>
        </div>
      </Card>

      {editing && (
        <CharacterEditor
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(draft) => {
            if (editing === 'new') add(draft);
            else update(editing.id, draft);
            setEditing(null);
          }}
        />
      )}

      {sheetFor && (
        <CharacterSheetModal character={sheetFor} onClose={() => setSheetFor(null)} />
      )}
    </div>
  );
}

function CharacterSheetModal({
  character,
  onClose,
}: {
  character: Character;
  onClose: () => void;
}) {
  const prompt = buildCharacterSheetPrompt(character);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <LayoutGrid className="h-4 w-4 text-violet-600" />
            Character Sheet — {character.name}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-5">
          {/* How-to */}
          <div className="flex items-start gap-2.5 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-slate-600">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
            <div>
              วิธีใช้เพื่อให้ <span className="font-semibold text-slate-800">ตรงรูป 100%</span>: คัดลอก prompt
              ด้านล่าง → เปิด ChatGPT หรือ Grok →{' '}
              <span className="font-semibold text-slate-800">แนบรูปอ้างอิงด้านล่าง</span> + วาง prompt → ส่ง
              <div className="mt-1 text-xs text-slate-400">
                (ai-flow ในแอปยังส่งรูปอ้างอิงเข้าโมเดลไม่ได้ จึงต้องแนบรูปเองในเว็บ — ผลลัพธ์จะยึดรูปเป็นต้นแบบจริง)
              </div>
            </div>
          </div>

          {/* Reference image */}
          <div>
            <div className="mb-1.5 text-xs font-semibold text-slate-500">รูปอ้างอิง (แนบรูปนี้)</div>
            {character.refImage ? (
              <div className="flex items-end gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={character.refImage}
                  alt={character.name}
                  className="h-40 w-40 rounded-xl object-cover ring-1 ring-slate-200"
                />
                <a
                  href={character.refImage}
                  download={`ref-${character.name || 'character'}.jpg`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="h-3.5 w-3.5 rotate-180" /> เซฟรูปไว้แนบ
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                ตัวละครนี้ยังไม่มีรูปอ้างอิง — กด “แก้ไข” แล้วอัปโหลดรูปก่อน เพื่อให้ Character Sheet ตรงรูป
              </div>
            )}
          </div>

          {/* Prompt */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Prompt (พร้อมข้อมูลตัวละคร)</span>
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'คัดลอกแล้ว' : 'คัดลอก prompt'}
              </button>
            </div>
            <textarea
              readOnly
              value={prompt}
              rows={12}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-700"
            />
          </div>
        </div>

        {/* Footer: open web tools */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <a
            href="https://chatgpt.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" /> เปิด ChatGPT
          </a>
          <a
            href="https://grok.com/imagine"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" /> เปิด Grok
          </a>
          <Button onClick={copy} icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
            {copied ? 'คัดลอกแล้ว' : 'คัดลอก prompt'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CharacterEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: Character | null;
  onClose: () => void;
  onSave: (d: Draft) => void;
}) {
  const [d, setD] = useState<Draft>(
    initial
      ? {
          name: initial.name,
          gender: initial.gender,
          age: initial.age,
          appearance: initial.appearance,
          outfit: initial.outfit,
          style: initial.style,
          distinctive: initial.distinctive,
          nationality: initial.nationality,
          note: initial.note ?? '',
          refImage: initial.refImage,
        }
      : EMPTY
  );
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const field =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            {initial ? 'แก้ไขตัวละคร' : 'เพิ่มตัวละคร'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-5">
          {/* Reference image */}
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-500">
              รูปอ้างอิง (Reference) — ต้นแบบหน้าตา + ใช้ทำ Character Sheet
            </span>
            <div className="flex items-center gap-3">
              {d.refImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={d.refImage}
                  alt="ref"
                  className="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-300">
                  <ImageIcon className="h-7 w-7" />
                </div>
              )}
              <div className="flex flex-col items-start gap-1.5">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" /> {d.refImage ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        try {
                          set({ refImage: await fileToResizedDataUrl(f) });
                        } catch {
                          /* ignore decode errors */
                        }
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
                {d.refImage && (
                  <button
                    type="button"
                    onClick={() => set({ refImage: undefined })}
                    className="text-xs font-medium text-rose-600 hover:underline"
                  >
                    ลบรูป
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">ชื่อตัวละคร</span>
              <input className={field} value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="เช่น น้องมายด์" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">เพศ</span>
              <select className={field} value={d.gender} onChange={(e) => set({ gender: e.target.value })}>
                <option>หญิง</option>
                <option>ชาย</option>
                <option>อื่นๆ</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">ช่วงวัย</span>
              <input className={field} value={d.age} onChange={(e) => set({ age: e.target.value })} placeholder="วัยทำงาน 30 ต้นๆ" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">สัญชาติ</span>
              <input className={field} value={d.nationality} onChange={(e) => set({ nationality: e.target.value })} placeholder="Thai" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">รูปร่าง / ใบหน้า / ผม</span>
            <textarea className={field} rows={2} value={d.appearance} onChange={(e) => set({ appearance: e.target.value })} placeholder="ผิวสองสี ผมยาวสีดำ รูปร่างสมส่วน ยิ้มง่าย" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">การแต่งกาย</span>
            <input className={field} value={d.outfit} onChange={(e) => set({ outfit: e.target.value })} placeholder="เสื้อเชิ้ตสีขาว กางเกงสแล็คดำ" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">สไตล์ภาพ</span>
              <select className={field} value={d.style} onChange={(e) => set({ style: e.target.value })}>
                {STYLES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">จุดเด่น</span>
              <input className={field} value={d.distinctive} onChange={(e) => set({ distinctive: e.target.value })} placeholder="แว่นตากลม / ไฝใต้ตา" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">หมายเหตุ (ไม่บังคับ)</span>
            <input className={field} value={d.note} onChange={(e) => set({ note: e.target.value })} placeholder="บุคลิก ร่าเริง เป็นกันเอง" />
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            icon={<Check className="h-4 w-4" />}
            onClick={() => onSave(d)}
            disabled={!d.name.trim()}
          >
            บันทึกตัวละคร
          </Button>
        </div>
      </div>
    </div>
  );
}

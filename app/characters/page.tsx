'use client';

// app/characters/page.tsx — manage reusable "ตัวละคร" for sales clips.

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Sparkles, X, Check, Drama } from 'lucide-react';
import { Badge, Button, Card, PageHeader, Spinner, EmptyState } from '@/components/ui';
import { useCharacters, type Character } from '@/lib/characters';

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
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-sm font-bold text-white">
                      {c.name.slice(0, 1) || '?'}
                    </span>
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
            ตัวละครที่สร้างไว้จะเลือกใช้ได้ในหน้า{' '}
            <span className="font-semibold text-slate-800">สร้างคลิปขายของ</span> —
            ระบบจะนำลักษณะตัวละคร + สินค้าของคุณ มารวมกันเป็นพรอมต์ภาพ/วิดีโอให้อัตโนมัติ
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

'use client';

// components/studio/StudioWorkspace.tsx — shared engine for two routes:
//   mode="drama" → "สตูดิโอละครสั้น" (general vertical short drama, original)
//   mode="sales" → "สร้างคลิปขายของ" (adds product + cast + sales style)

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  BookOpen,
  Clapperboard,
  Download,
  FileJson,
  FolderOpen,
  Image as ImageIcon,
  Info,
  Save,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
} from '@/components/ui';
import { useStore, useHydrated } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { callAI } from '@/lib/ai';
import { db } from '@/lib/firebase';
import { useCharacters, characterPromptBlock } from '@/lib/characters';
import { StoryForm } from '@/components/studio/StoryForm';
import { SceneCard } from '@/components/studio/SceneCard';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildImageRegenPrompt,
  buildVideoRegenPrompt,
  finalizeImagePrompt,
  finalizeVideoPrompt,
  parseDrama,
  type CreativeContext,
} from '@/components/studio/dramaPrompt';
import {
  emptyMedia,
  sceneKey,
  SALES_STYLE_META,
  type Drama,
  type SceneMedia,
  type Scene,
  type StudioForm,
} from '@/components/studio/types';
import { buildGrokStoryboard, downloadStoryboardJson } from '@/components/studio/grokExport';

export type StudioMode = 'drama' | 'sales';

const DEFAULT_FORM: StudioForm = {
  title: '',
  topic: '',
  episodeCount: 3,
  scenesPerEpisode: 3,
  style: 'Photorealistic',
  aspectRatio: '9:16',
  productName: '',
  productDetail: '',
  salesStyle: 'persuade',
};

type SavedDrama = { id: string; title: string; createdAt?: string };

export function StudioWorkspace({ mode }: { mode: StudioMode }) {
  const isSales = mode === 'sales';
  const hydrated = useHydrated();
  const settings = useStore((s) => s.settings);
  const { user } = useAuth();

  const [form, setForm] = useState<StudioForm>(DEFAULT_FORM);
  const [drama, setDrama] = useState<Drama | null>(null);
  const [media, setMedia] = useState<Record<string, SceneMedia>>({});

  // Reusable characters (sales mode only).
  const characters = useCharacters((s) => s.items);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [autoTopicLoading, setAutoTopicLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [savedList, setSavedList] = useState<SavedDrama[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const hasKey = settings.apiKey.trim().length > 0;

  // Cast applies in BOTH modes; product + sales style only in sales mode.
  const creativeCtx = (): CreativeContext | undefined => {
    const cast = characters
      .filter((c) => selectedCharacterIds.includes(c.id))
      .map((c) => characterPromptBlock(c));
    // Carry the generated drama's locked look into single-scene regeneration so a
    // re-rolled prompt stays on-style with the rest of the series.
    const styleBible = drama?.styleBible?.trim() || undefined;
    if (!isSales) {
      return cast.length || styleBible ? { cast, styleBible } : undefined;
    }
    return {
      productName: form.productName,
      productDetail: form.productDetail,
      cast,
      styleBible,
      salesStyle: {
        label: SALES_STYLE_META[form.salesStyle].label,
        instruction: SALES_STYLE_META[form.salesStyle].instruction,
      },
    };
  };

  const toggleCharacter = (id: string) =>
    setSelectedCharacterIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );

  // Each mode keeps its own saved-project collection.
  const colName = isSales ? 'salesClips' : 'dramas';

  const refreshSaved = async (uid: string) => {
    setLoadingList(true);
    try {
      const col = collection(db, 'users', uid, colName);
      let snap;
      try {
        snap = await getDocs(query(col, orderBy('createdAt', 'desc')));
      } catch {
        snap = await getDocs(col);
      }
      const list: SavedDrama[] = snap.docs.map((d) => {
        const data = d.data() as { drama?: { title?: string }; title?: string; createdAt?: string };
        return {
          id: d.id,
          title: data.drama?.title || data.title || 'โปรเจกต์ไม่มีชื่อ',
          createdAt: data.createdAt,
        };
      });
      setSavedList(list);
    } catch {
      setSavedList([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (user?.uid) void refreshSaved(user.uid);
    else setSavedList([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, colName]);

  // Auto-write the "หัวข้อ/แนวคิด" using the title (and product, in sales mode).
  const autoTopic = async () => {
    if (!hasKey) {
      setGenError('ยังไม่ได้ตั้งค่า API Key — ไปที่หน้าตั้งค่าก่อน');
      return;
    }
    setAutoTopicLoading(true);
    setGenError(null);
    try {
      const title = form.title.trim();
      // All providers go through /api/ai which forwards the image for vision.
      const canVision = true;
      const kind = isSales
        ? 'คลิปขายของแนวตั้ง (ละครสั้นที่ปิดการขายอย่างเป็นธรรมชาติ)'
        : 'ละครสั้นแนวตั้ง';
      const productLine =
        isSales && (form.productName.trim() || form.productDetail.trim())
          ? `สินค้าที่ต้องนำเสนอ/ขาย: ${form.productName.trim()} ${form.productDetail.trim()}`.trim()
          : '';
      const prompt = [
        `ช่วยคิด "หัวข้อ/แนวคิด" สำหรับ${kind} ความยาว 3-5 ประโยค เป็นภาษาไทย`,
        title ? `อ้างอิงจากชื่อเรื่อง: "${title}" (ให้สอดคล้องกับชื่อนี้)` : '',
        productLine,
        isSales && canVision && form.productImage
          ? 'มี "รูปสินค้า" แนบมาด้วย — ดูรูปแล้วนำลักษณะ/ประเภท/จุดเด่นของสินค้าที่เห็นมาใช้คิดหัวข้อ'
          : '',
        'ระบุ: ตัวละครหลัก (ผู้ใหญ่), อารมณ์/โทน, จุดพลิกของเรื่อง และฉากจบสั้นๆ',
        isSales ? 'ร้อยเรื่องให้นำไปสู่การขายสินค้าได้เนียน' : '',
        'ตอบกลับเฉพาะเนื้อหาหัวข้อ/แนวคิด — ไม่ต้องมีคำนำ ไม่ต้องมีหัวข้อกำกับ ไม่ต้องใส่เครื่องหมายคำพูด',
      ]
        .filter(Boolean)
        .join('\n');
      const text = await callAI(
        { prompt, image: isSales && canVision ? form.productImage : undefined },
        settings,
      );
      setForm((f) => ({ ...f, topic: text.trim() }));
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'ให้ AI คิดหัวข้อไม่สำเร็จ');
    } finally {
      setAutoTopicLoading(false);
    }
  };

  const onGenerate = async () => {
    if (!hasKey) {
      setGenError('ยังไม่ได้ตั้งค่า API Key — ไปที่หน้าตั้งค่าก่อน');
      return;
    }
    setGenerating(true);
    setGenError(null);
    setSavedNote(null);
    try {
      const text = await callAI(
        {
          system: buildSystemPrompt(form.style, form.aspectRatio),
          prompt: buildUserPrompt(form, creativeCtx()),
        },
        settings
      );
      const parsed = parseDrama(text, form.style);
      setDrama(parsed);
      const fresh: Record<string, SceneMedia> = {};
      for (const epi of parsed.episodes) {
        epi.scenes.forEach((_, i) => {
          fresh[sceneKey(epi.ep, i)] = emptyMedia('grok');
        });
      }
      setMedia(fresh);
      // Non-blocking notice: the model occasionally under-delivers the requested
      // episode/scene counts. The output is still usable, so just inform the user.
      const gotEps = parsed.episodes.length;
      const sceneShort = parsed.episodes.some(
        (e) => e.scenes.length < form.scenesPerEpisode,
      );
      if (gotEps !== form.episodeCount || sceneShort) {
        setGenError(
          `AI สร้างได้ ${gotEps} ตอน (ขอ ${form.episodeCount} ตอน ฉากละ ${form.scenesPerEpisode}) — ใช้ผลลัพธ์นี้ต่อได้เลย หรือกด “สร้างเรื่อง” อีกครั้งเพื่อลองให้ครบ`,
        );
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการสร้างเรื่อง');
    } finally {
      setGenerating(false);
    }
  };

  const patchScene = (epIndex: number, sceneIdx: number, patch: Partial<Scene>) => {
    setDrama((prev) => {
      if (!prev) return prev;
      const episodes = prev.episodes.map((epi, ei) => {
        if (ei !== epIndex) return epi;
        return {
          ...epi,
          scenes: epi.scenes.map((sc, si) => (si === sceneIdx ? { ...sc, ...patch } : sc)),
        };
      });
      return { ...prev, episodes };
    });
  };

  const patchMedia = (key: string, patch: Partial<SceneMedia>) => {
    setMedia((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? emptyMedia()), ...patch },
    }));
  };

  // Ordered reference entities = selected characters (IN SELECTION ORDER) then the
  // product. This order defines the reference-image order: image 1 = first character,
  // image 2 = second character, … and the product (if any) is the LAST reference image.
  const refEntities: { kind: 'character' | 'product'; name: string; desc: string; img?: string }[] =
    (() => {
      const out: { kind: 'character' | 'product'; name: string; desc: string; img?: string }[] = [];
      for (const id of selectedCharacterIds) {
        const c = characters.find((x) => x.id === id);
        if (c)
          out.push({ kind: 'character', name: c.name || 'ตัวละคร', desc: characterPromptBlock(c), img: c.refImage });
      }
      if (isSales && (form.productName.trim() || form.productDetail.trim() || form.productImage)) {
        out.push({
          kind: 'product',
          name: form.productName.trim() || 'สินค้า',
          desc: `${form.productName.trim()} ${form.productDetail.trim()}`.trim(),
          img: form.productImage,
        });
      }
      return out;
    })();

  // Ordered list of ref-image data-urls (characters in order, then product).

  // Text descriptions (always included so the look is known even without ref images).
  const castText = refEntities.length
    ? [
        'Keep these consistent in EVERY scene:',
        ...refEntities.map((e) => `- ${e.kind} "${e.name}": ${e.desc}`),
      ].join('\n')
    : '';

  // Reference-image ORDERING note — only the entities that actually have a ref image.
  const refOrderNote = (() => {
    const withImg = refEntities.filter((e) => e.img);
    if (!withImg.length) return '';
    return [
      'Reference images — attach and use in THIS exact order (do not reorder or swap):',
      ...withImg.map(
        (e, i) =>
          `- image ${i + 1} = ${e.kind} "${e.name}" — match it exactly (${
            e.kind === 'product' ? 'same shape/label/colors' : 'same face/hair/outfit/identity'
          })`,
      ),
      'Conditions: characters come first in this order; the product (if any) is the LAST image. Place all referenced characters and the product together naturally in the same scene; keep each one identical to its own image in every scene.',
    ].join('\n');
  })();

  // For copy buttons + exported JSON (the user attaches the ref images themselves).
  const copyRefContext = [castText, refOrderNote].filter(Boolean).join('\n\n');

  const regenImagePrompt = async (key: string, epIndex: number, sceneIdx: number, scene: Scene) => {
    patchMedia(key, { regenImageLoading: true });
    setGenError(null);
    try {
      const text = await callAI(
        { prompt: buildImageRegenPrompt(scene, form.style, creativeCtx(), form.aspectRatio) },
        settings
      );
      patchScene(epIndex, sceneIdx, { visualPrompt: finalizeImagePrompt(text, form.style) });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'สร้าง prompt ภาพใหม่ไม่สำเร็จ');
    } finally {
      patchMedia(key, { regenImageLoading: false });
    }
  };

  const regenVideoPrompt = async (key: string, epIndex: number, sceneIdx: number, scene: Scene) => {
    patchMedia(key, { regenVideoLoading: true });
    setGenError(null);
    try {
      const text = await callAI(
        { prompt: buildVideoRegenPrompt(scene, form.style, creativeCtx(), form.aspectRatio) },
        settings
      );
      patchScene(epIndex, sceneIdx, { videoPrompt: finalizeVideoPrompt(text) });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'สร้าง prompt วิดีโอใหม่ไม่สำเร็จ');
    } finally {
      patchMedia(key, { regenVideoLoading: false });
    }
  };

  const onSave = async () => {
    if (!drama) return;
    if (!user?.uid) {
      setSavedNote('ต้องเข้าสู่ระบบก่อนจึงจะบันทึกโปรเจกต์ได้');
      return;
    }
    setSaving(true);
    setSavedNote(null);
    try {
      const id = `${isSales ? 'clip' : 'drama'}-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;
      const ref = doc(collection(db, 'users', user.uid, colName), id);
      // Don't persist the raw base64 product image — a large photo plus a full
      // scene grid can push the doc past Firestore's ~1 MiB limit (it's only a
      // thumbnail; scene media isn't saved here either).
      const formToSave = { ...form };
      delete formToSave.productImage;
      await setDoc(ref, {
        mode,
        form: formToSave,
        drama,
        cast: selectedCharacterIds,
        createdAt: new Date().toISOString(),
        savedAt: serverTimestamp(),
      });
      setSavedNote(`บันทึกแล้ว: “${drama.title}”`);
      void refreshSaved(user.uid);
    } catch (e) {
      const raw = e instanceof Error ? e.message : '';
      const tooBig = /longer than|exceeds the maximum|maximum.*size|1048487|too large/i.test(raw);
      setSavedNote(
        tooBig
          ? 'บันทึกไม่สำเร็จ: ข้อมูลโปรเจกต์ใหญ่เกินกำหนด (เกิน 1MB) — ลองลดจำนวนตอน/ฉาก แล้วบันทึกใหม่'
          : raw || 'บันทึกไม่สำเร็จ',
      );
    } finally {
      setSaving(false);
    }
  };

  // Bundle the whole story into a Grok-agent storyboard JSON and download it,
  // ready to hand to Grok to generate clips (image-to-video per scene, joined).
  const onDownloadJson = () => {
    if (!drama) return;
    const storyboard = buildGrokStoryboard(drama, form, isSales, copyRefContext);
    const safe =
      (drama.title || 'storyboard')
        .replace(/[^\w฀-๿]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40) || 'storyboard';
    downloadStoryboardJson(storyboard, `${safe}.grok.json`);
  };

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="กำลังโหลดสตูดิโอ…" />
      </div>
    );
  }

  const totalScenes = drama ? drama.episodes.reduce((n, e) => n + e.scenes.length, 0) : 0;
  const title = isSales ? 'สร้างคลิปขายของ' : 'สตูดิโอละครสั้น';
  const subtitle = isSales
    ? 'ใส่สินค้า + เลือกตัวละคร + สไตล์การขาย → แตกตอน/ฉาก + prompt แล้วเจนภาพ/วิดีโอทีละฉาก'
    : 'แตกหัวข้อ → เรื่อง → ตอน/ฉาก → prompt แล้วเจนภาพ/วิดีโอทีละฉาก';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Badge color="violet" icon={<Clapperboard className="h-3 w-3" />}>
            {isSales ? 'สร้างคลิปขายของ' : 'WorkD-Cine'}
          </Badge>
        }
        title={title}
        subtitle={subtitle}
        action={
          drama ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                icon={<FileJson className="h-4 w-4" />}
                onClick={onDownloadJson}
                title="รวมทุกฉากเป็นไฟล์ JSON เดียว ส่งให้ Grok agent ไปเจนคลิป (image-to-video ต่อฉาก แล้วต่อเป็นคลิปเดียว)"
              >
                ดาวน์โหลด JSON (Grok agent)
              </Button>
              <Button icon={<Save className="h-4 w-4" />} loading={saving} onClick={onSave}>
                บันทึกโปรเจกต์
              </Button>
            </div>
          ) : undefined
        }
      />

      <StoryForm
        form={form}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onGenerate={onGenerate}
        generating={generating}
        hasKey={hasKey}
        onAutoTopic={autoTopic}
        autoTopicLoading={autoTopicLoading}
        salesMode={isSales}
        characters={characters.map((c) => ({ id: c.id, name: c.name, style: c.style }))}
        selectedIds={selectedCharacterIds}
        onToggleCharacter={toggleCharacter}
      />

      {genError && (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm font-medium text-rose-700">{genError}</p>
        </Card>
      )}
      {savedNote && (
        <Card className="border-emerald-200 bg-emerald-50">
          <p className="text-sm font-medium text-emerald-700">{savedNote}</p>
        </Card>
      )}

      {generating && !drama && (
        <Card className="flex flex-col items-center gap-3 py-12">
          <Spinner size={26} />
          <p className="text-sm text-slate-500">AI กำลังเขียนบท แตกตอนและฉาก…</p>
        </Card>
      )}

      {drama && (
        <div className="space-y-6">
          <Card className="space-y-4 border-violet-100 bg-gradient-to-br from-violet-50/60 to-blue-50/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <BookOpen className="h-5 w-5 text-violet-600" />
                  {drama.title}
                </h2>
                {drama.logline && (
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{drama.logline}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Badge color="violet">{drama.episodes.length} ตอน</Badge>
                <Badge color="blue">{totalScenes} ฉาก</Badge>
              </div>
            </div>

            {drama.characters.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Users className="h-3.5 w-3.5" /> ตัวละคร
                </div>
                <div className="flex flex-wrap gap-2">
                  {drama.characters.map((c, i) => (
                    <span
                      key={`${c.name}-${i}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"
                    >
                      <span className="font-semibold text-slate-800">{c.name}</span>
                      {c.description ? ` · ${c.description}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* ภาพอ้างอิงตัวละคร/สินค้าที่เลือก — แนบตามลำดับนี้ตอนเอาพรอมต์ไปเจนเองที่ Grok/ChatGPT */}
          {refEntities.some((e) => e.img) ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <ImageIcon className="h-4 w-4 text-violet-600" />
                ภาพอ้างอิง — แนบตามลำดับนี้ตอนเอาพรอมต์ไปเจน (Grok / ChatGPT) เพื่อให้หน้าตัวละคร/สินค้าตรงทุกฉาก
              </div>
              <div className="flex flex-wrap gap-3">
                {refEntities
                  .filter((e) => e.img)
                  .map((e, i) => (
                    <div key={`${e.kind}-${i}`} className="flex w-24 flex-col items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={e.img}
                        alt={e.name}
                        className="h-24 w-24 rounded-lg object-cover ring-1 ring-violet-200"
                      />
                      <span className="w-full truncate text-center text-[11px] font-medium text-slate-600">
                        image {i + 1} · {e.name}
                      </span>
                      <a
                        href={e.img}
                        download={`ref-${i + 1}-${e.name}.png`}
                        className="inline-flex items-center gap-0.5 text-[11px] text-violet-600 hover:underline"
                      >
                        <Download className="h-3 w-3" /> เซฟรูป
                      </a>
                    </div>
                  ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                พรอมต์ที่กด “คัดลอก” มีคำอธิบาย + ลำดับภาพให้แล้ว — แค่แนบรูปเหล่านี้ตามลำดับ (image 1, 2, …) ตอนวางพรอมต์
              </p>
            </div>
          ) : selectedCharacterIds.length > 0 ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                ตัวละครที่เลือกยังไม่มี “รูปอ้างอิง” — ไปที่{' '}
                <a href="/characters" className="font-semibold underline">หน้าตัวละคร</a>{' '}
                อัปโหลดรูป ref ก่อน เพื่อให้แนบรูปอ้างอิงเวลาเอาพรอมต์ไปเจนได้ (คำบรรยายตัวละครถูกใส่ในพรอมต์ให้แล้ว)
              </span>
            </div>
          ) : null}

          {drama.episodes.map((epi, epIndex) => (
            <div key={epi.ep} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 items-center rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-3 text-xs font-bold text-white">
                  ตอนที่ {epi.ep}
                </span>
                <span className="text-xs text-slate-400">{epi.scenes.length} ฉาก</span>
              </div>
              <div className="space-y-3">
                {epi.scenes.map((scene, sceneIdx) => {
                  const key = sceneKey(epi.ep, sceneIdx);
                  return (
                    <SceneCard
                      key={key}
                      ep={epi.ep}
                      sceneIndex={sceneIdx}
                      scene={scene}
                      aspectRatio={form.aspectRatio}
                      copyRefContext={copyRefContext}
                      media={media[key] ?? emptyMedia()}
                      onSceneChange={(patch) => patchScene(epIndex, sceneIdx, patch)}
                      onRegenImage={() => regenImagePrompt(key, epIndex, sceneIdx, scene)}
                      onRegenVideo={() => regenVideoPrompt(key, epIndex, sceneIdx, scene)}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* ด้านล่าง: ดาวน์โหลด JSON รวมทุก ep/scene สำหรับสั่ง Grok agent */}
          <Card className="flex flex-col items-center gap-2.5 border-violet-200 bg-gradient-to-br from-violet-50 to-blue-50/50 py-7 text-center">
            <p className="text-sm font-semibold text-slate-700">
              รวมทุกตอน/ฉากเป็นไฟล์ JSON เดียว — สำหรับสั่ง Grok agent ให้สร้างคลิป
            </p>
            <Button icon={<FileJson className="h-5 w-5" />} onClick={onDownloadJson}>
              ดาวน์โหลด JSON (Grok agent)
            </Button>
            <p className="text-[11px] text-slate-400">
              ไฟล์มี: project · ตัวละคร/อ้างอิงที่เลือก · ทุก scene (prompt ภาพ/วิดีโอ + บทพูด) · assembly
            </p>
          </Card>
        </div>
      )}

      {!drama && !generating && (
        <EmptyState
          icon={Clapperboard}
          title="ยังไม่มีเรื่อง"
          description={
            isSales
              ? 'ใส่สินค้า เลือกตัวละคร + สไตล์การขาย แล้วกด “สร้างเรื่อง” เพื่อให้ AI แตกเป็นคลิปขายของพร้อม prompt'
              : 'กรอกหัวข้อด้านบนแล้วกด “สร้างเรื่อง” เพื่อให้ AI แตกเป็นบท ตอน และฉากพร้อม prompt'
          }
        />
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FolderOpen className="h-4 w-4 text-violet-600" />
            โปรเจกต์ที่บันทึกไว้
          </h3>
          {user?.uid && (
            <Button size="sm" variant="ghost" loading={loadingList} onClick={() => refreshSaved(user.uid)}>
              รีเฟรช
            </Button>
          )}
        </div>

        {!user?.uid ? (
          <p className="flex items-center gap-1.5 text-sm text-slate-400">
            <Sparkles className="h-4 w-4" /> เข้าสู่ระบบเพื่อบันทึกและดูโปรเจกต์ของคุณ
          </p>
        ) : loadingList ? (
          <div className="py-4">
            <Spinner size={18} label="กำลังโหลดรายการ…" />
          </div>
        ) : savedList.length === 0 ? (
          <p className="text-sm text-slate-400">ยังไม่มีโปรเจกต์ที่บันทึกไว้</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {savedList.map((d) => (
              <li key={d.id} className="flex items-center gap-2 py-2.5 text-sm">
                <Clapperboard className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="flex-1 truncate text-slate-700">{d.title}</span>
                {d.createdAt && (
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(d.createdAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

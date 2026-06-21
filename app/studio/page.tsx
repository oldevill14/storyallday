'use client';

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
  FolderOpen,
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
  type Drama,
  type SceneMedia,
  type Scene,
  type StudioForm,
} from '@/components/studio/types';

const DEFAULT_FORM: StudioForm = {
  title: '',
  topic: '',
  episodeCount: 3,
  scenesPerEpisode: 3,
  style: 'Photorealistic',
  aspectRatio: '9:16',
  productName: '',
  productDetail: '',
};

type SavedDrama = { id: string; title: string; createdAt?: string };

async function postGenerate<T extends Record<string, unknown>>(
  url: string,
  body: T
): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as
    | { ok: true; dataUrl: string }
    | { ok: false; error: string }
    | null;
  if (!res.ok || !data || data.ok !== true || typeof data.dataUrl !== 'string') {
    const msg =
      (data && 'error' in data && data.error) ||
      `สร้างไม่สำเร็จ (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return data.dataUrl;
}

export default function StudioPage() {
  const hydrated = useHydrated();
  const settings = useStore((s) => s.settings);
  const { user } = useAuth();

  const [form, setForm] = useState<StudioForm>(DEFAULT_FORM);
  const [drama, setDrama] = useState<Drama | null>(null);
  const [media, setMedia] = useState<Record<string, SceneMedia>>({});

  // Reusable characters (from /characters) + which are cast in this clip.
  const characters = useCharacters((s) => s.items);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);

  // Product + cast context woven into generation + regeneration.
  const creativeCtx = (): CreativeContext => ({
    productName: form.productName,
    productDetail: form.productDetail,
    cast: characters
      .filter((c) => selectedCharacterIds.includes(c.id))
      .map((c) => characterPromptBlock(c)),
  });

  const toggleCharacter = (id: string) =>
    setSelectedCharacterIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const [savedList, setSavedList] = useState<SavedDrama[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const hasKey = settings.apiKey.trim().length > 0;

  // --- Saved dramas list (Firestore) ----------------------------------------
  const refreshSaved = async (uid: string) => {
    setLoadingList(true);
    try {
      const col = collection(db, 'users', uid, 'dramas');
      let snap;
      try {
        snap = await getDocs(query(col, orderBy('createdAt', 'desc')));
      } catch {
        // Missing index / field on older docs — fall back to unordered.
        snap = await getDocs(col);
      }
      const list: SavedDrama[] = snap.docs.map((d) => {
        const data = d.data() as { drama?: { title?: string }; title?: string; createdAt?: string };
        return {
          id: d.id,
          title: data.drama?.title || data.title || 'ละครสั้นไม่มีชื่อ',
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
  }, [user?.uid]);

  // --- STEP B: generate the drama -------------------------------------------
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
          system: buildSystemPrompt(form.style),
          prompt: buildUserPrompt(form, creativeCtx()),
        },
        settings
      );
      const parsed = parseDrama(text, form.style);
      setDrama(parsed);

      // reset media slots (default provider = grok)
      const fresh: Record<string, SceneMedia> = {};
      for (const epi of parsed.episodes) {
        epi.scenes.forEach((_, i) => {
          fresh[sceneKey(epi.ep, i)] = emptyMedia('grok');
        });
      }
      setMedia(fresh);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการสร้างเรื่อง');
    } finally {
      setGenerating(false);
    }
  };

  // --- Scene + media mutations ----------------------------------------------
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

  const genImage = async (key: string, scene: Scene) => {
    const provider = media[key]?.imageProvider ?? 'grok';
    patchMedia(key, { imageStatus: 'loading', imageError: undefined });
    try {
      const dataUrl = await postGenerate('/api/generate-image', {
        prompt: scene.visualPrompt,
        provider,
      });
      patchMedia(key, { imageStatus: 'done', imageDataUrl: dataUrl });
    } catch (e) {
      patchMedia(key, {
        imageStatus: 'error',
        imageError: e instanceof Error ? e.message : 'สร้างรูปภาพไม่สำเร็จ',
      });
    }
  };

  const genVideo = async (key: string, scene: Scene) => {
    patchMedia(key, { videoStatus: 'loading', videoError: undefined });
    try {
      const dataUrl = await postGenerate('/api/generate-video', {
        prompt: scene.videoPrompt,
        tool: 'grok',
      });
      patchMedia(key, { videoStatus: 'done', videoDataUrl: dataUrl });
    } catch (e) {
      patchMedia(key, {
        videoStatus: 'error',
        videoError: e instanceof Error ? e.message : 'สร้างวิดีโอไม่สำเร็จ',
      });
    }
  };

  // --- Regenerate a single scene's prompt (AI), weaving in cast + product ----
  const regenImagePrompt = async (
    key: string,
    epIndex: number,
    sceneIdx: number,
    scene: Scene
  ) => {
    patchMedia(key, { regenImageLoading: true });
    setGenError(null);
    try {
      const text = await callAI(
        { prompt: buildImageRegenPrompt(scene, form.style, creativeCtx()) },
        settings
      );
      patchScene(epIndex, sceneIdx, { visualPrompt: finalizeImagePrompt(text, form.style) });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'สร้าง prompt ภาพใหม่ไม่สำเร็จ');
    } finally {
      patchMedia(key, { regenImageLoading: false });
    }
  };

  const regenVideoPrompt = async (
    key: string,
    epIndex: number,
    sceneIdx: number,
    scene: Scene
  ) => {
    patchMedia(key, { regenVideoLoading: true });
    setGenError(null);
    try {
      const text = await callAI(
        { prompt: buildVideoRegenPrompt(scene, form.style, creativeCtx()) },
        settings
      );
      patchScene(epIndex, sceneIdx, { videoPrompt: finalizeVideoPrompt(text) });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'สร้าง prompt วิดีโอใหม่ไม่สำเร็จ');
    } finally {
      patchMedia(key, { regenVideoLoading: false });
    }
  };

  // --- Persist the drama to Firestore ---------------------------------------
  const onSave = async () => {
    if (!drama) return;
    if (!user?.uid) {
      setSavedNote('ต้องเข้าสู่ระบบก่อนจึงจะบันทึกโปรเจกต์ได้');
      return;
    }
    setSaving(true);
    setSavedNote(null);
    try {
      const id = `drama-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const ref = doc(collection(db, 'users', user.uid, 'dramas'), id);
      await setDoc(ref, {
        form,
        drama,
        cast: selectedCharacterIds,
        createdAt: new Date().toISOString(),
        savedAt: serverTimestamp(),
      });
      setSavedNote(`บันทึกแล้ว: “${drama.title}”`);
      void refreshSaved(user.uid);
    } catch (e) {
      setSavedNote(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="กำลังโหลดสตูดิโอ…" />
      </div>
    );
  }

  const totalScenes = drama
    ? drama.episodes.reduce((n, e) => n + e.scenes.length, 0)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Badge color="violet" icon={<Clapperboard className="h-3 w-3" />}>
            สร้างคลิปขายของ
          </Badge>
        }
        title="สร้างคลิปขายของ"
        subtitle="แตกหัวข้อ → เรื่อง → ตอน/ฉาก → prompt แล้วเจนภาพ/วิดีโอทีละฉาก"
        action={
          drama ? (
            <Button
              icon={<Save className="h-4 w-4" />}
              loading={saving}
              onClick={onSave}
            >
              บันทึกโปรเจกต์
            </Button>
          ) : undefined
        }
      />

      {/* STEP A — form */}
      <StoryForm
        form={form}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onGenerate={onGenerate}
        generating={generating}
        hasKey={hasKey}
        characters={characters.map((c) => ({ id: c.id, name: c.name, style: c.style }))}
        selectedIds={selectedCharacterIds}
        onToggleCharacter={toggleCharacter}
      />

      {/* Generate error */}
      {genError && (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm font-medium text-rose-700">{genError}</p>
        </Card>
      )}

      {/* Save note */}
      {savedNote && (
        <Card className="border-emerald-200 bg-emerald-50">
          <p className="text-sm font-medium text-emerald-700">{savedNote}</p>
        </Card>
      )}

      {/* STEP C — results */}
      {generating && !drama && (
        <Card className="flex flex-col items-center gap-3 py-12">
          <Spinner size={26} />
          <p className="text-sm text-slate-500">AI กำลังเขียนบท แตกตอนและฉาก…</p>
        </Card>
      )}

      {drama && (
        <div className="space-y-6">
          {/* Story overview */}
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

          {/* Note about ai-flow accounts */}
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              การสร้างภาพ/วิดีโอใช้บัญชี <span className="font-medium text-slate-600">ai-flow</span>{' '}
              (โปรไฟล์ Grok / ChatGPT บนเครื่องนี้) ซึ่งแยกจากบัญชีที่เข้าสู่ระบบแอป — กดสร้างทีละฉากเพื่อคุมการใช้งาน
            </span>
          </div>

          {/* Episodes → scene cards */}
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
                      media={media[key] ?? emptyMedia()}
                      onSceneChange={(patch) => patchScene(epIndex, sceneIdx, patch)}
                      onMediaChange={(patch) => patchMedia(key, patch)}
                      onGenerateImage={() => genImage(key, scene)}
                      onGenerateVideo={() => genVideo(key, scene)}
                      onRegenImage={() => regenImagePrompt(key, epIndex, sceneIdx, scene)}
                      onRegenVideo={() => regenVideoPrompt(key, epIndex, sceneIdx, scene)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state when nothing generated yet */}
      {!drama && !generating && (
        <EmptyState
          icon={Clapperboard}
          title="ยังไม่มีเรื่อง"
          description="กรอกหัวข้อด้านบนแล้วกด “สร้างเรื่อง” เพื่อให้ AI แตกเป็นบท ตอน และฉากพร้อม prompt"
        />
      )}

      {/* Saved projects */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FolderOpen className="h-4 w-4 text-violet-600" />
            โปรเจกต์ที่บันทึกไว้
          </h3>
          {user?.uid && (
            <Button
              size="sm"
              variant="ghost"
              loading={loadingList}
              onClick={() => refreshSaved(user.uid)}
            >
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

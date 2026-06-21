'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Wand2,
  Plus,
  RefreshCw,
  KeyRound,
  Lightbulb,
  LayoutTemplate,
  AlertTriangle,
  Eye,
  Layers,
  CheckCircle2,
  Hash,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';
import { useStore, useHydrated } from '@/lib/store';
import { suggestAngles, draftPost } from '@/lib/ai';
import type { Angle, Post } from '@/lib/types';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Spinner,
  EmptyState,
  ConfidenceBar,
  PlatformIcons,
  StatusChip,
} from '@/components/ui';
import { AngleCard } from '@/components/dashboard/AngleCard';
import { AnalysisPanel } from '@/components/dashboard/AnalysisPanel';
import { CategoryFilter } from '@/components/dashboard/CategoryFilter';
import { Modal } from '@/components/dashboard/Modal';
import { Toast, type ToastData } from '@/components/dashboard/Toast';
import { categoryColor, confidenceTier } from '@/components/dashboard/angleMeta';

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

type DraftResult = {
  angle: Angle;
  post: Post;
};

export default function DashboardPage() {
  const hydrated = useHydrated();

  const settings = useStore((s) => s.settings);
  const brand = useStore((s) => s.brand);
  const angles = useStore((s) => s.angles);
  const posts = useStore((s) => s.posts);
  const addAngles = useStore((s) => s.addAngles);
  const addPost = useStore((s) => s.addPost);

  const [loadingAngles, setLoadingAngles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [usingAngleId, setUsingAngleId] = useState<string | null>(null);

  // Modal state
  const [previewAngle, setPreviewAngle] = useState<Angle | null>(null);
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const hasKey = settings.apiKey.trim().length > 0;
  const lastUpdated = useMemo(
    () => new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    // recompute when the angle set changes (new suggestions) so the timestamp feels live
    [angles.length] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Counts for the filter chips.
  const counts = useMemo(() => {
    const c: Record<string, number> = { __all__: angles.length };
    for (const a of angles) c[a.category] = (c[a.category] ?? 0) + 1;
    return c;
  }, [angles]);

  // Filter + sort (confidence desc).
  const visibleAngles = useMemo(() => {
    const filtered =
      activeCategory === null ? angles : angles.filter((a) => a.category === activeCategory);
    return [...filtered].sort((a, b) => b.confidence - a.confidence);
  }, [angles, activeCategory]);

  const publishedCount = useMemo(
    () => posts.filter((p) => p.status === 'published').length,
    [posts]
  );
  const decisionCount = posts.length;

  // --- Actions ---------------------------------------------------------------

  async function handleSuggest() {
    if (!hasKey) return;
    setError(null);
    setLoadingAngles(true);
    try {
      const next = await suggestAngles(brand, settings);
      if (next.length === 0) {
        setError('AI ไม่ได้เสนอมุมใหม่ ลองอีกครั้ง');
      } else {
        addAngles(next);
        setActiveCategory(null);
        setToast({ message: `AI เสนอ ${next.length} มุมใหม่ให้แล้ว ✨`, tone: 'success' });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการเรียก AI');
    } finally {
      setLoadingAngles(false);
    }
  }

  async function handleUseAngle(angle: Angle) {
    if (!hasKey) return;
    setError(null);
    setUsingAngleId(angle.id);
    try {
      const draft = await draftPost(angle, brand, settings);
      const post: Post = {
        id: uid('post'),
        title: angle.title,
        caption: draft.caption,
        hashtags: draft.hashtags,
        platforms: ['facebook', 'instagram'],
        status: 'pending',
        createdAt: new Date().toISOString(),
        angleId: angle.id,
        imageIdea: draft.imageIdea,
      };
      addPost(post);
      setDraftResult({ angle, post });
      setToast({ message: 'สร้างโพสต์แล้ว — รอการอนุมัติของคุณ', tone: 'success' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'สร้างโพสต์ไม่สำเร็จ';
      setError(msg);
      setToast({ message: msg, tone: 'error' });
    } finally {
      setUsingAngleId(null);
    }
  }

  // --- Render ----------------------------------------------------------------

  if (!hydrated) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={28} label="กำลังเตรียมคำแนะนำ…" />
      </div>
    );
  }

  const busy = loadingAngles || usingAngleId !== null;

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <Card className="overflow-hidden border-violet-100 bg-gradient-to-br from-violet-50 via-white to-blue-50">
        <PageHeader
          eyebrow={
            <Badge color="violet" icon={<Sparkles className="h-3.5 w-3.5" />}>
              AI แนะนำ
            </Badge>
          }
          title="วันนี้ควรโพสต์มุมไหนดี?"
          subtitle="AI คัดมุมที่น่าทำวันนี้จากแบรนด์ เทรนด์ และข้อมูลที่คุณตอบรับ แล้วจัดอันดับให้ — เลือกแล้วต่อยอดเข้าคิวรออนุมัติได้ทันที"
          action={
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-slate-400">อัปเดต {lastUpdated} น.</span>
              <div className="flex items-center gap-2">
                <Link href="/library">
                  <Button variant="outline" icon={<Plus className="h-4 w-4" />}>
                    คลังโพสต์
                  </Button>
                </Link>
                <Button
                  onClick={handleSuggest}
                  loading={loadingAngles}
                  disabled={!hasKey || busy}
                  icon={
                    angles.length > 0 ? (
                      <RefreshCw className="h-4 w-4" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )
                  }
                >
                  {angles.length > 0 ? 'ให้ AI แนะนำมุมใหม่' : 'ให้ AI แนะนำมุม'}
                </Button>
              </div>
            </div>
          }
        />

        {/* Summary pills */}
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">
            <Layers className="h-4 w-4 text-violet-500" />
            <strong className="font-semibold text-slate-800">{angles.length}</strong> มุมพร้อมเลือก
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">
            <Sparkles className="h-4 w-4 text-blue-500" />
            จัดอันดับตามความมั่นใจให้แล้ว
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ใช้มุม → เข้าคิว <strong className="font-semibold text-slate-800">รออนุมัติ</strong>
          </span>
        </div>
      </Card>

      {/* No-API-key prompt */}
      {!hasKey && (
        <Card className="border-amber-200 bg-amber-50/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <div className="font-semibold text-slate-900">ยังไม่ได้เชื่อมต่อ AI</div>
                <p className="mt-0.5 text-sm text-slate-600">
                  ใส่ API key ในหน้าตั้งค่าก่อน เพื่อให้ AI แนะนำมุมและร่างโพสต์ให้คุณได้
                  (ระหว่างนี้แสดงตัวอย่างมุมที่เตรียมไว้)
                </p>
              </div>
            </div>
            <Link href="/settings" className="shrink-0">
              <Button icon={<KeyRound className="h-4 w-4" />}>ไปตั้งค่า AI</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Error banner */}
      {error && (
        <Card className="border-rose-200 bg-rose-50/60">
          <div className="flex items-start gap-3 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">เรียก AI ไม่สำเร็จ</div>
              <p className="mt-0.5 break-words text-rose-600">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 text-xs font-medium text-rose-500 hover:underline"
            >
              ปิด
            </button>
          </div>
        </Card>
      )}

      {/* Category filter */}
      <CategoryFilter active={activeCategory} onChange={setActiveCategory} counts={counts} />

      {/* Main grid: angles (left) + analysis panel (right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {loadingAngles && angles.length === 0 ? (
            <Card className="flex items-center justify-center py-16">
              <Spinner size={26} label="AI กำลังคิดมุมคอนเทนต์ให้คุณ…" />
            </Card>
          ) : visibleAngles.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title={
                activeCategory
                  ? `ยังไม่มีมุมในหมวด "${activeCategory}"`
                  : 'ยังไม่มีมุมคอนเทนต์'
              }
              description={
                hasKey
                  ? 'กด "ให้ AI แนะนำมุม" เพื่อให้ AI เสนอมุมที่น่าโพสต์วันนี้'
                  : 'เชื่อมต่อ AI ในหน้าตั้งค่าก่อน แล้วให้ AI แนะนำมุมให้คุณ'
              }
              action={
                hasKey ? (
                  <Button
                    onClick={handleSuggest}
                    loading={loadingAngles}
                    icon={<Wand2 className="h-4 w-4" />}
                  >
                    ให้ AI แนะนำมุม
                  </Button>
                ) : (
                  <Link href="/settings">
                    <Button icon={<KeyRound className="h-4 w-4" />}>ไปตั้งค่า AI</Button>
                  </Link>
                )
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleAngles.map((angle) => (
                <AngleCard
                  key={angle.id}
                  angle={angle}
                  using={usingAngleId === angle.id}
                  disabled={!hasKey || (busy && usingAngleId !== angle.id)}
                  onUse={handleUseAngle}
                  onPreview={setPreviewAngle}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <AnalysisPanel
            brand={brand}
            publishedCount={publishedCount}
            decisionCount={decisionCount}
          />
        </div>
      </div>

      {/* Angle preview modal */}
      <Modal
        open={previewAngle !== null}
        onClose={() => setPreviewAngle(null)}
        leading={
          previewAngle ? (
            <Badge color={categoryColor(previewAngle.category)}>{previewAngle.category}</Badge>
          ) : null
        }
        title={previewAngle?.title}
        footer={
          previewAngle ? (
            <>
              <Button variant="ghost" onClick={() => setPreviewAngle(null)}>
                ปิด
              </Button>
              <Button
                icon={<Wand2 className="h-4 w-4" />}
                disabled={!hasKey}
                loading={usingAngleId === previewAngle.id}
                onClick={() => {
                  const a = previewAngle;
                  setPreviewAngle(null);
                  void handleUseAngle(a);
                }}
              >
                ใช้มุมนี้
              </Button>
            </>
          ) : null
        }
      >
        {previewAngle && (
          <div className="space-y-4">
            <div>
              <Badge color={confidenceTier(previewAngle.confidence).color} variant="outline">
                {confidenceTier(previewAngle.confidence).label}
              </Badge>
            </div>
            <ConfidenceBar value={previewAngle.confidence} />
            <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <div className="text-[11px] font-semibold text-slate-400">แนวทาง / เหตุผล</div>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                  {previewAngle.rationale}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <LayoutTemplate className="h-4 w-4 text-violet-500" />
              <span className="text-slate-400">รูปแบบที่แนะนำ:</span>
              <span className="font-medium text-slate-700">{previewAngle.format}</span>
            </div>
            <p className="text-xs text-slate-400">
              กด “ใช้มุมนี้” เพื่อให้ AI ร่างแคปชั่น + แฮชแท็ก + ไอเดียภาพ แล้วส่งเข้าคิวรออนุมัติ
            </p>
          </div>
        )}
      </Modal>

      {/* Drafted post result modal */}
      <Modal
        open={draftResult !== null}
        onClose={() => setDraftResult(null)}
        leading={
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </span>
        }
        title="สร้างโพสต์เรียบร้อย"
        footer={
          draftResult ? (
            <>
              <Button variant="ghost" onClick={() => setDraftResult(null)}>
                ปิด
              </Button>
              <Link href="/approvals">
                <Button icon={<ArrowRight className="h-4 w-4" />}>ไปที่รออนุมัติ</Button>
              </Link>
            </>
          ) : null
        }
      >
        {draftResult && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={draftResult.post.status} />
              <PlatformIcons platforms={draftResult.post.platforms} />
              <span className="text-xs text-slate-400">
                จากมุม: {draftResult.angle.title}
              </span>
            </div>

            <div>
              <div className="mb-1 text-[11px] font-semibold text-slate-400">แคปชั่น</div>
              <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                {draftResult.post.caption}
              </p>
            </div>

            {draftResult.post.hashtags.length > 0 && (
              <div>
                <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                  <Hash className="h-3.5 w-3.5" /> แฮชแท็ก
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {draftResult.post.hashtags.map((tag) => (
                    <Badge key={tag} color="blue">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {draftResult.post.imageIdea && (
              <div>
                <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                  <ImageIcon className="h-3.5 w-3.5" /> ไอเดียภาพประกอบ
                </div>
                <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                  {draftResult.post.imageIdea}
                </p>
              </div>
            )}

            <p className="flex items-center gap-1 text-xs text-slate-400">
              <Eye className="h-3.5 w-3.5" />
              โพสต์ถูกบันทึกเป็น “รออนุมัติ” แล้ว — ตรวจและอนุมัติได้ที่หน้ารออนุมัติ
            </p>
          </div>
        )}
      </Modal>

      {/* Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

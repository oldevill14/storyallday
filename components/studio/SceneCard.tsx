'use client';

import { useState } from 'react';
import {
  Camera,
  Check,
  Clapperboard,
  Clock3,
  Copy,
  Film,
  ImageIcon,
  MapPin,
  MessageSquareText,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { videoPromptWithDialogue } from './types';
import type { Scene, SceneMedia } from './types';

type Props = {
  ep: number;
  sceneIndex: number;
  scene: Scene;
  aspectRatio: '9:16' | '16:9';
  /** Reference block (selected character[s]/product) prepended when copying prompts. */
  copyRefContext?: string;
  /** Holds the per-scene prompt-regeneration spinners. */
  media: SceneMedia;
  onSceneChange: (patch: Partial<Scene>) => void;
  /** Regenerate this scene's image/video prompt via AI (uses cast + product). */
  onRegenImage: () => void;
  onRegenVideo: () => void;
};

/** Small copy-to-clipboard button with a transient ✓. */
function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked — ignore */
        }
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-violet-700"
      title={`คัดลอก${label}`}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'คัดลอกแล้ว' : `คัดลอก ${label}`}
    </button>
  );
}

/** Prepend the selected character/product reference block to a prompt for copying. */
function withRef(ctx: string | undefined, prompt: string): string {
  return ctx && ctx.trim() ? `${ctx.trim()}\n\n${prompt}` : prompt;
}

const fieldLabel = 'mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500';
const textareaBase =
  'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 ' +
  'placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none ' +
  'focus:ring-2 focus:ring-violet-200 transition-colors resize-y';

export function SceneCard({
  ep,
  sceneIndex,
  scene,
  aspectRatio,
  copyRefContext,
  media,
  onSceneChange,
  onRegenImage,
  onRegenVideo,
}: Props) {
  // aspectRatio is kept in the props for parity with the export/JSON flow.
  void aspectRatio;
  const [showPrompts, setShowPrompts] = useState(false);

  const regenImg = !!media.regenImageLoading;
  const regenVid = !!media.regenVideoLoading;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header: EP / scene labels + duration */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge color="violet" variant="solid" icon={<Clapperboard className="h-3 w-3" />}>
          EP {ep}
        </Badge>
        <Badge color="blue" icon={<Film className="h-3 w-3" />}>
          ฉาก {sceneIndex + 1}
        </Badge>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400">
          <Clock3 className="h-3.5 w-3.5" />
          {scene.duration}
        </span>
      </div>

      <div className="space-y-3">
        {/* Setting (read-only) */}
        <div className="flex items-start gap-1.5 text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
          <span>
            <span className="font-medium text-slate-700">ฉาก:</span> {scene.setting}
            {scene.action ? <span className="text-slate-500"> — {scene.action}</span> : null}
          </span>
        </div>

        {/* Dialogue (editable) */}
        <div>
          <label className={fieldLabel}>
            <MessageSquareText className="h-3.5 w-3.5" /> บทพูด (ไทย)
          </label>
          <textarea
            rows={2}
            value={scene.dialogue}
            onChange={(e) => onSceneChange({ dialogue: e.target.value })}
            placeholder="บทพูดของตัวละคร…"
            className={textareaBase}
          />
        </div>

        {/* Prompts toggle */}
        <button
          type="button"
          onClick={() => setShowPrompts((v) => !v)}
          className="text-xs font-medium text-violet-600 hover:text-violet-700"
        >
          {showPrompts ? 'ซ่อน prompt ภาพ/วิดีโอ' : 'แก้ไข prompt ภาพ/วิดีโอ (อังกฤษ)'}
        </button>

        {showPrompts && (
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className={fieldLabel + ' mb-0'}>
                  <ImageIcon className="h-3.5 w-3.5" /> Visual prompt (image)
                </label>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={onRegenImage}
                    disabled={regenImg}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-50"
                    title="ให้ AI เขียน prompt ภาพใหม่ (รวมตัวละคร+สินค้า)"
                  >
                    <RefreshCw className={'h-3 w-3' + (regenImg ? ' animate-spin' : '')} />
                    {regenImg ? 'กำลังเขียน…' : 'Regen'}
                  </button>
                  <CopyBtn text={withRef(copyRefContext, scene.visualPrompt)} label="prompt ภาพ" />
                </div>
              </div>
              <textarea
                rows={3}
                value={scene.visualPrompt}
                onChange={(e) => onSceneChange({ visualPrompt: e.target.value })}
                className={textareaBase + ' font-mono text-xs leading-relaxed'}
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className={fieldLabel + ' mb-0'}>
                  <Camera className="h-3.5 w-3.5" /> Video prompt (image-to-video)
                </label>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={onRegenVideo}
                    disabled={regenVid}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-50"
                    title="ให้ AI เขียน prompt วิดีโอใหม่ (รวมตัวละคร+สินค้า)"
                  >
                    <RefreshCw className={'h-3 w-3' + (regenVid ? ' animate-spin' : '')} />
                    {regenVid ? 'กำลังเขียน…' : 'Regen'}
                  </button>
                  <CopyBtn text={withRef(copyRefContext, videoPromptWithDialogue(scene))} label="prompt วิดีโอ" />
                </div>
              </div>
              <textarea
                rows={3}
                value={scene.videoPrompt}
                onChange={(e) => onSceneChange({ videoPrompt: e.target.value })}
                className={textareaBase + ' font-mono text-xs leading-relaxed'}
              />
            </div>
          </div>
        )}

        {/* คัดลอก prompt (เอาไปสร้างภาพ/วิดีโอเองที่ Grok / ChatGPT) */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            คัดลอก prompt
          </span>
          <CopyBtn text={withRef(copyRefContext, scene.visualPrompt)} label="ภาพ" />
          <CopyBtn text={withRef(copyRefContext, videoPromptWithDialogue(scene))} label="วิดีโอ" />
        </div>
      </div>
    </div>
  );
}

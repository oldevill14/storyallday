'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Camera,
  Clapperboard,
  Clock3,
  Film,
  ImageIcon,
  MapPin,
  MessageSquareText,
  Sparkles,
} from 'lucide-react';
import { Badge, Button, Spinner } from '@/components/ui';
import type { ImageProvider, Scene, SceneMedia } from './types';

type Props = {
  ep: number;
  sceneIndex: number;
  scene: Scene;
  media: SceneMedia;
  onSceneChange: (patch: Partial<Scene>) => void;
  onMediaChange: (patch: Partial<SceneMedia>) => void;
  onGenerateImage: () => void;
  onGenerateVideo: () => void;
};

const fieldLabel = 'mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500';
const textareaBase =
  'w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 ' +
  'placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none ' +
  'focus:ring-2 focus:ring-violet-200 transition-colors resize-y';

export function SceneCard({
  ep,
  sceneIndex,
  scene,
  media,
  onSceneChange,
  onMediaChange,
  onGenerateImage,
  onGenerateVideo,
}: Props) {
  const [showPrompts, setShowPrompts] = useState(false);

  const imageLoading = media.imageStatus === 'loading';
  const videoLoading = media.videoStatus === 'loading';
  const busy = imageLoading || videoLoading;

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: text + editable fields */}
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
                <label className={fieldLabel}>
                  <ImageIcon className="h-3.5 w-3.5" /> Visual prompt (image)
                </label>
                <textarea
                  rows={3}
                  value={scene.visualPrompt}
                  onChange={(e) => onSceneChange({ visualPrompt: e.target.value })}
                  className={textareaBase + ' font-mono text-xs leading-relaxed'}
                />
              </div>
              <div>
                <label className={fieldLabel}>
                  <Camera className="h-3.5 w-3.5" /> Video prompt (image-to-video)
                </label>
                <textarea
                  rows={3}
                  value={scene.videoPrompt}
                  onChange={(e) => onSceneChange({ videoPrompt: e.target.value })}
                  className={textareaBase + ' font-mono text-xs leading-relaxed'}
                />
              </div>
            </div>
          )}

          {/* Generate controls */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Provider dropdown for image */}
            <select
              value={media.imageProvider}
              onChange={(e) => onMediaChange({ imageProvider: e.target.value as ImageProvider })}
              disabled={busy}
              aria-label="ผู้ให้บริการสร้างรูปภาพ"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:opacity-50"
            >
              <option value="grok">Grok</option>
              <option value="chatgpt">ChatGPT</option>
            </select>

            <Button
              size="sm"
              variant="soft"
              icon={<ImageIcon className="h-4 w-4" />}
              loading={imageLoading}
              disabled={busy}
              onClick={onGenerateImage}
            >
              สร้างรูปภาพ
            </Button>

            <Button
              size="sm"
              variant="outline"
              icon={<Film className="h-4 w-4" />}
              loading={videoLoading}
              disabled={busy}
              onClick={onGenerateVideo}
            >
              สร้างวิดีโอ
            </Button>
          </div>
        </div>

        {/* Right: preview area (9:16) */}
        <div className="flex flex-col gap-2">
          <div className="relative mx-auto flex aspect-[9/16] w-full max-w-[220px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-violet-50/40">
            {/* Video wins if present */}
            {media.videoDataUrl ? (
              <video
                controls
                src={media.videoDataUrl}
                className="h-full w-full object-cover"
              />
            ) : media.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media.imageDataUrl}
                alt={`พรีวิว EP${ep} ฉาก ${sceneIndex + 1}`}
                className="h-full w-full object-cover"
              />
            ) : busy ? (
              <div className="flex flex-col items-center gap-2 px-4 text-center">
                <Spinner size={22} />
                <p className="text-[11px] leading-snug text-slate-500">
                  {imageLoading
                    ? `กำลังเจนภาพผ่าน ${media.imageProvider === 'grok' ? 'Grok' : 'ChatGPT'}…\nอย่าปิดหน้านี้ ~1-2 นาที`
                    : 'กำลังเจนวิดีโอผ่าน Grok…\nอย่าปิดหน้านี้ ~3-7 นาที'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 px-4 text-center text-slate-300">
                <Sparkles className="h-7 w-7" />
                <p className="text-[11px] text-slate-400">พรีวิวภาพ/วิดีโอจะแสดงที่นี่</p>
              </div>
            )}
          </div>

          {/* Inline errors */}
          {media.imageStatus === 'error' && media.imageError && (
            <p className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              ภาพ: {media.imageError}
            </p>
          )}
          {media.videoStatus === 'error' && media.videoError && (
            <p className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              วิดีโอ: {media.videoError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

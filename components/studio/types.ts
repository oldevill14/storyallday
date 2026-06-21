// components/studio/types.ts — shared shapes for the Cine Studio (WorkD-Cine pipeline).

/** Visual style presets — the value is prepended to every image prompt (English). */
export type VisualStyle =
  | 'Photorealistic'
  | '3D Pixar'
  | 'Ghibli'
  | 'Cyberpunk'
  | 'Anime Shinkai'
  | 'Vintage Film';

/** A character in the drama (adults only — enforced in the system prompt). */
export type Character = {
  name: string;
  description: string;
};

/** A single scene inside an episode. */
export type Scene = {
  /** Where it happens. */
  setting: string;
  /** What happens (action description). */
  action: string;
  /** Spoken line — Thai. */
  dialogue: string;
  /** Image prompt (English, starts with the visual style). */
  visualPrompt: string;
  /** Image-to-video direction (English, camera + dialogue in quotes). */
  videoPrompt: string;
  /** Target clip length, e.g. "8s". */
  duration: string;
};

/** One episode = an ordered list of scenes. */
export type Episode = {
  ep: number;
  scenes: Scene[];
};

/** Full generated drama. */
export type Drama = {
  title: string;
  logline: string;
  characters: Character[];
  episodes: Episode[];
};

/** Form inputs for STEP A. */
export type StudioForm = {
  title: string;
  topic: string;
  episodeCount: 1 | 3 | 5;
  scenesPerEpisode: 1 | 3 | 5;
  style: VisualStyle;
  aspectRatio: '9:16';
};

/** Provider for image generation (maps to the ai-flow profiles). */
export type ImageProvider = 'grok' | 'chatgpt';

/** Per-scene media state (keyed by `ep-sceneIndex`). */
export type SceneMediaStatus = 'idle' | 'loading' | 'done' | 'error';

export type SceneMedia = {
  imageStatus: SceneMediaStatus;
  imageDataUrl?: string;
  imageError?: string;
  imageProvider: ImageProvider;

  videoStatus: SceneMediaStatus;
  videoDataUrl?: string;
  videoError?: string;
};

export const VISUAL_STYLES: VisualStyle[] = [
  'Photorealistic',
  '3D Pixar',
  'Ghibli',
  'Cyberpunk',
  'Anime Shinkai',
  'Vintage Film',
];

/** Thai labels for the style chips. */
export const STYLE_LABELS: Record<VisualStyle, string> = {
  Photorealistic: 'เสมือนจริง (Photorealistic)',
  '3D Pixar': '3D พิกซาร์ (3D Pixar)',
  Ghibli: 'จิบลิ (Ghibli)',
  Cyberpunk: 'ไซเบอร์พังก์ (Cyberpunk)',
  'Anime Shinkai': 'อนิเมะ ชินไก (Anime Shinkai)',
  'Vintage Film': 'ฟิล์มวินเทจ (Vintage Film)',
};

/** Stable key for a scene's media slot. */
export function sceneKey(ep: number, sceneIndex: number): string {
  return `${ep}-${sceneIndex}`;
}

/** Default empty media slot. */
export function emptyMedia(provider: ImageProvider = 'grok'): SceneMedia {
  return {
    imageStatus: 'idle',
    imageProvider: provider,
    videoStatus: 'idle',
  };
}

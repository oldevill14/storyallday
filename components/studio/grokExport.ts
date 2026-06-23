// components/studio/grokExport.ts
// แปลง Drama ที่สร้างแล้ว → ไฟล์ JSON "สตอรีบอร์ด" สำหรับส่งให้ Grok agent ไปเจนคลิป
// (ใช้ image-to-video ต่อ scene แล้วต่อเป็นคลิปเดียว).

import {
  videoPromptWithDialogue,
  SALES_STYLE_META,
  type Drama,
  type StudioForm,
} from './types';

/**
 * Build a Grok-agent-ready storyboard object from a generated drama + the form.
 * `refContext` = a reference block describing the selected character(s)/product
 * (kept in continuity so every scene references the same cast/refs).
 */
export function buildGrokStoryboard(
  drama: Drama,
  form: StudioForm,
  isSales: boolean,
  refContext?: string,
) {
  const scenes: Array<Record<string, unknown>> = [];
  let order = 0;
  for (const epi of drama.episodes) {
    epi.scenes.forEach((sc, i) => {
      order += 1;
      scenes.push({
        id: `ep${epi.ep}_scene${i + 1}`,
        order,
        episode: epi.ep,
        scene_no: i + 1,
        duration: sc.duration,
        setting: sc.setting,
        action: sc.action,
        dialogue_th: sc.dialogue,
        image_prompt: sc.visualPrompt,
        // วิดีโอ prompt ที่ "รวมบทพูด" ไว้แล้ว (ฝังในเครื่องหมายคำพูด)
        video_prompt: videoPromptWithDialogue(sc),
      });
    });
  }

  return {
    schema_version: '1.0',
    project: {
      title: drama.title,
      logline: drama.logline,
      visual_style: form.style,
      aspect_ratio: form.aspectRatio,
      total_episodes: drama.episodes.length,
      total_scenes: scenes.length,
      ...(isSales && (form.productName || form.productDetail)
        ? { product: { name: form.productName, detail: form.productDetail } }
        : {}),
      ...(isSales ? { sales_style: SALES_STYLE_META[form.salesStyle].label } : {}),
    },
    generation_defaults: {
      engine: 'grok-imagine',
      mode: 'image-to-video (สร้างภาพ keyframe ต่อ scene จาก image_prompt แล้ว animate ด้วย video_prompt)',
      aspect_ratio: form.aspectRatio,
      negative_prompt:
        'inconsistent character, face/outfit change between scenes, style change, watermark, text artifacts, distorted faces, extra limbs, flicker, low quality, blurry',
    },
    continuity: {
      characters: drama.characters.map((c) => ({ name: c.name, description: c.description })),
      style_lock: `Keep the "${form.style}" visual style and every character's identity, face and outfit identical across all scenes. The Thai spoken line is embedded in each video_prompt in quotes.`,
      ...(refContext && refContext.trim() ? { reference: refContext.trim() } : {}),
    },
    scenes,
    assembly: {
      order: scenes.map((s) => s.id),
      edit_notes:
        'สำหรับแต่ละ scene: (1) สร้างภาพ keyframe จาก image_prompt (2) ทำ image-to-video ด้วย video_prompt (มีบทพูดไทยฝังในเครื่องหมายคำพูดแล้ว) ความยาวตาม duration (3) ต่อทุก scene ตามลำดับ order เป็นคลิปเดียว',
      desired_final_format: 'mp4',
    },
  };
}

/** Trigger a browser download of an object as a pretty-printed .json file. */
export function downloadStoryboardJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

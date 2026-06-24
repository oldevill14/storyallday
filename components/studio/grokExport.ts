// components/studio/grokExport.ts
// แปลง Drama ที่สร้างแล้ว → ไฟล์ JSON "สตอรีบอร์ด" สำหรับส่งให้ Grok agent ไปเจนคลิป
// (ใช้ image-to-video ต่อ scene แล้วต่อเป็นคลิปเดียว).

import {
  videoPromptWithDialogue,
  SALES_STYLE_META,
  type Drama,
  type StudioForm,
} from './types';

/** A selected reference image embedded into the storyboard (data URL + which entity). */
export type RefImage = {
  order: number;
  kind: 'character' | 'product';
  name: string;
  /** data:image/...;base64 — the actual selected reference image. */
  image: string;
};

/**
 * Build a Grok-agent-ready storyboard object from a generated drama + the form.
 * `refContext` = a text reference block describing the selected character(s)/product.
 * `refImages` = the ACTUAL selected reference images (data URLs, in attach order) so
 * the storyboard is self-contained — the agent has the real images, not just text.
 */
export function buildGrokStoryboard(
  drama: Drama,
  form: StudioForm,
  isSales: boolean,
  refContext?: string,
  refImages?: RefImage[],
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
        // ตัวละครในฉาก + โน้ตความต่อเนื่องจากฉากก่อน (ช่วย agent เชื่อมช็อต)
        ...(sc.characters?.length ? { characters: sc.characters } : {}),
        ...(sc.continuity ? { continuity: sc.continuity } : {}),
        // ฉากนี้ "ต้องใช้รูปอ้างอิงหมายเลขไหน" — ตัวละครที่อยู่ในฉาก + สินค้า (อ้างอิง 100%)
        ...(() => {
          if (!refImages?.length) return {};
          const present = refImages.filter(
            (ri) => ri.kind === 'product' || !sc.characters?.length || sc.characters.includes(ri.name),
          );
          return present.length
            ? { use_reference_images: present.map((r) => ({ order: r.order, name: r.name })) }
            : {};
        })(),
        // image_prompt/video_prompt ฝัง "บล็อกความต่อเนื่อง" (look + อัตลักษณ์ตัวละคร) ไว้แล้ว
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
      characters: drama.characters.map((c) => ({
        name: c.name,
        description: c.description,
        ...(c.appearance ? { appearance: c.appearance } : {}),
      })),
      ...(drama.styleBible ? { style_bible: drama.styleBible } : {}),
      style_lock: `Keep the "${form.style}" visual style${
        drama.styleBible ? ' and the locked style_bible look' : ''
      } and every character's identity, face and outfit identical across all scenes. The story is ONE continuous timeline — each scene continues from the previous one (see each scene's "continuity" note). The Thai spoken line is embedded in each video_prompt in quotes.`,
      ...(refContext && refContext.trim() ? { reference: refContext.trim() } : {}),
      // รูปอ้างอิงจริง (data URL) ของตัวละคร/สินค้าที่เลือก เรียงตามลำดับ image 1,2,…
      ...(refImages && refImages.length ? { reference_images: refImages } : {}),
      // คำสั่งบังคับอ้างอิง 100% (image-to-image เข้ม — รูปชนะ text เสมอ)
      ...(refImages && refImages.length
        ? {
            reference_lock:
              'STRICT 100% image-to-image. Each item in reference_images is the ABSOLUTE source of truth for that subject. In EVERY scene, reproduce each referenced character/product PIXEL-FAITHFULLY — same face, skin tone, hairstyle, outfit, shape, label and colors. The reference image always overrides any text description. Each scene lists the exact images to use in its "use_reference_images". NEVER restyle, re-age, beautify, swap, crop out or redesign a referenced subject; only pose, expression, camera angle and background may change between scenes.',
          }
        : {}),
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

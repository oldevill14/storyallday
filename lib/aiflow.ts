// lib/aiflow.ts — SERVER-ONLY helper that drives the local `ai-flow` CLI.
//
// `ai-flow` (a bash script) automates the user's logged-in playwright browser
// profiles (ChatGPT / Grok) to generate images & video. Those browser sessions
// are INDEPENDENT of the app's Firebase auth — this module just execs the CLI.
//
// HARD CONSTRAINT: ai-flow CANNOT run two playwright jobs at once (they share a
// single browser profile and would corrupt each other). So every call here is
// pushed through a module-level Promise queue — strictly one CLI run at a time,
// app-wide.
//
// Do NOT add "use client" — this imports node:child_process / node:fs and must
// only ever run inside an API route (runtime = 'nodejs').

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const AI_FLOW_BIN = '/Users/mini/Desktop/KengOracle/bin/ai-flow';
const AI_FLOW_CWD = '/Users/mini/Desktop/KengOracle';

// --- single-flight serialization -------------------------------------------
// All ai-flow invocations chain off this tail promise, so only one runs at a
// time no matter how many requests arrive concurrently.
let queue: Promise<unknown> = Promise.resolve();

// module-level monotonic counter → unique temp filenames even within the same ms
let counter = 0;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  // attach to the tail; swallow the predecessor's result/rejection so one
  // failed job never poisons the next one in line.
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

type ExecResult = { stdout: string; stderr: string };

function execAiFlow(args: string[], timeout: number): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(
      AI_FLOW_BIN,
      args,
      {
        timeout,
        cwd: AI_FLOW_CWD,
        maxBuffer: 1 << 24, // 16 MB — base64 chunks / verbose logs can be large
        encoding: 'utf8',
      },
      (err, stdout, stderr) => {
        // We resolve even on non-zero exit: the CLI sometimes writes the file
        // then exits non-zero, and we'd rather check for the file first. The
        // caller throws with stdout/stderr if no output file materializes.
        if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(
            new Error(
              `ai-flow CLI not found at ${AI_FLOW_BIN}. ตรวจสอบว่าติดตั้ง ai-flow บนเครื่องนี้แล้ว`,
            ),
          );
          return;
        }
        const killed = (err as (Error & { killed?: boolean }) | null)?.killed;
        if (killed) {
          reject(
            new Error(
              `ai-flow หมดเวลา (timeout ${Math.round(timeout / 1000)}s) — งานสร้างสื่อใช้เวลานานเกินไป`,
            ),
          );
          return;
        }
        resolve({ stdout: stdout ?? '', stderr: stderr ?? '' });
      },
    );
  });
}

/**
 * Parse `Downloaded file ... to "<path>"` out of the CLI stdout. The grok-video
 * download path (and some playwright-cli saves) print this line; we use it as a
 * fallback when the expected out path doesn't exist after the run.
 */
function parseDownloadedPath(stdout: string): string | null {
  const m = stdout.match(/Downloaded file .* to "([^"]+)"/);
  return m ? m[1] : null;
}

/**
 * Run an ai-flow generation subcommand and return the absolute path of the file
 * it produced. Serialized across the whole process (see `enqueue`).
 *
 * @param sub     ai-flow subcommand: 'image' | 'grok-image' | 'grok-video'
 * @param prompt  English prompt for the generator
 * @param outExt  output extension WITHOUT the dot: 'png' | 'jpg' | 'mp4'
 * @returns       absolute path to the generated file on disk
 */
export function runAiFlow(sub: string, prompt: string, outExt: string): Promise<string> {
  return enqueue(async () => {
    const ext = outExt.replace(/^\./, '');
    // compute timestamp at call time (inside the queued task), plus a counter,
    // for a collision-proof temp filename.
    const id = `${Date.now()}_${counter++}`;
    const outPath = path.join(os.tmpdir(), `saf_${id}.${ext}`);

    const timeout = ext === 'mp4' ? 420_000 : 180_000;

    const { stdout, stderr } = await execAiFlow([sub, prompt, outPath], timeout);

    // 1) expected path written directly (image / grok-image / grok-video all do this)
    if (await fileExists(outPath)) return outPath;

    // 2) fallback: CLI printed a "Downloaded file ... to <path>" line
    const downloaded = parseDownloadedPath(stdout);
    if (downloaded && (await fileExists(downloaded))) return downloaded;

    // 3) nothing produced → surface the CLI's own message (stderr preferred)
    const detail = (stderr.trim() || stdout.trim() || 'ai-flow ไม่ได้สร้างไฟล์ผลลัพธ์').slice(-2000);
    throw new Error(detail);
  });
}

/** Decode a base64 image data URL to a temp file; returns its absolute path. */
async function dataUrlToTempFile(dataUrl: string): Promise<string> {
  const m = /^data:(image\/(png|jpe?g|webp));base64,(.+)$/i.exec(dataUrl);
  if (!m) throw new Error('รูปอ้างอิงไม่ถูกต้อง (ต้องเป็น data URL ของรูปภาพ)');
  const sub = m[2].toLowerCase();
  const ext = sub.startsWith('jp') ? 'jpg' : sub;
  const id = `${Date.now()}_${counter++}`;
  const p = path.join(os.tmpdir(), `saf_ref_${id}.${ext}`);
  await fs.writeFile(p, Buffer.from(m[3], 'base64'));
  return p;
}

/**
 * Generate an image FROM a reference image (image-to-image) via ai-flow.
 *   engine 'chatgpt' → `image-ref`      (ChatGPT /images → PNG, detailed)
 *   engine 'grok'    → `grok-image-ref` (Grok Imagine → JPG, faster)
 * Writes the ref to a temp file, runs the CLI, returns the produced file path.
 * Serialized like every other ai-flow call.
 */
export function runAiFlowImageRef(
  prompt: string,
  refDataUrl: string,
  engine: 'chatgpt' | 'grok' = 'chatgpt',
): Promise<string> {
  return enqueue(async () => {
    const refPath = await dataUrlToTempFile(refDataUrl);
    const sub = engine === 'grok' ? 'grok-image-ref' : 'image-ref';
    const ext = engine === 'grok' ? 'jpg' : 'png';
    const id = `${Date.now()}_${counter++}`;
    const outPath = path.join(os.tmpdir(), `saf_sheet_${id}.${ext}`);
    try {
      const { stdout, stderr } = await execAiFlow(
        [sub, prompt, refPath, outPath],
        300_000,
      );
      if (await fileExists(outPath)) return outPath;
      const detail = (stderr.trim() || stdout.trim() || 'ai-flow ไม่ได้สร้างไฟล์ผลลัพธ์').slice(-2000);
      throw new Error(detail);
    } finally {
      void fs.unlink(refPath).catch(() => {});
    }
  });
}

/**
 * Generate a VIDEO from a start-frame image (image-to-video) via ai-flow's
 * `grok-video-ref` (Grok Imagine, Video mode). Locks the character from the
 * supplied frame. Serialized; ~6 min timeout for mp4.
 */
export function runAiFlowVideoRef(prompt: string, refDataUrl: string): Promise<string> {
  return enqueue(async () => {
    const refPath = await dataUrlToTempFile(refDataUrl);
    const id = `${Date.now()}_${counter++}`;
    const outPath = path.join(os.tmpdir(), `saf_vidref_${id}.mp4`);
    try {
      const { stdout, stderr } = await execAiFlow(
        ['grok-video-ref', prompt, refPath, outPath],
        420_000,
      );
      if (await fileExists(outPath)) return outPath;
      const downloaded = parseDownloadedPath(stdout);
      if (downloaded && (await fileExists(downloaded))) return downloaded;
      const detail = (stderr.trim() || stdout.trim() || 'ai-flow ไม่ได้สร้างไฟล์ผลลัพธ์').slice(-2000);
      throw new Error(detail);
    } finally {
      void fs.unlink(refPath).catch(() => {});
    }
  });
}

async function fileExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

/**
 * Read a generated file as a base64 `data:` URL, then unlink it (best-effort).
 * The MIME type is derived from the file extension.
 */
export async function fileToDataUrlAndUnlink(filePath: string): Promise<string> {
  try {
    const buf = await fs.readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } finally {
    // never let cleanup failure mask a successful read
    void fs.unlink(filePath).catch(() => {});
  }
}

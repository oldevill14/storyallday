# Story AI (storyallday) — Foundation SPEC

> Contract for feature-page agents. If you read ONLY this file + `lib/types.ts`,
> you can build a feature page correctly. The foundation type-checks clean
> (`npx tsc --noEmit`). Do **not** modify foundation files (listed below) or
> `app/page.tsx` (Dashboard agent owns it).

---

## 1. Tech rules (HARD — do not break)

- **Next.js 16** App Router. Pages live in `app/<route>/page.tsx`. **No `src/` dir.**
- **React 19** + **TypeScript** (`strict`). Import alias `@/*` → repo root (e.g. `@/lib/store`, `@/components/ui`).
- **Tailwind CSS v4** — `app/globals.css` uses `@import "tailwindcss";` + `@theme { … }`. **There is NO `tailwind.config.js`.** Use Tailwind's built-in palette directly in JSX: `violet-600`, `blue-600`, `indigo`, `slate`, `emerald-500`, `amber-500`, `rose`. Gradients like `bg-gradient-to-r from-violet-600 to-blue-600`.
- Any **interactive component or page** (uses hooks, store, events) MUST start with `"use client";` on the first line. The zustand store is client-only.
- **Do NOT** run `npm install`, `npm run dev`, or `npm run build`. **Do NOT** add deps. Available deps: `zustand`, `lucide-react` (icons), `date-fns`, `clsx`.
- **lucide-react is v1.x** — it does NOT ship `Facebook` / `Instagram` brand icons. Use `<PlatformIcons>` / `<PlatformIcon>` from the UI kit for platform marks.
- **Thai UI throughout.** Font is Noto Sans Thai, already wired in `app/layout.tsx` (`lang="th"`). Don't re-add fonts.
- API routes: `app/api/<name>/route.ts` with `export const runtime = 'nodejs'` + `export async function POST(req: Request) {…}`.

---

## 2. File ownership

### Foundation (DO NOT EDIT — owned by foundation engineer)
```
lib/types.ts                 lib/store.ts            lib/seed.ts
lib/ai.ts                    app/api/ai/route.ts
app/layout.tsx               app/globals.css         SPEC.md
components/Sidebar.tsx       components/TopBar.tsx
components/ui/*              (Button, Card, Badge, StatCard, PageHeader,
                              Mascot, ConfidenceBar, Spinner, EmptyState,
                              StatusChip, PlatformIcons, index.ts)
```

### Routes / feature pages (one agent each — create the `page.tsx`)
| Route | File | Sidebar label | Owner |
|---|---|---|---|
| `/` | `app/page.tsx` | หน้าแรก / AI แนะนำ | **Dashboard agent** (do not touch from other agents) |
| `/create` | `app/create/page.tsx` | สร้างด้วยตัวเอง | Create agent |
| `/approvals` | `app/approvals/page.tsx` | รออนุมัติ (badge = pending count) | Approvals agent |
| `/calendar` | `app/calendar/page.tsx` | ปฏิทินโพสต์ | Calendar agent |
| `/library` | `app/library/page.tsx` | คลังโพสต์ | Library agent |
| `/brand` | `app/brand/page.tsx` | แบรนด์ของฉัน | Brand agent |
| `/connections` | `app/connections/page.tsx` | การเชื่อมต่อ | Connections agent |
| `/settings` | `app/settings/page.tsx` | ตั้งค่า | Settings agent |

The Sidebar links to all of these. Until a page is created, its link 404s on
navigation — that's expected; just build your own `page.tsx`.

---

## 3. Types (`lib/types.ts`)

```ts
type Provider = 'openai' | 'anthropic' | 'gemini' | 'zai';

type AISettings = { provider: Provider; apiKey: string; model: string; baseUrl?: string };

type Brand = {
  name: string; business: string; tone: string;
  language: string; audience: string; keywords: string[];
};

type Platform = 'facebook' | 'instagram' | 'line';

type PostStatus = 'pending' | 'scheduled' | 'published' | 'draft';

type Angle = {
  id: string; title: string; category: string; // 'สำหรับคุณ'|'เทรนด์วันนี้'|'ให้ความรู้'|'เทศกาล'|'โลคัลสไตล์'
  confidence: number;  // 0-100
  rationale: string; format: string; createdAt: string; // ISO
};

type Post = {
  id: string; title: string; caption: string; hashtags: string[];
  platforms: Platform[]; status: PostStatus;
  scheduledAt?: string;  // ISO
  createdAt: string;     // ISO
  angleId?: string; imageIdea?: string;
};

type AIMessage = { role: 'user' | 'assistant' | 'system'; content: string };
type AIProxyRequest = { provider; apiKey; model; baseUrl?; system?; messages: AIMessage[] };
type AIProxyResponse = { text: string } | { error: string };
```

---

## 4. Store (`lib/store.ts`) — zustand + persist

Import: `import { useStore, useHydrated } from '@/lib/store';`
(`StoreHydrator` is already mounted in the layout — do NOT mount it again.)

### State
```ts
{
  settings: AISettings;  // default { provider:'zai', apiKey:'', model:'glm-4.6', baseUrl:'' }
  brand: Brand;          // seeded from lib/seed.ts on first load
  angles: Angle[];       // seeded
  posts: Post[];         // seeded
}
```
Persisted to `localStorage` key **`storyallday`**. On first load (empty storage),
seed data from `lib/seed.ts` is used.

### Actions
```ts
setSettings(patch: Partial<AISettings>): void   // merges
setBrand(patch: Partial<Brand>): void           // merges
addAngles(angles: Angle[]): void                // prepends
removeAngle(id: string): void
addPost(post: Post): void                       // prepends (newest first)
updatePost(id: string, patch: Partial<Post>): void
removePost(id: string): void
```

### Reading / writing (selectors avoid extra re-renders)
```tsx
const posts = useStore((s) => s.posts);
const addPost = useStore((s) => s.addPost);
const pending = useStore((s) => s.posts.filter((p) => p.status === 'pending'));
```

### HYDRATION (IMPORTANT — read this)
zustand `persist` is client-only and uses `skipHydration: true`. On the server
and the first client render, the store holds the **seed defaults**; the real
localStorage values are merged in after mount. To avoid hydration mismatches,
**gate UI that reads persisted state behind `useHydrated()`**:

```tsx
'use client';
import { useStore, useHydrated } from '@/lib/store';
import { Spinner } from '@/components/ui';

export default function MyPage() {
  const hydrated = useHydrated();
  const posts = useStore((s) => s.posts);
  if (!hydrated) {
    return <div className="flex justify-center py-20"><Spinner label="กำลังโหลด…" /></div>;
  }
  return <>{/* render with persisted posts */}</>;
}
```
Rendering seed data without gating is acceptable visually, but writes (add/update)
should happen after hydration so you don't clobber persisted state.

### ID helper
There's no exported id helper. Generate ids inline, e.g.:
```ts
const id = `post-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
```

---

## 5. AI helpers (`lib/ai.ts`) — client

```ts
callAI(opts: { system?: string; prompt: string }, settings: AISettings): Promise<string>
// POSTs to /api/ai with one user message; returns normalized text; throws Error on { error }.

parseJSON<T = unknown>(raw: string): T
// Strips ``` fences, extracts the outer {…}/[…], JSON.parses; throws clear Error on failure.

suggestAngles(brand: Brand, settings: AISettings): Promise<Angle[]>
// Thai strategist prompt → 5 angles, mapped to Angle[] (id + createdAt filled, confidence clamped 0-100).

draftPost(angle: Angle, brand: Brand, settings: AISettings): Promise<{ caption: string; hashtags: string[]; imageIdea: string }>
// Thai copywriter prompt → caption (hook+CTA), 3-6 hashtags (# prefixed), imageIdea.
```
All four **throw `Error`** on failure (missing key, network, malformed JSON,
empty result) — wrap calls in `try/catch` and show the `error.message` (Thai-friendly).

Typical flow on a page:
```tsx
const settings = useStore((s) => s.settings);
const brand = useStore((s) => s.brand);
const addAngles = useStore((s) => s.addAngles);
try {
  const angles = await suggestAngles(brand, settings);
  addAngles(angles);
} catch (e) {
  setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
}
```

---

## 6. AI proxy (`app/api/ai/route.ts`)

`POST /api/ai`, `runtime = 'nodejs'`.

**Request** `{ provider, apiKey, model, baseUrl?, system?, messages: [{role,content}] }`
**Response** `{ text }` (200) or `{ error }` (400 validation / 502 provider/network).

Validation: missing/unknown `provider` → 400; missing `apiKey` → 400; missing
`model` → 400; `messages` not array → 400. Provider/network failure → 502 with
the provider's message when available.

Provider mapping (handled server-side; you don't call providers directly):
- **openai** → `(baseUrl||https://api.openai.com)/v1/chat/completions`, `Authorization: Bearer`.
- **anthropic** → `(baseUrl||https://api.anthropic.com)/v1/messages`, `x-api-key` + `anthropic-version: 2023-06-01`, `max_tokens: 2048`.
- **zai** → same as anthropic, default baseUrl `https://api.z.ai/api/anthropic` (GLM; e.g. `glm-4.6`).
- **gemini** → `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent?key=<apiKey>`.

Most pages should use `lib/ai.ts` (`callAI` / `suggestAngles` / `draftPost`)
rather than calling `/api/ai` directly.

---

## 7. UI kit (`components/ui/`)

Import from the barrel: `import { Button, Card, StatusChip } from '@/components/ui';`
(or per-file: `import { Button } from '@/components/ui/Button';`).

### `<Button>` (`"use client"`, forwardRef)
```ts
props: ButtonHTMLAttributes & {
  variant?: 'gradient' | 'outline' | 'ghost' | 'soft';   // default 'gradient'
  size?: 'sm' | 'md' | 'lg';                              // default 'md'
  loading?: boolean;     // shows spinner, disables
  icon?: ReactNode;      // leading icon (hidden while loading)
}
```
`gradient` = violet→blue filled (primary). Rounded-full pill. Example:
`<Button icon={<Plus className="h-4 w-4" />}>สร้างโพสต์</Button>`

### `<Card>`
```ts
props: HTMLAttributes<HTMLDivElement> & { padded?: boolean /*default true*/; hoverable?: boolean }
```
White, `rounded-2xl`, `border-slate-200`, soft shadow. The base surface.

### `<Badge>`
```ts
props: {
  color?: 'violet'|'blue'|'indigo'|'emerald'|'amber'|'rose'|'slate';  // default 'violet'
  variant?: 'soft'|'solid'|'outline';   // default 'soft'
  icon?: ReactNode; children?: ReactNode;
}
```
Small rounded-full pill label. (For post statuses use `<StatusChip>` instead.)

### `<StatCard>`
```ts
props: {
  icon: ComponentType<LucideProps>;   // pass the component, e.g. icon={Calendar}
  value: ReactNode; label: ReactNode; caption?: ReactNode;
  color?: 'violet'|'blue'|'emerald'|'amber'|'indigo'|'rose';   // default 'violet'
}
```
Icon-in-tinted-square + big number + label (+ optional caption). Matches the
calendar stat tiles. Example: `<StatCard icon={Calendar} value={6} label="โพสต์ทั้งหมด" caption="ใน 7 วัน" />`

### `<PageHeader>`
```ts
props: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }
```
Page title block with optional right-side `action` (buttons) and `eyebrow`
(badge above title). Use at the top of every feature page.

### `<Mascot>`
```ts
props: { size?: number /*px, default 40*/ }
```
Gradient circle with a lucide `Bot` — the Story AI robot.

### `<ConfidenceBar>`
```ts
props: { value: number /*0-100*/; label?: string /*default 'ความมั่นใจของ AI'*/; hidePercent?: boolean }
```
Label + violet→blue gradient progress bar + `%`. Use for `Angle.confidence`.

### `<Spinner>`
```ts
props: { size?: number /*px, default 20*/; label?: string }
```
Spinning loader (violet), optional label.

### `<EmptyState>`
```ts
props: { icon: ComponentType<LucideProps>; title: ReactNode; description?: ReactNode; action?: ReactNode }
```
Dashed-border placeholder. Example: `<EmptyState icon={Inbox} title="ยังไม่มีโพสต์" action={<Button>สร้างเลย</Button>} />`

### `<StatusChip>` + `STATUS_META`
```ts
props: { status: PostStatus; hideIcon?: boolean }
```
Maps `PostStatus` → Thai label + color + icon:
`pending`→"รออนุมัติ" (amber), `scheduled`→"ลงตารางแล้ว" (emerald),
`published`→"เผยแพร่แล้ว" (blue), `draft`→"ฉบับร่าง" (slate).
`STATUS_META[status]` exposes `{ label, className, icon }` if you need the parts.

### `<PlatformIcons>` / `<PlatformIcon>`
```ts
PlatformIcons props: { platforms: Platform[]; size?: number /*default 18*/ }
PlatformIcon  props: { platform: Platform; size?: number /*default 18*/ }
```
Renders each platform as a small brand-colored circle (FB blue, IG gradient,
LINE green) via inline SVG. **Use these instead of lucide for social marks.**

---

## 8. App shell & layout (already built)

`app/layout.tsx` renders: `<Sidebar/>` (left, hidden `md:` down) + `<TopBar/>`
(sticky top: BETA badge, "สร้างโพสต์ใหม่" gradient button → `/`, notifications,
account "เจ้าของเพจ Test") + `<main>` with `max-w-7xl` container and your page's
`children`. `<StoreHydrator/>` is mounted here. **Just export a default
component from your `page.tsx`** — it lands inside the main container. Don't add
your own sidebar/topbar/shell.

`components/Sidebar.tsx` reads live counts from the store (`/` shows total post
count, `/approvals` shows pending count) and highlights the active route via
`usePathname()`.

---

## 9. Design language

- **Background** light lavender/white: `bg-slate-50` (page). Cards `bg-white`.
- **Cards** `rounded-2xl border border-slate-200` + soft shadow (use `<Card>`).
- **Primary brand** violet→blue gradient: `bg-gradient-to-r from-violet-600 to-blue-600`.
  Accent text/icons `text-violet-600` & `text-blue-600`.
- **Status colors** success `emerald-500`, warning `amber-500`, info `blue-600`, danger `rose-500`.
- **Buttons** rounded-full pills (use `<Button>`). Primary = `gradient` variant.
- **Mascot** the lucide `Bot` in a gradient circle (`<Mascot>`).
- **Confidence** shown as a gradient `<ConfidenceBar>` 0-100.
- **Status** shown as `<StatusChip>`; brand pills as `<Badge>`.
- Generous padding (`p-5`+), Thai text, premium & modern, light theme only.

### Quick page skeleton
```tsx
'use client';
import { useStore, useHydrated } from '@/lib/store';
import { PageHeader, Card, Button, Spinner } from '@/components/ui';

export default function ExamplePage() {
  const hydrated = useHydrated();
  const posts = useStore((s) => s.posts);
  if (!hydrated) return <div className="flex justify-center py-20"><Spinner label="กำลังโหลด…" /></div>;
  return (
    <div className="space-y-6">
      <PageHeader title="หัวข้อหน้า" subtitle="คำอธิบายสั้นๆ" action={<Button>ปุ่มหลัก</Button>} />
      <Card>{/* content */}</Card>
    </div>
  );
}
```

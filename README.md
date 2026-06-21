# Story AI — สตอรี่ ออลเดย์

ผู้ช่วย AI สำหรับ "ครีเอเตอร์/เพจ/ร้านค้า" ที่อยากมีคอนเทนต์ลงโซเชียลทุกวันแบบไม่ต้องคิดเอง — AI ช่วยคิดมุมคอนเทนต์, เขียนแคปชั่น, ตั้งเวลาลงโพสต์ และจัดการคลังโพสต์ในที่เดียว ผ่านหน้าตาเว็บแอปภาษาไทยที่สะอาด ทันสมัย

> สร้างด้วย **Next.js 16** (App Router, static export) · **React 19** · **TypeScript** · **Tailwind CSS v4** · state ผ่าน **zustand** (เก็บใน localStorage) · auth + ข้อมูลผ่าน **Firebase** (Auth + Firestore)

**🌐 เว็บไลฟ์:** https://oldevill14.github.io/storyallday/

---

## การ Deploy (GitHub Pages)

แอปนี้ deploy เป็น **เว็บ static ล้วน** (ไม่มีเซิร์ฟเวอร์) บน **GitHub Pages** ที่
https://oldevill14.github.io/storyallday/

- `next.config.ts` ตั้ง `output: 'export'` → `next build` จะ emit ไฟล์ static ทั้งหมดไปที่ `./out`
- เสิร์ฟใต้ subpath `/storyallday/` (`basePath` + `assetPrefix` + `trailingSlash`), `images.unoptimized` เพราะไม่มี image server
- ทุกครั้งที่ push เข้า `main`, GitHub Actions (`.github/workflows/deploy.yml`) จะ `npm ci` → `npm run build` → อัปโหลด `./out` แล้ว deploy ขึ้น Pages อัตโนมัติ
- `public/.nojekyll` มีไว้ให้ Pages เสิร์ฟโฟลเดอร์ `_next/` (Jekyll ปกติจะข้ามโฟลเดอร์ขึ้นต้นด้วย `_`)
- **Login gate:** หน้าเว็บถูกล็อกด้วย **Firebase Auth** (Google + Email/Password); ข้อมูลผูกกับ **Firestore**
  - Firebase Web config เป็นข้อมูล public (ปลอดภัยที่จะอยู่ฝั่ง client) ฝังอยู่ใน `lib/firebase.ts`

> ตั้งค่าครั้งแรกใน repo settings: **Settings → Pages → Build and deployment → Source = GitHub Actions**

---

## แอปนี้ทำอะไรได้

- **หน้าแรก / AI แนะนำ** (`/`) — กดให้ AI เสนอ "มุมคอนเทนต์" ที่น่าโพสต์วันนี้ พร้อมแถบความมั่นใจ (confidence %) แล้วเลือกมุมที่ถูกใจเพื่อต่อยอดเป็นโพสต์เข้าคิวรออนุมัติ
- **รออนุมัติ** (`/approvals`) — รีวิว/แก้ไขแคปชั่น–แฮชแท็กแบบ inline, เลือกหลายโพสต์พร้อมกัน, ตั้งเวลาลงโพสต์ แล้วอนุมัติเข้าปฏิทิน
- **ปฏิทินโพสต์** (`/calendar`) — มองภาพรวมโพสต์ที่จัดตารางไว้แบบรายสัปดาห์
- **คลังโพสต์** (`/library`) — รวมโพสต์ทั้งหมด (ร่าง/รออนุมัติ/จัดตาราง/เผยแพร่แล้ว) เปิดดูรายละเอียด, คัดลอกแคปชั่น และสั่งให้ AI สร้างแคปชั่นใหม่ได้
- **แบรนด์ของฉัน** (`/brand`) — ตั้งค่าตัวตนแบรนด์ (ชื่อ, ประเภทธุรกิจ, โทนเสียง, กลุ่มเป้าหมาย, คีย์เวิร์ด) ซึ่ง AI จะใช้เป็นบริบทในการคิดคอนเทนต์ทั้งหมด
- **การเชื่อมต่อ** (`/connections`) — จัดการช่องทางโซเชียล (Facebook, Instagram, TikTok, X ฯลฯ) แบบ mock
- **ตั้งค่า** (`/settings`) — เลือกผู้ให้บริการ AI และใส่ API key (ดูหัวข้อด้านล่าง)

---

## วิธีรัน (Development)

ต้องมี **Node.js 20+**

```bash
npm install      # ติดตั้ง dependencies
npm run dev      # เปิด dev server
```

แล้วเปิดเบราว์เซอร์ที่ **http://localhost:3000/storyallday**
(แอปเสิร์ฟใต้ `basePath: /storyallday` ทั้งตอน dev และตอน deploy)

คำสั่งอื่น ๆ:

```bash
npm run build    # build → static export ที่โฟลเดอร์ ./out
npm run lint     # ตรวจ ESLint
```

> ไม่มีคำสั่ง `npm start` แล้ว เพราะเป็น static export (ไม่มีเซิร์ฟเวอร์ Node) — ถ้าจะพรีวิว build ในเครื่อง เสิร์ฟโฟลเดอร์ `./out` ด้วย static server ใด ๆ เช่น `npx serve out`

---

## การตั้งค่า AI (สำคัญ)

แอปนี้ **ไม่ผูกกับผู้ให้บริการ AI เจ้าใดเจ้าหนึ่ง** — คุณเลือกเองและใส่ API key ของคุณเองได้

ไปที่หน้า **ตั้งค่า** (`/settings`) แล้ว:

1. **เลือก provider** — รองรับ 5 เจ้า: **OpenAI** (GPT-4o / GPT-4.1) · **Anthropic** (Claude) · **Gemini** (Google AI) · **GLM (z.ai)** (`glm-4.6` ฯลฯ ผ่าน endpoint Anthropic-compatible ที่ `https://api.z.ai/api/anthropic`) · **OpenRouter** (100+ โมเดล มีตัวเลือกฟรี เลือกจาก picker พร้อมราคา)
2. **ใส่ API key** ของ provider นั้น (มีลิงก์ไปหน้าออกคีย์ของแต่ละเจ้าให้ในหน้าตั้งค่า)
3. (ไม่บังคับ) ปรับ **model** หรือ **base URL** เองได้ ถ้าใช้ gateway
4. กด **บันทึก** แล้วลอง **ทดสอบการเชื่อมต่อ** เพื่อเช็คว่าคีย์ใช้งานได้

หลังตั้งค่าเสร็จ ปุ่ม "ให้ AI แนะนำมุม" ในหน้าแรกและปุ่ม "สร้างแคปชั่นใหม่ด้วย AI" ในคลังโพสต์จะใช้งานได้ทันที

### ⚠️ AI ถูกเรียก "ตรงจากเบราว์เซอร์" (client-side)

แอปนี้เป็น static export จึง **ไม่มี API route / proxy ฝั่งเซิร์ฟเวอร์อีกต่อไป** — `lib/ai.ts` ยิงไปยัง provider โดยตรงจากเบราว์เซอร์ ผลที่ตามมา:

- **บนเว็บที่ deploy แล้ว (GitHub Pages)** ใช้ได้เฉพาะ **OpenRouter** และ **Gemini** เท่านั้น เพราะสอง provider นี้อนุญาต CORS จากเบราว์เซอร์
- **OpenAI / Anthropic / GLM (z.ai)** ถูก **บล็อกด้วย CORS** เมื่อเรียกตรงจากเบราว์เซอร์ — แอปจะ "พยายามเรียก" แต่จับ error แล้วแจ้งเป็นภาษาไทยให้หันไปใช้ OpenRouter/Gemini (provider เหล่านี้พอใช้งานได้บ้างตอนรันในเครื่องด้วย `npm run dev` ขึ้นกับ network/extension แต่ไม่รับประกัน)
- รายการโมเดล OpenRouter ใน picker ดึงตรงจาก `https://openrouter.ai/api/v1/models` (catalog สาธารณะ CORS-friendly) ไม่ผ่านเซิร์ฟเวอร์เราแล้ว

### API key ปลอดภัยแค่ไหน

- **API key เก็บไว้ใน `localStorage` ของเบราว์เซอร์คุณเท่านั้น** — ไม่ถูกส่งไปเก็บที่เซิร์ฟเวอร์ใด ๆ ของแอป
- เวลาเรียก AI จริง เบราว์เซอร์ส่งคีย์ไปยังผู้ให้บริการที่คุณเลือก (เช่น OpenRouter / Gemini) **โดยตรง** ไม่มี proxy อยู่ตรงกลาง — แอปไม่บันทึกคีย์ลงที่ไหนทั้งสิ้น
- ข้อมูลแบรนด์/มุมคอนเทนต์/โพสต์ ผูกกับบัญชี Firebase ของคุณผ่าน **Firestore** (และยัง cache ใน `localStorage` ด้วย)

---

## โครงสร้างโปรเจกต์

```
.github/workflows/
  deploy.yml         # GitHub Actions: build static export + deploy ขึ้น Pages
public/.nojekyll     # ให้ Pages เสิร์ฟโฟลเดอร์ _next/
app/                 # หน้าเพจ (App Router) — ไม่มี API route แล้ว (static export)
  page.tsx           # หน้าแรก / AI แนะนำมุม
  approvals/         # คิวรออนุมัติ
  calendar/          # ปฏิทินโพสต์
  library/           # คลังโพสต์
  brand/             # ตั้งค่าแบรนด์
  connections/       # เชื่อมต่อโซเชียล (mock)
  settings/          # ตั้งค่า AI provider + key
  login/             # หน้า login (Firebase Auth gate)
components/           # UI kit + ส่วนประกอบของแต่ละฟีเจอร์
lib/
  store.ts           # zustand store + persist (localStorage) + hydration plumbing
  ai.ts              # เรียก provider ตรงจากเบราว์เซอร์ + prompt คิดมุม/เขียนโพสต์ + OpenRouter catalog
  firebase.ts        # Firebase app/auth/firestore init (web config — public)
  auth.tsx           # Auth context/provider + login gate
  types.ts           # type กลาง
  seed.ts            # ข้อมูลตัวอย่างตอนเปิดครั้งแรก
```

---

## หมายเหตุทางเทคนิค

- ใช้ Tailwind CSS v4 (ไม่มี `tailwind.config.js` — ธีมอยู่ใน `app/globals.css` ผ่าน `@theme`)
- zustand persist ทำงานฝั่ง client เท่านั้น และใช้ `skipHydration` + manual rehydrate เพื่อกัน hydration mismatch (ดู `lib/store.ts`) — UI ที่อ่าน state แบบ persist จะรอผ่าน hook `useHydrated()` ก่อนแสดงผล
- ฟอนต์ภาษาไทย: Noto Sans Thai ผ่าน `next/font/google`

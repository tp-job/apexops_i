# Browser extension + web app — แผนละเอียดและความเสี่ยง

**สถานะ: แผนเท่านั้น ยังไม่มีการแก้โค้ด** — เขียน 2026-09-18 ตรวจกับ `main` ที่ `212c88b`
ทุกข้อที่อ้างไฟล์ด้านล่างเปิดดูจริงแล้ว ข้อที่ยังไม่ได้ยืนยันเขียนกำกับว่า "ยังไม่ยืนยัน"

**เป้าหมาย:** มีทั้ง web app (`app/client` ตัวเดิม) และ browser extension (Chrome/Edge ก่อน, Firefox ตามมา)
โดยใช้โค้ดชุดเดียวกันสำหรับ auth, API client, types และตัวดักจับ console ไม่ copy แยกสองชุด

**Extension ทำอะไร (v1)**
1. ดักจับ error/warn จากเว็บที่ผู้ใช้เลือกเปิดทีละเว็บ แล้วส่งเข้า project ใน ApexOps
2. Popup: login, ดู issue ล่าสุดของ project, badge แจ้ง issue ใหม่
3. ปุ่ม "Report bug" สร้าง ticket จาก tab ปัจจุบัน (URL + title + ข้อความ) — screenshot แยกเป็น phase ของมันเอง

---

## 1. สิ่งที่พบจากการตรวจโค้ด (ข้อเท็จจริงที่กำหนดแผน)

| # | สิ่งที่พบ | ที่ไหน | ผลต่อแผน |
|---|---|---|---|
| F1 | Auth ใช้ **Bearer token** ใน header ไม่ใช่ cookie | `api/config.ts`, `lib/authSession.ts` | extension เรียก API เดิมได้ ไม่ติด SameSite/third-party cookie |
| F2 | แผน auth **Phase 4 (A7)** กำลังพิจารณาย้าย refresh token ไป httpOnly cookie | `.agents/docs/planning/auth-review-and-restructure-2026-08-25.md` | **ชนกับ extension โดยตรง** — ถ้าทำ phase 4 แบบ cookie อย่างเดียว extension จะ login ไม่ได้ ดู R1 |
| F3 | `authSession.ts` อ่าน/เขียน `localStorage` แบบ **sync** | `lib/authSession.ts` | service worker ของ MV3 **ไม่มี `localStorage`** ต้องเปลี่ยนเป็น storage adapter แบบ async |
| F4 | มีโค้ดอ่าน token จาก `localStorage` **ตรงๆ ไม่ผ่าน authSession อีก 5 จุด** | `api/config.ts:14`, `context/AuthContext.tsx:72,132`, `services/auth.ts:93,96`, `dev/devSessions.ts:228-229` | ต้องรวมให้ผ่าน authSession ก่อนแยก package ไม่งั้นสองฝั่งจะเพี้ยนกันเงียบๆ |
| F5 | API base URL มาจาก `import.meta.env.VITE_API_URL` ตอน **build** | `api/config.ts:6` | extension ต้องให้ผู้ใช้กรอก server URL ตอนใช้งาน (self-host) ต้องเป็นค่า runtime |
| F6 | `/sdk/v1.js` อ่าน config จาก `document.currentScript.dataset` | `server/public/sdk/v1.js:47-56` | ตอน extension inject **ไม่มี script tag** ต้องแยก core ออกมาให้รับ config เป็น argument |
| F7 | SDK มี re-entrancy guard (`inside`) และเรียก console เดิมก่อนเสมอ | `sdk/v1.js:29-41, 249-268` | ดีแล้ว ต้องคงไว้ตอนแยก core |
| F8 | `/api/ingest` มี **origin allowlist** ต่อ project; ไม่มี `Origin` = ปฏิเสธ | `api/ingest.ts:155-164` | ถ้าส่งจาก service worker, `Origin` = `chrome-extension://<id>` → **403** กับ project ที่ตั้ง allowlist ดู R6 |
| F9 | Ingest จำกัด rate ต่อ key และต่อ IP (in-memory), body 1 MB | `api/ingest.ts:49, 61-128` | extension บนเว็บที่ error เยอะอาจกิน quota ของ key จนตัว SDK จริงโดน 429 ดู R12 |
| F10 | `Event.context` เป็น `Json` อยู่แล้ว | `database/prisma/schema.prisma:592` | ติด tag `source: "extension"` ได้โดย **ไม่ต้องแก้ schema** (ต้องยืนยันว่า `ingest.schema.ts` รับ `context` ผ่าน — ยังไม่ยืนยัน) |
| F11 | `Ticket` **ไม่มี** field/ตารางไฟล์แนบ และทั้งระบบไม่มี file upload (source map เก็บใน Postgres) | `schema.prisma:669-691`, `api/sourcemaps.ts` | screenshot ต้องมีการตัดสินใจเรื่อง storage ใหม่ → แยกเป็น phase |
| F12 | Session เก็บ `userAgent` เพื่อแสดงในรายการ session | `lib/sessions.ts:87-90` | session ของ extension จะดูเหมือน "Chrome" ธรรมดา แยกไม่ออกจาก tab |
| F13 | Refresh token **ใช้ได้ครั้งเดียว** และกัน race ด้วย in-flight promise **ต่อ JS context** | `lib/authSession.ts` `refreshOnce()` | popup, service worker, options page เป็นคนละ context → refresh ชนกันได้ ดู R2 |
| F14 | `package-lock.json` ถูก track, CI ใช้ `npm ci` และรัน typecheck/test ทุก workspace | `.github/workflows/ci.yml` | เพิ่ม workspace = lockfile เปลี่ยน, CI ต้องรู้จัก workspace ใหม่ |
| F15 | Client build ใช้ `erasableSyntaxOnly` (`tsc --noEmit` จับไม่ได้ แต่ `npm run build` จับได้) | memory: client-build-erasable-syntax | `packages/shared` ห้ามใช้ `enum`/`namespace`/parameter properties |
| F16 | ไฟล์เก่า `server/public/bug-tracker-client.js` (WebSocket :8082 ที่ถูกลบไปแล้ว) ยังอยู่ | `server/public/` | **ห้ามใช้เป็นฐาน** ของ extension ให้ใช้ `/sdk/v1.js` |

---

## 2. การตัดสินใจที่ต้องล็อกก่อนเริ่ม

แต่ละข้อมีคำแนะนำ ถ้าไม่มีใครค้าน ถือตามคำแนะนำ

| # | คำถาม | แนะนำ | เหตุผล |
|---|---|---|---|
| **X1** | extension เก็บ token ที่ไหน | `chrome.storage.local` | `storage.session` หายเมื่อปิด browser = login ใหม่ทุกวัน; `local` ไม่ถูกเว็บอื่นอ่านได้ (ต่างจาก `localStorage` ของหน้าเว็บ) |
| **X2** | ใครเป็นเจ้าของการ refresh ใน extension | **service worker คนเดียว** popup/options ขอ token ผ่าน `chrome.runtime.sendMessage` | กัน refresh ชนกันข้าม context (R2) |
| **X3** | Auth Phase 4 จะทำอย่างไรกับ extension | บันทึกลงแผน auth ว่า **Bearer path ต้องคงอยู่สำหรับ client ที่ไม่ใช่เว็บ** ไม่ว่า phase 4 เลือกอะไร | ถ้าไม่เขียนไว้ phase 4 จะทำ extension พังโดยไม่มีใครรู้ (R1) |
| **X4** | event ที่ดักได้ส่งด้วยอะไร | **ingest key** (ไม่ใช่ JWT) และแนะนำให้สร้าง project แยก เช่น "Extension captures" | เส้นทาง capture ไม่มีสิทธิ์อะไรเลยนอกจากเขียน event; ไม่กิน quota ของ SDK จริง |
| **X5** | เปิดดักจับที่ไหน | **ปิดเป็นค่าเริ่มต้น** เปิดทีละ origin, ตัด query string และ `#hash` ออกจาก URL โดยค่าเริ่มต้น | ความเป็นส่วนตัว + ผ่าน review ของ Web Store ง่ายขึ้น (R7, R10) |
| **X6** | แจ้งเตือน issue ใหม่แบบไหน | **polling ด้วย `chrome.alarms`** (ทุก 1–5 นาที) ไม่ใช้ socket | socket ไม่ได้อยู่ใต้ระบบ refresh และ service worker ถูกปิดได้ทุกเมื่อ (R11) |
| **X7** | Screenshot | **แยก phase P5** ต้องเลือก storage ก่อน (Postgres `bytea` จำกัดขนาด / object storage) | ไม่มีที่เก็บไฟล์ในระบบเลย (F11) |
| **X8** | Framework | **WXT** (Vite + React), Chrome + Edge ก่อน, Firefox หลังผ่าน P6 | MV3 + multi-browser จากโค้ดชุดเดียว |
| **X9** | หน้าเว็บมี SDK อยู่แล้ว + extension inject ซ้ำ | ตรวจ marker `window.__apexopsSdk` ถ้ามีแล้ว extension **ไม่ inject** | กัน event ซ้ำสองเท่า (R8) |

---

## 3. สถาปัตยกรรม

```
apexops_i/
  app/client/        web app เดิม (import จาก @apexops/shared)
  app/server/        API เดิม; /sdk/v1.js build จาก shared/sdk-core
  app/extension/     ใหม่ (WXT)
    entrypoints/
      background.ts      service worker: เจ้าของ token, refresh, ส่ง ingest, alarms
      capture.main.ts    content script world:"MAIN" — patch console (sdk-core)
      bridge.content.ts  content script world:"ISOLATED" — ส่งต่อ event ไป SW
      popup/             React: login, issue ล่าสุด, Report bug
      options/           server URL, ingest key, รายชื่อเว็บที่เปิดดักจับ
packages/shared/     ใหม่
  src/auth/          authSession (รับ StorageAdapter), types
  src/api/           base URL (runtime), fetch helper + 401 retry
  src/sdk-core/      console patch, dedupe, batching — ไม่มี DOM/script-tag
  src/types/         types ที่ client และ extension ใช้ร่วม
```

**เส้นทางของ event ที่ดักได้** (ไม่ส่งจากหน้าเว็บโดยตรง เพราะ CSP `connect-src` ของหลายเว็บจะบล็อก):

```
หน้าเว็บ (MAIN world, sdk-core)
   └─ window.postMessage ─▶ bridge (ISOLATED)  ── ตรวจรูปแบบ + จำกัดขนาด
         └─ chrome.runtime.sendMessage ─▶ service worker
               └─ fetch POST /api/ingest  (X-Apexops-Key)
```

**กฎความปลอดภัยของ bridge:** หน้าเว็บปลอม `postMessage` ได้เสมอ ดังนั้น bridge **รับได้แค่ event สำหรับ ingest**
ห้ามมีข้อความใดจากหน้าเว็บที่ทำให้ SW ใช้ JWT, อ่าน token หรือเรียก API อื่น event ที่ถูกปลอมก็แค่เป็น event ปลอม
ซึ่ง SDK ปกติก็รับความเสี่ยงเดียวกันอยู่แล้ว (ingest key เป็น public โดยออกแบบ — D4 ของ project-workspaces spec)

**StorageAdapter** (หัวใจของ P1):

```ts
export interface StorageAdapter {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(keys: string[]): Promise<void>;
}
```
web ส่ง adapter ที่ห่อ `localStorage` (resolve ทันที), extension ส่ง adapter ที่ห่อ `chrome.storage.local`

---

## 4. Phases

ทุก phase = หนึ่ง branch, เงื่อนไขปิด phase เขียนเป็น **สิ่งที่สังเกตได้** ไม่ใช่ "ทำเสร็จแล้ว"

### P0 — ล็อกการตัดสินใจ (0.5 วัน)
- ยืนยัน X1–X9 ในไฟล์นี้
- เพิ่มหมายเหตุ X3 ลงใน `planning/auth-review-and-restructure-2026-08-25.md` ส่วน phase 4
- ยืนยัน F10: `ingest.schema.ts` รับ `context` หรือไม่ (ถ้าไม่ ต้องเพิ่ม field — งานเล็ก)

### P1 — เตรียม web app โดยยังไม่แยก package (1–1.5 วัน) · branch `ext/p1-auth-storage`
งานทั้งหมดอยู่ใน `app/client` เพื่อให้ถ้าพัง รู้ทันทีว่าพังเพราะ refactor ไม่ใช่เพราะย้ายไฟล์
1. ย้ายการอ่าน token ตรงทั้ง 5 จุด (F4) ให้ผ่าน `authSession`
2. เปลี่ยน `authSession` เป็น async + `StorageAdapter`
   - `AuthContext.tsx:72` ใช้ `useState(() => !!localStorage...)` แบบ sync ตอน render แรก → ต้องออกแบบ initial state ใหม่ ไม่ให้หน้าแวบไป `/login` ก่อนอ่าน storage เสร็จ
   - `api/client.ts:81` และ `services/api.ts` เรียก `isExpired(getAccessToken())` แบบ sync → ต้อง `await`
   - คง logic "อีก tab rotate token ไปแล้ว ให้ใช้ token ใหม่" (`accessAtStart`) ไว้ครบ
3. base URL เป็น runtime: `configureApi({ baseUrl })` โดย web ส่ง `VITE_API_URL` เข้าไป
4. Test: race สอง caller → refresh ครั้งเดียว; 401 → `endSession`; 5xx/network → session อยู่ต่อ; adapter ที่ throw → ไม่ crash

**ปิด phase เมื่อ:** `npm run build`, test, typecheck ผ่าน · login → reload → ยังอยู่ · เปิด 2 tab ให้ token หมดอายุพร้อมกัน → ไม่มีใครถูก logout ·
revoke session จากอีกเครื่อง → call ถัดไปได้ 401 และเด้งไป `/login` · `grep localStorage` ใน client เหลือเฉพาะ adapter, theme, และค่าที่ไม่ใช่ token

### P2 — แยก `packages/shared` (1–1.5 วัน) · branch `ext/p2-shared-package`
1. สร้าง workspace `packages/shared` (TypeScript source, ไม่ต้อง build แยก ให้ Vite/WXT compile)
2. ย้าย `authSession`, API config/fetch helper, types ที่ใช้ร่วม
3. แยก `sdk-core` จาก `/sdk/v1.js`: `startCapture(config, transport)` ไม่แตะ `document.currentScript`
4. `/sdk/v1.js` build จาก sdk-core + ตัวอ่าน `data-*` เดิม **พฤติกรรมต้องเหมือนเดิมทุกอย่าง** (URL นี้สัญญาว่าจะไม่เปลี่ยนความหมาย — `server.ts:360-363`)
5. React เป็น `peerDependency` ของ shared เท่านั้น, ทุก workspace ใช้ React เวอร์ชันเดียว
6. เพิ่ม workspace ใน root `package.json`, commit lockfile, ให้ CI รัน test ของ shared

**ปิด phase เมื่อ:** CI เขียว · `/sdk/test` และ `/sdk/demo` ทำงานเหมือนก่อน (error, warn, unhandled rejection, dedupe, sendBeacon ตอนปิดหน้า) ·
`npm ls react` เห็น React ชุดเดียว · web app ผ่านเช็กลิสต์ของ P1 อีกรอบ

### P3 — Extension: ดักจับ error (2 วัน) · branch `ext/p3-capture`
1. สร้าง `app/extension` ด้วย WXT, manifest ขั้นต่ำ: `storage`, `scripting`, `alarms`, `activeTab`; host เป็น `optional_host_permissions`
2. Options page: server URL (ขอ permission ของ host นั้นตอนกรอก), ingest key, รายชื่อ origin ที่เปิดดักจับ
3. เปิดเว็บ = `chrome.permissions.request` สำหรับ origin นั้น + `chrome.scripting.registerContentScripts` (ไม่ใช้ `<all_urls>`)
4. `capture.main.ts` (sdk-core) + `bridge.content.ts` + SW ส่ง ingest ตามเส้นทางในข้อ 3
5. ตัด query/hash (X5), ติด `context.source = "extension"`, ตรวจ `__apexopsSdk` (X9)
6. SW ถูกปิดได้ทุกเมื่อ: คิว event เก็บใน `chrome.storage.session` ก่อนส่ง, จำกัดขนาดคิว, ทิ้งของเก่าเมื่อเต็ม

**ปิด phase เมื่อ:** เปิดดักจับบนเว็บทดสอบ → `console.error` ขึ้นเป็น issue ใน project ภายใน ~5 วินาที ·
เว็บที่ไม่ได้เปิด → ไม่มี content script ถูกฉีด (ดูใน DevTools) · เว็บที่มี CSP `connect-src 'self'` ยังส่งได้ ·
เว็บที่มี SDK อยู่แล้ว → event ไม่ซ้ำ · URL ที่เก็บไม่มี query string · ปิด/เปิด SW (`chrome://serviceworker-internals` → stop) ระหว่างมี event ค้าง → event ไม่หายและไม่ซ้ำ ·
throw ข้างใน sdk-core โดยตั้งใจ → หน้าเว็บไม่พัง

### P4 — Extension: popup + login + Report bug (2 วัน) · branch `ext/p4-popup`
1. Login ใน popup → `POST /api/auth/login`, token เก็บผ่าน adapter `chrome.storage.local`
2. SW เป็นเจ้าของ refresh (X2); popup ขอ token ผ่าน message ไม่ refresh เอง
3. ส่ง header `X-Apexops-Client: extension/<version>` เพื่อให้รายการ session แยกได้ (F12 — ต้องแก้ `lib/sessions.ts` เล็กน้อย)
4. เลือก project (จาก `/api/projects`), ดู issue ล่าสุด, ลิงก์เปิดใน web app (`/p/:slug/...`)
5. Badge: `chrome.alarms` ทุก 1–5 นาที ดึงจำนวน issue ใหม่ (X6)
6. Report bug → `POST /api/tickets` พร้อม `projectId`, URL (ตัด query), title ของ tab, ข้อความที่ผู้ใช้พิมพ์
7. Logout → `/api/auth/logout` (revoke ด้วย `sid` ตามที่ phase 1 ของ auth แก้แล้ว) + ล้าง storage

**ปิด phase เมื่อ:** login ใน extension แล้ว web app ยัง login อยู่ (คนละ session) · session ของ extension แยกออกในหน้า Settings ·
revoke session ของ extension จากเว็บ → popup เด้งไปหน้า login ใน call ถัดไป · ปล่อยให้ access token หมดอายุ แล้วเปิด popup + alarm ยิงพร้อมกัน → refresh ครั้งเดียว ไม่หลุด ·
สร้าง ticket จาก tab → ขึ้นใน board ของ project ที่เลือก

### P5 — Screenshot (1–1.5 วัน, รอการตัดสินใจ X7) · branch `ext/p5-screenshot`
- `chrome.tabs.captureVisibleTab` → JPEG คุณภาพ ~70, จำกัด ≤ 500 KB
- **ผู้ใช้ต้องเห็นภาพก่อนส่งทุกครั้ง** (อาจมีข้อมูลส่วนตัวในหน้าจอ) และลบภาพออกได้
- ต้องมี model `TicketAttachment` + route อัปโหลด/ดาวน์โหลดที่ตรวจสิทธิ์ project, ติด retention
- ใช้ `db push` แบบเพิ่มตารางใหม่ (additive) ไม่แตะคอลัมน์เดิม · หยุด dev server :3000 ก่อน `prisma generate` (Windows EPERM)

### P6 — Packaging และ release (1 วัน) · branch `ext/p6-release`
- Build Chrome/Edge zip, ทดสอบ Firefox (`world: "MAIN"` ต้อง Firefox 128+, background เป็น event page ไม่ใช่ SW)
- ตรึง extension ID ด้วย `key` ใน manifest ตอน dev เพื่อให้ `chrome-extension://<id>` คงที่ (ใช้กับ allowlist, R6)
- Privacy policy (เก็บอะไร ส่งไปไหน ไม่ขายข้อมูล), เหตุผลของแต่ละ permission สำหรับ Web Store
- **CI ห้าม publish** (กฎใน `ci.yml`) — การส่งขึ้น Store ทำมือ หรือ workflow แยกที่มีคน review

### รวม

| Phase | วัน |
|---|---|
| P0 ล็อกการตัดสินใจ | 0.5 |
| P1 เตรียม auth/storage ใน client | 1–1.5 |
| P2 แยก shared package | 1–1.5 |
| P3 ดักจับ error | 2 |
| P4 popup + Report bug | 2 |
| P5 screenshot (มีเงื่อนไข) | 1–1.5 |
| P6 packaging | 1 |
| **รวม** | **8.5–10 วัน** (ไม่รวม P5 = 7.5–8.5) |

ตัวเลขเดิม 5–6.5 วันที่ประเมินไว้ก่อนตรวจโค้ด **ต่ำเกินไป** — ส่วนที่เพิ่มคือ F4 (token 5 จุด), F6 (SDK ผูกกับ script tag),
F13 (refresh ข้าม context) และ F11 (ไม่มี storage ไฟล์)

ถ้าต้องตัด: ตัด P5 ก่อน แล้วค่อย Firefox · **ห้ามบีบ P1** — เป็นส่วนเดียวที่ถ้าพังแล้ว web app ที่ใช้งานอยู่พังด้วย

---

## 5. ความเสี่ยง (เรียงตามความเสียหาย)

| # | ความเสี่ยง | โอกาส | ความเสียหาย | ป้องกัน |
|---|---|---|---|---|
| **R1** | Auth phase 4 ย้าย token ไป httpOnly cookie → extension login ไม่ได้ | กลาง | สูง | X3: เขียนลงแผน auth ก่อนเริ่ม ว่า Bearer ต้องคงอยู่สำหรับ non-web client; StorageAdapter ทำให้ web เปลี่ยนเป็น cookie ได้โดยไม่กระทบ extension |
| **R2** | Refresh ชนกันระหว่าง popup / SW / options (in-flight promise อยู่คนละ context) → token ใช้ครั้งเดียวถูกใช้สองครั้ง → หลุด session แบบสุ่ม | สูง ถ้าไม่ออกแบบ | สูง | X2: SW เป็นเจ้าของคนเดียว; test ตามเงื่อนไขปิด P4 |
| **R3** | SW ถูกปิดหลัง server rotate token แต่ก่อนบันทึก token ใหม่ → หลุด session | ต่ำ | กลาง | เขียน storage ทันทีหลังได้ response; ยอมรับว่าเกิดได้น้อยครั้ง = login ใหม่; **ต้องทดสอบจริง** ว่า Chrome ยืดอายุ SW ระหว่าง fetch ที่ค้างอยู่หรือไม่ (ยังไม่ยืนยัน) |
| **R4** | Refactor P1 ทำ web app พัง (หน้าแวบไป `/login`, logout สุ่ม) | กลาง | สูง | P1 แยก branch, ไม่ย้ายไฟล์ใน phase เดียวกัน, เช็กลิสต์ปิด phase ทำในเบราว์เซอร์จริง |
| **R5** | หน้าเว็บปลอม `postMessage` มาหลอก bridge ให้ทำอย่างอื่นนอกจาก ingest | ต่ำ | สูงมาก | bridge รับเฉพาะรูปแบบ event, จำกัดขนาด, **ไม่มีเส้นทางจากหน้าเว็บไปถึง JWT เลย** — review ข้อนี้โดยเฉพาะใน P3 |
| **R6** | Project ที่ตั้ง origin allowlist ปฏิเสธ event จาก extension (403) | สูง | ต่ำ | ตรึง extension ID (P6), หน้า project settings บอกให้เพิ่ม `chrome-extension://<id>`; หรือใช้ project แยก (X4) |
| **R7** | เก็บข้อมูลส่วนตัวจากเว็บคนอื่น (token ใน URL, PII ใน console) | กลาง | สูง | X5: ปิดเป็นค่าเริ่มต้น, ทีละ origin, ตัด query/hash, ไม่ดักจับ `log/info/debug` ถ้าไม่เปิด |
| **R8** | Event ซ้ำเมื่อเว็บมี SDK อยู่แล้ว | กลาง | ต่ำ | X9 marker |
| **R9** | React ซ้ำสองชุดข้าม workspace → หน้าขาว (เคยเจอกับ motion/react) | กลาง | กลาง | React เป็น peerDependency ของ shared, `npm ls react` ในเงื่อนไขปิด P2 |
| **R10** | Web Store review ช้า/ไม่ผ่านเพราะขอ host permission กว้าง | กลาง | กลาง | `optional_host_permissions` + `activeTab`, ไม่ใช้ `<all_urls>`, privacy policy ชัด |
| **R11** | Socket ใน SW ขาดบ่อย และไม่อยู่ใต้ระบบ refresh | สูง ถ้าใช้ | ต่ำ | X6 polling |
| **R12** | Extension บนเว็บที่ error เยอะกิน rate limit ของ key → SDK จริงโดน 429 | กลาง | กลาง | X4 project/key แยก, dedupe ใน sdk-core, จำกัดคิวใน SW |
| **R13** | ผู้ใช้คาดหวัง stack ที่ map แล้ว แต่เว็บของคนอื่นไม่มี `release`/source map | สูง | ต่ำ | เขียนในหน้าคำอธิบาย ว่าเป็น stack ดิบ |
| **R14** | ใช้ syntax ที่ `erasableSyntaxOnly` ไม่รับใน shared → CI ผ่าน typecheck แต่ build พัง | กลาง | ต่ำ | CI รัน `npm run build` อยู่แล้ว; ห้าม enum/namespace ใน shared |
| **R15** | มีคนเอา `bug-tracker-client.js` เก่ามาใช้ต่อ | ต่ำ | กลาง | F16 — ควรลบไฟล์นั้นและ `/api/console-logs/script` ถ้ายังเสิร์ฟมันอยู่ (ยังไม่ยืนยันว่า route นั้นเสิร์ฟไฟล์ไหน) เป็นงานแยก |

---

## 6. ไม่ทำใน v1
- แก้ไข ticket/issue แบบเต็มใน popup (เปิด web app แทน)
- Chat, Notes, Calendar ใน extension
- Session replay / บันทึกการคลิก
- Safari
- Publish อัตโนมัติจาก CI
- PWA ของ web app (งานแยก ประมาณครึ่งวัน ทำเมื่อไหร่ก็ได้)

## 7. คำถามที่ยังเปิดอยู่
1. X7 screenshot เก็บที่ไหน — ใน Postgres (สอดคล้องกับ source map) หรือ object storage (ถ้าจะ deploy จริงในไม่ช้า)
2. Extension จะใช้แค่ในทีม (โหลดแบบ unpacked / Edge ไม่ผ่าน store) หรือขึ้น Chrome Web Store สาธารณะ — กำหนดความเข้มของ P6
3. Server URL ค่าเริ่มต้นของ extension คืออะไร (ตอนนี้มีแค่ `localhost:3000` ซึ่งชนกับโปรเจกต์อื่นบนเครื่องนี้)

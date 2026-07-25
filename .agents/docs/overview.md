# 🧭 ApexOps Overview

> Rewritten 2026-07-24 against actual `app/server/src/api/*` routes and
> `database/prisma/schema.prisma` — the previous version (dated 2025-01-27) described features and
> a directory layout that no longer exist. See [`ui-reset-2026-07-24.md`](frontend/ui-reset-2026-07-24.md)
> and [`user-flow.md`](frontend/user-flow.md) for the full history and the rebuild plan.

## จุดประสงค์ของระบบ

ApexOps คือระบบ **Bug & Log Management** สำหรับนักพัฒนา — ติดตาม tickets แบบ JIRA, เก็บ log
จากแอปพลิเคชัน, จับ console log จากเบราว์เซอร์แบบเรียลไทม์ (ผ่าน Puppeteer), และมีระบบ Notes
ที่ผูกกับมุมมองปฏิทินในตัว

## ฟังก์ชันหลัก — อ้างอิงจาก endpoint จริงใน `app/server/src/api/`

### 🔐 Authentication (`api/auth.ts`)
Register (rate-limited), login (rate-limited), JWT access + refresh token, profile/settings/password
update — ดู `SECURITY-AUTH.md` สำหรับรายละเอียด

### 🎫 Bug Tracker (`api/tickets.ts`)
Ticket CRUD + stats, ผูกกับ `assignee`/`reporter` (เป็น User จริงผ่าน `assigneeId`/`reporterId`),
`tags` และ `relatedLogs` เป็น JSON field, realtime ผ่าน `hooks/useBugTrackerSocket.ts`

### 📝 Logs + Console Monitor (`api/logs.ts`, `api/console-monitor.ts`)
Log CRUD + stats + batch insert, แยกกับระบบ **Console Monitor** ที่เปิด session แบบ
per-user (gated ด้วย `session.userId !== req.user.id` ไม่ใช่ role) เพื่อจับ console log จาก URL
ที่ระบุแบบ real-time หลาย session พร้อมกัน

### 🗒️ Notes + Calendar (`api/notes.ts`)
Note CRUD, rich content (`type`: text/image/list/link, `checklistItems`, `quote`),
`stats/overview`, และ **`GET /calendar/:year/:month`** — นี่คือฐานข้อมูลเดียวกับที่ทั้งหน้า
Calendar และ OptimizationCalendar เดิมใช้ (ดู `user-flow.md` Finding 2 — ควรรวมเป็นหน้าเดียว)

### 💬 Chat (`api/chat.ts`) และ AI Chat (`api/ai.ts`)
Chat ฝั่ง backend มีแค่ `GET /users` — ยังไม่มี endpoint สำหรับ presence หรือ message history
AI Chat ใช้ Google Gemini ผ่าน `POST /api/ai/chat` — เป็นคนละฟีเจอร์กับ Chat ระหว่างผู้ใช้

### ❌ ไม่มีจริง: Invoices
ไม่มี `Invoice` model ใน Prisma schema และไม่มี route ใดใน `app/server` ที่เกี่ยวกับ invoice —
หน้า Invoices เดิมเป็น mock data ล้วน ๆ ใช้เป็นต้นแบบของ design system (ดู `design.md`) ไม่ใช่
ฟีเจอร์จริงของสินค้า

---

## โครงสร้างระบบ (ปัจจุบัน)

### Frontend — `app/client/`
React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router · MUI (widget ที่ซับซ้อนเท่านั้น) ·
`motion` (ไม่ใช่ framer-motion) · shadcn/ui · react-icons · Recharts

### Backend — `app/server/`
Node.js · Express 5 · Prisma ORM · JWT + bcryptjs · Socket.io · Google Gemini (`@google/genai`) ·
Puppeteer (console log capture)

### Database
PostgreSQL ผ่าน Prisma, schema อยู่ที่ `database/prisma/schema.prisma` (แยกจาก `app/server`
โดยตั้งใจ — ดู memory `repo-layout-workspaces`)

---

## สถานะปัจจุบันของ UI

**ตั้งแต่การรื้อ UI เมื่อ 2026-07-24 เหลือแค่ route เดียวที่ใช้งานได้จริง: `/design-system`**
ทุกหน้าเดิมถูกลบ แต่ business logic (`hooks/`, `services/`, `api/`, `utils/`, `types/`,
`context/`) ยังอยู่ครบ ไม่ได้ผูกกับหน้าไหน — พร้อมสำหรับ build หน้าใหม่ทีละหน้าตามแผนใน
[`user-flow.md`](frontend/user-flow.md)

---

**Last Updated**: 2026-07-24

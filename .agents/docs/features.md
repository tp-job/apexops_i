# 🧩 ApexOps — Core Features

> Rewritten 2026-07-24 against actual `app/server/src/api/*` routes and
> `database/prisma/schema.prisma`. The previous version (2025-01-27) listed features — Chat message
> history endpoints, an Invoices module — that were never backed by real routes. See
> [`overview.md`](overview.md) for the short version and [`user-flow.md`](frontend/user-flow.md)
> for how these map to pages.

## 🔐 Authentication & Account — `api/auth.ts`

| Endpoint | Notes |
|---|---|
| `POST /register` | Rate-limited. Strong-password rules enforced via `schemas/auth.schema.ts` |
| `POST /login` | Rate-limited, generic error message on failure |
| `POST /refresh`, `POST /logout` | Refresh-token rotation (`SECURITY-AUTH.md`) |
| `GET /profile`, `PUT /profile` | `User` has `firstName/lastName/email/phone/company/position/location/timezone/bio/avatarUrl/gender/birthDate/language` |
| `PUT /settings` | Separate `UserSettings` model |
| `PUT /password` | bcryptjs, 12 rounds |

No role-based route gating is actually wired up (`authorize()` middleware exists in
`middleware/auth.ts` but nothing currently calls it) — every authenticated user has the same
access today, despite `User.role` existing as a field.

## 🎫 Bug Tracker — `api/tickets.ts`

`Ticket`: `title`, `description`, `status` (default `open`), `priority` (default `medium`),
`assignee`/`reporter` as free text **and** `assigneeId`/`reporterId` as real `User` relations,
`tags` and `relatedLogs` as JSON arrays. Full CRUD + `GET /stats`. Realtime updates via
`hooks/useBugTrackerSocket.ts` (Socket.io, not polling).

## 📝 Logs — `api/logs.ts`

`Log`: `level`, `message`, `source`, `stack`, optional `userId`. CRUD + `GET /stats` +
`POST /batch` for bulk insert. Indexed on `userId` and `createdAt`.

## 🖥️ Console Monitor — `api/console-monitor.ts`

A separate feature from Logs: opens a **session** per browser URL and captures its console output
in real time via Puppeteer (`console-logs.ts` handles the capture side). Sessions are gated to
their owner (`session.userId !== req.user.id` → 403), not by role. Multiple sessions can run
concurrently. This is a debugging power-tool, not a primary nav item — see `user-flow.md`.

## 🗒️ Notes + Calendar — `api/notes.ts`

`Note`: rich content — `type` (`text`/`image`/`list`/`link`), `isPinned`, `color`, `tags`,
`imageUrl`, `linkUrl`, `checklistItems` (JSON), `quote` (JSON). CRUD, `GET /stats/overview`, and
**`GET /calendar/:year/:month`**.

That last endpoint is the entire calendar feature — there is no separate `Event`/`CalendarEvent`
model. The old `Calendar.tsx` and `OptimizationCalendar.tsx` (1,132 lines) both rendered this same
endpoint's data at different densities. `hooks/useNoteAiChat.ts` also lives here — an AI-assisted
note-drafting flow distinct from the general AI Chat feature below.

## 💬 Chat — `api/chat.ts`

Backend surface today is `GET /users` only — no message-send, message-history, or presence
endpoint exists yet. The client-side chat logic (`useChatController`, `chatApi`, `chatTypes`) did
**not** survive the 2026-07-24 UI reset (it lived inside `components/ui/chat/`, not the preserved
`hooks/`/`services/` directories) — rebuilding Chat means new backend routes and a new client hook,
not just new UI. See `devrule.md` §8 for the Socket.io pattern to build it on.

## 🤖 AI Chat — `api/ai.ts`

`POST /chat` (Google Gemini via `@google/genai`, per `devrule.md` §9) and `GET /status`. Separate
from interpersonal Chat and from the note-AI flow in `useNoteAiChat.ts` — no client hook exists
for general-purpose AI chat yet.

## ❌ Not a real feature: Invoices

No `Invoice` model, no `/api/invoices` route. The old Invoices page (11 components,
`components/ui/invoices/`) was entirely mock data — it's the page `design-system/design.md` was
extracted from, kept as design lineage, not a product feature to rebuild as-is.

## 🎨 UI/UX

Dark/light theme (`context/ThemeContext.tsx`), the Luxe v2 design system (`design-system/design.md`)
— neutral + lime, glass surfaces, `motion` for animation, shadcn/ui for complex interactive
widgets. Full primitive list in `components/design-system/*`.

---

**Last Updated**: 2026-07-24

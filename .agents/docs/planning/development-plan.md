# ApexOps — Development Plan

> Written 2026-07-25 from the actual codebase: `app/server/src/api/*`, `database/prisma/schema.prisma`,
> `app/client/src/*`, workspace manifests. Supersedes the sequencing in
> [`user-flow.md`](../product/user-flow.md) — see "Correction to the existing plan" below.
> The feature/endpoint inventory in [`features.md`](../product/features.md) is still accurate and is not repeated here.

> ## ⚠️ Currency notice — 2026-07-28
>
> **§1's status table below is out of date and is kept for its reasoning, not its numbers.**
> Re-audited against the tree on 2026-07-28:
>
> | §1 says | Actually |
> |---|---|
> | 6 models | **10** — plus `Project`, `ProjectMember`, `Issue`, `Event` |
> | 8 route modules | **10** — plus `projects`, `ingest` |
> | Client UI ~0%, 2 routes | **8 pages, ~3,250 lines, 8 routes.** Dashboard, Bug Tracker, Notes+Calendar, Chat, Login, Register, Home, Design System all shipped |
> | 12 design-system primitives | **16**, though the form/data/overlay kits are still thin |
> | Tests: none | server has fingerprint + API check suites (18/18, 21/21); client still has no runner |
>
> **§1's headline conclusion still holds** — this remains a frontend reconstruction on a working
> backend, and the remaining effort is overwhelmingly in `app/client/src`. What changed is which
> screens are missing: not "all of them," but the **project workspace, issue list and SDK surfaces**.
>
> For current status and sequencing, read [`sprint-plan.md`](sprint-plan.md); for scope and
> decisions, read the relevant spec in [`../features/`](../features/).

---

## 1. Where the project actually stands

> Status table below reflects **2026-07-25**. See the currency notice above before quoting it.

| Layer | Status | Evidence |
|---|---|---|
| Database | Done | 6 models: `User`, `UserSettings`, `Log`, `Note`, `Ticket`, `RefreshToken` |
| Backend API | ~90% done | 8 route modules, 38 endpoints, zod validation, rate limiting, JWT rotation, Socket.IO, Gemini, Puppeteer |
| Client business logic | Done, unwired | 7 hooks, 2 services, api client, 11 type modules, 3 contexts — nothing imports most of them |
| Design system | Done | 12 primitives in `components/design-system/`, `/design-system` route, `.agents/design-system/design.md` |
| **Client UI / routes** | **~0%** | `AppRoutes.tsx` has exactly 2 routes: `/design-system` and a catch-all redirect |
| Tests | **none** | server `npm test` = `exit 1`; no test runner in either workspace |
| CI | **none** | no workflow files |

**The headline: this is not a full-stack build, it is a frontend reconstruction on top of a working backend.**
Roughly 85% of remaining effort is in `app/client/src`. Plan the resourcing accordingly.

### Backend gaps (small, but they gate specific pages)

| Gap | Blocks | Cost |
|---|---|---|
| `authorize()` middleware in `middleware/auth.ts` is defined but never called — `User.role` is decorative | Any multi-role product story | S |
| `api/chat.ts` is `GET /users` only — no message model, no history endpoint | Chat persistence | M (schema + routes) |
| No `Event`/`CalendarEvent` model — calendar is `GET /notes/calendar/:year/:month` | True scheduling (if ever wanted) | M |
| Puppeteer bundled in the server image | Deploy size/memory | S (split service) |
| No automated tests anywhere | Every refactor | M |

### The trap that will bite on day one

`app/client/components.json` exists (shadcn is configured, `lib/utils.ts` has `cn`), but
**zero shadcn components are installed** — the reset deleted `components/ui/` down to `note/utils/`.
Memory and docs referring to "shadcn Alert already working in the Dashboard" describe a state that no
longer exists on disk. First task of Phase 0 is re-adding the primitives.

---

## 2. Correction to the existing plan

`user-flow.md` sequences the rebuild as **Dashboard → Bug Tracker → Notes+Calendar → Settings → AI Chat → Chat**,
on the logic of "cheapest page first." That ordering optimizes for page count, not for a usable app.

The problem: **there is no auth screen, no `ProtectedRoute`, and no app shell** (sidebar/topbar were deleted
with everything else). A rebuilt Dashboard under that plan is a page you cannot log into and cannot
navigate away from — a demo, not a product. Every subsequent page then re-invents its own chrome, and the
shell gets retrofitted later across N pages instead of built once.

**Revised: Phase 1 is a thin vertical slice — Login → protected shell → Dashboard — shipped together.**
After that, `user-flow.md`'s ordering is right and I'd keep it.

Its other three calls stand and should not be relitigated: no Invoices page (no backend), one merged
Calendar (one dataset), Chat last (highest net-new cost).

---

## 2b. Decisions locked 2026-07-25

| Decision | Answer | Plan impact |
|---|---|---|
| Landing page | **Yes** — public intro page at `/`, app behind auth | +3 days in Phase 1; nav split public/protected |
| User groups | **Two: `admin` and `user`** | Authorization becomes a Phase 0 workstream, not Phase 7 cleanup |
| Chat persistence | **Ephemeral, labelled in-product** | Phase 6 stays ~1 week, zero backend work |
| Templates | `.agents/template/*.html`, **renamed to function names** | `template-adoption.md` mapping table is stale — fix in Phase 0 |

### Admin requirements — added 2026-07-25 (round 3)

The system administrator manages the system, publishes documentation, assigns responsibilities, views a
user's work, and tracks OWASP issues — and must be able to promote users through the UI.

**Three of these had no backend at all** (verified: no `Project` model, no `Document` model, zero OWASP
references anywhere in `database/`, `app/server/src/`, or the SRS). Each was scoped to its cheapest
credible form:

| Requirement | Decision | Cost | Where |
|---|---|---|---|
| Promote users via UI | Full user management: list, role, activate/deactivate | 4d BE + 3d FE | Phase 5 |
| View user projects | Read-only view of a user's tickets/notes/logs — **no `Project` entity** | 3d | Phase 5 |
| Track OWASP | `Ticket.owaspCategory` enum + filters + dashboard panel — **not** a separate checklist | 4d | Phase 2 (migration in Phase 0) |
| Send documentation | New `Document` model, admin authors / all users read — no targeting or uploads | 1.5w | Phase 6 |
| Assign responsibilities | **Already exists** — `Ticket.assigneeId`/`reporterId` are real `User` relations | 0 | Phase 2 |

This changes the project's shape: it is no longer "rebuild a UI on a working backend," it is that **plus
three new backend features**. Roughly 4 of the 13.5 weeks are admin work. Plan it as a workstream.

### Assumed defaults (overturn any of these cheaply — say so before Phase 0 ends)

- **Data scope:** tickets stay team-visible (it's a shared bug tracker); Logs and every destructive
  endpoint go admin-only. Notes stay per-user as they already are.
- **Admin surfaces:** Console Monitor, full Logs view, `DELETE /logs`, ticket delete, plus the Phase 5
  admin console (user management, view-a-user's-work) and Phase 6 document authoring.
- **Homepage:** single-page intro — hero, feature sections mapped to the four real features, CTA to
  login/register. No `/docs` section in v1.

### The security finding that made roles urgent

`api/notes.ts` scopes every query with `where: { userId: req.user!.id }`. **`api/tickets.ts` and
`api/logs.ts` do not scope at all** — today any authenticated user reads and deletes every ticket and
every log, including `DELETE /logs` with no id. With one user group that was a design choice. With an
admin/user split it is a gap, and it is the reason authorization moved from Phase 7 to Phase 0.

Good news on cost: `role` is **already in the JWT payload**, defaulted to `'user'` at sign time
(`api/auth.ts:33`), and `authorize()` (`middleware/auth.ts:76`) works as written — `authorize('admin')`
would function today. `POST /register` destructures its fields explicitly and does **not** accept `role`
from the body, so there is no privilege-escalation hole. The real work is typing and wiring, not design.

---

## 2c. Template map — filenames changed

The 9 files in `.agents/template/` were renamed from opaque codes to function names. **Every mapping
table in [`frontend/template-adoption.md`](../guides/template-adoption.md) points at filenames that no
longer exist.** Reconciled by `<title>`:

| Current filename | Was | Serves |
|---|---|---|
| `design-system-template.html` | `ai.html` | Design system origin — already adopted |
| `dashboard-template.html` | `aa.html` | Dashboard KPI band |
| `productivity-report-template.html` | `af.html` | Dashboard charts / chart-type switcher |
| `daily-note-todo-template.html` | `aj.html` | Notes & task board *(doc mapped it to Bug Tracker — filename wins)* |
| `create-task-template.html` | `ac.html` | Ticket create flow (stepped IA) |
| `task-timeline-template.html` | `zc.html` | Calendar / Gantt timeline |
| `chat-template.html` | `zd.html` | Chat contact rail |
| `components-card-template.html` | `zb.html` | Card + activity-timeline components |
| `documentation-template.html` | `za.html` | Docs shell — **unused in v1** |

Two warnings that survive the rename:

1. **`dashboard-template.html` is the `#ccff33` file.** `template-adoption.md` calls it the
   "highest-risk contamination" — its neon green is a near-miss of brand lime `#C5F43A` and will pass
   casual review while shipping a second accent. Swap the hex at the moment of extraction, never later.
2. **No template exists for the homepage or for any admin surface.** Both get designed from
   `design.md` directly. Budget design time; don't expect to harvest.

The adoption procedure in `template-adoption.md` §4 (harvest IA, reject all visuals, tokens only, one
accent per view, verify both modes) still applies unchanged — only the filenames moved.

---

## 3. The plan

### Phase 0 — Foundation + authorization (1 week, was 0.5)

The work every later phase assumes exists. Grew by half a week because the admin/user split has to land
here — retrofitting authorization across six built pages is how gaps ship.

**Frontend foundation**

1. Re-install shadcn primitives the rebuild needs: `button card input label dialog dropdown-menu alert
   badge tabs table select textarea skeleton sonner`. Verify against the Windows/workspace gotchas in
   `.agents/context/devrule.md` before bulk-adding.
2. Build the app shell: `layouts/AppLayout.tsx` + `Sidebar` + `Topbar`, on the design-system primitives.
   Nav is **4 items** — Bug Tracker, Notes & Calendar, Chat, Settings — plus admin-only entries rendered
   from role, not hidden by CSS.
3. Restore `routes/ProtectedRoute.tsx` against `AuthContext`, add `RoleRoute` for admin paths, and split
   `AppRoutes` into three trees: public (`/`, `/login`, `/register`), authenticated, admin.
4. Stand up Vitest + React Testing Library, and a smoke test per phase from here on. Doing this now costs
   a day; doing it after six pages costs a sprint and never happens.
5. Fix the stale filename table in `template-adoption.md` (see §2c) before anyone follows it into a
   missing file.

**Authorization (backend)**

6. Make `role` non-nullable and typed: `role Role @default(USER)` with `enum Role { USER ADMIN }`, plus a
   backfill migration for existing null rows. As it stands, `role String?` can be null and
   `authorize()`'s `roles.includes(req.user.role)` has no defined behaviour for that.
7. Wire `authorize('admin')` onto the destructive and admin-only endpoints — `DELETE /logs`,
   `DELETE /logs/:id`, `DELETE /tickets/:id`, all of `console-monitor`.
8. Add owner-scoping to `api/logs.ts` list/stats queries, matching the pattern `api/notes.ts` already
   uses. Tickets stay team-visible by decision, not by omission — write that as a comment in the route so
   the next maintainer doesn't "fix" it.
9. A seed script or documented path to create the first admin. There is no role-update endpoint; without
   this, nobody can ever *be* an admin.

**Exit:** `/design-system` still renders; a non-admin gets 403 on every gated endpoint, verified by test;
`npm run build` + `tsc --noEmit` clean.

### Phase 1 — Vertical slice: Homepage → Auth → Shell → Dashboard (2 weeks, was 1.5)

- `pages/Home.tsx` — public intro page at `/`. Hero, feature sections mapped to the four real features,
  CTA to register/login. No template to harvest — built from `design.md` primitives directly. Must be
  fast and correct in both themes; it's the only page a stranger ever sees.
- `pages/Login.tsx`, `pages/Register.tsx` on `services/auth.ts` (already written — wire, don't rewrite).
- Token refresh interceptor verified end-to-end in `api/client.ts`; a 401 must land the user on `/login`,
  not on a blank screen.
- `pages/Dashboard.tsx` — KPI tiles from `GET /tickets/stats` + `GET /logs/stats`, using `StatTile`,
  `Surface`, `AnimatedNumber`, Recharts. Harvest IA from `dashboard-template.html` and
  `productivity-report-template.html` — **swap `#ccff33` for the brand lime token on extraction.**
- **New:** `hooks/useLogs.ts` — the one missing data hook; Logs currently has no client logic at all.

**Exit:** land on `/` as a stranger → register → dashboard with real data → logout → back to `/`. First
point the app is demoable to anyone.

#### Built 2026-07-25 — Homepage + Dashboard workspace

Shipped ahead of Phase 0, composed from `design.md` primitives only (no template harvested, per the
"four screens have no template" decision):

| File | Role |
|---|---|
| `pages/Home.tsx` | Public landing — hero, 4 feature cards, principles, CTA. One accent element (the CTA). |
| `pages/Dashboard.tsx` | Workspace home — KPI band, focus rail, resolution, priority/level breakdowns |
| `layouts/AppLayout.tsx` | Workspace shell; desktop rail + mobile drawer, pages render into `<Outlet />` |
| `components/layouts/Sidebar.tsx` | Nav rail; admin group renders from `user.role` |
| `components/layouts/Topbar.tsx` | Theme toggle, identity, sign-out |
| `hooks/useDashboardStats.ts` | `Promise.allSettled` over ticket + log stats — partial failure is a state |
| `types/dashboard.ts` | Response shapes verified against the real route handlers |

Verified in-browser: both themes (dark `#1a1a1a` / light `#f8fafc`), mobile drawer with no horizontal
overflow at 375px, full-data and partial-failure render paths. `tsc --noEmit`, `eslint src`, and
`npm run build` all clean. Zero `#ccff33`, zero inline hex, zero `framer-motion` imports.

**Still owed before this counts as Phase 1 complete:** `/login`, `/register`, `ProtectedRoute`, and the
401→login interceptor. `/dashboard` currently renders for anyone who visits — its `hasAuth` empty state
is a UX guard, not access control.

Two changes made to get a second dev server running alongside an existing one: `autoPort: true` in
`.claude/launch.json`, and `server.port` in `vite.config.ts` now reads `process.env.PORT` with the usual
5173 fallback.

### Phase 2 — Bug Tracker + OWASP tagging (2 weeks, was 1.5)

Richest surviving logic: `useBugTrackerData` + `useBugTrackerSocket` (realtime already works).
Board/list view, ticket detail, stepped create flow (`Stepper`), filters on status/priority/assignee.
Harvest the stepped-form IA from `create-task-template.html`.

Watch the socket: two clients registering with the same `clientType` must not double-apply optimistic
updates. Test with two browser windows before calling it done.

**OWASP tracking (decided: tag tickets, not a separate compliance system).** `Ticket` gets an optional
`owaspCategory` enum covering the Top 10. The Bug Tracker filters by it, and the Dashboard gets a security
panel counting open issues per category.

Why this over a standalone checklist: a security finding *is* a ticket — it has a status, an assignee, and
a lifecycle the Bug Tracker already models. A parallel compliance system would duplicate all of that and
immediately drift out of sync with the tickets that represent the actual work. If a governance-style
checklist is needed later, it can roll up from these tags rather than being maintained by hand.

**The migration goes in Phase 0, the UI here.** `owaspCategory` and the `Role` enum ship as one migration
with the Phase 0 authorization work — two schema changes, one migration, rather than a second migration
against a database that by then has real data in it.

Deliberately **not** in scope: automated scanning. That's a different product and needs security
expertise this codebase doesn't have.

### Phase 3 — Notes + Calendar, merged (2 weeks)

One route, `SegmentedControl` toggling list ⇄ calendar density — built merged from the start, not merged
later. Tiptap editor for note content (already a dependency, unused). `useNoteList`,
`useNoteStatsOverview`, `useCalendarEvents` wire straight in.

Largest phase: rich text + calendar grid + the four note types (`text`/`image`/`list`/`link`).

### Phase 4 — Account Settings (0.5 week)

Tabs: Profile / Security / Notifications, against `PUT /profile`, `PUT /settings`, `PUT /password`.
No new hook needed. Cheap, and it closes the auth loop properly.

### Phase 5 — Admin Console (2 weeks) — NEW

The administrator's own surface. Everything here is `authorize('admin')` server-side **first**, hidden
client-side second — never the reverse.

**User management (backend is net-new: ~4 days).** No user-list or role-update endpoint exists today;
`api/chat.ts`'s `GET /users` is a contact list, not admin CRUD.

- `GET /api/users` (paginated, searchable), `PATCH /api/users/:id/role`, `PATCH /api/users/:id/active`.
- UI: user table, role dropdown, deactivate toggle.

Three rules that are not optional, in rough order of how much they'll hurt if skipped:

1. **Role changes must invalidate tokens.** The role lives *inside the JWT* (`api/auth.ts:33`), so a
   demoted admin keeps admin rights until their access token expires — up to an hour of stale privilege,
   while the UI reports the change as done. Fix both ends: read role from the DB on admin routes, **and**
   revoke the user's refresh tokens on role change. This is the single most likely security bug in the
   whole plan, because everything about it *looks* like it works.
2. **No last-admin lockout.** Refuse to demote or deactivate the final remaining admin — server-side, not
   just a disabled button. There is no recovery path if it happens in production.
3. **No self-demotion**, and log every role change with actor, target, and timestamp.

**View a user's work (~3 days).** Decided as a read-only view over existing data, **not** a new `Project`
entity. Admin opens a user and sees their tickets, notes, and logs. Reuses the Phase 2/3 list components
with a `userId` filter — no schema change, and the Phase 0 scoping model stays intact.

Worth naming: a real `Project` model would have meant `projectId` on `Ticket`, `Log`, and `Note`, plus
membership, plus rewriting every scoping rule from Phase 0 — 2–3 weeks and a re-do of finished work.
Revisit only if projects turn out to be how people actually organize, once Phases 2–3 are live.

No template exists for either screen; both come from `design.md` primitives.

### Phase 6 — Documentation (1.5 weeks) — NEW

Admin authors, all users read. Decided as publish-and-read: **no** targeting, read receipts, unread
badges, or file uploads (the project has no file-storage strategy at all today — no upload endpoint, no
disk or S3 decision — so "upload a PDF" is a bigger question than it sounds).

- New `Document` model: `title`, `slug`, `content`, `section`, `order`, `isPublished`, `authorId`.
- `GET /api/docs`, `GET /api/docs/:slug` for everyone; POST/PUT/DELETE admin-only.
- Authoring reuses the Tiptap editor from Phase 3 — a real reason to build Notes first.
- Reading UI harvests the 3-pane shell (section nav → page nav → on-page ToC) from
  `documentation-template.html`. This is the one new feature that *has* a template.

Draft/publish matters more than it looks: `isPublished` means an admin can work on a document across
several sessions without users seeing half-written guidance.

### Phase 7 — AI Chat (0.5 week)

`hooks/useAiChat.ts` modeled on the existing `useNoteAiChat.ts`, against `POST /api/ai/chat`.
Surface as a drawer/panel from Dashboard and Notes — **not** a top-level nav item. It's an assistant,
not a destination.

### Phase 8 — Chat, ephemeral (1 week)

`hooks/useChat.ts`, `utils/chatApi.ts`, `types/chat.ts` already exist (built 2026-07-24 against the real
Socket.IO handlers; 1:1 DM only, confirmed from `server.ts`). What's missing is UI.

**Decided: ephemeral, labelled.** No `ChatMessage` model, no history endpoint, ~1 week, zero backend work.
Persistence is a real feature with real retention and privacy questions; it doesn't get smuggled in as a
side effect of building a chat page.

Labelling is a shipping requirement, not a nicety — silent data loss is the failure mode here. The user
must know before they type, not after they reload:

- A persistent line in the thread header, not a dismissible toast: *"Messages aren't saved — this
  conversation clears when you close the tab."*
- Empty state says the same thing in full sentences.
- On disconnect, show the break in the thread rather than silently dropping messages.

Harvest the contact rail from `chat-template.html`. Skip its Font Awesome icon font — `react-icons/fi`.

### Phase 9 — Console Monitor + hardening (1 week)

Console Monitor as an **admin-only** surface, reached from Logs context rather than primary nav. Then:
split Puppeteer out of the server image, add CI (build + typecheck + lint + tests on PR).

---

### Timeline

| Phase | Weeks |
|---|---|
| 0 — Foundation + authorization | 1 |
| 1 — Homepage → Auth → Shell → Dashboard | 2 |
| 2 — Bug Tracker + OWASP tagging | 2 |
| 3 — Notes + Calendar | 2 |
| 4 — Account Settings | 0.5 |
| 5 — Admin Console | 2 |
| 6 — Documentation | 1.5 |
| 7 — AI Chat | 0.5 |
| 8 — Chat (ephemeral) | 1 |
| 9 — Console Monitor + hardening | 1 |
| **Total** | **~13.5 weeks solo** |

Growth from the original 9–10 weeks: +0.5 authorization, +0.5 homepage, +0.5 OWASP, +2 admin console,
+1.5 documentation. **The admin requirements are ~4 of the 13.5 weeks — treat them as a workstream, not a
detail.** Phases 2 and 3 parallelize cleanly across two frontend devs after Phase 1; Phase 5's backend can
start during Phase 3.

**A first cut, if 13.5 weeks is too long:** Phases 0–4 (7.5 weeks) is a complete, usable, role-aware
product — homepage, auth, dashboard, bug tracking with OWASP tags, notes, calendar, settings. Admin
console, docs, and both chats are genuinely separable from that. Cutting Phase 5 means admins are seeded
by script rather than promoted in the UI; nothing else breaks.

---

## 4. Risks

| Risk | Why it's real here | Mitigation |
|---|---|---|
| **Rebuild stalls at 3 pages** | Most believable 6-month failure: design system + a couple of pages, still no auth, still not usable | Phase 1 is a full vertical slice — the app is demoable in week 2, not week 8 |
| **Docs drift again** | Already happened once (2025-01 docs described features that never existed) | Update `features.md` / `user-flow.md` at each phase exit, not at the end |
| **Orphaned-file build breaks** | `tsconfig.app.json` has `"include": ["src"]` — unimported files still typecheck | Grep a kept file's own imports before leaving it unwired |
| **`motion` vs `framer-motion`** | Hoisting mismatch produces a *blank page*, not an error | Import from `motion/react` only; `lib/motion.ts` is the single source |
| **No tests + no CI** | 177 uncommitted changes on `main` right now | Phase 0 test setup; branch protection once CI exists |
| **Auth edge cases** | Refresh rotation is implemented but never exercised by a real UI | Explicit Phase 1 tests: expired access token, revoked refresh, concurrent refresh |
| **Role gaps ship silently** | A missed `authorize()` produces no error — just an endpoint anyone can call | Phase 0 test asserts 403 for a non-admin on *every* gated route; new gated routes must add a case |
| **Hiding admin UI without gating the API** | Sidebar-level hiding looks like security and isn't | Every admin surface gated server-side first, then hidden client-side. Never the reverse. |
| **`#ccff33` ships as a second accent** | It's now the file literally named `dashboard-template.html` | Swap at extraction; grep for `ccff33` in Phase 1 exit check |
| **Ephemeral chat reads as a bug** | Users assume messages persist unless told otherwise | Persistent header label + honest empty state, per Phase 8 |
| **Stale role in JWT after demotion** | Role is signed into the token; a demoted admin keeps access up to the 1h TTL while the UI says otherwise. Looks like it works. | Read role from DB on admin routes **and** revoke refresh tokens on role change (Phase 5) |
| **Last-admin lockout** | Demoting or deactivating the final admin has no recovery path in production | Server-side refusal, not a disabled button; covered by a Phase 5 test |
| **Admin scope creeps back to a Project model** | "View user projects" was scoped down to a read-only view; the fuller reading costs 2–3 weeks and re-does Phase 0 | If projects resurface, re-plan explicitly — do not let `projectId` arrive one model at a time |

---

## 5. Still open

Answered 2026-07-25: landing page (yes), roles (admin + user), chat (ephemeral + labelled), templates
(renamed, see §2c). Console Monitor resolved as admin-only under the assumed defaults in §2b.

What's left:

1. **The assumed defaults in §2b** — data scope, admin surfaces, homepage depth. Each was chosen as the
   smallest change that satisfies the admin/user split. Cheap to overturn before Phase 0 ends; expensive
   after Phase 2, because ticket and log queries get written either way.
2. **Missing templates.** The convention is that a template file is named for the function it serves.
   Four planned screens have no template and will be designed from `design.md` instead: the **homepage**,
   **user management**, **view-a-user's-work**, and the **OWASP security panel**. `documentation-template.html`
   covers Phase 6. If you intend to supply templates for those four, they're needed before Phases 1 and 5.
3. **Is 13.5 weeks acceptable, or do we cut to the Phase 0–4 first release?** See the Timeline note —
   Phases 0–4 (7.5 weeks) is already a complete role-aware product; admin console, docs, and chat are
   separable.
4. **The 177 uncommitted changes on `main`** — still uncommitted. Commit them as the reset baseline
   before Phase 0 starts. Doing this work on top of an uncommitted teardown means no clean revert point.

---

**Last updated:** 2026-07-25 (decisions round 3 — admin requirements)

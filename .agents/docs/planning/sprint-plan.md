# ApexOps — Sprint Plan

> Written 2026-07-25. Sequencing and scope come from
> [`development-plan.md`](development-plan.md); this doc turns it into dated sprints and names the
> shared foundations each sprint must build **before** the feature that needs them.
> Estimates are in **engineer-days**, not points — clearer for a solo build.

**Assumption: one engineer.** Say so if that's wrong; Sprints 2–4 parallelize across two.

---

## The load-bearing finding

Counted the real widget demand in `.agents/template/*`:

| Template | inputs | selects | textareas |
|---|---|---|---|
| `create-task-template.html` | 11 | 12 | 2 |
| `documentation-template.html` | 1 | — | — |
| `task-timeline-template.html` | 2 | — | — |
| `chat-template.html` | 1 | — | — |

**The codebase has zero form primitives.** No `Input`, no `Select`, no `Field`, no validation. The
design system is 12 display primitives — beautiful for a dashboard, useless for a create-ticket flow.

Every remaining feature is a form or a table. Ticket create, note editor, settings tabs, user
management, document authoring, login — all blocked on the same missing kit. Build it once in
Sprint 1, or rebuild it badly six times.

Same story for data surfaces: Bug Tracker, Logs, Users and Documents are all "search + filter +
sort + paginate a list." That's one `DataTable`, not four.

**Sprint order therefore leads with foundations, not features.** The pre-mortem is specific: six
months out, the most believable failure is not "we ran out of time" — it's four subtly different
select components, three date formats, and two ways of showing a loading state, because each page
was allowed to solve it locally.

---

## Foundation Kit — the small functions that need to exist first

Grouped by what unblocks what. **Nothing here is a page**; all of it is reused 3+ times.

### 1. Form kit — blocks *every* remaining feature (4d)

| Item | Why it must be shared |
|---|---|
| `Field` | label + hint + error + required marker + `aria-describedby` wiring. Accessibility done once. |
| `Input` `Textarea` `Select` `Checkbox` `Switch` `RadioGroup` | 12 selects in one template alone |
| `FormActions` | consistent submit/cancel placement and disabled-while-submitting |
| `useFormState` | values / errors / touched / isSubmitting / submit. Not a form library — ~80 lines |
| `validators.ts` | mirrors `app/server/src/schemas/auth.schema.ts` password rules |

**Recommendation: add `zod` to the client** and port the server's schema shapes rather than
hand-writing validators. The server already uses zod v4; hand-rolled client rules will drift from it
silently, and the failure mode is a user who passes client validation and gets a 400 they can't
action. Mitigation for the duplication: a header comment naming the server file, plus one test that
asserts a known-bad password fails both.

### 2. API layer — one place that handles 401 (2d)

`api/client.ts` has `fetchWithAuth` but **nothing refreshes an expired token**. Today a 1-hour-old
tab just starts failing.

- `apiFetch` — base URL, auth header, JSON, typed errors, **refresh-once-and-retry on 401**, and a
  single in-flight refresh (concurrent 401s must not fire N refresh calls and rotate each other out).
- `ApiError` — carries status + server message so UI can distinguish 403 from 500.
- `useResource<T>` — the generic loading/error/refetch state machine.
  **The four existing hooks each hand-copy this pattern.** Six more pages means six more copies;
  extract it now and migrate the existing four opportunistically.

### 3. Data-surface kit — blocks Bug Tracker, Logs, Users, Documents (4d)

| Item | Notes |
|---|---|
| `DataTable` | column defs, sort, loading, empty, row actions. Virtualize later — `react-virtuoso` is already a dependency |
| `Pagination` | server-side paging; every list endpoint returns totals |
| `SearchInput` | debounced, clearable |
| `FilterBar` + `useUrlFilters` | **filters sync to the query string.** A filtered bug list you can't paste into chat is half a feature, and retrofitting URL state later means touching every page |
| `Skeleton` | promote the hand-rolled one from `Dashboard.tsx` |
| `StatTile` unavailable variant | promote `MissingTile` from `Dashboard.tsx` — missing ≠ zero, and that rule should be enforced by the primitive, not remembered per page |

### 4. Overlay kit — blocks create flows and every destructive action (3d)

- `Modal` — focus trap, ESC, scroll lock, restore focus on close.
- `ConfirmDialog` — **required before any admin delete ships.** `DELETE /logs` wipes everything and
  has no confirmation anywhere in the system today.
- `Drawer` — note editor, ticket detail, AI panel.
- `DropdownMenu`, `Tooltip` — row actions and icon-button labels.

Use shadcn for `dialog`/`dropdown-menu`/`tooltip` (Radix handles focus management correctly);
re-skin to Luxe tokens. Hand-rolling a focus trap is a bug generator.

### 5. Guards & permissions (1d)

`ProtectedRoute`, `RoleRoute`, `useIsAdmin`, `<RequireRole>`.
Client-side only ever decides *what to show*. Server `authorize('admin')` decides what's allowed.

### 6. Small utils — each currently inlined or absent (1d)

`formatDate` / `relativeTime` (dayjs is installed, unused) · `formatNumber` · `initials`
(inlined in `Topbar.tsx`) · `statusTone` / `priorityTone` / `owaspLabel` maps · `getErrorMessage`
(extend the existing one for `ApiError`) · `buildQuery`.

Tone maps matter more than they look: ticket priority appears on the board, the detail page, the
dashboard and the OWASP panel. Four local colour decisions become four different reds.

### 7. Test foundation (1d)

Vitest + RTL + `renderWithProviders` (Theme/Auth/Toast/Router) + MSW-style fetch stub.
Without `renderWithProviders`, every test re-mounts four providers by hand and people stop writing tests.

**Foundation Kit total: 16d — roughly 1.5 sprints.** It is not overhead; it is the six features'
shared cost, paid once and visibly.

---

## Sprint schedule

Two-week sprints, 10 working days, planned to **~75% capacity (7.5d)** — the rest absorbs review,
bugs and interrupts.

### Sprint 1 — Foundations & the front door
**2026-07-27 → 2026-08-07**
**Goal:** *A stranger can register, log in, and land in a workspace that survives a token expiry.*

| P | Item | Est |
|---|---|---|
| P0 | Form kit (§1) | 4d |
| P0 | API layer + `useResource` (§2) | 2d |
| P0 | Guards (§5) + `/login`, `/register` | 2d |
| P0 | Prisma migration: `Role` enum + `Ticket.owaspCategory` (one migration) | 1d |
| P1 | Test foundation (§7) | 1d |
| P2 | Migrate existing 4 hooks onto `useResource` | 1d |

**Load 10d / 7.5d capacity — over. Cut P2, and P1 slips to Sprint 2 if the form kit runs long.**
Flagging this deliberately: the honest read is that Sprint 1 is full at P0 alone.

**Exit:** register → dashboard → wait past token expiry → still works. Non-admin gets 403 on gated
routes, proven by test.

---

### Sprint 2 — Data surfaces & Bug Tracker (part 1)
**2026-08-10 → 2026-08-21**
**Goal:** *Tickets are listable, filterable and shareable by URL.*

| P | Item | Est |
|---|---|---|
| P0 | Data-surface kit (§3) | 4d |
| P0 | Bug Tracker list + filters + URL state | 3d |
| P1 | Small utils (§6) | 1d |
| P2 | Logs list (reuses the same kit — proves it) | 1d |

**Load 9d.** P2 is the stretch, and it's the *right* stretch: building Logs on the kit immediately
is how you find out the kit is wrong while it's still cheap to change.

---

### Sprint 3 — Bug Tracker complete + OWASP
**2026-08-24 → 2026-09-04**
**Goal:** *A ticket can be created, assigned, tagged with an OWASP category and worked to done, live.*

| P | Item | Est |
|---|---|---|
| P0 | Overlay kit (§4) | 3d |
| P0 | Stepped create flow (`create-task-template.html` IA) | 3d |
| P0 | Ticket detail + status/assignee actions | 2d |
| P1 | OWASP category filter + dashboard security panel | 1d |

**Load 9d.** Realtime check is part of DoD here: two browser windows, no double-applied optimistic
updates.

---

### Sprint 4 — Notes & Calendar
**2026-09-07 → 2026-09-18**
**Goal:** *One Notes surface with a calendar density toggle — merged from the start, never two routes.*

| P | Item | Est |
|---|---|---|
| P0 | Note list + editor (Tiptap, already a dependency) | 4d |
| P0 | Calendar view + `SegmentedControl` toggle | 3d |
| P1 | Note types: checklist / image / link | 2d |

Harvest the timeline track from `task-timeline-template.html`.

---

### Sprint 5 — Settings & Admin Console
**2026-09-21 → 2026-10-02**
**Goal:** *An admin can promote a user, and that user's access actually changes.*

| P | Item | Est |
|---|---|---|
| P0 | Account Settings tabs (pure form-kit payoff — should be fast) | 2d |
| P0 | `GET /api/users`, `PATCH /:id/role`, `PATCH /:id/active` | 3d |
| P0 | **Token invalidation on role change + last-admin guard** | 1d |
| P0 | User management UI (DataTable payoff) | 2d |
| P1 | View-a-user's-work (tickets/notes/logs, `userId` filter) | 2d |

**The 1d token-invalidation item is the highest-risk line in the whole plan.** Role is signed into
the JWT; without it, demotion silently doesn't take effect for up to an hour while the UI reports
success. It is not a stretch item and must not be cut.

---

### Sprint 6 — Documentation & AI Chat
**2026-10-05 → 2026-10-16**
**Goal:** *Admins publish docs; everyone reads them.*

| P | Item | Est |
|---|---|---|
| P0 | `Document` model + CRUD (admin-gated) + draft/publish | 3d |
| P0 | Docs reading shell — 3-pane, from `documentation-template.html` | 3d |
| P1 | AI Chat drawer (`useAiChat`, modeled on `useNoteAiChat`) | 2d |

Authoring reuses the Sprint 4 Tiptap editor — a concrete reason Notes came first.

---

### Sprint 7 — Chat, Console Monitor, hardening
**2026-10-19 → 2026-10-30**
**Goal:** *Ship the last two surfaces and close the operational gaps.*

| P | Item | Est |
|---|---|---|
| P0 | Chat UI on the existing `useChat` — ephemeral, **labelled in the thread header** | 3d |
| P0 | Console Monitor (admin-only) | 2d |
| P0 | CI: build + typecheck + lint + test on PR | 1d |
| P1 | Split Puppeteer out of the server image | 2d |

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Sprint 1 is over capacity at P0 alone | Everything shifts a sprint | Named up front, not discovered in week 2. Cut the hook migration and test foundation first; keep the form kit whole |
| Foundation Kit gets skipped under delivery pressure | Four select components, three date formats — the exact 6-month failure | Kit items are P0 *inside* the sprint that needs them, never a separate "cleanup" backlog |
| `DataTable` designed for tickets only | Rework at Users and Documents | Build Logs on it in Sprint 2 as the second consumer — the cheapest possible generality test |
| Role change doesn't take effect | Silent privilege retention, looks like it works | Sprint 5 P0, with an explicit test: demote → old token rejected |
| URL filter state retrofitted late | Touches every list page | In the kit from Sprint 2, not added per page |
| Client validators drift from server zod | Users blocked by 400s they can't action | Share zod schemas; test asserts both reject the same bad input |

---

## Definition of Done

- [ ] `tsc --noEmit`, `eslint src`, `npm run build` clean
- [ ] Verified in-browser: happy path, empty state, **and** the failure state
- [ ] Light and dark both checked
- [ ] No inline hex, no `framer-motion`, no `#ccff33`; motion only from `@/lib/motion`
- [ ] New shared primitive → added to `/design-system` **before** the page that uses it
- [ ] Admin-facing work: server-side `authorize()` first, UI hiding second
- [ ] Docs updated at sprint exit, not "at the end"

## Key dates

| Date | Event |
|---|---|
| 2026-07-27 | Sprint 1 start |
| 2026-08-07 | Sprint 1 demo — auth loop closed |
| 2026-09-04 | Sprint 3 demo — **first genuinely useful product** (tickets end-to-end) |
| 2026-10-02 | Sprint 5 demo — admin console |
| 2026-10-30 | Sprint 7 — feature complete |

---

**Last updated:** 2026-07-25

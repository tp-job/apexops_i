# ApexOps — Sprint Plan

> **Rewritten 2026-07-28** against the code, not against the previous plan. Sprints 2–4 were
> re-cut from scratch; the versions written 2026-07-25 described a different product (a manual
> Jira-style ticket tracker) than the one that has since been built and scope-locked (an
> SDK-fed error monitor). See [The re-cut](#the-re-cut-2026-07-28) for the audit that forced it.
>
> Sequencing rationale: [`development-plan.md`](development-plan.md) — read its 2026-07-28 currency
> notice first; its §1 status table predates the workspaces work.
> Estimates are in **engineer-days**, not points — clearer for a solo build.
> **Assumption: one engineer.** Say so if that's wrong; Sprints 2–4 parallelize across two.

## Document precedence

Per [`../README.md`](../README.md) convention 3 — *feature decisions live in `features/`, not in
sprint plans.* When this file and a feature spec disagree:

| Subject | Authority |
|---|---|
| Scope, decisions (`D1`…), gates, exit notes | the feature spec in [`../features/`](../features/) |
| Dates, ordering, capacity, what is next | **this file** |

This file **never** re-states a decision. It points at the spec that owns it. That is the rule
that was broken last time and produced two contradictory plans.

---

## The re-cut (2026-07-28)

The 2026-07-25 plan was written two days before
[`project-workspaces-and-sdk.md`](../features/project-workspaces-and-sdk.md) locked scope on a
per-project, SDK-fed error monitor. It never absorbed that. Audited against the tree, four of its
seven sprints were wrong in a way that would have cost real days:

| Old plan said | Code says |
|---|---|
| Sprint 2: "Bug Tracker list + filters" (single-tenant) | `Ticket` is project-scoped since 2026-07-27. A non-scoped list would be built and immediately rewritten. |
| Sprint 3: stepped ticket create flow, 6d | The product's primary input is **SDK ingest**, not human filing. `POST /api/ingest` already works. |
| Sprint 3: `Ticket.owaspCategory` | **Not in the schema.** The Sprint 1 migration item never landed, and nothing references it. |
| Sprint 4: Notes & Calendar, 9d | [`NotesCalendar.tsx`](../../../app/client/src/pages/NotesCalendar.tsx) is 614 lines and shipped. |
| Sprint 7: Chat UI, 3d | [`Chat.tsx`](../../../app/client/src/pages/Chat.tsx) is 339 lines and shipped. |

**The load-bearing finding: the goal is ~60% backend-complete and 0% visible.** Multi-project, API
keys, and error grouping are all built, tested and verified server-side. None of them has a screen.
The entire remaining gap is SDK + UI. Sprints 2–4 below are that gap, in dependency order.

### Objective this plan serves

A centralized bug tracker for multiple projects (React / Node / TypeScript) —
multi-project · API key · real-time dashboard · error grouping · source maps.

| Goal feature | Backend | Frontend | Lands |
|---|---|---|---|
| Multi-Project | ✅ `Project`, `ProjectMember`, CRUD, archive/restore | ✅ `/projects` + switcher | **Shipped** |
| API Key | ✅ generate, rotate, write-only, rate-limited | ✅ snippet + rotate w/ confirm | **Shipped** |
| Error Grouping | ✅ fingerprint + upsert | ✅ `/p/:slug/issues` | **Shipped** |
| Real-time Dashboard | ⚠️ socket.io exists, not wired to issues | ⚠️ 4s poll on the waiting state only | Sprint 3 |
| Source Maps | ❌ only `Event.release` as a hook | ❌ | Sprint 4 |

---

## Where things actually stand

### Shipped

| | Evidence |
|---|---|
| **Auth** — login, register, guards, seeded dev users | `Login.tsx` · `Register.tsx` · `ProtectedRoute` · [`sprint-1-thin-slice.md`](../archive/sprint-1-thin-slice.md) |
| **Dashboard, Bug Tracker board + detail + comments, Notes + Calendar, Chat** | 4 pages, 2158 lines, all routed in `AppRoutes.tsx` |
| **Workspaces G1** — `Project`, `ProjectMember`, `Issue`, `Event`, `Ticket.projectId`, project CRUD + key rotation | [`api/projects.ts`](../../../app/server/src/api/projects.ts) · [`lib/projectKeys.ts`](../../../app/server/src/lib/projectKeys.ts) |
| **Workspaces G2** — secure `POST /api/ingest`, fingerprint grouping, per-key rate limit, retention prune, `DELETE /api/logs` closed, :8082 relay deleted | [`api/ingest.ts`](../../../app/server/src/api/ingest.ts) · [`lib/fingerprint.ts`](../../../app/server/src/lib/fingerprint.ts) · [`lib/retention.ts`](../../../app/server/src/lib/retention.ts) |
| **Chat socket security** | JWT handshake + per-room emit, verified 2026-07-26 |

### Foundation Kit — what exists, what does not

The 2026-07-25 kit analysis still holds; the inventory has moved. Current state of
[`components/design-system/`](../../../app/client/src/components/design-system/index.ts):

| Kit | Built | Missing |
|---|---|---|
| Display | `Surface` `StatTile` `AnimatedNumber` `Meter` `AccentButton` `Badge` `EmptyState` `Timeline` `Stepper` `AvatarStack` `SegmentedControl` `GanttTrack` `PageHeader` `GlassPanel` `KpiCard` `PillTabs` | — |
| **Form** | `Field` `Input` `useFieldWiring` · `utils/validators.ts` | `Select` `Textarea` `Checkbox` `Switch` `RadioGroup` `FormActions` `useFormState` |
| **Data-surface** | — | `DataTable` `Pagination` `SearchInput` `FilterBar` `useUrlFilters` `Skeleton` |
| **Overlay** | — | `Modal` `ConfirmDialog` `Drawer` `DropdownMenu` `Tooltip` |
| **API layer** | `fetchWithAuth` (base URL + auth header) | `ApiError` · `useResource` · **refresh-once-and-retry on 401** |

Kit items are P0 **inside the sprint that needs them**, never a separate cleanup backlog. Each is
listed against its first real consumer below, and every one has ≥2 consumers by Sprint 4.

### One correction to the Sprint 1 record

Sprint 1's stated exit was *"wait past token expiry → still works."* **That is not true today.**
`authApi.refreshToken()` exists in [`services/auth.ts`](../../../app/client/src/services/auth.ts)
and `AuthContext` wraps it — but grep finds **no caller**: no interval, no 401 interceptor, and
[`api/client.ts`](../../../app/client/src/api/client.ts)'s `fetchWithAuth` returns a 401 unchanged.
A token that expires mid-session silently breaks every request.

It is carried as **P0 in Sprint 3**, not quietly dropped. It is one sprint late because nothing
built so far runs long enough in one tab to hit it; the issue stream in Sprint 3 is the first
surface that does.

---

## Sprint schedule

Two-week sprints, 10 working days, planned to **~75% capacity (7.5d)** — the rest absorbs review,
bugs and interrupts.

### Sprint 2 — Ingest becomes visible
**2026-07-28 → 2026-08-08**
**Goal:** *Paste one line into another project's `index.html`, break that page, and watch a grouped
issue appear in its ApexOps workspace and become a tracked ticket.*

Closes [`project-workspaces-and-sdk.md`](../features/project-workspaces-and-sdk.md) G3–G5.

**Status: shipped 2026-07-28.** Exit notes in
[`project-workspaces-and-sdk.md`](../features/project-workspaces-and-sdk.md).

| P | Item | First consumer | Est | |
|---|---|---|---|---|
| P0 | Data-surface core: `DataTable`, `Pagination`, `Skeleton` | issue list | 2d | ✅ |
| P0 | `Modal` + `ConfirmDialog` (shadcn/Radix, re-skinned to Luxe) | rotate key, delete project | 1d | ✅ |
| P0 | Form kit: `Checkbox` + `Switch` | capture-levels + retention controls in G4 | 0.5d | ✅ |
| P0 | **G3** — SDK v2 at `/sdk/v1.js`: `data-*` config, 5s dedupe window, `sendBeacon` on unload, circuit breaker, payload caps, WS path removed. Ship `demo.html` proving it end-to-end | — | 1.5d | ✅ |
| P0 | **G4** — `/projects` list + create, project switcher in Topbar, `/p/:slug/settings` with the live *waiting for first event* state | — | 1.5d | ✅ |
| P0 | **G5a** — `/p/:slug/issues` list (sorted by `lastSeen`) + **Create ticket from issue** + board filtered by project | — | 1.5d | ✅ |
| — | **Unplanned: issues API** — no issue endpoints existed; list/detail/status/promote all had to be built, plus `lib/projectAccess.ts` | G5a | +1d | ✅ |
| — | **Unplanned: close the ticket-read leak** — `GET /api/tickets` returned every ticket in the database to any authenticated user | G5a | +0.5d | ✅ |

**Planned 8.0d against 7.5d capacity; landed at 9.5d.**

Two items were not in the plan and were not optional:

- **The issues API did not exist.** G5a read as a UI gate, but there were no issue endpoints to
  build a UI on. Worth recording as an estimation lesson: the gate named the screen, and nobody
  checked whether the data it renders had a route.
- **`GET /api/tickets` had no project scoping** — it returned every ticket in the database to any
  authenticated user, and `GET /:id` served any row by integer. Correct when the board was
  single-tenant; a cross-project leak from the moment `Project` landed. Found only because G5a
  required "board filtered by project" and the filter had nothing to filter on.

The original half-day overrun (`Checkbox`/`Switch`) was real and was also correct to flag: G4's
settings screen edits capture levels and retention, and the design system shipped **only `Field` and
`Input`**.

**Why `ConfirmDialog` is P0 here and not "overlay kit later":** G4 ships key rotation and project
delete in the same screen. Rotating a key silently breaks every page already embedding it. Shipping
a destructive action with no confirmation is the exact failure the old plan flagged for
`DELETE /logs` and then scheduled a sprint too late.

**Cut order if it runs long:** issue-list `Pagination` → project-switcher polish → `demo.html`
fixture. **Do not cut G5a's Create-ticket action** — see the pre-mortem.

**Exit — the acceptance test, run for real on 2026-07-28. Passed.**
200 identical errors → **one** issue, count 200. 50 distinct `User <n> not found` strings → **one**
issue, count 50, while `eventsLast24h` read 51 (the D3 split working). Promote → `TICK-007` on that
project's board; a second promote answered 409 with the existing ticket id. A non-member account
could not see the ticket in the list, got 404 by id, and 404 on the project's issues. The *waiting
for first event* screen flipped to *receiving* on its own, ~4s after an event was posted from
outside the browser, with no refresh.

---

### Sprint 3 — An issue list you'd trust
**2026-08-11 → 2026-08-22**
**Goal:** *The issue list updates itself, tells the truth when it is silent, and survives a
one-hour-old tab.*

Sprint 2 makes errors visible. This one makes the surface trustworthy enough to leave open on a
second monitor — which is the only way a monitoring tool gets used.

| P | Item | Est |
|---|---|---|
| P0 | API layer: `apiFetch` + `ApiError` + **refresh-once-and-retry on 401 with a single in-flight refresh** + `useResource` | 2d |
| P0 | Real-time issue stream — socket.io → issue list, per-project room, no double-applied optimistic updates | 1.5d |
| P0 | **The three states** (spec §UX): zero-events-ever, receiving-then-silent-24h, flooding + inline *Ignore this issue* | 1.5d |
| P0 | `SearchInput` + `FilterBar` + `useUrlFilters` on `/p/:slug/issues` (level, status, time) | 1d |
| P1 | **G5b** — issue detail: latest event, full stack, occurrence timeline, browser/OS breakdown | 1.5d |

**Load 7.5d at P0 + P1.** P1 is the stretch and the honest cut.

**On the single in-flight refresh:** concurrent 401s must not fire N refresh calls that rotate each
other's tokens out. This is the whole reason the item is 2d and not 0.5d, and it is the bug that
looks like "random logouts" three months from now.

**On URL filter state:** the old plan's risk table warned against retrofitting it late because it
touches every list page. It is one page here, one sprint after that page ships — an increment on a
single surface, not a cross-app retrofit. The rule still holds for every *new* list.

**Exit:** two browser windows on the same project; an error thrown in a third tab appears in both
within 2s, once. Leave a tab open past token expiry — it keeps streaming. A project with no events
for 24h says so, in words, instead of showing an empty table.

---

### Sprint 4 — Source maps & releases
**2026-08-25 → 2026-09-05**
**Goal:** *A minified stack frame resolves to the original file, line and function.*

The last unshipped feature in the objective, and the one that decides whether the tracker is usable
against a production React build at all. `Event.release` already exists as the hook; nothing else does.

| P | Item | Est |
|---|---|---|
| P0 | `SourceMap` model + **authenticated** upload API scoped to project + release; size caps; overwrite semantics | 1.5d |
| P0 | Symbolication service — `source-map` lib, frame resolution, LRU cache, graceful fallback to the raw frame | 2d |
| P0 | Apply at issue-detail read time; show original frames with a *view minified* toggle | 1.5d |
| P0 | Upload recipe (curl + npm script) and `data-release` wired end-to-end in SDK v2 + docs | 1d |
| P1 | Release list; *first seen in release* on the issue; regression flag when a resolved issue returns in a newer release | 1.5d |

**Load 7.5d at P0 + P1.**

**Hard dependency: this needs Sprint 3's P1 issue-detail view.** Symbolication with nowhere to
render it is not shippable. If G5b slips out of Sprint 3, it becomes the first P0 item here and the
P1 release work drops — flagging that now rather than discovering it in week 2.

**Security note, and it is not a footnote: uploaded source maps contain your original source.**
Storage must be non-public, never served from the SDK origin, and never reachable with the ingest
key (which is public by design — spec D4). The upload endpoint uses the JWT session. Getting this
backwards publishes the customer's codebase, which is the single worst outcome available in this
sprint.

**Why this displaces Settings.** [`settings.md`](../features/settings.md) claims "the sprint after
the current one," and that claim was written on 2026-07-27 when it was true. It no longer is: that
spec's own load-bearing finding is that all 11 `UserSettings` toggles are decorative — written to
Postgres and read by nothing. Source maps is a named objective feature; Settings is a screen for
switches that do not do anything yet. **Settings moves to Sprint 5**, and its S-D1…S-D5 decisions
still need locking before it starts.

---

### Sprint 5+ — not yet scoped

Sequenced, deliberately not estimated. Each needs a `features/` spec at G0 before it gets dates.

| Sprint | Subject | Blocking question |
|---|---|---|
| 5 | Settings — function + account; **roles that mean something** | S-D1…S-D5 unlocked in [`settings.md`](../features/settings.md); which of the 11 toggles become real |
| 6 | Team invites + `ProjectMember` UI | the table exists, the sharing model does not |
| 7 | Alerting (email/Slack), Docs + AI Chat, CI on PR | what is worth waking someone up for |

**Two items carried forward from the old plan so they are not lost in the re-cut:**

1. **`authorize()` has one caller in the whole codebase** — `DELETE /api/logs`, added by workspaces
   G2. No user-facing endpoint is role-gated, so promoting a user to admin currently grants almost
   nothing. Roles have to *mean* something before anything built on them is worth doing.
2. **Token invalidation on role change** — role is signed into the JWT, so a demotion silently does
   not take effect for up to an hour while the UI reports success. The old plan called this its
   highest-risk single line and it was right. It is **not** cuttable once (1) lands, and it must be
   scoped in the same sprint as the role-gating, never after it.

Deferred to v1.1 by the workspaces spec and still deferred: npm package, server-side/Node SDK,
breadcrumbs, session replay, per-issue assignment rules.

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Two half-built bug trackers** — the manual `Ticket` board and the SDK `Issue` pipeline both exist, neither seam-complete. The most believable 6-month failure. | Product has no answer to *"where do I look when something breaks?"* | `Issue.ticketId` is the seam. **Create-ticket-from-issue is P0 in Sprint 2 and explicitly not on the cut list.** A list + promote is a coherent product; a detail view with no promote is a dead end. |
| Sprint 2 is 0.5d over capacity before it starts | Any further overrun pushes the demo | Named up front, not discovered in week 2. Cut order is written into the sprint, in order, before it starts. |
| Form kit is thinner than every plan has assumed | Estimates that touch a form are low across Sprints 2, 4 and 5 | Inventory table above is now explicit about what exists. `Select`/`Textarea`/`RadioGroup`/`FormActions`/`useFormState` are **still unbuilt** and must be priced into Settings (Sprint 5), not assumed. |
| Real-time double-applies optimistic updates | Counts visibly wrong — fatal for trust in a *counting* tool | Two-window check is Sprint 3's exit criterion, not a QA afterthought |
| Token refresh still unbuilt | Silent breakage in any long-lived tab — and Sprint 3 ships the first surface people leave open | P0 Sprint 3. Single in-flight refresh, tested with concurrent 401s |
| Source maps leak original source | Customer codebase published | JWT-gated upload, non-public storage, never reachable via the ingest key. Asserted at Sprint 4 exit |
| Feature spec and sprint plan drift apart again | Exactly what produced this rewrite | Precedence table at the top of this file. Sprint plans carry dates; specs carry decisions |
| Docs updated "at the end" | This document was 3 sprints stale when audited | Sprint exit updates the spec's exit notes **and** this file's status table, in the same PR as the code |

---

## Definition of Done

- [ ] `tsc --noEmit`, `eslint src`, `npm run build` clean
- [ ] Verified in-browser: happy path, empty state, **and** the failure state
- [ ] Light and dark both checked
- [ ] No inline hex, no `framer-motion`, no `#ccff33`; motion only from `@/lib/motion`
- [ ] New shared primitive → added to `/design-system` **before** the page that uses it
- [ ] Admin-facing work: server-side `authorize()` first, UI hiding second
- [ ] Ingest-facing work: rate limit and payload cap asserted, not assumed
- [ ] Docs updated at sprint exit — feature spec exit notes **and** this file's status table

## Key dates

| Date | Event |
|---|---|
| 2026-07-27 | Workspaces G1 + G2 shipped (out of band) |
| 2026-08-08 | **Sprint 2 demo — paste-one-line-see-the-issue.** First genuinely useful product |
| 2026-08-22 | Sprint 3 demo — live issue stream you can leave open |
| 2026-09-05 | Sprint 4 demo — minified stack resolves to original source |

---

**Last updated:** 2026-07-28 — Sprints 2–4 re-cut against the tree; Sprints 5–7 reduced to an
unestimated backlog pending G0 specs.

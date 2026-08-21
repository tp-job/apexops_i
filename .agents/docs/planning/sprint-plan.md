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

### One correction to the Sprint 1 record — ✅ closed 2026-08-03

Sprint 1's stated exit was *"wait past token expiry → still works."* **It was not true.**
`authApi.refreshToken()` existed in `services/auth.ts` and `AuthContext` wrapped it — but grep found
**no caller**: no interval, no 401 interceptor, and `fetchWithAuth` returned a 401 unchanged. A token
that expired mid-session silently broke every request, while the app kept rendering a signed-in shell.

**Fixed as Sprint 3's P0 on 2026-08-03.** [`lib/authSession.ts`](../../../app/client/src/lib/authSession.ts)
now owns the refresh with a single in-flight promise; all four client transports —
[`fetchWithAuth`](../../../app/client/src/api/client.ts), the axios instance in `services/api.ts`,
the six modules that called `fetch` directly, and `services/auth.ts` itself — refresh once and retry
once on a 401. Spec and evidence: [`build-spec.md`](../archive/sprint-3-auth-build-spec.md),
[`progress.md`](../archive/sprint-3-auth-progress.md). Socket handshakes are **not** covered and are recorded there
as a gap belonging to the real-time-stream item.

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
| P0 | API layer: `apiFetch` + `ApiError` + **refresh-once-and-retry on 401 with a single in-flight refresh** + `useResource` — **401 half ✅ shipped 2026-08-03**; `useResource` still open | 2d |
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

**Status: P0 shipped 2026-08-04.** Spec and evidence:
[`build-spec.md`](../archive/sprint-4-sourcemaps-build-spec.md), [`progress.md`](../archive/sprint-4-sourcemaps-progress.md),
[`feature-list.json`](../archive/sprint-4-sourcemaps-feature-list.json) — 12/13 features verified.

| P | Item | Est | |
|---|---|---|---|
| P0 | `SourceMap` model + **authenticated** upload API scoped to project + release; size caps; overwrite semantics | 1.5d | ✅ |
| P0 | Symbolication service — `source-map` lib, frame resolution, LRU cache, graceful fallback to the raw frame | 2d | ✅ |
| P0 | Apply at issue-detail read time; show original frames with a *view minified* toggle | 1.5d | ✅ |
| P0 | Upload recipe (curl + npm script) and `data-release` wired end-to-end in SDK v2 + docs | 1d | ✅ |
| P1 | Release list | 0.5d | ✅ |
| P1 | *First seen in release*; regression flag when a resolved issue returns in a newer release | 1.0d | ❌ **cut** |

**Load 7.5d at P0 + P1; landed P0 plus the release list.**

**The cut half of P1 is a G0 decision, not an implementation — which is why it was cut rather than
rushed.** *Regression in a newer release* requires release **ordering**, and there is no correct
ordering for arbitrary version strings: `cart@4.2.0`, `cart@4.10.0`, a git SHA and a CI build number
are four different schemes. Picking one silently is how a "regression" badge starts lying. *First
seen in release* additionally needs a per-issue release denormalization. Both belong in a spec.

**`data-release` needed no SDK work.** It was already read from the script tag, stored on `Event`
and tallied in the issue breakdown — the hook the plan described. Only the docs changed, including
the row that called source maps "a future feature".

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

### Sprint 6 — Team invites + roles that mean something
**2026-09-22 → 2026-10-03** *(nominal — see the note under Sprints 5, 7)*
**Goal:** *Invite a teammate into one project, give them a role, and have that role decide what they
can actually do — enforced on the server, not just hidden in the UI.*

Spec: [`team-and-roles.md`](../features/team-and-roles.md) — scoped to G0 on 2026-07-31. Decisions
`T-D1`…`T-D7` are locked there; this file does not restate them.

| P | Item | Gate | Est |
|---|---|---|---|
| P0 | **Assignee membership check** on ticket create + update; permission matrix asserted on every existing project route | G1 | 1.5d |
| P0 | `ProjectInvite` migration + the eight invite/member routes; token hashing, expiry, rate limit | G2 | 2d |
| P0 | `Select` primitive (**still unbuilt**) + Members tab on `/p/:slug/members` | G3 | 2d |
| P0 | `/invite/:token` accept screen + the `invite` notification | G4 | 1.0d |
| P1 | Leave project, remove member, transfer ownership | G5 | 1.5d |

**Load 6.5d at P0, 8.0d with P1 — 0.5d over capacity, named before the sprint starts.** Cut order
and the full exit test live in the spec.

**Scoping this sprint found a live PII leak, and it is P0 here, first:** `assigneeId` in
[`api/tickets.ts`](../../../app/server/src/api/tickets.ts) is validated as *"is a known user"* rather
than *"is a member of this project"*, and the response embeds the assignee's email. Any authenticated
user can enumerate every account's name and email by guessing integers. The correct check needs the
membership surface this sprint builds, which is why it sits here rather than in a security pass.

**One carried-forward risk is smaller than this plan priced it.** `ProjectRole` is **not** in the
JWT — every project route resolves it per request via `resolveMembership`. A demotion therefore takes
effect on the next request, with no token work at all. The token-staleness risk belongs to the
global `User.role` only, which this sprint does not touch. See the spec's finding 2.

---

### Sprint 5 — Settings that enforce, roles that mean something

**Status: shipped 2026-08-04.** Spec and evidence: [`build-spec.md`](../archive/sprint-5-settings-roles-build-spec.md),
[`progress.md`](../archive/sprint-5-settings-roles-progress.md), [`feature-list.json`](../archive/sprint-5-settings-roles-feature-list.json) —
17/17 features, 62/62 API assertions, acceptance criteria 1–14 all met.

Landed in two passes. S1/S2 and half of S4 shipped early on **2026-07-31** (`/settings` with profile,
password change and the active-session list; `updateSettingsSchema` pruned to one field). The rest
shipped **2026-08-04**, once Sprint 3's 401-refresh path unblocked S-D2.

| # | Gate | Est | |
|---|---|---|---|
| S1 | `/settings` shell + Profile tab (email read-only) | 1.5d | ✅ 07-31 |
| S2 | Security: change password, `RefreshToken` user-agent/IP, session list + revoke + sign-out-everywhere | 2.0d | ✅ 07-31 |
| S3 | `sessionTimeout` made real + Preferences (theme/timezone applied) | 1.5d | ✅ 08-04 |
| S4 | Honest cleanup: the ten unenforced toggles out of the schema **and** the `/profile` response | 0.5d | ✅ 07-31 + 08-04 |
| S5 | Endpoint role-gating, `GET /api/users`, role/active PATCH, role-change invalidation, last-admin guard | 2.0d | ✅ 08-04 |

**The sprint's two load-bearing findings, both of which changed the implementation:**

1. **`sessionTimeout` had to bound the refresh token, not just the access token.** S-D2 said "sign the
   access token with it as `expiresIn`", and that alone enforces *nothing observable* — since Sprint 3
   the client silently re-issues an expired token, so a 5-minute setting and a 60-minute one feel
   identical. `RefreshToken.expiresAt` is now a sliding idle window; that is what makes the label
   true. The old column default (30) was migrated to 480 **before** enforcement, because nobody chose
   30 and enforcing it would have shipped this sprint as "the app started logging me out".
2. **Token-invalidation-on-role-change did not need a `tokenVersion` column.** This risk has been the
   top item in every plan's backlog for months. Sprint 6 found the project-role half was never real;
   the same answer works globally — `authorize()` resolves `role` and `isActive` from the database,
   costing one primary-key lookup on gated routes only, with no window in which a revoked admin is
   still an admin. **Both carried-forward items below are now closed.**

**Also closed here, found while scoping or verifying:**

- The session list's `current` flag was computed from `req.body` on a **GET**, so it was always
  `false`: the "this device" badge never rendered and the per-row *Sign out* would revoke the session
  in use. Exactly the failure settings.md's risk table predicted, shipped and live. Fixed with a `sid`
  claim carrying the refresh row's id.
- Sessions were effectively immortal — every rotation reset `expiresAt` to `now + 7d`. There is now a
  true absolute cap, carried forward through rotations.
- `DELETE /api/logs/:id` was reachable by any authenticated user. The bulk route was gated in the
  workspaces sprint; the by-id one was missed.
- **Two logins in the same second returned a 500** (identical refresh JWT → unique-constraint
  violation). Pre-existing; fixed with a random `jti`.

---

### Sprint 7 — Platform hardening

**Status: shipped 2026-08-04.** Spec [`platform-hardening.md`](../features/platform-hardening.md)
(`E-D1`…`E-D6`); evidence [`build-spec.md`](../archive/sprint-7-hardening-build-spec.md),
[`progress.md`](../archive/sprint-7-hardening-progress.md), [`feature-list.json`](../archive/sprint-7-hardening-feature-list.json) —
19/19 features, 77 assertions, criteria 1–14.

Scoping the row changed it. Two of the three planned items were smaller than assumed, and **the most
urgent work in the sprint was not on the plan.**

| Planned | What scoping found | Landed |
|---|---|---|
| Docs + AI Chat | Both already built (`Chat.tsx` 339 lines, `Docs.tsx` 256) — but **`POST /api/ai/chat` had no auth, no rate limit and no input cap.** An anonymous request reached Google. | ✅ P0, first |
| CI on PR | Not the gap. There was **no test runner at all**, and four consecutive sprints closed with "no automated tests" as their first known gap. | ✅ 59 tests + CI |
| Email for alerts and invites | Blocked on a production domain, **not** on being built or verified — real SMTP against a local catcher exercises the whole path. | ✅ shipped |

**Two live security holes closed, neither of them on any plan:**

1. **The AI proxy was open to the internet.** With a valid key in the environment, anyone reachable
   had free, unattributed use of the Gemini quota at 8192 output tokens per call. Four controls, all
   refusing *before* the outbound call, because a cap that runs after the spend is a log message.
2. **`POST /api/console-logs` was unauthenticated SSRF.** It took an arbitrary URL and drove a
   headless Chrome to it — including `169.254.169.254`, the cloud metadata address. Now admin-gated,
   rate-limited, and behind a guard that resolves DNS rather than pattern-matching hostnames.

**The four-sprint testing gap is closed and was proven rather than declared:** two real regressions
were reintroduced (the timezone display-suffix strip, the fingerprint NUL separator) and the suite
went red naming the right test each time. It also caught a bug in the new SSRF guard on its first
run — an `::ffff:0:0/96` BlockList rule that silently blocked the entire public IPv4 internet.

**Verifying CI against a clean checkout — rather than this working tree — found two more:**
`package-lock.json` was **gitignored**, so `npm ci` was impossible and no install had ever been
reproducible (the direct cause of Sprint 4's deduped `source-map` 0.5.7); and a pre-existing lint
error that would have made the very first pull request red.

**CI checks only — no deploy, no publish, no secrets.** This repo had no pipeline; the first one must
not ship code as a side effect of a merge. Adding delivery is its own decision.

The one thing still genuinely blocked is what the plan predicted: **a production sending domain with
SPF/DKIM.** That is operator work. Everything up to it is built and asserted.

> **The dates above are nominal.** Work has landed out of plan order throughout: Sprint 5's account
> half and the alerting pencilled for Sprint 7 both shipped on 2026-07-31, then Sprints 6, 3, 4, the
> rest of 5, and 7 all landed between 2026-08-01 and 2026-08-04. Sequencing has been **by dependency,
> not by the calendar** — which is why Sprint 5's S3 waited for Sprint 3 rather than for its date.
>
> **Corrected 2026-08-20.** This paragraph used to read *"Every sprint in this plan has now shipped."*
> It was not true. Sprint 3's **real-time issue stream** — *"socket.io → issue list, per-project room,
> no double-applied optimistic updates"* — had never been built: `hooks/useIssues.ts` had no socket
> and no poll, nothing on the server emitted for issues, and `io` was not even exported, so there was
> no seam to emit from. Sprint 3's other four items did ship, which is the likely reason the row was
> marked done. The gap was found by auditing the tree on 2026-08-07 and closed by **Sprint 8**
> ([`.agents/harness/sprint-8-realtime-issue-stream/`](../../harness/sprint-8-realtime-issue-stream/),
> decisions in [`realtime-issue-stream.md`](../features/realtime-issue-stream.md)) on 2026-08-20.
>
> **The lesson is the process one, and it is why this correction is verbose:** a plan row is a claim
> about the tree, and only the tree can settle it. Verify before writing "shipped".
>
> Every sprint in this plan has now shipped, Sprint 3 included. What is left is named in each
> sprint's `progress.md` gap list, not here; the largest are integration tests (most coverage today
> is unit tests — Sprint 8 added the first wire-level socket tests), a production sending domain for
> email, and the two release features cut from Sprint 4 pending a decision on release ordering.

**Two items carried forward from the old plan — both closed by Sprint 5 on 2026-08-04:**

1. ~~**`authorize()` has one caller in the whole codebase**~~ — it now gates `GET /api/users`,
   `PATCH /api/users/:id/role`, `PATCH /api/users/:id/active`, `DELETE /api/logs` and
   `DELETE /api/logs/:id`. ✅ **Closed.** The global `admin` role decides something.
2. ~~**Token invalidation on role change**~~ — ✅ **Closed, and it needed no token machinery.**
   `authorize()` resolves `role` and `isActive` from the database rather than trusting the JWT claim,
   so a demotion takes effect on the demoted user's next request. Asserted, not assumed: the same
   access token answers 403, then 200 after promotion, then 403 again after demotion. Demotion and
   deactivation also delete the target's refresh tokens, so ordinary access cannot outlive the current
   access token either.

Deferred to v1.1 by the workspaces spec and still deferred: npm package, server-side/Node SDK,
breadcrumbs, session replay, per-issue assignment rules.

### Sprint 8 — Real-time issue stream — **scoped, never started**

Spec, ledger, progress and decisions are archived intact at
[`archive/sprint-8-realtime-issue-stream-*`](../archive/) and are re-scopeable as written. Nothing was
built against them, so nothing about them is stale.

### Sprint 9 — The two admin surfaces — ✅ shipped 2026-08-08 / 08-09

Decisions: [`admin-docs-and-console.md`](../features/admin-docs-and-console.md) (`S9-D1`…`S9-D8`, with
exit notes). Both Administration rows that had rendered disabled with a `soon` badge are now live
routes, and both refuse a non-admin server-side rather than only hiding.

| Piece | Detail | Status |
|---|---|---|
| `monitors` room gates on `role === 'admin'` | Read from the DB at join time, never from the JWT claim. It previously admitted any signed-in user while carrying every target app's console output | ✅ 08-08, wire-verified 5/5 |
| `/admin/console` | Target list, live stream, level filter, copy/clear, a pause that keeps buffering, 500-entry ring buffer, nothing persisted | ✅ 08-08 |
| `DocPage` + Markdown-with-directives storage | The six public pages were 929 lines of hand-authored JSX, which is why a CMS was never possible — a storage-format change first, a UI second | ✅ 08-09 |
| `/docs` reads from the database | Published-only, still anonymous. The SDK install instructions did not move behind a login | ✅ 08-09 |
| `/admin/docs` | Editor, preview through the *same* renderer, reorder, publish/unpublish, slug rename behind a confirmation naming the consequence | ✅ 08-09 |
| The escaping allowlist | No HTML string exists in the render path at all, so `dangerouslySetInnerHTML` has nowhere to be added. Proven on rendered output, not on the parse tree | ✅ 08-09 |

**Carried:** F012 — a demoted admin keeps the `monitors` stream until that socket drops. Narrower than
what shipped before (the room used to admit any signed-in user), so it is a window, not a hole. On the
ledger, not in a comment.

**Followed by a scoped refactor pass** (F013–F015): one docs article renderer shared by the public page
and the admin preview, one route-id parser, one admin refusal panel. Each went on the ledger with
verification steps before any code moved, and the docs one was proven behaviour-preserving by diffing
rendered HTML rather than by reading it.


---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Two half-built bug trackers** — the manual `Ticket` board and the SDK `Issue` pipeline both exist, neither seam-complete. The most believable 6-month failure. | Product has no answer to *"where do I look when something breaks?"* | `Issue.ticketId` is the seam. **Create-ticket-from-issue is P0 in Sprint 2 and explicitly not on the cut list.** A list + promote is a coherent product; a detail view with no promote is a dead end. |
| Sprint 2 is 0.5d over capacity before it starts | Any further overrun pushes the demo | Named up front, not discovered in week 2. Cut order is written into the sprint, in order, before it starts. |
| ~~Form kit is thinner than every plan has assumed~~ | ~~Estimates that touch a form are low across Sprints 2, 4 and 5~~ | ✅ **Closed 2026-08-04.** `Select` shipped in Sprint 6 and carried Sprint 5's Preferences, session-timeout and per-row role controls with no new primitives. `Textarea`/`RadioGroup`/`FormActions`/`useFormState` are still unbuilt and still unneeded — price them the first time a screen actually wants one, rather than pre-building a kit. |
| Real-time double-applies optimistic updates | Counts visibly wrong — fatal for trust in a *counting* tool | Two-window check is Sprint 3's exit criterion, not a QA afterthought |
| ~~Token refresh still unbuilt~~ | ~~Silent breakage in any long-lived tab~~ | ✅ **Closed 2026-08-03.** Single in-flight refresh, verified with 6 concurrent 401s producing one refresh, plus the cross-tab race and the network-down case |
| ~~Source maps leak original source~~ | ~~Customer codebase published~~ | ✅ **Closed 2026-08-04.** Stored in Postgres so no URL serves them at all; upload is JWT + owner/admin; the ingest key presented as a bearer token answers 401; `content` is selected in exactly one module, and `sourcesContent` is never returned. Asserted, not assumed |
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

**Last updated:** 2026-08-09 — Sprint 9 shipped (both admin surfaces) plus a scoped refactor pass;
Sprint 8 recorded as scoped-never-started.

*Previously: 2026-07-31* — Sprint 6 scoped and estimated against
[`team-and-roles.md`](../features/team-and-roles.md); Sprints 5 and 7 re-cut to reflect the
account-settings and alerting work that shipped early.

*Previously: 2026-07-28 — Sprints 2–4 re-cut against the tree; Sprints 5–7 reduced to an
unestimated backlog pending G0 specs.*

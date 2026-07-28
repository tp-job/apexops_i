# Project Workspaces + Embeddable Console SDK — sprint plan (G0 scope lock)

> Status: **scope locked 2026-07-27**. D1–D6 decided; sprint committed at all 5 gates / 7.5d.
> Owner: product + full-stack. Follows [`bug-tracker.md`](bug-tracker.md), which shipped the
> single-tenant board. This is the multi-project layer under it.

## The load-bearing finding

**Roughly 60% of this already exists — and the part that exists is the part that is unsafe.**

| Piece | Where | State |
|---|---|---|
| Embeddable console-capture script | [`public/bug-tracker-client.js`](../../../app/server/public/bug-tracker-client.js) | works: console patch, batching, WS + HTTP fallback, `error`/`unhandledrejection` |
| Snippet generator endpoint | `GET /api/console-logs/script` | works |
| Ingest endpoint | `POST /api/console-logs/realtime` | works, **unauthenticated + unscoped** |
| Native WS relay :8082 | [`server.ts:50-91`](../../../app/server/src/server.ts) | works, **unauthenticated, broadcasts every app's logs to all monitors** |
| Ticket board + detail + comments | `/bug-tracker` | done |
| **Project / workspace entity** | — | **does not exist** |
| **Per-project scoping on `Log` / `Ticket`** | — | **does not exist** |

So this is not a greenfield build. It is: *add the scoping root, then make the ingest path safe,
then give the existing SDK an identity.*

### Four defects that must be fixed as part of this work, not after

1. **`POST /api/console-logs/realtime` has no auth, no rate limit, no project scope.** Anyone who
   views source on a monitored page gets the URL and can write unbounded rows into `logs`. Pair that
   with the known `DELETE /api/logs` hole (`logs.ts:125` — `deleteMany({})` reachable by *any*
   authenticated user, see [[sprint-1-auth-2026-07-25]]) and the log store is both freely writable
   and freely destroyable.
2. **The endpoint writes one row per log in a sequential `await` loop** (`console-logs.ts:88-92`).
   A 50-log batch is 50 round trips. Must be `createMany`.
3. **CORS is pinned to `http://localhost:5173`** (`server.ts:35`). The SDK cannot actually post from
   a third-party origin today. The ingest route needs its own permissive-but-scoped CORS; the rest of
   the API must stay pinned.
4. **`express.json()` runs at the default 100 kB cap** with no per-route override. A batch of 50
   serialized objects (the SDK pretty-prints with `JSON.stringify(..., 2)`) will exceed it and 413.

## Locked decisions (D1–D6)

### D1 — `Project` is the scoping root, added **now**, retrofitted onto `Log` and `Ticket`

Every ingested event and every ticket hangs off a `Project`. `bug-tracker.md` listed
"cross-project ticket scoping" as an explicit non-goal; this supersedes that.

**Recommendation: do it now.** The tables are effectively empty. `projectId` added today is one
`db push` and a backfill of a single "Default" project. Added after real multi-project data exists,
there is no correct backfill — you cannot infer which project an orphan ticket belonged to.

### D2 — Ingested events get their own table (`Event`), **not** `Log`

`Log` is ApexOps' own internal application log, written by trusted server code. Ingested browser
console data is untrusted, attacker-controllable, high-volume, third-party input. Mixing them means
one retention policy, one destructive admin delete, and one index strategy for two workloads with
nothing in common.

**Recommendation: separate table.** `Log` stays as-is.

### D3 — Group events into `Issue` by fingerprint; the UI lists issues, not events

This is the single decision that determines whether the product is usable. A render loop that throws
100,000 times must appear as **one** issue with a count of 100,000 — not 100,000 rows. Without
grouping, the first real integration makes the UI useless and the database large on the same
afternoon.

Fingerprint = `hash(projectId, level, normalizedMessage, topStackFrame)`, where *normalizedMessage*
strips numbers, UUIDs, and quoted strings so `User 4821 not found` and `User 9134 not found` collapse.

### D4 — The ingest key is **public by design**

The key ships inside a `<script>` tag on a public page. It cannot be a secret, and pretending
otherwise produces false confidence. Design for that:

- **write-only scope** — the key can `POST /ingest` and nothing else. It can never read.
- **rotatable** — one click, old key dies.
- **origin allowlist per project** — optional; empty list means any origin.
- **hard rate limit per key** (default 300 events/min) and per-IP burst cap.
- reads (dashboard, issue list) use the existing JWT session, never the ingest key.

The public ID in the snippet and the ingest key are the same string. Do not build two.

### D5 — Default capture level is `error` + `warn` + unhandled rejections

The current SDK patches `log`, `info`, and `debug` too. A chatty dev app emits thousands of
`console.log`s per session, all of which become network traffic and rows. `log`/`info`/`debug` become
opt-in via `data-levels`.

Corollary: **retention is part of v1, not later.** 30 days for events, indefinite for issues (the
aggregate row). A nightly prune job. A tracker with no TTL is a disk-space incident with a UI.

### D6 — The native WebSocket relay on :8082 is **removed**, HTTP ingest only

The relay ([`server.ts:50-91`](../../../app/server/src/server.ts)) accepts unauthenticated
connections and re-emits every target app's logs to every listener in the `monitors` room — a
cross-project leak in the one feature whose entire purpose is per-project isolation. The alternative,
keying the handshake and emitting per-project rooms (mirroring the chat socket fix in
[[chat-socket-security-2026-07-26]]), costs ~0.5d and leaves a second realtime stack to maintain
forever.

**Decision: delete it.** HTTP batching + `sendBeacon` covers the ingest path, and the socket.io
channel already feeds the dashboard. This removes an entire unauthenticated surface and one open
port. G2 deliverable, not a follow-up.

Removals: the `WebSocket.Server` on `NATIVE_WS_PORT` (`server.ts:51-52`), its `listening`/`error`
handlers and the startup log line at `server.ts:405`, the `targetApps`/`monitors` relay maps and the
`console-logs` handler at `server.ts:85-91`, `NATIVE_WS_PORT` from env and docs, and the SDK's entire
WS path (`connectWebSocket`, reconnect timer, `isConnected` branch in `flushLogs`).

Blast radius confirmed by grep on 2026-07-27: **the only client dialing :8082 is
`bug-tracker-client.js`**, which G3 replaces wholesale. `console-monitor.html` and
`useBugTrackerSocket.ts` both use socket.io and are untouched. This is a deletion, not a migration.

---

## Database design

```prisma
model Project {
  id           Int       @id @default(autoincrement())
  name         String
  slug         String    @unique              // URL: /p/:slug
  ingestKey    String    @unique @map("ingest_key")   // public, rotatable — see D4
  allowedOrigins Json    @default("[]") @map("allowed_origins")
  captureLevels Json     @default("[\"error\",\"warn\"]") @map("capture_levels")
  retentionDays Int      @default(30) @map("retention_days")
  ownerId      Int       @map("owner_id")
  archivedAt   DateTime? @map("archived_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @default(now()) @updatedAt @map("updated_at")

  owner    User    @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  members  ProjectMember[]
  issues   Issue[]
  events   Event[]
  tickets  Ticket[]

  @@index([ownerId])
  @@map("projects")
}

/// Membership is modelled from day one even though v1 ships owner-only.
/// Adding it later means rewriting every authorization check.
model ProjectMember {
  projectId Int    @map("project_id")
  userId    Int    @map("user_id")
  role      ProjectRole @default(member)
  createdAt DateTime @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([projectId, userId])
  @@map("project_members")
}

enum ProjectRole { owner  admin  member  @@map("project_role") }

enum IssueStatus { unresolved  resolved  ignored  @@map("issue_status") }

/// The grouped, deduplicated unit the UI actually lists (D3).
model Issue {
  id           Int         @id @default(autoincrement())
  projectId    Int         @map("project_id")
  fingerprint  String                                  // hash(project, level, normMsg, topFrame)
  level        String
  title        String                                  // first line of the message
  culprit      String?                                 // top stack frame
  status       IssueStatus @default(unresolved)
  count        Int         @default(1)
  firstSeen    DateTime    @default(now()) @map("first_seen")
  lastSeen     DateTime    @default(now()) @map("last_seen")
  ticketId     Int?        @unique @map("ticket_id")   // promoted to a tracked bug

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  ticket  Ticket? @relation(fields: [ticketId], references: [id], onDelete: SetNull)
  events  Event[]

  @@unique([projectId, fingerprint])   // the upsert target — makes ingest idempotent
  @@index([projectId, status, lastSeen])
  @@map("issues")
}

/// One raw occurrence. Pruned on the project's retention window.
model Event {
  id        BigInt   @id @default(autoincrement())
  projectId Int      @map("project_id")
  issueId   Int      @map("issue_id")
  level     String
  message   String
  stack     String?
  url       String?
  userAgent String?  @map("user_agent")
  release   String?                                    // for future source-map support
  context   Json     @default("{}")                    // SDK-supplied breadcrumbs/tags
  createdAt DateTime @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  issue   Issue   @relation(fields: [issueId], references: [id], onDelete: Cascade)

  @@index([issueId, createdAt])
  @@index([projectId, createdAt])   // drives retention pruning
  @@map("events")
}
```

**Changes to existing models:**

- `Ticket` gains `projectId Int` + `@@index([projectId, status])`, and the reverse `Issue?` relation.
- `User` gains `projects Project[]` and `projectMemberships ProjectMember[]`.
- `Log` is untouched.

**Migration path:** this repo uses `prisma db push`, no `migrations/` dir
([[sprint-1-auth-2026-07-25]]). `projectId` on `Ticket` must be nullable in push #1, backfilled to a
seeded "Default" project, then made required in push #2. One-shot required column will fail on any
existing row.

**`BigInt` on `Event.id`:** deliberate. It is the one table with a credible path to 10⁸ rows, and
`Int` overflow at 2.1 B is an outage with no fast fix. Note the client-side cost — `BigInt` does not
`JSON.stringify`; the API must serialize it as a string.

---

## SDK v2 — the script contract

Transport is **HTTP only** per D6 — the WebSocket path is deleted, not ported.

The design goal is *one line, no build step, works in any project*:

```html
<script src="https://apexops.local/sdk/v1.js" data-project="pk_7f3a9c2e" defer></script>
```

Config reads from the script tag's own `data-*` attributes rather than `window.BUG_TRACKER_*`
globals. The globals in today's script must be set *before* the script loads, which is a foot-gun
with `defer`/`async` and silently yields "My App" for every project.

| Attribute | Default | Purpose |
|---|---|---|
| `data-project` | *(required)* | ingest key; absent ⇒ SDK no-ops silently |
| `data-levels` | `error,warn` | D5 |
| `data-release` | — | version string, for future source maps |
| `data-sample` | `1.0` | fraction of *non-error* events kept |
| `data-endpoint` | script's own origin | self-hosting |

Changes from the current script:

0. **Transport simplification** — `connectWebSocket`, the reconnect timer, and the `isConnected`
   branch in `flushLogs` all disappear (D6). What is left is one `fetch` with a `sendBeacon` fallback,
   which is a meaningfully smaller thing to keep correct in a script that runs on other people's pages.
1. **Identity** — every payload carries the ingest key; server derives `projectId`.
2. **Client-side dedupe window** — identical message+stack inside 5 s increments a local counter
   instead of sending. A tight error loop currently pushes 500 messages/s onto the queue.
3. **`sendBeacon` on unload** — the current `beforeunload` → `flushLogs()` → `fetch()` path is
   cancelled by the browser during teardown. The final batch, which is the one containing the crash,
   is exactly the batch that gets dropped.
4. **Circuit breaker** — after 3 consecutive ingest failures, back off exponentially to 5 min. Today
   a down server means a failed `fetch` per batch forever.
5. **Never log its own errors through the patched console** — the current code is careful about this;
   keep it. A recursion here takes down the host page, which is the worst possible failure mode for
   an SDK that other projects embed.
6. **Payload cap** — truncate messages at 8 kB, stacks at 16 kB, batch at 64 kB. Send compact JSON,
   not `JSON.stringify(arg, null, 2)`.
7. **Drop the `window.__BugTracker` global** or namespace it — it is a hook for a host page to
   tamper with capture.

**Non-goal for v1:** an npm package. A `<script>` tag is the whole point of the ask, and a published
package is a release-process problem, not a product problem. Revisit once ≥3 projects are live.

---

## UX / workspace design

**Route shape:** `/p/:slug/...` — project is in the URL, not in a global store. Deep links,
back button, and two tabs on two projects all work for free. A store-only "current project" breaks
all three, and every one of those breakages gets reported as a bug.

| Screen | Contents |
|---|---|
| `/projects` | grid of project cards: name, 24 h event sparkline, unresolved-issue count, last-seen. Primary CTA **New project**. |
| `/p/:slug` (Overview) | KPI tiles reusing the Bug Tracker tiles; event volume chart; top 5 issues. |
| `/p/:slug/issues` | the main surface — grouped issue list, sorted by `lastSeen`. Row: level dot, title, culprit, count, sparkline, assignee. Filters: level, status, time. |
| `/p/:slug/issues/:id` | latest event, full stack, occurrence timeline, browser/OS breakdown, **Create ticket** button. |
| `/p/:slug/board` | the existing Bug Tracker board, filtered to this project. |
| `/p/:slug/settings` | ingest key + copy-paste snippet, rotate key, origin allowlist, capture levels, retention. |

**Project switcher** in the Topbar, next to the existing role/user controls. Keyboard-accessible,
recent-projects first.

**The three states that decide whether this feels finished:**

1. **Project created, zero events ever** — this is the make-or-break screen. It must show the exact
   snippet with the real key already in it, a copy button, and a live "waiting for first event…"
   indicator that flips to a success state the instant ingest fires. Not an empty table with
   "No data".
2. **Was receiving, now silent 24 h+** — "No events in 24 h. Working, or disconnected?" with a link
   to verify the integration. Silence is ambiguous, and ambiguity in a monitoring tool is worse than
   an error.
3. **Flooding** — one issue at 50 k/hr. Surface a rate-limit banner and offer *Ignore this issue*
   inline. Otherwise the flood is the only thing anyone can see.

**Follow the Luxe design system** ([[apexops-design-system-v2]]) — Invoices is the template.
The issue list is a `DataTable` consumer, which per [`sprint-plan.md`](../planning/sprint-plan.md) is the
cheapest available generality test for that kit.

---

## Sprint schedule

Two-week sprint, 10 working days, planned to **7.5d** per the existing convention.

| # | Gate | Est | Priority |
|---|---|---|---|
| G1 | ~~`Project`/`ProjectMember`/`Issue`/`Event` models; `projectId` on `Ticket`; two-step push + Default-project backfill; project CRUD API; key generation + rotation~~ **DONE 2026-07-27** | 1.5d | P0 |
| G2 | ~~Secure ingest: `POST /api/ingest` keyed by `data-project`; fingerprint + `Issue` upsert; `createMany` for events; per-key rate limit; 1 MB route body cap; route-scoped permissive CORS; retention prune job. **Close `DELETE /api/logs`. Delete the :8082 relay (D6).**~~ **DONE 2026-07-27** | 2.0d | P0 |
| G3 | SDK v2 at `/sdk/v1.js` — `data-*` config, dedupe window, `sendBeacon`, circuit breaker, payload caps, **WS path removed**. Ship a `demo.html` fixture that proves it end-to-end. | 1.5d | P0 |
| G4 | Workspace UI: `/projects` list + create, project switcher, `/p/:slug/settings` with live "waiting for first event" state | 1.5d | P0 |
| G5 | `/p/:slug/issues` list + detail; **Create ticket from issue**; board filtered by project | 1.0d | P0 |
| — | **Total** | **7.5d** | |

**Sprint goal:** *paste one line into another project's `index.html`, break something on that page,
and watch a grouped issue appear in its ApexOps workspace and become a tracked ticket.*

**Demo script (the acceptance test):** create project "Demo" → copy snippet → paste into a scratch
`index.html` → open it → throw in a loop 200× → issue list shows **one** row, count 200 → open it,
see the stack → **Create ticket** → it appears on that project's board and nowhere else.

### G1 exit notes (2026-07-27)

Shipped: [`schema.prisma`](../../../database/prisma/schema.prisma) (Project, ProjectMember,
ProjectRole, Issue, IssueStatus, Event, `Ticket.projectId`),
[`lib/projectKeys.ts`](../../../app/server/src/lib/projectKeys.ts),
[`schemas/project.schema.ts`](../../../app/server/src/schemas/project.schema.ts),
[`api/projects.ts`](../../../app/server/src/api/projects.ts),
[`scripts/backfill-default-project.ts`](../../../app/server/src/scripts/backfill-default-project.ts).
Clean `tsc --noEmit`; **30/30 API checks pass**; the three-step push ran green and the existing Bug
Tracker board was re-verified in-browser (both tickets render, and creating a ticket through the UI
as a *non-owner* still returns 201).

Two decisions the plan did not anticipate, both made during implementation:

1. **The backfill adds every existing user to the Default project as `member`.** Without it, only the
   oldest account keeps access to tickets it could see yesterday, which reads as data loss. This is a
   one-time migration convenience, *not* the sharing model — projects created from here on are
   owner-only. The `dev.user` UI check above is what proved this mattered.
2. **`Ticket.projectId` is transitional in the API, not in the database.** The column is NOT NULL,
   but `POST /api/tickets` accepts an *optional* `projectId` and falls back to the caller's oldest
   project, because the Bug Tracker board predates projects and does not send one until G5. An
   explicit `projectId` is membership-checked, so this is not a hole — omitting it is implicit, never
   ambiguous.

Landmines found:

- The backfill's `{ projectId: null }` filters are **raw SQL on purpose**. Once step 3 makes the
  column NOT NULL, Prisma rejects that filter at *runtime* as well as at compile time — a cast fixes
  the types and still throws. Raw SQL keeps the script a clean no-op on re-run.
- `prisma generate` EPERM'd on Windows exactly as [[sprint-1-auth-2026-07-25]] warned; the API dev
  server has to be stopped first. `db push --skip-generate` works while it is running.
- **CORS pinning (plan defect #3) confirmed the hard way.** A preview server on a non-5173 port had
  every API call die with `net::ERR_FAILED` at the CORS layer while the server logged nothing. When
  G2 opens `/api/ingest` to third-party origins, the route-scoped-CORS requirement is real, and this
  is the failure mode it produces: silent on the server, opaque on the client.

### G2 exit notes (2026-07-27)

Shipped: [`lib/fingerprint.ts`](../../../app/server/src/lib/fingerprint.ts),
[`lib/retention.ts`](../../../app/server/src/lib/retention.ts),
[`schemas/ingest.schema.ts`](../../../app/server/src/schemas/ingest.schema.ts),
[`api/ingest.ts`](../../../app/server/src/api/ingest.ts),
[`scripts/prune-events.ts`](../../../app/server/src/scripts/prune-events.ts)
(`npm run prune:events`). The :8082 relay and the `ws` import are gone from `server.ts`;
`POST /api/console-logs/realtime` now answers **410** with an upgrade hint rather than 404, so an old
embedded snippet gets an actionable signal.

Clean `tsc --noEmit`. **18/18 fingerprint unit checks + 21/21 API checks.** Verified against the real
database, then the test project was deleted.

**D3 demonstrated, not assumed.** Two batches of 50 `User <n> not found` errors — 100 distinct
message strings — produced **one** issue with `count=100` and `culprit=app.js:42`. Separately,
one event carrying the SDK's dedupe counter `count: 500` produced `count=500` with a **single**
stored event row. That pair is the whole design: *how often it happened* and *how many samples we
kept* are different numbers, and only the first one grows without bound.

Decisions made during implementation:

1. **A resolved issue that recurs is flipped back to `unresolved`** — a regression must return to the
   top of the list. `ignored` deliberately does *not* flip: that is the user asking not to be told,
   and a recurrence should not override it.
2. **Level filtering is enforced server-side**, not just in the SDK. The SDK's config is a hint from
   a client we do not control; `Project.captureLevels` is the enforcement. Filtered events return
   `202` with a `dropped` count rather than an error — dropping is normal, not a failure.
3. **The ingest key is accepted in the body as well as `X-Apexops-Key`**, because
   `navigator.sendBeacon` cannot set custom headers — and the unload beacon is precisely the batch
   containing the crash.
4. **`DELETE /api/logs` got two fixes, not one**: `authorize('admin')` (its first real use anywhere
   in the codebase) *and* a mandatory filter, so even an admin cannot wipe every log by accident.
   `all=true` must be spelled out.

Landmines:

- **Rate-limit buckets keyed by attacker-supplied values are a memory leak.** A script cycling fake
  keys would grow the Map forever. There is a sweeper on a `unref()`ed interval; any future limiter
  keyed on untrusted input needs the same.
- **Pinned CORS returns the *configured* origin, not an empty header,** for a foreign request — the
  browser then blocks on the mismatch. A check asserting "no ACAO header" reads as a failure when the
  behaviour is correct; assert the header is not the *requesting* origin instead.
- Retention prunes in bounded batches rather than one `deleteMany`. The first prune after a busy
  period can span millions of rows, and a single statement there blocks writes on the table the SDK
  is actively posting into.

### Deferred to v1.1 — named so they don't leak into the sprint

Source maps / minified stack symbolication · release + regression tracking · alerting (email/Slack) ·
team invites (the `ProjectMember` table exists; the UI does not) · npm package · server-side/Node SDK ·
breadcrumbs & session replay · per-issue assignment rules.

### Explicitly out of scope

Real multi-tenancy (org boundaries, billing, data isolation guarantees). This is a per-user workspace
feature. If ApexOps is ever hosted for third parties, that is a separate security design.

---

## Risks / pre-mortem

| Risk | Impact | Mitigation |
|---|---|---|
| **Grouping ships late or not at all** — the most likely way this fails at 6 months | Product is unusable at the first real integration | D3 is in G2, before any UI. The demo script asserts count=200 on one row. |
| Ingest key abused as a free write endpoint | DB flooded by a stranger | Rate limit per key **and** per IP in G2, not v1.1. Origin allowlist available. Accept that the key is public (D4). |
| Retention deferred | Disk fills; Postgres degrades before anyone notices | Prune job is a G2 deliverable, not a follow-up ticket. |
| `Ticket.projectId` backfill botched | Existing tickets orphaned | Two-step push, seeded Default project, verified row count before the NOT NULL step. |
| SDK error recurses through patched console | **Takes down the host project's page** — reputational worst case | Bound all SDK-internal logging to captured `originalConsole`; add a global re-entrancy flag; test with the demo fixture. |
| CORS opened globally to make ingest work | Whole API becomes cross-origin readable | Route-scoped CORS on `/api/ingest` only; assert the app CORS is still pinned in G2 exit. |
| Removing :8082 breaks an unnoticed consumer | Silent loss of a log stream someone relied on | **Checked 2026-07-27: the only dialer is `bug-tracker-client.js` itself**, which G3 rewrites anyway. `console-monitor.html` and the dashboard both use socket.io and are unaffected. D6 is a clean deletion, not a migration. |
| Sprint runs long on UI | G5 slips | G5 is the only gate whose absence still leaves a working product (ingest + settings + existing board). Cut order: G5 detail view → G4 switcher polish. **Committed at all 5 gates with no slack** — if G1 or G2 overruns, cut from G5 immediately rather than compressing G2's security work. |

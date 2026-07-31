# Overview surfaces + regression tracking — feature spec

> Status: **shipped 2026-07-29**. Owner: product + full-stack.
> Follows [`project-workspaces-and-sdk.md`](project-workspaces-and-sdk.md), which shipped the
> per-project issue list. This is the trend layer over it, plus the schema that makes
> "it came back" answerable at all.

## The load-bearing finding

**There were already two dashboards, and the existing one was measuring the wrong thing.**

`/dashboard` read `GET /api/tickets/stats` and `GET /api/logs/stats` and contained **zero**
references to projects. `Log` is ApexOps' own internal server log — not ingested customer events —
so the global dashboard was charting the monitoring tool's own noise. It predated the workspace
layer entirely and had quietly stopped being true.

Building a second dashboard next to it without deciding its fate is how both stop being trusted.
So the split was settled first, and should stay sharp:

| Surface | Question it answers |
|---|---|
| `/dashboard` | **Which project needs attention?** Breadth, ranked, no detail. |
| `/p/:slug/overview` | **Is this project getting better or worse, and did that start with a deploy?** |
| `/p/:slug/issues` | **What is broken right now?** (unchanged) |

The rule that keeps them from converging: *the issue list owns **state**; the overview surfaces own
**trend**.* Any number on an overview that can be read off the issue list unchanged does not earn
its place.

## Locked decisions

### D1 — `IssueStatusChange` audit table **and** denormalized counters, not one or the other

`Issue.status` held only the current value, so a resolved issue that recurred flipped back to
`unresolved` and no trace of the flip survived. "Regressions this week" — the most actionable number
an overview can show — was uncomputable.

- **`IssueStatusChange`** is the source of truth: `fromStatus`, `toStatus`, `reason`
  (`regression` | `manual`), nullable `actorId`, `createdAt`. It answers windowed questions.
- **`Issue.reopenCount` / `lastReopenedAt`** are denormalized: the issue list badges regressions on
  every row, and a join per row would be paid on the hottest read in the product.

Both are written in the same transaction. Volume is bounded by human actions plus genuine
regressions — not by ingest — so the table stays small even under a flood.

**`projectId` is denormalized onto the change row** for the same reason `Event.projectId` exists:
the cross-project roll-up counts regressions per project over a window, and without it every row of
that query needs a join through `issues`.

### D2 — A no-op status change writes nothing

`PATCH` with the status the issue already has returns 200 and writes no audit row. Otherwise
"resolved 4 times" becomes a count of how often someone clicked a button that was already pressed.

### D3 — Release markers are the reason the overview exists

A volume chart alone is a prettier restatement of the issue list. Volume **with deploy pins**
answers the question the issue list structurally cannot: *did the spike start with a release?*

`firstSeenAt` is the **global** first sighting of a release, deliberately not clamped to the
window; markers outside the visible range are dropped by the API instead. Clamping would draw every
old release at the left edge and imply they all deployed at once.

Requires `data-release` on the SDK snippet. With no release data the panel says so and tells you
how to turn it on, rather than rendering an empty strip.

### D4 — Ranking is opinionated, and the page says so

Roll-up order is regressions → unresolved → volume → name. **One regression outranks a pile of
stale open issues**, which is the judgement a human on-call would make. The sort is stated in the
UI, because a ranked list whose order you cannot explain reads as arbitrary.

### D5 — Issues stays the landing route, not Overview

`/p/:slug` still redirects to `/issues`. During an incident "what is broken" should cost zero
clicks; the overview is a review surface. Making it the default would penalise the frequent case to
serve the occasional one. It sits one click away in the new `ProjectTabs` sub-nav.

## What shipped

| Layer | Files |
|---|---|
| Schema | `IssueStatusChange`, `IssueStatusChangeReason`, `Issue.reopenCount`, `Issue.lastReopenedAt` |
| Analytics | [`lib/eventAnalytics.ts`](../../../app/server/src/lib/eventAnalytics.ts) — bucketing, release markers, regression counts, status counts |
| API | [`api/overview.ts`](../../../app/server/src/api/overview.ts) — `GET /api/projects/rollup`, `GET /api/projects/:slug/overview` |
| Recording | `api/ingest.ts` (auto-reopen → `regression`), `api/issues.ts` (`PATCH` → `manual`) |
| Client | `Dashboard` (rewritten), `ProjectOverview`, `ProjectTabs`, `charts/EventVolumeChart`, `useOverview` |

`EventVolumeChart` replaces `OccurrenceTimeline`: the marker was generalized from a single
timestamp to a list, so one chart now serves both the issue detail (first-seen pin) and the project
overview (release pins). The alternative was a second chart that would drift.

`rollup` and `overview` are **reserved slugs** — `/rollup` is a sibling of `/:slug`, so a project
with that slug would be shadowed and unreachable.

## Verification (2026-07-29, against the real database)

Full regression cycle exercised end to end:

1. `PATCH` issue 297 → `resolved` — audit row `unresolved → resolved`, `reason=manual`, `actor=7`
2. Identical `PATCH` again → 200, **no second audit row** (D2)
3. Same error ingested again → auto-reopened: `status=unresolved`, `reopenCount=1`,
   audit row `resolved → unresolved`, `reason=regression`, `actor=none`
4. Overview `regressions` KPI = 1, issue listed under **Came back**, badged in the issue list

Roll-up: totals `{projects:3, unresolved:3, events:6, regressions:1, awaitingFirstEvent:2}`, ranked
with the regressing project first, `never` rendered distinctly from a quiet project.

Overview: 25 hourly buckets / 3 release markers at 24h, 8 daily at 7d, no skeleton flash on range
change. **Bucket 20 is simultaneously the 100%-height spike and a release pin** — the exact reading
the feature exists to produce. Clean lint, typecheck and build on both workspaces; console clean.

## Landmines

- **`prisma generate` EPERM on Windows** while the API dev server runs — it holds
  `query_engine-windows.dll.node`. Stop the server, generate, restart. `db push --skip-generate`
  works while it is running.
- Raw timestamp comparisons still need `${iso}::timestamp` — see
  [`eventAnalytics.ts`](../../../app/server/src/lib/eventAnalytics.ts). Prisma's query builder is
  unaffected, which is why `regressionCount` can pass a `Date` directly while the histogram cannot.

## `/p/:slug/board` (2026-07-30)

Shipped after the rest of this doc. Reused [`BugTracker.tsx`](../../../app/client/src/pages/BugTracker.tsx)
rather than duplicating its 750 lines: it now takes an optional `projectId` prop that scopes its
fetch (`useBugTrackerData(projectId)` → `ticketsAPI.getAll({ projectId })`), threads into every
ticket it creates, and suppresses its own `PageHeader` when embedded (the wrapping
[`ProjectBoard.tsx`](../../../app/client/src/pages/ProjectBoard.tsx) supplies one plus
`ProjectTabs`, matching `ProjectOverview`/`ProjectIssues`/`ProjectSettings`). The unscoped
`/bug-tracker` route renders the same component with no props — unchanged.

One incidental fix while touching `useBugTrackerData`: it fetched `GET /api/logs` unconditionally
even though `BugTracker.tsx` doesn't consume `logs` at all (destructures `tickets` only) — a wasted
round trip on every load. Now skipped whenever a `projectId` is passed, since `Log` has no project
concept anyway; the unscoped board keeps fetching it in case something else comes to depend on it.

**Verified against the real database, both directions:**

- Ticket created on `sprint2-demo` (id 6) → `GET /api/tickets?projectId=6` shows it and only that
  project's other 3; `GET /api/tickets?projectId=8` (sdf) does not.
- Ticket created **through the board UI itself** on `sdf` → confirmed server-side as `projectId: 8`,
  not the fallback ("caller's oldest project") that the unscoped board still relies on.
- `/bug-tracker` unaffected: still shows all 8 tickets across all 3 projects, header and subtitle
  unchanged.

`Board` added to `ProjectTabs` between Issues and Settings.

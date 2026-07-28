# Bug Tracker — feature spec (G0 scope lock)

> Status: **scope locked 2026-07-26**. Owner: product + full-stack.
> Sequenced as step 2 in [`user-flow.md`](../product/user-flow.md)'s rebuild order, after Dashboard.

## Problem statement

ApexOps captures application `Log` records and already stores `Ticket` rows, but there is **no
screen** to triage them. Today a developer who sees an error in the Dashboard KPI tiles has nowhere
in-app to turn it into tracked, assigned, discussable work — the conversation moves to Slack and the
ticket table stays empty. Bug Tracker is the screen that closes that loop.

## What already exists (do not rebuild)

| Layer | Where | State |
|---|---|---|
| `Ticket` model, FKs, indexes | [`schema.prisma`](../../../database/prisma/schema.prisma) | complete |
| REST CRUD + `GET /stats`, `authenticate`-gated | [`api/tickets.ts`](../../../app/server/src/api/tickets.ts) | complete |
| Zod request validation | [`schemas/ticket.schema.ts`](../../../app/server/src/schemas/ticket.schema.ts) | complete |
| Client fetch hook + offline-mock fallback | [`hooks/useBugTrackerData.ts`](../../../app/client/src/hooks/useBugTrackerData.ts) | complete |
| Socket hook (console-log stream) | [`hooks/useBugTrackerSocket.ts`](../../../app/client/src/hooks/useBugTrackerSocket.ts) | complete |
| Typed API client (`ticketsAPI`) | [`services/api.ts`](../../../app/client/src/services/api.ts) | complete |
| **The page, route, and nav entry** | — | **missing** |

This is predominantly a wire-up + UI build, not a feature build from zero.

## Locked scope decisions

### D1 — v1 is Board + Detail + **Comments**

A tracker without a discussion thread is a to-do list; the comment thread is what keeps triage
in-app. Attachments and ticket-change realtime broadcast are explicitly **out of v1** (see
[Deferred](#deferred-to-v11)).

### D2 — assignee/reporter migrate to **foreign keys now**

The schema currently forks: `assignee String?` **and** `assigneeId Int? -> User`. The API only ever
writes the string and never reads the relation, so "assigned to X" is unvalidated free text — rename
a user and every ticket silently lies, and it can never be filtered reliably.

`assigneeId` / `reporterId` become the source of truth. The legacy string columns stay only as a
display denorm during transition and are dropped once no reads remain. Doing this while the table is
effectively empty costs one migration; doing it after real tickets exist has no clean answer.

### D3 — `status` and `priority` become Prisma **enums**

They are `String` in Postgres but discriminated unions on the client
([`types/bugTrackerApp.ts`](../../../app/client/src/types/bugTrackerApp.ts)). One out-of-band write
produces a value the UI cannot render. Enums push the constraint down to where it holds.

### D4 — delete becomes **soft delete**

`DELETE /api/tickets/:id` is currently a hard `prisma.ticket.delete` — an unrecoverable data-loss
path exposed to any authenticated user. Replaced by an archived/closed state.

## Non-goals (v1)

- File attachments — needs a storage decision (local disk vs. S3) that does not exist in this repo.
- Cross-project / multi-workspace ticket scoping.
- SLA timers, due dates, burndown reporting.
- Email or push notification on assignment (`UserSettings.bugAlerts` exists but has no delivery path).

## Success criteria

1. A signed-in user can list, filter (status / priority / assignee), and open a ticket.
2. A user can create a ticket, assign it to a **real** `User`, and change its status.
3. A user can post a comment and see the ticket's status-change history in the same thread.
4. Every list/filter combination renders correctly at **zero**, **one**, and **500+** tickets.
5. The page degrades to offline-mock data without an error banner when the API is unreachable
   (existing `hasMockFlag` contract).

## Known risks

| Risk | Mitigation |
|---|---|
| **Concurrent edit = last write wins.** `PUT /:id` has no precondition; two triagers overwrite each other silently. | Send `If-Unmodified-Since`-style `updatedAt` precondition on PUT; 409 on mismatch. |
| **"Realtime" is a half-truth.** `useBugTrackerSocket` subscribes to `console-logs` only; ticket mutations never broadcast. | Do not describe the board as collaborative until G4. Poll-on-focus is the v1 answer. |
| **Local Postgres is still blocked** (Sprint 1 password issue) — G1 cannot run its migration. | G2 (UI) builds against offline mocks in parallel and is not gated on G1 landing. |
| `formatTicket` returns display ids (`TICK-003`) that mutation routes must string-parse back. | Keep the transform in one place; never let the client construct the numeric id. |

## Gated plan

| Gate | Deliverable | Exit criteria | Blocked by |
|---|---|---|---|
| **G0** | This document | Scope decisions D1–D4 locked | ✅ done |
| **G1** | Schema + API: enums, assignee FK, `Comment` model, soft delete, `updatedAt` precondition | One migration applied; endpoints return the new shape | ✅ done — migration applied, 22/22 API checks pass |
| **G2** | UI: route, board, filters, detail panel, comment thread | Renders real *and* mock data; empty state included | ✅ done — `pages/BugTracker.tsx` at `/bug-tracker`, verified in-browser |
| **G3** | Stepped create flow (per `ac.html` IA), assignee picker | Ticket created via a guided flow, assigned to a real user | ⬜ next |
| **G4** | Ticket-change socket broadcast + QA pass | Concurrent-edit and scale states verified in-browser | ⬜ |

G2 verification against the real database: comment posted and attributed to the token's user; a
status change appended an `activity` entry (`changed status from in-progress to resolved`) to the
same thread and moved the KPI tiles; archived tickets disappear from the list but remain
retrievable; malformed ids 404 instead of 500; a stale `expectedUpdatedAt` returns 409.

## Deferred to v1.1

- Ticket-change broadcast over the existing Socket.IO channel (server already runs one).
- Attachments.
- Notification delivery for `UserSettings.bugAlerts`.

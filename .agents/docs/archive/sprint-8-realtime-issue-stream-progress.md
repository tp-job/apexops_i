# Progress — Sprint 8: the real-time issue stream

Spec: [`build-spec.md`](build-spec.md) · Ledger: [`feature-list.json`](feature-list.json)
Decisions: [`realtime-issue-stream.md`](.agents/docs/features/realtime-issue-stream.md)

Sprint 7's log is archived at
[`.agents/docs/archive/sprint-7-hardening-progress.md`](.agents/docs/archive/sprint-7-hardening-progress.md).

---

## 2026-08-07 — scoping

Scoped from the ask *"build the features that are not success"*. The ledger was 19/19 and Sprint 7
genuinely closed, so the target had to come from what was never built rather than from what failed.

**The finding: [`sprint-plan.md:375`](.agents/docs/planning/sprint-plan.md) says every sprint has
shipped, and that is false.** Verified against the tree, not against the plan:

| Checked | Result |
|---|---|
| `hooks/useIssues.ts` | No socket, no `setInterval`. The list is a mount-time snapshot |
| `server.ts` emits | `chat-message`, `user-typing`, `console-logs`, `target-app-*`. **Nothing for issues** |
| `api/ingest.ts` | Never touches `io` |
| `io` export | Not exported at all — there is no seam to emit from |
| Sprint 3's other items | `SearchInput`, URL filter state, the three empty states, `ProjectIssueDetail.tsx` all shipped |

Four of five items landing is the likely reason the row was marked done. Recorded as an instance of
the drift the document-precedence convention exists to catch: **verify plans against the tree.**

**Gates and decisions written before any code.** Six decisions locked (`R-D1`…`R-D6`), 14 acceptance
criteria, 10 ledger features, all `passes: null`.

Two design calls worth stating here because they are what the sprint is shaped around:

1. **Absolute values, never increments.** The push carries the new total, not `+1`. Sockets drop,
   reconnect and replay; an increment over an unreliable transport is how a *counting* tool starts
   lying, and the counts are this product's entire credibility. Applied twice, an absolute value is
   the same value — double-application becomes harmless by construction rather than by care.
2. **The client decides insertion, not the server.** The list is server-filtered, sorted and paged,
   and the room has no idea what filter a given client is on. Deciding in the room means injecting
   rows that do not match an active filter, which reads as a broken filter.

## Status

| G | Scope | State |
|---|---|---|
| G1 | `lib/realtime.ts` registry | not started |
| G2 | `project:<id>` room + authorized join, ingest emit | not started |
| G3 | `useIssues` reconciliation | not started |
| G4 | Connection badge + reconnect refetch | not started |
| G5 | Socket token refresh | not started |
| G6 | Tests, reintroduced-bug proof, plan correction | not started |

**Nothing is implemented yet. No criterion has been observed.**

## Carried risk

**G5 is the item that decides whether this sprint is real.** `lib/authSession.ts` is the single
refresh coordinator and covers four HTTP transports; sockets are recorded there as explicitly not
covered. Sprint 3's own exit criterion is *"leave a tab open past token expiry — it keeps streaming"*,
which cannot pass without it. It is also the first time anything will drive that coordinator from
outside an HTTP transport, so it is the most likely item to run long.

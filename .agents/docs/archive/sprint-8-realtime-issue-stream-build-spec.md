# Build spec — Sprint 8: the real-time issue stream

Ledger: [`feature-list.json`](feature-list.json) · Log: [`progress.md`](progress.md)
**Decisions live in [`realtime-issue-stream.md`](.agents/docs/features/realtime-issue-stream.md)**
(`R-D1`…`R-D6`). This file does not restate them.

Sprint 7's ledger is archived at
[`.agents/docs/archive/sprint-7-hardening-*`](.agents/docs/archive/) — 19/19, 77 assertions.

---

## 1. Problem statement

The plan says every sprint has shipped. Audited against the tree on 2026-08-07, **one named item has
not**: Sprint 3's *"Real-time issue stream — socket.io → issue list, per-project room, no
double-applied optimistic updates."*

- `hooks/useIssues.ts` — no socket subscription, no polling. The list is a mount-time snapshot.
- `server.ts` — emits for `chat-message`, `user-typing`, `console-logs`, `target-app-*`.
  **Nothing emits for issues.** `api/ingest.ts` never touches `io`.
- `io` is not exported from `server.ts`, so there is no seam to emit from yet.
- Sprint 3's exit test — *"an error in a third tab appears in both windows within 2s, once"* — has
  never been runnable.

The four other Sprint 3 items did ship (URL filter state, the three empty states, `SearchInput`,
issue detail), which is the likely reason the row was marked done.

**Sprint goal:** *the issue list updates itself within 2s, exactly once, tells the truth when it is
silent, and survives a tab left open past token expiry.*

## 2. Acceptance criteria

Every one is an observation, not an implementation claim. A criterion that cannot fail proves nothing.

1. Two browser windows on the same project's issue list. An error thrown from a third context appears
   in **both**, within 2s, **once**.
2. The count on an existing issue increments in place. It does not reorder the list under the cursor
   and it does not refetch.
3. A brand-new issue arriving while the client is on page 1 with no filters prepends, and the list
   still holds exactly `pageSize` rows.
4. A brand-new issue arriving while a **filter is active** does *not* insert. A "N new issues" banner
   appears; clicking it refetches.
5. **Double-apply check.** Resolve an issue in window A. Window B shows `resolved` once. Window A's
   own optimistic update and the echoed push do not produce a doubled count or a flicker.
6. **Cross-project check.** A signed-in **non-member** of project P, with a socket connected, receives
   **zero** `project:P` frames. Asserted on the wire, not by checking the UI is empty.
7. The SDK's anonymous socket cannot join `project:<id>`.
8. **Ingest is unharmed.** With the emit path forced to throw, ingest still answers 202, still writes
   the event and the issue, and is not measurably slower.
9. Kill the server. The badge goes `reconnecting`, then `offline`. **It never reads `live` over a dead
   feed.** Restart: it reconnects and refetches, and the list is correct.
10. **The token-expiry criterion.** Leave a tab open past access-token expiry. The socket refreshes
    once via `authSession.ts` and keeps streaming. This is the criterion Sprint 3 wrote and never ran.
11. A second consecutive auth failure signs out rather than looping.
12. `tsc --noEmit`, `eslint src`, `npm run build` clean in both workspaces; `npm test` green.
13. **FAILURE CASE, proven not declared:** reintroduce an increment-based count (`count += 1`) and
    show a test goes red naming the drift. Same discipline as F011 last sprint.
14. `sprint-plan.md`'s "every sprint has shipped" line is corrected in the same PR.

## 3. Gates

| G | Scope | Exit |
|---|---|---|
| **G1** | `lib/realtime.ts` registry + `project:<id>` room with `resolveMembership` on join | Criteria 6, 7 |
| **G2** | Emit from `api/ingest.ts`, post-commit, detached, absolute values (R-D1, R-D4) | Criteria 1, 8 |
| **G3** | `useIssues` reconciliation: patch-in-place, conditional prepend, banner (R-D2) | Criteria 2, 3, 4, 5 |
| **G4** | Connection badge + reconnect refetch (R-D5) | Criterion 9 |
| **G5** | Socket token refresh through `authSession.ts` (R-D6) | Criteria 10, 11 |
| **G6** | Tests, the reintroduced-bug proof, docs + plan correction | Criteria 12, 13, 14 |

**Cut order if it runs long:** the "N new issues" banner degrades to a plain refetch button → the
three-state badge degrades to two. **Do not cut G5.** A live feed that dies at token expiry is worse
than no live feed, because the page keeps claiming to be current.

## 4. Estimate

1.5–2d, matching the plan's original figure. G5 is the item that could double it, because it is the
first time anything has driven the refresh coordinator from outside an HTTP transport.

## 5. Known risk, named before the start

`io` is single-process. Every push, like every existing in-memory rate limit, is per-instance. This
sprint does not fix that and must not pretend to — a Redis adapter is a deliberate decision, and
half-building it here would leave a system that looks horizontally scalable and is not.

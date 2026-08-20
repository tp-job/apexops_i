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

## Status — at scoping (2026-08-07)

Nothing was implemented and no criterion had been observed. Superseded by the 2026-08-20 entries
below; left in place because the ledger is append-mostly and a scoping snapshot that quietly turns
into a completion claim is the drift this sprint exists to correct.

## Carried risk

**G5 is the item that decides whether this sprint is real.** `lib/authSession.ts` is the single
refresh coordinator and covers four HTTP transports; sockets are recorded there as explicitly not
covered. Sprint 3's own exit criterion is *"leave a tab open past token expiry — it keeps streaming"*,
which cannot pass without it. It is also the first time anything will drive that coordinator from
outside an HTTP transport, so it is the most likely item to run long.

---

## 2026-08-20 — build opened, target re-verified against the tree

The spec was written 2026-08-07 and nothing was built. Sprints 9, 11 and 12 landed in between, so
the target was re-audited before consuming it rather than trusted because it is written down.

| Spec claim (2026-08-07) | Re-checked 2026-08-20 | Still true |
|---|---|---|
| `hooks/useIssues.ts` has no socket and no poll | `grep socket\|setInterval` → no hits; `load()` runs on mount and on query change only | yes |
| `io` is not exported from `server.ts` | [`server.ts:52`](../../../app/server/src/server.ts) — `const io`, no export | yes |
| `api/ingest.ts` never touches `io` | no `io` and no `emit` in the file | yes |
| `server/src/lib/realtime.ts` does not exist | missing | yes |
| `sprint-plan.md` still claims every sprint shipped | line still present | yes |

**All six gates and ten ledger features stand unchanged.** Stage 1 and Stage 2 were closed on
2026-08-07; this session consumes them and does not re-derive them.

Harness moved out of `.agents/docs/archive/` into `.agents/harness/sprint-8-realtime-issue-stream/`
to match the sprint-11 and sprint-12 layout — it was archived while unbuilt, alongside sprint 9's,
which is part of how it stayed invisible. Decisions moved to
[`.agents/docs/features/realtime-issue-stream.md`](../../docs/features/realtime-issue-stream.md),
which is the path the spec and the ledger already pointed at and which did not exist.

Branch: `sprint-8/realtime-issue-stream`.

### Implementation shape chosen at open (does not alter R-D1..R-D6)

The repo's testable-decision idiom is a **pure module + a thin caller** — `lib/monitorAccess.ts`'s
`decideMonitorAdmit` next to a `socket.join` that only obeys it. There is no socket or HTTP
integration harness in this repo (vitest covers pure `lib/*` only), so every decision this sprint
makes goes into a pure module or it cannot be verified by the suite at all:

| Decision | Pure module | Thin caller |
|---|---|---|
| frame shape, absolute values (R-D1) | `server/src/lib/issueStream.ts` | `api/ingest.ts` |
| room name + join admittance (R-D3) | `server/src/lib/issueStream.ts` | `server.ts` socket handler |
| reconciliation: patch / prepend / banner (R-D2) | `client/src/lib/issueStream.ts` | `hooks/useIssueStream.ts` |
| badge state machine (R-D5) | `client/src/lib/issueStream.ts` | badge component |

F009's reintroduced-drift proof is only meaningful against pure modules, so this is what makes that
ledger item runnable rather than a claim.


## 2026-08-20 — all six gates closed

10/10 ledger features pass. Every note in `feature-list.json` says which criteria were **observed**
and which were unit-tested, because those are different claims.

| G | Scope | State | Evidence |
|---|---|---|---|
| G1 | `lib/realtime.ts` registry | done | 4 assertions; `dist/lib/realtime.js` emits no `require()`, so no cycle is even possible |
| G2 | `project:<id>` room + authorized join, ingest emit | done | Real-socket isolation test; live ingest → one frame at +858ms then +34ms |
| G3 | `useIssues` reconciliation | done | Two windows, one change each at +156ms, no reorder, no refetch |
| G4 | Badge + reconnect refetch | done | `live → reconnecting → offline → live`, and the issue ingested during the outage recovered |
| G5 | Socket token refresh | done | Tab past expiry refreshed through `authSession.ts` and kept streaming, 5 → 6 |
| G6 | Tests, reintroduced-bug proof, plan correction | done | Two mutations watched to fail; `sprint-plan.md:375` corrected |

### What the carried risk turned out to be

G5 was called *"the item that decides whether this sprint is real"* and *"the most likely to run
long."* It was neither difficult nor long — because `authSession.ts` had already done the hard part.
The socket needed roughly fifteen lines: catch `connect_error` with the server's `Unauthorized`,
stop socket.io retrying the refused token, call the existing single-flight `refreshOnce()`, set
`socket.auth` and connect **once**. The risk was real but it had been paid down in Sprint 5.

### What actually cost time, and was not on the list

1. **Verifying honestly.** The repo's suite is pure-unit only, so "a non-member receives zero frames"
   had nowhere to live. The fix was to extract the join handler with membership injected and stand up
   a real Socket.IO server in the test — the first wire-level test in this repo. Criterion 8 needed
   the emit forced to throw and the server restarted; criterion 9 and G5 needed a **second, isolated**
   client/server pair (vite :5199 → API :3013, WS :8099) so the developer's own dev server was never
   killed underneath them.
2. **Two decisions had to be amended, and were written down rather than applied quietly** — see
   `R-D1a`. The frame gained `ticketId`, and `PATCH /:id` and `POST /:id/ticket` emit too: criterion
   5 needs a resolve *and* a promote in one window to reach another, and ingest is not the only
   writer of these rows.
3. **A prepended row is a placeholder**, because the frame carries no title by design. One debounced
   refetch fills it in; a burst of new fingerprints coalesces into a single request.

### Gaps carried out of the sprint

Listed with their reasons in the exit notes of
[`realtime-issue-stream.md`](../../docs/features/realtime-issue-stream.md). The short version:
single-process `io` (stated non-goal, needs a Redis adapter — do not half-build it), the banner
counting new issues per *project* rather than per *query*, the ~10s socket.io ping timeout before
`reconnecting` shows, and one auth branch that is code rather than an observation.

### The finding that produced this sprint, restated

`sprint-plan.md` claimed every sprint had shipped. Four of Sprint 3's five items had. **Verify plans
against the tree** — the correction now sits in the plan itself, with the reasoning, so the next
reader learns the process lesson and not just the fact.

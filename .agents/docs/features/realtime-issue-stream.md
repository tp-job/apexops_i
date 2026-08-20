# Real-time issue stream

**Status:** scoped 2026-08-07. Decisions `R-D1`…`R-D6` locked here.
**Sprint:** 8. Plan row: [`sprint-plan.md`](../planning/sprint-plan.md) Sprint 3, *"Real-time issue
stream — socket.io → issue list, per-project room, no double-applied optimistic updates"*.

---

## The finding that produced this spec

`sprint-plan.md:375` states *"Every sprint in this plan has now shipped."* **That is not true of this
item, and the plan should be corrected in the same PR as the code.**

Audited against the tree on 2026-08-07:

| Claim | Reality |
|---|---|
| Sprint 3 shipped | Filters, URL state, the three empty states and issue detail did ship |
| Real-time issue stream | **Not built.** `hooks/useIssues.ts` has no socket and no polling |
| Server pushes issues | **Nothing emits for issues.** `server.ts` emits only for chat, typing and `console-logs` |
| Exit criterion met | *"An error in a third tab appears in both windows within 2s, once"* has never been runnable |

The row was plausibly marked done because four of its five items did land. That is the drift pattern
this repo's document-precedence rule exists to catch: **verify plans against the tree.**

## Problem statement

The issue list is a snapshot taken when the page mounted. A monitoring tool whose value proposition
is *leave it open on a second monitor* currently requires a manual refresh to learn anything. Worse,
it does not distinguish "nothing is happening" from "the page stopped listening" — the failure the
existing `monitors` room comment already names as the worst a monitoring view can have.

`useProject` polls at 4s **only** on the *waiting for first event* state. That poll was correct for
what it does — proving the SDK is installed — and is not a substitute for this.

---

## Decisions

### R-D1 — The server emits a small, absolute-valued delta, not the issue object

The push carries `{ issueId, projectId, fingerprint, level, status, count, lastSeen, isNew }`.

**Absolute values, never increments.** `count` is the new total, not `+1`. Sockets drop, reconnect
and replay; `count += 1` over an unreliable transport is how a counting tool starts lying, and this
product's entire credibility is its counts. An absolute value applied twice is the same value.

Not the full issue object, because the list is server-filtered, server-sorted and paginated — the
server room has no idea what filter the client is on, so it cannot know whether a given issue belongs
in that client's current view. That decision has to live where the query state lives (R-D2).

#### R-D1a — Amendment, 2026-08-20: the frame also carries `ticketId`, and status changes emit

Two additions made during G2/G3, recorded here rather than applied quietly:

1. **`ticketId: number | null` joins the frame.** Acceptance criterion 5 and ledger item F006 both
   require a promote in one window to reach another, and `status` cannot express it — a promoted
   issue is still `unresolved`. Without it a second window keeps offering *Create ticket* for work
   that already has one, and the click 409s. The field keeps every property R-D1 was protecting:
   absolute, small, and not the issue body.
2. **`PATCH /:id` and `POST /:id/ticket` emit too.** R-D4 named ingest because ingest is the hot
   path, but ingest is not the only writer of these rows. Both use the same builder, both push
   *after* the response, both are wrapped, and both force `isNew: false` — a human acting on an
   issue is never a first sighting whatever the timestamps say.

Neither changes the reconciliation rules below.

### R-D2 — The client reconciles against its own query; it never blind-inserts

`useIssues` owns filter, sort and page in the URL. On a push it:

| Case | Action |
|---|---|
| Issue already in `issues[]` | Patch `count`, `lastSeen`, `status` in place. No reorder, no refetch |
| `isNew`, and the client is on page 1 with no filters | Prepend, drop the last row to hold `pageSize` |
| `isNew`, and filters are active or page > 1 | **Do not insert.** Increment a "N new issues" banner |
| Push for a project the client is not viewing | Ignore |

The banner rather than an auto-insert is deliberate: silently injecting a row that does not match the
user's active filter makes the filter look broken, and re-sorting a list under a cursor mid-read is
the thing that makes people close the tab.

### R-D3 — Room membership is authorized, not merely authenticated

Room name: `project:<id>`. Joining requires `resolveMembership` to pass for the socket's user — the
same check the HTTP routes use, called from the same module.

An authenticated-only room is a cross-project leak. That is precisely the defect that got the `:8082`
native relay deleted (workspaces spec D6) and that the existing `monitors` room had to gate itself
against after the handshake was made optional. Repeating it here would be the third occurrence.

The SDK never joins. Ingest is write-only and has no session; it is the *source* of pushes, not a
subscriber.

### R-D4 — Emission is detached and bounded, and can never fail or slow ingest

Same rule as regression alerting, for the same reason: ingest is the hot path and an event that was
recorded but not broadcast is a cosmetic problem, whereas an event lost because a broadcast threw is
data loss.

- The emit happens **after** the ingest transaction commits, never inside it.
- It is fire-and-forget with its own `try/catch`. A throw is logged and swallowed.
- `io` is reached through a new `lib/realtime.ts` registry set at boot. `api/ingest.ts` must not
  import `server.ts` — that is a cycle.

### R-D5 — Reconnect resyncs by refetch, because pushes missed while disconnected are gone

There is no message buffer and there will not be one; durable delivery for a list that can be
re-derived from the database with one query is machinery bought for nothing.

On `connect` **after** a disconnect, the hook refetches the current query. The badge distinguishes
three states — `live`, `reconnecting`, `offline` — and **never shows `live` over a dead feed.**

### R-D6 — The socket handshake refreshes its token, or the sprint's exit criterion is unmeetable

**This is the load-bearing risk, and it is a known open gap**, recorded against
[`lib/authSession.ts`](../../../app/client/src/lib/authSession.ts): the 401 refresh coordinator covers
four HTTP transports and **explicitly does not cover sockets.**

The failure: a tab open past access-token expiry reconnects with a stale token,
`io.use` throws on `jwt.verify`, and the handshake is refused. The feed dies silently while the page
still renders a signed-in shell — the exact shape of the Sprint 1 defect that took until 2026-08-03
to find. And Sprint 3's stated exit is *"leave a tab open past token expiry — it keeps streaming."*

Therefore: on `connect_error` with an auth reason, the client calls the existing single-flight
refresh in `authSession.ts`, updates `socket.auth.token`, and reconnects **once**. A second failure
is a real sign-out, not a retry loop.

One server-side note this depends on: `io.use` currently calls `next()` with **no** token — anonymous
sockets are allowed through for the SDK's benefit. `project:<id>` gates itself under R-D3, so that
stays as-is. Do not tighten the handshake as a side effect of this work.

---

## Known non-goals

- **Real-time on the ticket board.** Different data, different sprint. Ingest is the high-frequency
  source; a human editing a ticket is not.
- **Buffering or guaranteed delivery.** R-D5.
- **Horizontal scale.** `io` is single-process, exactly like the in-memory rate limiters already
  recorded as a gap. Multi-instance needs a socket.io Redis adapter and is out of scope; note it,
  do not half-build it.

## Pre-mortem — the most believable way this fails in six months

**The counts drift and nobody trusts the page.** Not because the push is wrong, but because an
optimistic local update and an echoed server push both apply to the same row. R-D1's absolute values
make double-application harmless by construction; R-D2 forbids blind insertion. If those two hold,
the believable failure is gone. If either is softened during implementation — an increment "because
it's cheaper", an auto-insert "because the banner is ugly" — it comes straight back.

The second most believable: the feed dies at token expiry and the badge still says `live`. That is
R-D6 and R-D5, and it is why the badge has three states rather than a boolean.

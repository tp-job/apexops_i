# Chat — feature spec (G0, security-first)

> Status: **shipped. G1, G3 and G4 closed; G2 closed as `won't build` on 2026-08-21 —
> chat is ephemeral by decision, not by omission.**
> Split out of the "Notes + Calendar + Chat" request deliberately — see
> [`notes-calendar.md`](notes-calendar.md) for the features that shipped alongside this decision.

## Why Chat is its own spec

Notes and Calendar are UI exercises over a working, authenticated backend. Chat is not. It has one
REST endpoint (`GET /api/chat/users`), no persistence model, and **an unauthenticated socket that
broadcasts every message to every connected client.** Batching it with the others would have hidden
a security defect behind a correct-looking UI.

## The blocking defect

Two problems compound into one:

**1. The Socket.IO connection is not authenticated at all.**
[`server.ts`](../../../app/server/src/server.ts) `register` accepts a client-supplied `userId` with
no token verification. Anyone who can reach the WS port joins the `chat-users` room as any identity
they claim. Every REST route in this app is `authenticate`-gated; the socket is the one door left
open.

**2. Every message is fanned out to every chat client.**
`io.to('chat-users').emit('chat-message', msg)` sends each DM to *all* registered chat clients. The
source comment is explicit that the frontend filters by `roomId` — and it does, at
[`useChat.ts`](../../../app/client/src/hooks/useChat.ts) `if (msg.roomId !== roomIdRef.current) return;`.

**So privacy is enforced in the browser, over data the server already handed out.** Remove the
client-side filter and you read every conversation in the app. The same applies to `user-typing`.

This is acceptable for an unwired demo. It is not acceptable on a screen users type real things
into.

## Required before any UI work (G1)

1. **Authenticate the socket handshake.** Verify the JWT in `socket.handshake.auth.token` with the
   same secret `middleware/auth.ts` uses, and derive `userId` from the **token**, never from the
   client payload. Reject the connection otherwise.
2. **Scope rooms to participants.** Replace the single `chat-users` room with a per-conversation
   room. On join, verify server-side that the authenticated user is actually a participant. Emit to
   the conversation room only — never to a global room.
3. **Authorise the sender.** On `chat-message`, ignore `msg.senderId` and use the socket's
   authenticated identity, so a client cannot send as someone else.
4. **Validate and bound payloads.** Zod-validate inbound socket events and cap message length;
   nothing currently constrains them.
5. **Rate-limit** message and typing events per socket. The REST API has `express-rate-limit`; the
   socket has nothing.

## Persistence decision — DECIDED 2026-08-21: ephemeral

**Chat does not store messages, and that is the answer, not a gap.** There is no `ChatMessage`
model, no `Conversation` table and no history endpoint; the server relays into the conversation's
room and forgets. A reload starts an empty thread.

This section previously read *"still open"* and carried a recommendation to add
`Conversation` + `ConversationParticipant` + `ChatMessage`. That recommendation is **rejected**, and
the reasoning is worth keeping because it is the reason the question could be closed at all:

**The argument for persisting was authorisation, and G1 removed it.** The original case was that
room membership needs a participants table to check against — so persistence had to be decided
first or the auth path would be rebuilt. G1 solved membership without a table: a DM room id **is**
its two participants (`"3_7"`, ascending), so `utils/chatRoom.ts` checks membership from the id
alone. With that gone, persistence stopped being a structural question and became a product one.

As a product question the answer is no, for three reasons:

1. **Nothing asks for it.** This is a small-team side channel next to Notes, Tasks, Bug Tracker and
   Issues — the surfaces where things that must survive a reload already live, each with a real
   model behind it. A message that matters belongs in one of those.
2. **Storing conversations is a commitment, not a column.** It brings retention, deletion,
   moderation, export, and the expectation that "sent" means "kept" — with no owner for any of it.
   `Event` already has a retention policy precisely because stored user content needs one.
3. **The UI already tells the truth**, so the decision is visible rather than surprising: every
   thread carries a **"not saved"** badge ([`Chat.tsx`](../../../app/client/src/pages/Chat.tsx)),
   and the empty state says messages are relayed rather than implying a failed load. That page
   header carries a standing instruction not to refactor either property away.

**What would reopen this**, stated so the next person does not have to guess: a requirement that
names a retention period and an owner for deletion — compliance, support transcripts, or handover
between shifts. Absent that, "we might want history" is not a requirement, and building the table
in advance means shipping the obligations without the reason.

**Consequences that are now settled, not pending:**

- No message-history endpoint will be added; `GET /api/chat/users` stays the entire REST surface.
- The socket contract is the feature contract — see G1 below.
- Offline delivery, unread counts and read receipts are **out of scope by construction**: each of
  them needs a store, and there is none.

## Gates

| Gate | Deliverable | Exit criteria | State |
|---|---|---|---|
| **G0** | This document | Defect documented, plan agreed | ✅ done |
| **G1** | Socket auth, per-conversation rooms, server-derived sender, payload validation, rate limiting | A second authenticated client provably cannot receive a conversation it is not a participant in | ✅ **done and verified** |
| **G3** | Chat page UI on `useChat`, rewired to the new contract | Two users can hold a conversation | ✅ done — `pages/Chat.tsx` at `/chat` |
| **G2** | ~~`Conversation`/`ChatMessage` models + history endpoint~~ | — | ❌ **closed 2026-08-21, won't build** — ephemeral by decision (above). G1 made the authorisation argument for it moot |
| **G4** | QA: impersonation, cross-room leak, reconnect, empty states | Verified, not assumed | ✅ socket suite green; reconnect/offline still manual |

### G1 — how it was closed

Room identity carries its own participant list (`utils/chatRoom.ts`): a DM room id **is** the two
user ids ascending (`"3_7"`), so membership is checkable from the id alone — no `Conversation`
table needed. That is what allowed the socket to be secured **without** first settling
persistence, which the original plan had as a blocker.

Handshake auth is deliberately *optional*: the SDK and console-monitor `target-app` clients connect
anonymously and must keep working. (This sentence used to name `useBugTrackerSocket`, which has
since been deleted — `useConsoleMonitor.ts` is the anonymous client that remains.) A token that is present but
invalid is rejected outright; chat handlers require an authenticated socket.

Verified by an automated socket suite, 10/10:

- invalid token rejected at handshake
- anonymous socket still connects (monitor compatibility) but is refused chat
- non-participant refused a room join
- **a chat client not in the room receives nothing** — the leak, closed
- participant receives normally once joined
- spoofed `senderId` / `senderName` overridden with the token's identity
- whitespace-only messages dropped

The UI is live and labels every thread **"not saved"** — now a statement of the decision rather than a placeholder for G2.

## Non-goals (v1)

- **Message persistence and history** — decided above, not deferred.
- Group conversations.
- Presence/online indicators (no presence source exists).
- Attachments, reactions, read receipts, edit/delete.
- End-to-end encryption. Transport security is TLS's job; this spec is about authorisation.

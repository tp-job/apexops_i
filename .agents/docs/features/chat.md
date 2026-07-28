# Chat — feature spec (G0, security-first)

> Status: **spec only, 2026-07-26. No UI work should start until G1 lands.**
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

## Persistence decision (still open)

There is no `ChatMessage` model and no history endpoint — `useChat` is ephemeral by design, so a
reload loses the conversation. That was flagged as an open question in
[`user-flow.md`](../product/user-flow.md) and is **still unanswered**.

It needs answering before G1, because it changes the room model: persisted conversations need a
`Conversation` (or `ChatRoom`) row to attach participants and messages to, which is also the natural
place to authorise room joins in requirement 2. Deciding "ephemeral" later means rebuilding the
authorisation path.

Recommendation: add `Conversation` + `ConversationParticipant` + `ChatMessage`. 1:1 only for v1
(the server comments the registry as an "Instagram-style DM demo", and nothing in the code implies
group chat). Participants are what make room authorisation checkable at all.

## Gates

| Gate | Deliverable | Exit criteria | State |
|---|---|---|---|
| **G0** | This document | Defect documented, plan agreed | ✅ done |
| **G1** | Socket auth, per-conversation rooms, server-derived sender, payload validation, rate limiting | A second authenticated client provably cannot receive a conversation it is not a participant in | ✅ **done and verified** |
| **G3** | Chat page UI on `useChat`, rewired to the new contract | Two users can hold a conversation | ✅ done — `pages/Chat.tsx` at `/chat` |
| **G2** | `Conversation`/`ChatMessage` models + history endpoint | Reload restores the thread | ⬜ **still open** — persistence decision not made |
| **G4** | QA: impersonation, cross-room leak, reconnect, empty states | Verified, not assumed | ✅ socket suite green; reconnect/offline still manual |

### G1 — how it was closed

Room identity carries its own participant list (`utils/chatRoom.ts`): a DM room id **is** the two
user ids ascending (`"3_7"`), so membership is checkable from the id alone — no `Conversation`
table needed. That is what allowed the socket to be secured **without** first settling
persistence, which the original plan had as a blocker.

Handshake auth is deliberately *optional*: console-monitor `target-app` clients and
`useBugTrackerSocket` connect anonymously and must keep working. A token that is present but
invalid is rejected outright; chat handlers require an authenticated socket.

Verified by an automated socket suite, 10/10:

- invalid token rejected at handshake
- anonymous socket still connects (monitor compatibility) but is refused chat
- non-participant refused a room join
- **a chat client not in the room receives nothing** — the leak, closed
- participant receives normally once joined
- spoofed `senderId` / `senderName` overridden with the token's identity
- whitespace-only messages dropped

The UI is live but labels every thread **"not saved"**, because G2 is still open.

## Non-goals (v1)

- Group conversations.
- Presence/online indicators (no presence source exists).
- Attachments, reactions, read receipts, edit/delete.
- End-to-end encryption. Transport security is TLS's job; this spec is about authorisation.

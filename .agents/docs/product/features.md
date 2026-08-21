# ApexOps — core features

> **Rewritten 2026-08-21** against `app/server/src/api/*`, `app/client/src/pages/*` and
> `database/prisma/schema.prisma`. The previous version was written 2026-07-24 and had gone stale in
> ways that mislead rather than merely lag — it said no role gating was wired up, that Bug Tracker
> had realtime via a hook that no longer exists, and that the AI endpoints had no client. All three
> were true then and are false now. Endpoint-level detail lives in
> [`api-reference.md`](../architecture/api-reference.md); page-level flow in
> [`user-flow.md`](user-flow.md).

## What ApexOps is

An error tracker with a workspace attached. A browser SDK posts errors to one ingest endpoint; they
collapse into issues; an issue worth doing something about becomes a ticket on a board. Around that
sit the things a small team needs next to the work: notes, tasks, a calendar, docs, an AI assistant
and a side channel to talk in.

---

## Error pipeline — the spine

**Ingest** (`api/ingest.ts`) · `POST /api/ingest`, key-authenticated and write-only. The key is
public by design: it can write into exactly one project and can never read, so the defences are
blast-radius ones — per-key and per-IP limits, a 1 MB cap, bounded batches, server-side level
filtering and an optional origin allowlist.

**Grouping.** Events fingerprint into `Issue` rows, so the same error a thousand times is one row
with a count. A `resolved` issue that fires again is **reopened as a regression** and writes an
`IssueStatusChange` audit row — without it, "regressions this week" would be uncomputable, because
`Issue.status` only holds the current value. `ignored` deliberately stays ignored: that is the user
asking not to be told.

**Issues** (`api/issues.ts`, `/p/:slug/issues`). Server-filtered, sorted and paged, with filter
state in the URL so a filtered list can be pasted into chat. Detail shows the latest event, a
timeline, and browser/OS/release breakdowns.

**Source maps** are stored in Postgres, never on disk, and symbolication runs at **read** time — so
a map uploaded after a deploy retroactively resolves stacks that were already captured.

**Retention** prunes raw events on a schedule; issues and their counts survive.

---

## Bug Tracker

**Where it lives:** `/bug-tracker` (every ticket you can see) and `/p/:slug/board` (one project's
board). Backed by `api/tickets.ts` and `hooks/useBugTrackerData.ts`.

**What a ticket is.** `title`, `description`, `status` (`open` · `in-progress` · `resolved` ·
`closed`), `priority` (`low` · `medium` · `high` · `critical`), `assigneeId`/`reporterId` as real
`User` relations, `tags`, `relatedLogs`, and a **required `projectId`**. The free-text
`assignee`/`reporter` columns still exist as a display denorm from before the relations landed; they
are not the source of truth.

**Two corrections to the old description of this feature**, both worth stating because someone
planning work would otherwise build on them:

1. **There is no realtime on the board.** `useBugTrackerSocket.ts` is gone — `useConsoleMonitor.ts`
   replaced it for the console feed, and nothing took over the ticket side. The board is a
   fetch-and-refetch surface. (Realtime for the *issue list* is a separate piece of work, on
   `sprint-8/realtime-issue-stream` and not merged.)
2. **Tickets are project-scoped and soft-deleted.** `projectId` is required, `DELETE /:id` archives
   rather than destroys, and `POST /:id/restore` brings it back. The old text described an
   unscoped, hard-deleting CRUD.

**The link to the pipeline.** `POST /api/projects/:slug/issues/:id/ticket` promotes an issue into a
ticket, copying the culprit, count, first-seen and latest stack into the description and linking the
two rows. Promoting twice answers `409` with the existing ticket id rather than creating a duplicate
— `Issue.ticketId` is unique, and the UI navigates to what already exists.

**Comments** (`TicketComment`) are the discussion surface: `GET`/`POST /api/tickets/:id/comments`.

---

## AI Assistant — BYOK, shipped

**Where it lives:** a right-hand panel toggled from the Topbar, available on every page and
belonging to no route. Client: `hooks/useAssistant.ts` (owns the thread), `services/assistant.ts`
(owns the wire), `components/assistant/*` (composer, message list, Markdown renderer, key dialog).

**The old description said this was "a live backend with no caller." That has been false since
2026-08-16** (sprint 11, `.agents/docs/features/ai-assistant-byok.md`).

**Bring your own key.** Each user stores their own Gemini key rather than spending a shared one:

- `PUT /api/ai/key` **validates against the provider before storing**, using a list-models probe
  that spends none of the user's quota. A rejected key leaves the table exactly as it found it.
- Keys are encrypted with AES-256-GCM (`lib/crypto.ts`) and only a masked form is ever returned —
  a plaintext key enters and never leaves.
- The key travels in the `x-goog-api-key` header, never a query string, so it cannot end up in an
  error message, a redirect, or a proxy log that records paths.

**Four controls on the chat route, each closing a different door:** `authenticate` (the internet),
a per-user rate limit (the signed-in loop), prompt and history caps (the single enormous request),
and a max-output-token ceiling (the cost of every call). Every refusal happens **before** the
outbound call — a cap that runs after the spend is a log message, not a cost control.

**Typed errors.** Responses carry a stable `code` (`NO_KEY`, `INVALID_KEY`, `RATE_LIMITED`,
`PROVIDER_ERROR`, `EMPTY_RESPONSE`, `INVALID_REQUEST`) alongside the human `error` string, so a
rejected key reads as "re-enter your key" instead of "invalid request". Match on `code`; an English
sentence is not an API contract.

**Note the split:** `GET /api/ai/status` reports whether the *server's* `GEMINI_API_KEY` is set plus
the model and caps. Whether *you* have a usable key is `GET /api/ai/key`. Two different questions.

---

## Chat — interpersonal, ephemeral by decision

`/chat`, one-to-one, over the authenticated Socket.IO server. Identity comes from the verified
token, never from the payload, and each conversation has its own room whose id **is** its two
participants — so membership is checkable without a `Conversation` table.

**Messages are relayed and never stored, and that is a decision, not a gap** (settled 2026-08-21,
[`features/chat.md`](../features/chat.md)). Every thread carries a **"not saved"** badge and the
empty state says so rather than implying a failed load. Reopening it needs a requirement that names
a retention period and an owner for deletion.

---

## Notes, Tasks and Calendar — one dataset, several views

**Notes** (`/notes`) are written in the same rich editor everywhere: `content` always holds plain
text and `contentRich` holds the TipTap document, because previews and search read the plain
column and markup there would leak into both. Colours, tags, pinning, search and scheduling all
live on the card.

**Tasks** (`/tasks`) are real rows (`Task`), not JSON inside a note. That changed when the product
needed a cross-day master list, an overdue view and tasks on the calendar — none of which is
expressible as a query against a blob. `overdue` means a **deadline that has passed on unfinished
work**, not merely something planned for an earlier day.

**Calendar events** (`CalendarEvent`) are first-class, and an event crossing midnight appears on
every day it covers.

**Day buckets resolve in the viewer's timezone**, from `scheduledFor ?? createdAt` — the fallback is
what keeps every pre-existing note where it already appeared.

**`Note.checklistItems` no longer exists.** It was dropped on 2026-08-21 (notes-SSOT phase 4) after
its todos moved to `Task`; an old client that still sends the field gets a `201` with the key
ignored.

---

## Projects, roles and invites

A project owns its ingest key, capture levels, allowed origins, retention window, alerting and
webhook. Membership is `owner` · `admin` · `member`: admins manage settings, keys and people;
**only an owner** can archive, restore or transfer. Invites go by email and land as an in-product
notification when the address already has an account.

**Role gating is real and is read from the database on every request** — `authorize('admin')`
re-reads `role` and `isActive` rather than trusting the token's claim, so a demoted admin loses
access immediately. (The 2026-07-24 text said no route gating was wired up. It was accurate then.)

**A project you are not a member of answers `404`, not `403`**, so the routes cannot be used to
enumerate other people's project names.

---

## Admin surfaces

**Docs CMS** — public `/docs` renders published pages; `/admin/docs` creates, edits, reorders,
publishes and deletes them. Bodies are Markdown plus a small directive dialect with the table of
contents derived from headings at read time. `npm run seed:docs` seeds the shipped pages and
**unpublishes retired ones**; it never deletes.

**Console monitor** — `/admin/console`, admin only, session-scoped capture of a target app's console
output. The room re-checks the caller's role on join rather than trusting the handshake, and
`POST /api/console-logs/realtime` — the old unauthenticated write path — answers `410 Gone`.

**Users** — `/admin/users`, role and activation changes, which revoke the affected user's sessions.

---

## Account and platform

Profile, password, notification preferences, and **session management**: every active session
listed, revocable one at a time or all at once, with `sessionTimeout` acting as an idle window on
the refresh token. A 401 anywhere in the client goes through one refresh coordinator
(`lib/authSession.ts`) because `/refresh` is single-use and two concurrent refreshes would end a
healthy session.

Notifications cover regressions and invites. Overview screens roll up trend, release markers and
regressions across projects.

---

## Not a feature: Invoices

No `Invoice` model, no `/api/invoices`, no page. The old Invoices screen was entirely mock data and
survives only as the lineage of the design system.

---

**Verified against the tree on 2026-08-21.** Two branches from that day were unmerged and are
therefore *not* described above: `sprint-8/realtime-issue-stream` (a live issue list) and
`notes-calendar/g3-rich-notes` (read-time conversion of legacy HTML notes). Notes-SSOT phase 4 *is*
described, because it removes a field and calling it present would be wrong.

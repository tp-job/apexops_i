# API reference — ApexOps

> **Rewritten 2026-08-21**, enumerated from `app/server/src/server.ts`'s mounts and every router in
> `app/server/src/api/*.ts`. The previous version documented a `/register` + `/login` + Ticket +
> Log API with a `name` field on the user — a shape that predates project scoping, roles, ingest,
> issues, tasks, calendar events, AI and docs. It described an app that no longer exists.
>
> **How to re-derive this** rather than trusting it: `grep -n "app.use('/api" app/server/src/server.ts`
> for the mounts, then `grep -nE "^router\.(get|post|put|patch|delete)" app/server/src/api/*.ts` for
> the routes. If this file and that output disagree, the output is right.

## Conventions

**Base URL.** `http://localhost:3000` in development (`PORT`). The Socket.IO server is a **separate
port**, `8081` (`WS_PORT`) — see [Socket.IO events](#socketio-events).

**Authentication.** `Authorization: Bearer <accessToken>`. Access tokens are short-lived and carry
`{ id, email, role, sid }`; `POST /api/auth/refresh` rotates them, and the refresh token is
single-use — two concurrent refreshes are a bug, not a retry (see
[`authSession.ts`](../../../app/client/src/lib/authSession.ts), which is the client's *only* refresh
coordinator).

**Authorization is read from the database, never from the token.** `authorize('admin')` re-reads
`role` and `isActive` per request, so a demoted admin loses access immediately rather than when
their token happens to expire. Project routes resolve membership the same way, through
`lib/projectAccess.ts`.

**Errors.** `{ "error": "<human sentence>" }`, plus `details[]` on validation failures. The AI routes
additionally carry a stable `code` (see [AI](#ai-byok)) — match on `code`, never on the sentence.

**A project you are not a member of returns `404`, not `403`.** A 403 confirms the slug exists,
which turns every project route into a way to enumerate other people's project names one guess at a
time. The same rule applies to issues, tickets and members nested under a project.

**Rate limits** (`middleware/rateLimit.ts`), each closing a different door:

| Limiter | Applies to |
| --- | --- |
| `authLoginLimiter` / `authRegisterLimiter` | credential stuffing and signup floods |
| `inviteLimiter` | invite spam from one project |
| `aiChatLimiter` | per-user AI spend |
| `urlScanLimiter` | the admin URL-scan endpoint |
| in-memory per-key + per-IP buckets | `POST /api/ingest` (see below) |

**CORS.** The app is pinned to `CORS_ORIGIN` (the frontend). `POST /api/ingest` is the one endpoint
with its own permissive policy, because it legitimately accepts cross-origin posts from any site
running the SDK. Do not loosen the global policy to serve ingest.

---

## Ingest — the SDK's only endpoint

`POST /api/ingest` · **key-authenticated, write-only, no session**

Authenticated by a per-project ingest key (`X-Apexops-Key` header, or `key` in the body). The key is
**public by design**: it authorizes writing events into exactly one project and can never read.
Defences are blast-radius defences — per-key and per-IP rate limits, a 1 MB body cap, a bounded
batch size, server-side level filtering and an optional origin allowlist.

```http
POST /api/ingest
X-Apexops-Key: pk_...
Content-Type: application/json

{ "events": [ { "level": "error", "message": "…", "stack": "…", "url": "…", "release": "1.4.0", "count": 1 } ] }
```

| Status | Meaning |
| --- | --- |
| `202` | Accepted — `{ accepted, issues, dropped, regressions }`. Also the answer when every event was dropped by the project's capture levels |
| `400` | Payload failed validation (`details[]`, `maxEvents`) |
| `401` | Missing, malformed, unknown or archived-project key — deliberately the same answer for all four |
| `403` | Origin not in the project's allowlist |
| `413` | Body over 1 MB |
| `429` | Per-key or per-IP limit; `Retry-After: 60` |

Events collapse into `Issue` rows by fingerprint. An issue that was `resolved` and fires again is
**reopened as a regression**, writes an `IssueStatusChange` audit row, and dispatches an alert after
the response — never inside the request the SDK is waiting on.

---

## Auth and account — `/api/auth`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/register` | — | Rate limited; password rules in `schemas/auth.schema.ts` |
| POST | `/login` | — | Rate limited; returns `{ user, accessToken, refreshToken }` (plus `token`, a legacy alias for `accessToken`) |
| POST | `/refresh` | refresh token in body | Rotates: the presented row is deleted and a new one issued |
| POST | `/logout` | Bearer | Revokes the current session |
| GET · PUT | `/profile` | Bearer | `firstName`/`lastName`/`email`/`phone`/`company`/`position`/`location`/`timezone`/`bio`/`avatarUrl`/`gender`/`birthDate`/`language`. **There is no `name` column** |
| PUT | `/settings` | Bearer | `UserSettings`, including `sessionTimeout` — an idle window on the refresh token |
| PUT | `/password` | Bearer | bcrypt, 12 rounds |
| GET | `/sessions` | Bearer | Active sessions with device/IP context |
| DELETE | `/sessions/:id` | Bearer | Revoke one |
| POST | `/sessions/revoke-all` | Bearer | Revoke every other session |

## Users — `/api/users` · admin only

`GET /` · `PATCH /:id/role` · `PATCH /:id/active`. The whole router is behind `authenticate` +
`authorize('admin')`. Demoting or deactivating a user revokes their sessions — otherwise their
existing token would outlive the decision.

## Projects — `/api/projects`

The whole router is authenticated, and every `:slug` route resolves membership first.

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/` | member | Projects you belong to |
| POST | `/` | — | Creates the project and its `owner` membership |
| GET | `/rollup` | member | Cross-project dashboard aggregate; `?range=` |
| GET · PATCH | `/:slug` | member · admin | Settings: capture levels, allowed origins, retention, alerting, webhook |
| POST | `/:slug/rotate-key` | admin | New ingest key; the old one stops working immediately |
| DELETE | `/:slug` | owner | **Archives** (soft) |
| POST | `/:slug/restore` | owner | Un-archives |
| GET | `/:slug/deletion-summary` | owner | What a permanent delete would destroy, counted |
| DELETE | `/:slug/permanent` | owner | Irreversible |
| GET | `/:slug/overview` | member | Per-project trend, release markers, regressions |

**Members and invites** (`api/team.ts`, mounted under the same prefix): `GET /:slug/members`,
`POST /:slug/invites` (rate limited), `DELETE /:slug/invites/:id`, `PATCH` member role,
`DELETE /:slug/members/:userId`, `POST /:slug/transfer-ownership`. Roles are `owner`, `admin`,
`member`; `canAdminister` gates settings and membership, `isOwner` gates archive, restore and
transfer.

**Source maps** (`api/sourcemaps.ts`): `POST /:slug/sourcemaps`, `GET /:slug/sourcemaps`,
`DELETE /:slug/sourcemaps/:id`, `GET /:slug/releases`. Maps live in Postgres and are never written
to disk; only `lib/sourcemaps.ts` may select the `content` column, and symbolication happens at
**read** time so a map uploaded after a deploy retroactively resolves earlier events.

## Issues — `/api/projects/:slug/issues`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/` | Server-filtered, sorted and paged: `level`, `status`, `q`, `sort`, `direction`, `limit`, `offset` |
| GET | `/stats` | Counts for the header |
| GET | `/:id` | Detail: latest event, symbolicated frames, timeline, browser/OS/release breakdown, `?range=` |
| PATCH | `/:id` | `status` — `unresolved` \| `resolved` \| `ignored`. A no-op PATCH writes no audit row |
| POST | `/:id/ticket` | Promote to a `Ticket`; `409` with the existing `ticketId` if already promoted |

## Tickets — `/api/tickets`

Authenticated at the router. `Ticket` is `title`, `description`, `status`
(`open` \| `in-progress` \| `resolved` \| `closed`), `priority` (`low` \| `medium` \| `high` \|
`critical`), `assigneeId`/`reporterId` relations (with legacy free-text `assignee`/`reporter` kept
as a display denorm), `tags`, `relatedLogs`, and a **required `projectId`**.

`GET /` (filterable by `projectId`) · `GET /stats` · `GET /:id` · `POST /` · `PUT /:id` ·
`DELETE /:id` — **archives, does not destroy** · `POST /:id/restore` ·
`GET /:id/comments` · `POST /:id/comments`.

## Notes — `/api/notes`

`GET /` · `GET /stats/overview` · `GET /calendar/:year/:month` · `GET /:id` · `POST /` ·
`PUT /:id` · `PATCH /:id` · `DELETE /:id`.

A note carries `title`, `content` (**always plain text**), `contentRich` (a TipTap document, null
for plain notes), `type`, `isPinned`, `color`, `tags`, `imageUrl`, `linkUrl`, `quote`,
`scheduledFor` and `dueDate`. **`checklistItems` is gone** — dropped in notes-SSOT phase 4; todos
are `Task` rows. An old client that still sends the field gets a `201` with the key ignored.

`GET /calendar/:year/:month` buckets by `scheduledFor ?? createdAt` **in the viewer's timezone** and
echoes the zone it used, alongside `tasksByDay` and `eventsByDay`.

## Tasks — `/api/tasks`

`GET /` · `GET /day/:date` · `PUT /day/:date` (whole-day sync, reconciled by client-generated id) ·
`POST /` · `PATCH /:id` · `DELETE /:id`. Dates are `YYYY-MM-DD` and resolve in the user's zone.

`GET /` takes `status` (`open` \| `done` \| `overdue`), `day`, `from`/`to`, `q`, `limit` (max 500)
and `offset`, and answers `{ tasks, total, limit, offset }`. **`overdue` means a real deadline that
has passed on unfinished work** — `dueDate` in the past and not done — not merely something planned
for an earlier day, which is ordinary backlog.

## Calendar events — `/api/calendar-events`

`GET /` (range) · `POST /` · `PATCH /:id` · `DELETE /:id` (soft). An event that crosses midnight
appears on **every** day it covers — matching on the start day alone is the obvious implementation
and it is wrong.

## Day — `/api/day/:date`

One call, one paint: the day's tasks, events and daily note together, resolved in the user's zone by
the same helper the month grid uses, so the two can never disagree about which day something is on.

## AI (BYOK)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/ai/chat` | Authenticated, rate limited, prompt/history/output capped. Every refusal happens **before** the outbound call |
| GET | `/api/ai/status` | Server-side readiness only: whether `GEMINI_API_KEY` is set, plus the model and the prompt/history/output caps. It says nothing about *your* stored key — read that from `GET /api/ai/key` |
| GET · PUT · DELETE | `/api/ai/key` | The caller's own provider key |

`PUT /key` **validates the key against the provider before storing it**, using a list-models probe
that spends none of the user's quota; a rejected key leaves the table untouched. Keys are encrypted
(AES-256-GCM, `lib/crypto.ts`) and only `maskedKey` is ever returned — a plaintext key enters and
never leaves. The key travels in the `x-goog-api-key` header, never a query string.

Errors carry a typed `code` alongside `error`: `NO_KEY`, `INVALID_KEY`, `RATE_LIMITED`,
`PROVIDER_ERROR`, `EMPTY_RESPONSE`, `INVALID_REQUEST`.

## Chat — `/api/chat`

`GET /users` — the directory the contact rail renders. **That is the entire REST surface**, and it
is deliberate: messages are relayed over Socket.IO and never stored (see
[`features/chat.md`](../features/chat.md), decided 2026-08-21). There is no history endpoint and
none is planned.

## Notifications — `/api/notifications`

`GET /` · `POST /read-all` · `POST /:id/read`. Kinds: `regression`, `invite`.

## Docs — `/api/docs` and `/api/admin/docs`

Public: `GET /api/docs` (published pages, grouped and ordered) and `GET /api/docs/:slug`.
Admin: `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `POST /reorder`, `DELETE /:id` — the whole admin
router behind `authorize('admin')`.

Bodies are Markdown plus a small directive dialect, rendered by the client's own parser. The table
of contents is derived from headings at read time rather than stored, so there is one structure
instead of two that can disagree. **Never render a page body with `dangerouslySetInnerHTML`.**

`npm run seed:docs` seeds the shipped pages by slug and **unpublishes retired ones** (`RETIRED` in
`scripts/seed-docs.ts`); it never deletes.

## Console monitor — `/api/console-monitor` · `/api/console-logs`

`GET /sessions` · `POST /sessions` · `DELETE /sessions/:sessionId` · `GET /logs/:sessionId` ·
`GET /stats/:sessionId` · `POST /clear/:sessionId`. Sessions are gated to their owner.

`POST /api/console-logs` (admin, rate limited) scans a URL; `GET /api/console-logs/script` returns
the embed snippet. **`POST /api/console-logs/realtime` answers `410 Gone`** — it was an
unauthenticated, unbounded write path, and it now points callers at `POST /api/ingest`.

## Logs — `/api/logs`

ApexOps' own internal application log, unrelated to a project's ingested events. `GET /` ·
`GET /stats` · `GET /:id` · `POST /` · `POST /batch` · `DELETE /:id` and `DELETE /` (both admin).

## Misc

`GET /api/health` · `GET /api/mail/status` · `GET /api/invites/:token` and
`POST /api/invites/:token/accept` (authenticated — accepting an invite requires an account).
Static: `/sdk/v1.js`, `/sdk/demo`, `/sdk/test`, `/console-monitor`, `/ws-endpoint`.

---

## Socket.IO events

Port `8081`. The handshake takes `auth.token` and is **optionally** authenticated: the SDK and the
console-monitor target-app clients connect anonymously and must keep working. A token that is
present but invalid is rejected outright — that combination is only ever a bug or an attack.

| Event | Direction | Notes |
| --- | --- | --- |
| `register` | client → server | `clientType: 'monitor' \| 'target-app' \| 'chat'`. `monitor` is **admin only**, re-checked against the database |
| `chat-join` | client → server | Room id encodes its two participants; membership is verified server-side |
| `chat-message`, `user-typing` | both | Sender identity is rebuilt from the token; anything the client claimed about *who sent this* is discarded |
| `console-logs` | both | Only a registered target-app may relay; live view only, never persisted |
| `target-app-connected` / `-disconnected` | server → client | Into the `monitors` room |

**Rooms authorize themselves.** Because the handshake is optional, a room that carries other
people's data checks membership on join rather than assuming the handshake did it.

---

## Not in this API

- **Invoices.** No model, no route. The old page was mock data and survives only as design lineage.
- **Chat history.** Decided, not missing — see above.
- **`Note.checklistItems`.** Dropped; todos are `Task` rows.
- **Anything that writes logs without a session or a key.** That door was `/console-logs/realtime`
  and it is `410`.

## Work not yet on `main`

Written 2026-08-21, when three branches from that day's sessions were unmerged. This file describes
the tree **including** notes-SSOT phase 4 (`checklistItems` dropped), because that change removes a
field and documenting it as present would be knowingly wrong. Two others are **not** reflected
above:

| Branch | What it adds |
| --- | --- |
| `sprint-8/realtime-issue-stream` | An `issue-activity` socket frame pushed into a `project:<id>` room by ingest, plus status and promote changes |
| `notes-calendar/g3-rich-notes` | Read-time conversion of legacy HTML notes; no API change |

If those merge, add `issue-activity` to the socket table and nothing else here moves.

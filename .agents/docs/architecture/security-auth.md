# Authentication & Authorization

How auth actually works in the ApexOps stack (React, TypeScript, Prisma, Express), as of **2026-09-06**.

> Rewritten because the previous version was wrong in the way security documents usually go wrong —
> it under-sold the real controls and over-sold one number. It said the access token was *"short-lived,
> default 1h"*; it is **eight hours**. It sent signed-out users to `/auth`, a route that does not
> exist. And it predated the three controls that do the most work here: database-resolved roles, the
> session list, and the absolute cap. Full audit:
> [`auth-review-and-restructure-2026-08-25.md`](../planning/auth-review-and-restructure-2026-08-25.md).

## Tokens and sessions

- **Access token** — a JWT signed with `JWT_SECRET`, `HS256`, algorithm-pinned on verify. It lives
  for the user's `sessionTimeout`: **default and maximum 480 minutes (8 hours)**, minimum 5. That
  length is intended.
- **Refresh token** — a separate JWT under `JWT_REFRESH_SECRET`, backed by a `RefreshToken` row. The
  row *is* the session: it carries the user agent, the IP, the sliding idle window (`expiresAt`) and
  the hard end of the session (`absoluteExpiresAt`, 7 days).
- **Rotation is single-use.** Refreshing deletes the presented row and issues a new one. The absolute
  expiry is **carried forward, never recomputed** — recomputing is what once made a weekly-refreshed
  session immortal.
- **The access token names its session** via the `sid` claim, and that claim is what makes revocation
  work. See below.
- Both secrets come from `lib/jwtSecrets.ts`, which refuses to boot in production without them.

## What "revoked" means

`authenticate` verifies the token **and then verifies the session behind it** — one indexed lookup of
the `sid` row, which also returns the user's current `role` and `isActive`. A request is refused when
the session row is gone, belongs to someone else, is past either window, or the account is
deactivated.

This is what makes all four revocation paths immediate rather than advisory:

| Action | Effect |
|---|---|
| `POST /api/auth/logout` | that session ends now |
| `DELETE /api/auth/sessions/:id` | that device ends now; the caller's own session is refused with `409` (use *sign out everywhere*) |
| `POST /api/auth/sessions/revoke-all` | every session, including the caller's, ends now |
| Admin deactivate / demote (`api/users.ts` → `revokeAllSessions`) | every session for that account ends now |

**Before 2026-09-06 none of that was true.** `sid` was read and never checked, so a revoked access
token kept full access for the rest of its eight hours on the 18 of 22 routers that do not reach
`authorize()` — including during the incident response that revocation exists for. Fixed by
`lib/sessionAdmit.ts` (pure, 13 tests) and the lookup in `middleware/auth.ts`.

A token carrying **no** `sid` is refused. Those predate Sprint 5 (2026-08-04) and cannot still be
valid; accepting them would mean carrying a credential nothing can revoke.

## Authorization

- **`authenticate`** — `Authorization: Bearer <token>`, plus the session check above. It leaves the
  **current** role on `req.user`, marked `roleIsFresh`.
- **`authorize(...roles)`** — reads that fresh role rather than re-querying, and falls back to its own
  database read if the flag is absent. Either way the role comes from the database on this request,
  so a demotion lands on the next call. It fails **closed**: if the role cannot be read, `503`.
- **Project access** — `resolveMembership` per request. A project you are not a member of answers
  **404, not 403**, so the routes cannot be used to enumerate other people's project names.
- **Client** — `ProtectedRoute` gates the workspace tree and redirects to **`/login`**, carrying
  `state.from`. It decides *what to show*; it is not access control.

## Public by design

These are reachable **without signing in**, and that is a requirement rather than an oversight:

| Surface | Why |
|---|---|
| `/` | the landing page |
| `/docs`, `/docs/:slug` and `GET /api/docs*` | whoever is pasting the SDK snippet into another app needs the install instructions; gating them turns a one-line integration into a support conversation. `api/docs.ts` carries a "no `authenticate`, deliberately and permanently" note |
| `/design-system` | the live style guide |
| `POST /api/ingest` | key-authenticated, write-only, no session — the SDK's only endpoint |

Only **published** doc pages are served; drafts are invisible until published.

## Passwords and rate limits

- **bcrypt**, 12 rounds by default. Policy: 8+ characters, upper, lower, digit.
- **Login** 10 per 15 minutes per IP; **register** 5 per 15 minutes per IP.

## Headers, CORS, env

- **Helmet** enabled; CORS pinned to `CORS_ORIGIN`. `POST /api/ingest` carries its own permissive
  policy because it legitimately accepts cross-origin posts — the global policy is never loosened for
  it.
- `.env` is gitignored; `.env.example` documents what is required.

## Known gaps

Open, prioritised and phased in the
[review](../planning/auth-review-and-restructure-2026-08-25.md) — summarised here so this file does
not become the optimistic one again:

- **Account enumeration** on `/register` and on the deactivated-account login path.
- **No refresh-token reuse detection** — a replayed rotated token merely 401s, so a stolen token
  silently signs the victim out and alerts nobody.
- **Five error paths still return `err.message`**, which carries Prisma file paths and query text.
- **Rate limiting is per-IP only** — no per-account throttle, no lockout, no alerting on repeated
  failures.
- **Both tokens live in `localStorage`**, so any XSS takes the session and the 7-day refresh token.
- **No MFA.**

## Production checklist

1. `NODE_ENV=production`.
2. Strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (32+ random characters, and different from each other).
3. `CORS_ORIGIN` set to the frontend origin.
4. HTTPS only.
5. `npm audit`, and keep dependencies current.
6. Do **not** run `npm run seed:dev` — it refuses production and a non-local `DATABASE_URL`, and that
   refusal is not a reason to work around it.

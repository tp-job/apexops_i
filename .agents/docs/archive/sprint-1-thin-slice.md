# Sprint 1 (thin slice) — "I can see my project"

> Gate artifact for the long-horizon workflow. Written 2026-07-25, before any code.
> Scope was **narrowed by explicit decision** from [`sprint-plan.md`](../planning/sprint-plan.md)'s Sprint 1
> (10 engineer-days, already flagged there as over capacity) to a demonstrable slice.

---

## Stage 1 — Requirements

### Problem statement

The frontend was torn down on 2026-07-24 (see [`frontend/ui-reset-2026-07-24.md`](ui-reset-2026-07-24.md)).
Three routes exist today: `/` (landing), `/design-system`, and an **ungated** `/dashboard`. There is no
way to sign in, and `AuthContext` fakes a logged-in user, so nobody can tell whether the dashboard is
showing their data or fixture data. The owner cannot currently *see their project* in any honest sense.

### Two findings that shaped this scope

1. **`AuthContext.tsx` has a hardcoded login bypass.** `useState(() => getMockLoginResponse().user)`
   seeds a fake user, and the mount effect is deliberately empty with the comment
   `// BYPASS LOGIN: Do not load user from localStorage on mount`. `isAuthenticated` is therefore
   permanently `true`. Any route guard added on top of this would be decorative. Removing the bypass
   is a prerequisite, not a nice-to-have.
2. **Offline mock defaults to ON in dev.** `isMockEnabled()` in `utils/offlineMock.ts` returns
   `!!import.meta.env.DEV` when `VITE_ENABLE_OFFLINE_MOCK` is unset — and no `app/client/.env` exists,
   only `.env.example`. So a dev-mode network failure silently substitutes `mockUser`. For a sprint
   whose entire goal is *"I can see my project"*, a silent fixture fallback is the single most
   dangerous default in the repo: it makes a broken backend look like a working one.

### Acceptance criteria

1. `app/client/.env` exists with `VITE_API_URL` set and offline mock **explicitly disabled**, so what
   renders is real server data or a visible error — never fixtures pretending to be real.
2. Server boots against the local Postgres with Prisma client generated and migrations applied.
3. A new visitor can register at `/register` and lands on `/dashboard`.
4. An existing user can sign in at `/login` and lands on `/dashboard`.
5. `/dashboard` renders real values from `GET /api/tickets/stats` and `GET /api/logs/stats`
   for the signed-in user.
6. Visiting `/dashboard` while signed out redirects to `/login`, and after signing in the user is
   returned to `/dashboard` rather than dumped at the root.
7. A wrong password shows the server's message inline on the form; it does not blank the page, and it
   does not silently log the user in via mock.
8. Reloading the page while signed in keeps the session (hydrated from `localStorage`, validated
   against `GET /api/auth/profile`).
9. Signing out clears the session and returns to `/login`.
10. `tsc --noEmit`, `eslint src`, and `npm run build` are clean; light and dark both verified in-browser.

### Explicitly out of scope

Deferred to their planned sprints, and **not** silently dropped:

- The full form kit (`Select`, `Checkbox`, `Switch`, `RadioGroup`, `FormActions`, `useFormState`, zod
  on the client) — Sprint 1 P0 in the original plan. Only `Field` + `Input` get built here, because
  only they are load-bearing for two auth forms.
- `apiFetch` / `ApiError` / `useResource`, and **refresh-once-and-retry on 401**. This means a tab
  older than the 1h access-token expiry still starts failing. The original Sprint 1 exit criterion
  ("survives a token expiry") is therefore **not met by this slice** — called out, not hidden.
- Prisma migration for `Role` enum + `Ticket.owaspCategory`.
- Test foundation (Vitest + RTL + `renderWithProviders`). Verification here is manual and in-browser.
- Migrating the four existing hooks onto `useResource`.
- `RoleRoute` / `useIsAdmin`. This slice authenticates; it does not authorize by role.

### Edge cases to handle

| Case | Expected behaviour |
|---|---|
| Backend down | Visible "cannot reach server" error on the auth form. **Never** a mock login. |
| Expired/invalid token in `localStorage` | Session cleared on mount, user sent to `/login`, no error spam |
| Empty database (no tickets, no logs) | Dashboard shows zeroes and its "nothing needs you" empty state — not an error |
| One stats endpoint fails | Existing `partial` path: other panel renders, failed one shows `—` (unknown ≠ zero) |
| Email already registered | Server's 400 message rendered inline on the register form |
| Direct navigation to `/dashboard` signed out | Redirect to `/login`, return to `/dashboard` after success |
| Submit pressed twice | Button disabled while in flight |

---

## Stage 2 — Design

### Auth flow

```
                  ┌── token in localStorage? ──┐
   app boot ─────►│                            │
                  no                          yes
                  │                            │
                  ▼                            ▼
            authLoading=false          GET /api/auth/profile
            user=null                          │
                  │                   ┌────────┴────────┐
                  │                  200              401/network
                  │                   │                 │
                  │                   ▼                 ▼
                  │              user=profile      clear storage
                  │                                user=null
                  └───────────────┬─────────────────────┘
                                  ▼
                        ProtectedRoute decides
                    authLoading → splash (no flash of /login)
                    !user       → <Navigate to="/login" state={{from}} />
                    user        → <Outlet />
```

Why the splash matters: without an `authLoading` state, the profile round-trip on every reload would
render `/login` for a beat before bouncing back to `/dashboard`. That flash reads as a bug.

### Data contract (already served by `app/server/src/api/auth.ts`, unchanged)

| Call | Request | Success | Failure |
|---|---|---|---|
| `POST /api/auth/register` | `{firstName,lastName,email,password}` | `201 {user, accessToken, refreshToken}` | `400 {error}` |
| `POST /api/auth/login` | `{email,password}` | `200 {user, accessToken, refreshToken}` | `401 {error}`, `403` deactivated |
| `GET /api/auth/profile` | bearer token | `200 {user, settings}` | `401` |
| `POST /api/auth/logout` | `{refreshToken}` + bearer | `200` | tolerated — storage clears regardless |

No new server routes. No schema change. This slice is client-side only, which is why it fits.

### Component decisions

- **`Field`** owns label / hint / error / required marker and the `aria-describedby` wiring, so
  accessibility is solved once rather than per form. `Input` stays presentational and receives
  `aria-*` from `Field` via cloned props.
- **No `useFormState` yet.** Two forms with 2 and 4 fields do not justify the abstraction; it lands
  in Sprint 2 when the ticket-create flow makes it earn its place. Stated so it reads as a decision,
  not an oversight.
- Validation is hand-written against `app/server/src/schemas/auth.schema.ts` with a header comment
  naming that file. The plan's zod-sharing recommendation stands and is deferred with the form kit.

### Error & fallback behaviour

The offline-mock branches in `AuthContext.login/register` are removed from the auth path. A network
failure now produces a real error message naming the API base URL. Mock fallback surviving anywhere in
auth would defeat acceptance criterion 1.

---

## Stages 4–6 — verification plan

**QA (manual, in-browser):** register → dashboard · logout → `/login` · sign in → dashboard ·
reload → still signed in · wrong password → inline error · `/dashboard` signed out → redirect ·
backend stopped → visible error, no mock login · light and dark.

**Deployment:** none. Local dev only. Rollback is `git revert` of the sprint commit; nothing is
migrated, published, or deployed, so there is no external state to unwind.

---

## Exit notes — 2026-07-25

Commit `7efe672` on branch `sprint-1/auth-thin-slice`.

### ✅ Sprint complete — all ten acceptance criteria pass

Database credentials resolved 2026-07-25 (the local `postgres` role password differed from the
`.env` default). `prisma db push` synced the schema, `seed:dev` created both accounts, and the
full checklist below was walked in-browser. Superseded blocker notes kept for the record.

| Criterion | Result |
|---|---|
| 1 · `.env` with mock explicitly off | ✅ |
| 2 · Server boots against Postgres | ✅ `💾 Database: ✅ Connected` |
| 3 · Register → dashboard | ✅ (seeded accounts; register path exercised via the form) |
| 4 · Login → dashboard | ✅ |
| 5 · Dashboard shows real stats | ✅ 2 tickets / 2 errors / 20 info logs, both endpoints 200 |
| 6 · Signed-out `/dashboard` → `/login`, returns after sign-in | ✅ `state.from` hand-off works |
| 7 · Wrong password → inline error, no mock login | ✅ server's own "Invalid email or password" |
| 8 · Session survives reload | ✅ stayed on `/dashboard`, no flash of `/login` |
| 9 · Sign out clears session | ✅ → `/login`, tokens cleared |
| 10 · `tsc -b` / `eslint` / `build` clean, light + dark | ✅ |

### One thing to fix before shipping anything admin-shaped

**`authorize()` is exported from `middleware/auth.ts` and called nowhere.** No endpoint is
role-gated, so the `admin` role currently grants nothing and the Topbar's Admin badge is
decorative.

That matters most at `DELETE /api/logs` ([logs.ts:125](../../../app/server/src/api/logs.ts)): with no
`level` or `olderThan` filter it runs `deleteMany({})` and wipes every log — and it is reachable
by **any authenticated user**. Confirmed non-destructively by calling it with
`?olderThan=1970-01-01` (matches nothing) using both dev tokens: **both returned 200**, logs
intact.

The sprint plan already lists `ConfirmDialog` as required before admin deletes ship. The deeper
issue is that the endpoint isn't admin-gated at all — server-side `authorize('admin')` first, UI
second, per the project's own Definition of Done.

### Superseded: the credentials blocker

`app/server/.env` sets `PG_PASSWORD=postgres` with a matching `DATABASE_URL`, and the Postgres
listening on `localhost:5432` rejects it:

```
P1000: Authentication failed against database server,
the provided database credentials for `postgres` are not valid.
```

The env file is internally consistent, so the mismatch is with the actual role password on the
machine. Not guessable, and not something to guess at — **this is the only thing standing between
this branch and a full pass.**

To unblock, either point `DATABASE_URL` and `PG_PASSWORD` at real credentials, or run the compose
`db` service on a spare host port (5432 is already taken by the local instance). Then:

```bash
npm run db:push --workspace app/server
```

`database/prisma/` has **no `migrations/` directory** — this project has been using `db push`, not
migrate. Worth deciding deliberately before Sprint 5, since the plan assumes a migration exists.

### Verified

| Criterion | Result |
|---|---|
| 1 · `.env` with mock explicitly off | ✅ |
| 2 · Server boots, Prisma client generated | ⚠️ boots, but starts *without* a database |
| 3 · Register → dashboard | ⛔ blocked on DB |
| 4 · Login → dashboard | ⛔ blocked on DB |
| 5 · Dashboard shows real stats | ⛔ blocked on DB |
| 6 · Signed-out `/dashboard` → `/login` | ✅ redirects, `state.from` preserved |
| 7 · Failed login shows an error, no silent mock login | ✅ **500 → stayed signed out, no token written** |
| 8 · Session survives reload | ⛔ blocked on DB |
| 9 · Sign out clears session | ⛔ blocked on DB |
| 10 · `tsc -b` / `eslint src` / `build` clean, light + dark | ✅ all clean, both themes checked |

Also verified: empty submit raises per-field errors with correct `aria-invalid` / `aria-describedby`;
a weak password is rejected client-side with the server's own wording, before any request; the
`/design-system` Form kit section renders with no console errors.

### Found while building, fixed here

The 500 handlers on `/login` and `/register` returned raw `err.message`. With the database
unreachable that meant a Prisma stack trace — including absolute server file paths and the failing
query — went to any unauthenticated caller. Now a generic message; the detail stays in the log.

### Dev role switcher (added after the sprint, commit `e76eac5`)

Two seeded accounts and an in-app control for flipping between them, so a normal user
and an admin can both be signed in at once.

```bash
npm run seed:dev --workspace app/server
```

Creates `dev.user@apexops.local` and `dev.admin@apexops.local`, both `DevPass123`, both
upserted so re-running heals a poked database. Then use the amber control at bottom-left
in dev builds: **Sign in to both** → switch with one click.

**Why it can't ship.** Three independent reasons, because one is not enough for a feature
that hands out an admin session:

1. Account creation is a **CLI script, not an HTTP route** — no endpoint exists to call.
2. The script hard-exits on `NODE_ENV=production`, and separately on a `DATABASE_URL`
   whose host isn't local. `NODE_ENV` says nothing about where the database points, and
   the genuinely dangerous case is a dev machine aimed at a shared box.
3. The switcher is gated at the **JSX site** in `App.tsx`, not only inside the component.
   This distinction was measured, not assumed: with the guard only inside the component,
   Rollup kept stub functions and the `localStorage` key constants in `dist/`. Gating the
   element makes the module unreachable and the bundle returns to its exact pre-feature
   size (456.54 kB). If you touch this, re-check with:

```bash
grep -c "apexops.local\|DevPass123\|devSessions" app/client/dist/assets/*.js
```

**It grants nothing.** Both sessions come from real `POST /api/auth/login` calls against
real rows; the admin account is admin only because the seed script set that column.
Switching swaps which real token is active. The server stays the only authority.

**Switching reloads the page deliberately** — every hook fetches on mount with the token
that was current, so an in-place swap would leave the old role's data on screen, which
looks exactly like success.

`activateRole` refreshes a nearly-expired session before activating it. That's what
"logged in at all times" actually needs: tokens last an hour and app-wide refresh-on-401
is deferred, so the *inactive* role would otherwise rot while you work in the other one.

**Verified end to end** against the live database (commit `f2c2d46`). Two defects found and
fixed in the process, both worth knowing about:

- The active role used to live in its own `devActiveRole` key. Signing out via the top bar
  left it claiming `admin` while the real session was someone else, so the switcher marked
  admin active and **disabled that button** — it lied about the current role and blocked the
  click that would fix it. Now derived from the `user` entry `AuthContext` reads. Two places
  recording one fact will disagree eventually; one place can't.
- `POST /api/auth/logout` deletes the *active* session's refresh token, so signing out while
  on admin left the stored admin refresh token dead. `activateRole` now falls back to a fresh
  login when refresh fails.

### Remaining checklist once the database is up

1. `npm run db:push --workspace app/server`, restart the server, confirm `💾 Database: ✅`.
2. Register at `/register` → should land on `/dashboard` with your name in the top bar.
3. Reload → still signed in (no flash of `/login`).
4. Sign out via the top bar → back at `/login`.
5. Sign in again with a deliberately wrong password → inline "Invalid email or password".
6. Visit `/dashboard` in a private window → redirected to `/login`; sign in → lands on `/dashboard`,
   not `/`.

Steps 3 and 6 are the ones most likely to expose a bug, because they exercise the mount-time
`/profile` round trip and the `state.from` hand-off respectively.

7. `npm run seed:dev --workspace app/server`, then **Sign in to both** in the dev switcher and
   flip user ↔ admin. Confirm the top bar's Admin badge appears only for the admin, and that
   an admin-only API call returns 403 for the user role — the switcher is only useful if the
   two roles actually behave differently.

---

**Status:** complete — all 10 criteria pass · **Owner:** solo build · **Last updated:** 2026-07-25

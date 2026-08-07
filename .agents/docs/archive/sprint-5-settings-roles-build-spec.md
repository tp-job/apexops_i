# Build spec — Sprint 5: settings that enforce, roles that mean something

Ledger: [`feature-list.json`](feature-list.json) · Log: [`progress.md`](progress.md)
Source spec: [`.agents/docs/features/settings.md`](.agents/docs/features/settings.md) (S-D1…S-D5)
Plan row: [`.agents/docs/planning/sprint-plan.md`](.agents/docs/planning/sprint-plan.md) — Sprint 5

---

## 1. Problem statement

The settings sprint was scoped on 2026-07-27 around one finding: **all eleven `user_settings`
toggles are decorative** — written to Postgres and read by nothing. S-D1 answered that with a rule:
*a toggle ships only if it is enforced; everything else is absent, not greyed out.*

Half of that sprint (S1, S2, and most of S4) landed early on 2026-07-31. `/settings` exists with
profile, password change and an active-session list; `updateSettingsSchema` was pruned to a single
field. **This build is the other half**, and the two things it contains are the two the earlier pass
could not do:

1. **`sessionTimeout` is still not enforced.** It is stored, bounded 5–480, and displayed — and it
   changes nothing. It was deliberately deferred because enforcement shortens access-token life for
   every user, which is only survivable once a 401 triggers a silent refresh-and-retry. **That
   landed in Sprint 3 (2026-08-03).** The blocker is gone.
2. **`authorize()` still has exactly one caller in the codebase.** No user-facing endpoint is gated
   by the global role, so "admin" grants nothing and demoting someone removes nothing. S-D5 is
   explicit that the roles must mean something *before* making them revoke promptly is worth a day.

Scoping this build also found a live bug in the shipped half, and it is the exact risk the source
spec named: **the session list's `current` flag is always `false`**, so the "this device" badge never
appears and the per-row *Sign out* control will happily revoke the session you are using.

**Sprint goal:** *every control on the settings page changes something you can observe — and an admin
promoting or deactivating a user changes what that user can do on their very next request.*

---

## 2. Acceptance criteria

Numbered so the ledger and the UAT script can both cite them.

**Session timeout**

1. Setting session timeout to 5 minutes and reloading issues an access token whose `exp` is
   ~5 minutes out, not ~1 hour. Observable by decoding the token.
2. A session idle for longer than the timeout is signed out at the next request: `/api/auth/refresh`
   answers 401 and the client lands on `/login` with a session-expired message, not a blank page.
3. A session used continuously does **not** get signed out, whatever the timeout is set to. A
   5-minute timeout with a request every minute survives indefinitely.
4. No session survives the absolute cap (7 days) regardless of activity — including one that has
   been refreshed continuously, which today lives forever.
5. Existing accounts are not signed out more aggressively than before the change purely because of a
   default value they never chose.

**Sessions list**

6. The row for the browser you are looking at is labelled *this device*, and its per-row sign-out
   control refuses (the server refuses too, not only the UI).
7. Revoking another session signs that browser out at its next request.

**Preferences**

8. Theme follows the account: set dark, sign in on a second browser, it is dark before any toggle is
   touched. *System* tracks the OS setting live.
9. Timezone is a bounded list, not a free-text box, and picking a zone changes which day the notes
   calendar files a note under.
10. No control on the page writes a column that nothing reads. `GET /api/auth/profile` no longer
    returns the ten inert toggles.

**Roles**

11. `dev.user` (role `user`) gets 403 from every admin endpoint; promoting them to `admin` makes the
    same request succeed **on the next request**, with no re-login and no waiting for a token to
    expire. Demoting them takes effect just as fast.
12. Deactivating a user ends their sessions: their next refresh 401s, and admin-gated routes refuse
    them immediately.
13. The last active admin cannot be demoted or deactivated — by themselves or by anyone else.
14. No destructive route is reachable by an authenticated non-admin.

---

## 3. Out of scope — named so it does not leak in

- **2FA / TOTP.** Needs enrolment, recovery codes and a second factor at login. The `twoFactorAuth`
  column stays inert and stays absent from the UI.
- **Email transport and every notification toggle that depends on it.** Still no nodemailer/SES/
  Resend anywhere in the repo. Per S-D4 these are per-project when they land, not per-account.
- **Language / i18n.** There is no i18n framework, no message catalogue, and `User.language`
  (defaulting to `"ไทย (Thai)"`) is read by nothing. A language select would be precisely the lie
  S-D1 exists to prevent. See D7.
- **Email-change verification**, avatar upload, account deletion/export — all still deferred, all
  still for the same reasons.
- **Instant revocation of an access token mid-flight.** Deactivation is bounded by the access-token
  life, not instantaneous on non-admin routes. See D6 and the gap list.
- **Project-level roles.** Shipped in Sprint 6 and untouched here. This build is the *global*
  `admin`/`user` role only.

---

## 4. Decisions

### D1 — `sessionTimeout` is an **idle** timeout, and it bounds the refresh token, not just the access token

The obvious implementation — sign the access token with `expiresIn = sessionTimeout` — enforces
nothing a user can observe. Sprint 3's client refreshes on demand: the token expires, the next
request silently re-issues it, and a 5-minute setting feels exactly like a 60-minute one. The setting
would still be decorative, just with more machinery behind it.

So the access token's `exp` **and** `RefreshToken.expiresAt` both become the timeout, with the
refresh row's expiry re-set on every rotation — a sliding window. Idle past the window and the row is
expired, `/refresh` answers 401, and Sprint 3's `SessionExpiredError` path signs the user out. That is
the promise the label makes, enforced by the machinery that already exists.

### D2 — Sessions get an absolute cap, because today they are immortal

`/refresh` currently sets `expiresAt` to `now + 7d` on every rotation. A session refreshed every six
days therefore never expires, and neither does a stolen refresh token. `absoluteExpiresAt` is stamped
once at login and **carried forward** through every rotation; rotation past it is refused.

**7 days, not a new longer window** (`SESSION_ABSOLUTE_MAX_DAYS` in env). Seven days is what
`JWT_REFRESH_EXPIRY` has always claimed; this makes the claim true rather than inventing a different
promise. The refresh JWT is signed to expire at the same instant, so the row and the token cannot
disagree about when the session ends.

This is a fix to an existing hole that happens to be one column away from work already being done.

### D3 — Migrate the untouched `sessionTimeout` default from 30 to 480 before enforcing it

Every existing row holds `30`, and not one user chose it — it is a column default from a page that
never shipped a control for it. Enforcing it as written would mean a sprint about settings lands as
*"the app started logging me out every half hour."* Rows still at exactly the old default move to 480
(8 hours) as a one-time data change, and the column default follows. Anyone who picks a value
afterwards gets exactly what they picked.

### D4 — The access token carries `sid`, the id of its refresh-token row

`GET /api/auth/sessions` decides `current` by reading `req.body.refreshToken` — on a GET, which
carries no body. So `current` is always `false`: the badge never renders and the per-row control
revokes the session in use. Sending the refresh token up to fix it is worse (it is a bearer
credential, and a query string is the wrong place for one).

The refresh row is created first, then the access token is signed with `sid: row.id`. The server then
knows which session is asking, with no new client code, no credential in a URL, and a natural place to
refuse a self-revoke. It is also the hook a future "revoking a session kills its access token
immediately" would hang from — not built here.

### D5 — `authorize()` resolves the role from the database, not from the JWT claim

Sprint plans have carried *token-invalidation-on-role-change* as the highest risk in the backlog for
months. Sprint 6 found the project-role half of it was never real: `ProjectRole` is not in the token,
so `resolveMembership` reads it per request and a demotion lands on the next call. The same answer
works here. `authorize()` looks up `role` and `isActive` by primary key instead of trusting a claim
that may be up to an hour stale.

The cost is one indexed lookup, and only on routes that are admin-gated — a set small enough to name.
The alternative, a `tokenVersion` column plus an invalidation check on every authenticated request,
is more code, more state, and slower on the hot path, to solve a problem the cheap version does not
have.

### D6 — Demotion and deactivation delete the target's refresh tokens

D5 makes admin-gated routes correct instantly. Ordinary routes still trust the access token until it
expires, so a deactivated user keeps ordinary access for the rest of its life — which D1 has just cut
from an hour to their timeout. Deleting their refresh tokens means the session cannot outlive that
token. Stated in the gap list rather than hidden, because "deactivated" reading as *instantly gone*
when it is not would be worse than the delay itself.

### D7 — `theme` and `timezone` ship; `language` is cut

`timezone` is already enforced — `api/notes.ts` resolves the calendar month in the user's zone — but
it is collected as a free-text input, which is how an unparseable value silently falls back to a
default. It becomes a bounded `Select`. `theme` moves from localStorage-only to a `User.theme`
column so it follows the account, and gains a real *system* option. `language` is cut: no framework,
no catalogue, no consumer.

### D8 — User administration lives at `/admin/users`, not under `/settings`

S-D4's boundary rule is *`/settings` is about you*. Who may sign in to this instance is not about
you; it is about the instance. A separate route, with the nav entry rendered only for admins — and
gated on the server regardless, because hiding a link is not access control.

---

## 5. Data contract

### Schema changes

```prisma
model RefreshToken {
  // …existing
  absoluteExpiresAt DateTime? @map("absolute_expires_at")   // D2; nullable for rows predating it
}

model User {
  // …existing
  theme String? @default("system")   // 'light' | 'dark' | 'system' — D7
}

model UserSettings {
  sessionTimeout Int @default(480) @map("session_timeout")  // D3: was 30
}
```

### Access-token payload

```jsonc
{ "id": 1, "email": "…", "role": "admin", "sid": 42 }   // sid = RefreshToken.id (D4)
```

`role` stays in the token for display only. **`authorize()` does not read it** (D5).

### Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/auth/sessions` | user | `current` now derived from `sid` |
| `DELETE` | `/api/auth/sessions/:id` | user | **409** when `:id` is the caller's own session |
| `GET` | `/api/users` | **admin** | `?q=&page=&pageSize=` — id, name, email, role, isActive, createdAt |
| `PATCH` | `/api/users/:id/role` | **admin** | `{ role: 'admin' \| 'user' }` |
| `PATCH` | `/api/users/:id/active` | **admin** | `{ isActive: boolean }` |
| `PUT` | `/api/auth/settings` | user | `sessionTimeout` only, still |
| `PUT` | `/api/auth/profile` | user | gains `theme`; `language` no longer written from the UI |

Errors: `403 { error: 'Insufficient permissions' }` · `409 { error: '…last admin…' }` ·
`409 { error: '…current session…' }`.

---

## 6. Failure behaviour and edge cases

| Case | Required behaviour |
|---|---|
| Refresh row past `expiresAt` (idle timeout) | 401, client signs out cleanly via `SessionExpiredError` |
| Refresh row past `absoluteExpiresAt` | 401, same path — activity does not rescue it |
| `sessionTimeout` changed | Applies to the **next** issued token; the hint says so |
| Rows with `absoluteExpiresAt = null` (pre-existing) | Treated as uncapped, then stamped on first rotation. No mass logout on deploy |
| Two tabs refresh at once | Unchanged — Sprint 3's `refreshOnce()` coordinator already single-flights this |
| Revoke your own session by id | 409, and the UI has no control for it |
| Sign out everywhere | Still includes this device, still hard-reloads to `/login` |
| Admin demotes themselves, another admin exists | Allowed. Their next admin request 403s |
| Admin demotes/deactivates themselves, they are the last | 409, no write |
| Race: two admins demote each other concurrently | Guard counts inside the same transaction as the write |
| `PATCH /users/:id` where `:id` does not exist | 404, and the response says nothing about which ids do exist |
| Non-admin calls any `/api/users` route | 403 whether or not the target exists |
| Deactivated user with a live access token | Admin routes 403 immediately (D5); ordinary routes until token expiry (D6) |
| Invalid/unknown timezone string | Server's `resolveTimeZone` already falls back; the Select makes it unreachable from the UI |
| `theme` is `system` | Follows OS and reacts to changes live, without a reload |
| Notes calendar with a changed timezone | Recomputes on next fetch; no stale month cache |

---

## 7. Verification approach

Same as the last three sprints: no test runner exists in either workspace, so verification is
scripted HTTP against the running API plus in-browser checks, and each is recorded per feature in the
ledger.

- **Token `exp` is decoded and asserted**, not eyeballed. Criterion 1 is a number.
- **Idle expiry is proven by clock, not by assertion** — set a 5-minute timeout, backdate the refresh
  row, confirm the 401 and the redirect.
- **Role changes are proven against a route that genuinely refused a moment earlier**, per criterion
  11 — a 403 followed by a 200 with the same access token.
- **Last-admin guard is proven by trying it**, and by confirming nothing was written.

---

## 8. Known gaps carried in

- No automated tests, in either workspace. Fourth sprint running. `resolveTimeZone`, the last-admin
  guard and the sliding-window computation are all pure enough to cover the day a runner exists.
- `DELETE /api/logs/:id` deletes an arbitrary log row for any authenticated caller. In scope here
  (criterion 14) since it is the same gating pass.

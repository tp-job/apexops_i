# Progress — Sprint 5: settings that enforce, roles that mean something

Spec: [`build-spec.md`](build-spec.md) · Ledger: [`feature-list.json`](feature-list.json)

## 2026-08-04 — complete. 17/17 features verified, 62/62 API assertions, criteria 1–14 met.

The sprint goal was *"every control on the settings page changes something you can observe — and an
admin promoting or deactivating a user changes what that user can do on their very next request."*
Both halves hold, and both were proven against the running stack rather than reasoned about.

S1, S2 and half of S4 shipped early on 2026-07-31. This build is the rest.

**Built**

| Layer | Files |
| --- | --- |
| Schema | `RefreshToken.absoluteExpiresAt`, `User.theme`, `UserSettings.sessionTimeout` default 30 → 480 |
| Server | `lib/sessions.ts` (issuance, sliding window, absolute cap), `api/users.ts` + `schemas/user.schema.ts`, rewritten `middleware/auth.ts` `authorize()`, `api/auth.ts` refresh/sessions, `api/logs.ts` gating |
| Migration | `scripts/migrate-session-timeout.ts` (`npm run migrate:session-timeout`) |
| Client | `pages/AdminUsers.tsx`, `services/users.ts`, `hooks/useThemeControl.ts`, `utils/timezones.ts`, rewritten `ThemeContext`, Preferences + session-timeout on `pages/Settings.tsx` |

## Decisions worth keeping

- **`sessionTimeout` bounds the refresh token, not just the access token.** Signing the access token
  with it — the obvious reading of S-D2 — enforces *nothing observable*: since Sprint 3 the client
  refreshes on demand, so a 5-minute token and a 60-minute token feel identical. The setting would
  have stayed decorative with more machinery behind it. Making `RefreshToken.expiresAt` a sliding
  idle window is what turns the label into a promise the system keeps.
- **The default moved 30 → 480 *before* enforcement.** Every existing row held 30, and nobody chose
  it — it was a column default from a page that never shipped a control for it. Enforcing it as
  written would have landed a sprint about settings as *"the app started logging me out."*
- **`authorize()` reads the database, not the token.** The sprint plans have carried
  *token-invalidation-on-role-change* as the highest backlog risk for months, always priced as a
  `tokenVersion` column plus a check on every authenticated request. Sprint 6 found the project-role
  half was never real — `resolveMembership` reads per request, so demotion already landed on the next
  call. The same answer works for the global role: one primary-key lookup, only on gated routes, and
  no window in which a revoked admin is still an admin.
- **`sid` in the access token.** `GET /sessions` was deciding `current` from `req.body` on a **GET**,
  so it was always `false` — the badge never rendered and the per-row *Sign out* would revoke the
  session in use. That is the precise failure settings.md's risk table predicted, shipped and live.
  Sending the refresh token up to fix it would have put a bearer credential in a request the client
  can log; the row id costs nothing and gives the revoke route a reason to refuse.
- **`language` is cut, `theme` and `timezone` ship.** There is no i18n framework and no catalogue, so
  a language select is the exact lie S-D1 exists to prevent. Timezone was *already* enforced by the
  notes calendar but collected as free text, which is how an unparseable value silently falls back.
- **User administration is at `/admin/users`, not under `/settings`.** S-D4's rule is that
  `/settings` is about *you*. Who may sign in to the instance is not.

## Verification

**62 API assertions, 0 failures.** Notably:

```
CRITERION 11  same token, 403 -> 200 after promotion       PASS
CRITERION 11  demotion lands on the next request            PASS
CRITERION 12  deactivation deletes sessions; refresh 401s   PASS
CRITERION 13  last admin: demote 409, deactivate 409,
              and neither wrote anything                    PASS
```

**Criterion 8 was proven the hard way.** localStorage cleared, OS preferring dark, account holding
`light` → the page loaded light. The theme genuinely follows the account rather than the browser.

**Criterion 9 likewise.** One note pinned to `2026-08-10T02:00Z` files under **day 10** in
`Asia/Bangkok` and **day 9** in `Pacific/Honolulu`, and returns to 10 when the zone is restored.

**Criterion 1 from the control itself**: picking *15 minutes* moved the next issued token from
28800s to 900s, read off the decoded token.

**Criterion 14 at all three layers**: as `dev.user` the nav entry is absent, `/admin/users` renders a
refusal, and `GET /api/users` answers 403.

`tsc --noEmit` clean on the server, `npm run build` green on the client, no console errors.

## Found while building, fixed on the ledger

**F017 — two logins in the same second returned a 500.** The refresh JWT's payload was `{id, email}`
plus `iat`/`exp` at one-second resolution, so two logins by one account inside the same second
produced a byte-identical token and violated the unique index on `RefreshToken.token`. **This
predates the sprint** — it was true of the previous implementation too. It surfaced because the
harness opens two sessions back to back. Fixed with a random `jti`, which also stops the credential
being a pure function of (user, second). Filed as a ledger feature rather than fixed quietly.

Two smaller ones, both caught by verification rather than review:

- `middleware/validate.ts`'s `validateQuery` cannot work under Express 5 — it assigns to `req.query`,
  which is getter-only. Two other routers had already worked around it inline without anyone removing
  the middleware; `api/users.ts` now follows the same convention. **The dead middleware is still
  there and will bite the next caller.**
- `services/users.ts` initially passed a pre-stringified body without `json: true`, so no
  `Content-Type` was set, `express.json()` skipped it, and the route saw `req.body` undefined — a 400
  that reads like a validation bug and is actually a missing header.

## Known gaps

1. **No automated tests.** Fourth sprint running. `resolveSessionTimeoutMinutes`, the last-admin
   guard and `timezoneOptions` are pure and are the first things worth covering.
2. **Deactivation is not instant on ordinary routes.** Admin-gated routes refuse immediately (D5) and
   the target's refresh tokens are deleted (D6), so their session cannot outlive the current access
   token — which is now at most their timeout rather than a fixed hour. Making it truly instant means
   a user lookup on *every* authenticated request, which was not worth it at this scale. Named, not
   hidden.
3. **Expired `refresh_tokens` rows are never pruned.** They are filtered out of the session list, so
   nothing is visibly wrong, but the table grows without bound. Now more noticeable, since a sliding
   window retires rows far faster than the old flat 7 days. `prune-events.ts` is the model for the
   job that should exist.
4. **`validateQuery` is still exported and still broken** under Express 5 (see above). Removing it
   touches nothing that works today, but it is a trap rather than a bug, so it is named here instead
   of being swept into this sprint's diff.
5. **The theme flashes on a cold load for an account whose stored theme differs from this browser's
   last one.** localStorage paints first, the profile arrives a moment later. Correct in the end and
   invisible on a warm load; a server-rendered shell is the only real fix and this app has none.

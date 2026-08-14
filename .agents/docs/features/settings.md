# Settings — function settings + account settings (G0 scope proposal)

> ## Status: **SHIPPED.** S1/S2/S4a on 2026-07-31, S3/S4b/S5 on 2026-08-04.
>
> S-D1…S-D5 were locked as written and every one of them survived contact. Build record:
> [`build-spec.md`](../archive/sprint-5-settings-roles-build-spec.md), [`progress.md`](../archive/sprint-5-settings-roles-progress.md),
> [`feature-list.json`](../archive/sprint-5-settings-roles-feature-list.json) — 17/17 features, 62/62 API assertions.
>
> **Three amendments made during the build**, each because implementing revealed something this
> document could not have known:
>
> 1. **S-D2 was not sufficient as written.** "Sign the access token with `sessionTimeout` as
>    `expiresIn`" enforces nothing a user can observe — the client silently re-issues an expired
>    token, so every timeout value feels the same. The refresh token's expiry became a sliding idle
>    window as well. See D1 in the build spec.
> 2. **The old default had to be migrated before enforcement.** Every row held 30 minutes by column
>    default, chosen by nobody. Enforcing it as written would have landed this sprint as *"the app
>    started logging me out."* Untouched rows moved to 480 first.
> 3. **S-D5's token-invalidation worry needed no token machinery.** `authorize()` resolves the role
>    from the database per request, the same shape Sprint 6 used for project roles.
>
> The risk table at the bottom of this file is now a scorecard: every row was either prevented or
> found live and fixed. The one that had already gone wrong is **"revoking the current session"** —
> it shipped broken on 2026-07-31 and was caught while scoping this build.

> Original status: **proposed 2026-07-27**, awaiting decision lock on S-D1…S-D5.
> Owner: product + full-stack. Supersedes the "Account Settings tabs, 2d" line item that earlier
> sprint plans carried: that estimate assumed the toggles were real. They are not — see below.
>
> **Scheduling correction, 2026-07-28.** This spec previously claimed "the sprint *after* the
> current one." It no longer holds. Workspaces G1–G2 shipped 2026-07-27 and **G3–G5 are Sprint 2**;
> Sprint 3 is real-time + the API layer, and Sprint 4 is source maps — a named objective feature,
> where this is a screen for 11 switches that currently do nothing.
> **Settings is now Sprint 5** ([`sprint-plan.md`](../planning/sprint-plan.md)), and S-D1…S-D5 must
> be locked before it starts.

## The load-bearing finding

**The account-settings backend already exists in full. Every toggle it exposes is decorative.**

| Endpoint | State |
|---|---|
| `GET /api/auth/profile` (returns user + settings) | complete |
| `PUT /api/auth/profile` (12 profile fields) | complete |
| `PUT /api/auth/settings` (11 toggles) | complete |
| `PUT /api/auth/password` (current + new, validated) | complete |
| **The page** | **missing** |

So, like the SDK, this is a wire-up. The problem is *what* it would wire up.

`UserSettings` has 11 boolean/int columns. Grepped across `app/server/src` and `app/client/src`,
**not one of them is read by anything outside the endpoint that writes it.** The only other
occurrences are TypeScript interface declarations (`types/auth.ts`, `types/accountSettings.ts`) and
`utils/mockData.ts`. They are written to Postgres and never consulted again.

| Column | What the UI would promise | What actually happens |
|---|---|---|
| `emailNotifications` | "Email me" | **The project has no email transport at all** — no nodemailer, sendgrid, resend, or SMTP config anywhere |
| `pushNotifications` | "Push me" | no push infrastructure |
| `bugAlerts`, `weeklyReports`, `teamUpdates` | alert routing | nothing sends them |
| `twoFactorAuth` | "Two-factor authentication" | no TOTP, no enrolment, no second factor at login |
| `sessionTimeout` (30) | "Sign me out after 30 min" | never read; JWT expiry is a server constant |
| `loginAlerts` | "Tell me about new sign-ins" | needs the email transport that doesn't exist |
| `profileVisibility`, `activityStatus`, `dataCollection` | privacy posture | no consumer |

### Why this matters more than a normal "not wired up yet"

A settings page is a set of **promises about system behaviour**. A toggle that persists and changes
nothing is not an unfinished feature, it is a false statement — and the user has no way to detect it.
Two of these are worse than cosmetic:

- **`twoFactorAuth`** tells someone their account has a second factor when it does not. That is a
  security claim, and someone may reasonably choose a weaker password because of it.
- **`dataCollection`** is a privacy control. Shipping it non-functional is the kind of thing that is
  a compliance problem in some jurisdictions, not just a bug.

The 2d Sprint 5 estimate is achievable *only* by shipping all eleven as decoration. That is the
version of this feature I would refuse to ship.

## Decisions to lock

### S-D1 — A toggle ships only if it is enforced. Everything else is cut from the UI.

Not disabled-with-a-tooltip, not "coming soon" — **absent**. A settings page whose switches are
mostly greyed out reads as abandoned software, and it still occupies the reviewer's attention on
every future pass.

Three buckets:

| Ship & enforce (v1) | Cut until the feature exists | Cut permanently |
|---|---|---|
| password change | `emailNotifications`, `pushNotifications` | — |
| active session list + revoke | `bugAlerts`, `weeklyReports`, `teamUpdates` | — |
| `sessionTimeout` (made real) | `twoFactorAuth` | — |
| theme, language, timezone | `loginAlerts` | — |
| profile fields | `profileVisibility`, `activityStatus`, `dataCollection` | — |

**Keep the database columns.** Nothing reads them, so they are inert, and dropping them is a
migration that buys nothing. Instead remove them from `updateSettingsSchema` and from the
`GET /profile` response, so nothing can write them until the feature that consumes them lands.
That is the cheap, reversible half of the change.

### S-D2 — `sessionTimeout` becomes real by shortening the access token, not by a client timer

A client-side idle timer that clears localStorage is theatre: the token stays valid, so anyone
holding it still has access for its full life. The honest implementation is to sign the access token
with the user's `sessionTimeout` as its `expiresIn`, and let the existing refresh flow extend it
while the user is active.

**Recommendation: ship it this way, and bound the range** (5–480 min). It reuses the refresh-token
machinery that already exists, and it makes the setting mean exactly what it says.

### S-D3 — "Active sessions" is genuinely available today; it is the one security feature that lands cheap

Every login already writes a `RefreshToken` row (`auth.ts:76`, `auth.ts:110`). That table *is* the
session list. Listing it and offering "sign out everywhere" is a real, enforceable security control —
and unlike 2FA it needs no new infrastructure.

Add `createdAt`-adjacent context (user agent, IP) to `RefreshToken` at the same time. A session list
that says "session #4" is not usable; one that says "Chrome on Windows, 2 hours ago" is.

### S-D4 — Function settings live in two places, split by *what they are about*, not by convenience

There are now two settings surfaces, and the boundary must be stated before either is built or they
will drift into duplicating each other:

- **`/settings` (account)** — things about **you**: profile, password, sessions, theme, language,
  timezone. Follows you across every workspace.
- **`/p/:slug/settings` (project)** — things about **this workspace**: ingest key, capture levels,
  origin allowlist, retention, members. Already scoped in G4 of the workspaces sprint.

Rule for anything ambiguous later: *if changing it on a second workspace should produce a different
answer, it is a project setting.* Notification preferences, when they become real, are **per-project**
by that test — "alert me about this project" is the useful control, "alert me about everything" is not.

### S-D5 — Admin/role management is blocked on something the sprint plans keep skipping

Earlier sprint plans made "an admin can promote a user, and that user's access actually changes" a
sprint goal, and correctly flagged **token-invalidation-on-role-change** as the single highest risk
in the plan: role is signed into the JWT, so without invalidation a demotion silently does not take
effect for up to an hour while the UI reports success. That risk is still live and is carried
forward in [`sprint-plan.md`](../planning/sprint-plan.md)'s Sprint 5+ backlog.

But there is a prior problem. **`authorize()` has exactly one caller in the entire codebase** —
`DELETE /api/logs` ([`api/logs.ts:141`](../../../app/server/src/api/logs.ts)), added by the
workspaces G2 security work on 2026-07-27. *(Corrected 2026-07-28: this section previously said
"called nowhere," which was true when written and stopped being true the same day.)*

No *user-facing* endpoint is role-gated. So promoting a user to admin currently grants nothing
beyond the ability to bulk-delete logs, and demoting them removes nothing else. **Token
invalidation protects a boundary that has barely been drawn** — the roles have to mean something
before making them revoke promptly is worth a day.

**Recommendation: gate the endpoints first, in the same gate as the role UI.** The minimum set:

- `DELETE /api/logs` — still an ungated `deleteMany({})` (`logs.ts:125`) reachable by any
  authenticated user. This is already scheduled to be closed in the workspaces sprint's G2; if G2
  slips, it moves here and does not slip again.
- `GET /api/users`, `PATCH /api/users/:id/role`, `PATCH /api/users/:id/active`.

Otherwise the sprint goal is demonstrably false on the day it ships.

## Screens

### `/settings` — account

Three tabs. Tabs, not one long page: profile and security have different save semantics (profile is
a form with a Save button; a session revoke is immediate and irreversible) and mixing them under one
Save is how someone revokes a session by accident.

| Tab | Contents |
|---|---|
| **Profile** | avatar, first/last name, email, phone, company, position, location, bio. Save button, dirty-state guard on navigate-away. |
| **Security** | change password (current + new + confirm, live strength meter matching `passwordSchema`); active sessions list with per-row **Revoke** and a **Sign out everywhere** action; session timeout select (5/15/30/60/240/480 min). |
| **Preferences** | theme (light/dark/system — the Topbar toggle already exists, this persists it), language, timezone. Each applies immediately, no Save button. |

### Copy and states that decide whether this feels trustworthy

1. **Email change** — must not silently succeed. `PUT /profile` currently updates `email` directly
   after a uniqueness check, which means the account's identity changes with no verification, and
   `emailVerified` is left stale. Either verify the new address or, for v1, **make email read-only in
   the UI** and say why. Recommend read-only: verification needs the email transport that doesn't exist.
2. **Password changed** — offer "sign out other sessions" in the success state. This is the moment
   someone changes a password *because* they think it is compromised.
3. **Current session** — must be labelled in the session list and must not be revocable by the
   per-row control, or the first thing anyone does is sign themselves out and file a bug.
4. **Sole admin** — the last-admin guard has to exist before the role UI, not after.

Design system: Luxe, Invoices as the template ([[apexops-design-system-v2]]); the session list is a
`DataTable` consumer.

## Sprint schedule

Two-week sprint, 10 working days, planned to **7.5d**. Runs *after* the workspaces sprint closes.

| # | Gate | Est | Priority |
|---|---|---|---|
| S1 | `/settings` shell + tabs + **Profile** tab (form-kit payoff; email read-only) | 1.5d | P0 |
| S2 | **Security tab**: change password, `RefreshToken` gains user-agent/IP, session list + revoke + sign-out-everywhere | 2.0d | P0 |
| S3 | `sessionTimeout` made real (signed into token expiry, bounded 5–480) + **Preferences tab** (theme/language/timezone actually applied) | 1.5d | P0 |
| S4 | **Honest cleanup**: drop the 8 unenforced toggles from `updateSettingsSchema`, the `/profile` response, and the client types | 0.5d | P0 |
| S5 | Endpoint role-gating (`authorize()` actually used) + `GET /api/users` + role/active PATCH + **token invalidation on role change** + last-admin guard | 2.0d | P0 |
| — | **Total** | **7.5d** | |

**Sprint goal:** *every switch on the settings page changes something you can observe — and an admin
promoting a user grants access that was genuinely denied a moment earlier.*

**Demo script:** set session timeout to 5 min → confirm the issued token's `exp` moves → sign in on a
second browser → see two sessions with real device labels → revoke the other one → confirm it is
signed out → change password → "sign out everywhere" → promote `dev.user` to admin → confirm a
previously-403 admin endpoint now answers, and that demoting them takes effect on the next request,
not in an hour.

### Deferred, named so they don't leak in

2FA/TOTP enrolment · email transport and every notification toggle that depends on it · push
notifications · per-project notification routing (S-D4 says this is where they belong when they land)
· email-change verification flow · avatar upload (needs the same storage decision that deferred
ticket attachments) · account deletion/export.

## Risks / pre-mortem

| Risk | Impact | Outcome |
|---|---|---|
| ~~The 8 dead toggles ship anyway~~ | — | ✅ **Prevented.** All ten are absent from the UI, from `updateSettingsSchema` and from the `GET /profile` response. `PUT /settings {twoFactorAuth:true}` answers 400 and writes nothing. Columns kept, inert. |
| ~~`sessionTimeout` implemented as a client timer~~ | — | ✅ **Prevented, and the honest version went further than S-D2.** It sizes the access token *and* the refresh token's sliding idle window. Asserted on the decoded `exp`: 15 minutes → 900s. |
| ~~Role UI ships before endpoints are gated~~ | — | ✅ **Prevented.** `api/users.ts` gates the whole router before `/admin/users` existed. The same access token: 403 → 200 after promotion → 403 after demotion. |
| ~~Last-admin guard forgotten~~ | — | ✅ **Prevented.** Demote *and* deactivate both answer 409 for the last active admin, checked inside the write's transaction so two concurrent demotions cannot both win. |
| **Revoking the current session** | Every user signs themselves out on first visit | ⚠️ **This one actually happened.** It shipped on 2026-07-31 with `current` computed from `req.body` on a **GET** — always `false`. Found while scoping this build, before anyone hit it. Fixed via a `sid` claim; the server now answers 409 and the UI shows no control. |
| ~~Email change with no verification~~ | — | ✅ **Prevented.** Email is read-only in the UI and says why. |
| ~~Two settings surfaces drift into duplicates~~ | — | ✅ **Held.** Alert preferences stayed per-project; `/settings` links to them rather than duplicating them. Instance administration went to `/admin/users`, not into `/settings`, by the same rule. |

**One risk this table did not have**, found by verification rather than review: two logins in the
same second produced a byte-identical refresh JWT and violated the unique index — a 500 on the second
login, true of the implementation this spec was written against. Fixed with a random `jti`.

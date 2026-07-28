# Settings — function settings + account settings (G0 scope proposal)

> Status: **proposed 2026-07-27**, awaiting decision lock on S-D1…S-D5.
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

| Risk | Impact | Mitigation |
|---|---|---|
| **The 8 dead toggles ship anyway because they're already in the API** | The page lies to users about 2FA and privacy; nobody trusts any setting afterwards | S-D1 + S4 are P0 and the removal is a *deliverable*, not a cleanup task. The demo script asserts every visible switch is observable. |
| `sessionTimeout` implemented as a client timer | Looks done, enforces nothing, and is the kind of bug that is only found during an incident | S-D2 fixes it at token-issue time; demo asserts on the token's `exp`. |
| Role UI ships before endpoints are gated | Sprint goal is false on delivery day — promotion grants nothing | S5 bundles gating and UI in one gate; they cannot ship apart. |
| Last-admin guard forgotten | An instance with zero admins and no recovery path | Explicit S5 acceptance criterion, tested by trying to demote the only admin. |
| Revoking the current session | Every user signs themselves out on first visit | Current session labelled and excluded from per-row revoke. |
| Email change with no verification | Account identity changes silently; `emailVerified` goes stale | v1 makes email read-only and says why. |
| Two settings surfaces drift into duplicates | Users can't predict where anything lives | S-D4's boundary rule is written down before either is built. |

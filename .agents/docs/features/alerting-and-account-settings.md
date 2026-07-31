# Alerting on regressions + account settings — feature spec

> Status: **shipped 2026-07-31**. Owner: product + full-stack.
> Follows [`overview-and-regressions.md`](overview-and-regressions.md), which made regressions
> *detectable*. This makes them *tell you*, and closes out the account-settings half of
> [`settings.md`](settings.md)'s S-D1/S-D3/S-D4.

## The load-bearing finding

**There is no mail infrastructure — none.** No nodemailer, SMTP, SendGrid or Resend anywhere in
`app/server`. Email alerting is not a feature you add in an afternoon; it is a dependency, a sending
domain, SPF/DKIM, and a deliverability problem that only shows up in production.

**And the two asks turned out to be one decision.** `settings.md` had already ruled (S-D4) that
notification preferences are **per-project**, and (S-D1) that a toggle ships only if it is enforced.
So alerting determined whether the account settings screen was allowed to show notification toggles
at all — build settings first and you get more decorative switches; build alerting first and the
preference has somewhere honest to live.

## Locked decisions

### A-D1 — The in-app feed is the system of record; the webhook is a copy

Notification rows are written **first and unconditionally**, then the webhook is attempted.

A fire-and-forget webhook that silently stops delivering is indistinguishable from "no regressions
happened" — the same ambiguity as the silent-24h state, and the worst failure mode a monitoring tool
has. With a durable row there is always a record of what we *tried* to tell you, whatever the
outbound channel did.

Consequence: alerting works with zero external infrastructure, and is verifiable end to end.

### A-D2 — Alert config is per-project (`Project.alertOnRegression`, `Project.webhookUrl`)

Straight from S-D4's test: *if changing it on a second workspace should produce a different answer,
it is a project setting.* "Alert me about this project" is useful; "alert me about everything" is
not. On by default — a bug you already fixed coming back is the one event worth interrupting
someone for.

### A-D3 — The webhook URL is an SSRF surface and is treated as one

The URL is **user-supplied and the server is what fetches it**. Without checks, a project owner could
point it at `http://169.254.169.254/…` and use the server as a proxy to read cloud instance metadata,
or sweep internal services unreachable from outside.

Two layers, because either alone is bypassable:

1. **Shape** — https only, no credentials in the URL.
2. **Resolved address** — the hostname is resolved and *every* returned IP checked against
   loopback / private / link-local / IPv4-mapped ranges. Checking the hostname string alone is
   defeated by a DNS name pointing at `127.0.0.1`.

Also: `redirect: 'error'` (a redirect could land somewhere the DNS check never saw), a 5s timeout,
and validation at **save time** as well as send time so a bad URL is rejected with a message rather
than failing silently forever.

**Residual risk, named rather than hidden:** this is resolve-then-fetch, so DNS rebinding is not
fully closed. Closing it needs an agent that pins the validated IP. Acceptable while the attacker
must already be a project owner — *do not* treat it as airtight if webhooks ever become settable by
lower-privileged roles.

### A-D4 — Alerting never breaks ingest

`dispatchRegressionAlert` cannot throw, and it is dispatched **after** the 202 is sent. The reporting
client is a third-party page waiting on our response; it must not also wait on our outbound call to
someone's Slack. A failed webhook is a logged failure, not a 500 on someone else's error report.

### A-D5 — Account settings ships only enforced controls (S-D1, honoured literally)

`/settings` contains profile, password, and active sessions. It does **not** contain the ten inert
`user_settings` columns, and they were removed from `updateSettingsSchema` so nothing can write them
until the feature that reads them lands. The columns stay — dropping them is a migration that buys
nothing.

`sessionTimeout` is deliberately **not** surfaced. Making it real means signing the access token with
it as `expiresIn` (S-D2), which is blocked on the 401-refresh-and-retry path existing: shortening
tokens from 1h to the 30m default without it would just log people out mid-task. It is bounded
(5–480) in the schema so the stored value is never out of range when enforcement lands.

## What shipped

| Layer | Files |
|---|---|
| Schema | `Notification`, `NotificationKind`, `Project.alertOnRegression`, `Project.webhookUrl`, `RefreshToken.userAgent`/`ipAddress` |
| Alerting | [`lib/alerts.ts`](../../../app/server/src/lib/alerts.ts), [`lib/webhook.ts`](../../../app/server/src/lib/webhook.ts), regression hook in `api/ingest.ts` |
| API | [`api/notifications.ts`](../../../app/server/src/api/notifications.ts); `GET/DELETE /api/auth/sessions*`; alert fields on `PATCH /api/projects/:slug` |
| Client | `NotificationBell`, `useNotifications`, `services/notifications.ts`, `services/sessions.ts`, `pages/Settings.tsx`, Alerts panel in `ProjectSettings` |
| Harness | [`public/sdk/test.html`](../../../app/server/public/sdk/test.html), served at `/sdk/test` |

## Verification (2026-07-31, against the real database)

The harness at **`/sdk/test`** drives and *asserts* the whole loop. Recorded run:

```
✅ Ingested first occurrence — {"accepted":1,"issues":1,"dropped":0,"regressions":0}
✅ Issue #304 — count 1, status unresolved
✅ Status is now "resolved"
✅ Ingest reported regressions: 1
✅ Alert fired — unread 1 → 2 · "Regression in Sprint2 Demo"
✅ status=unresolved, reopenCount=1
✅ PASS — regression detected and alert delivered.
```

SSRF guard, exercised against the live endpoint:

| Target | Result |
|---|---|
| `http://localhost:3000/hook` | blocked (not https) |
| `https://127.0.0.1/hook` | blocked (loopback) |
| `https://169.254.169.254/latest/meta-data` | **blocked (cloud metadata)** |
| `https://192.168.1.10/hook` | blocked (private) |
| `https://user:pass@example.com/hook` | blocked (credentials) |
| `https://hooks.slack.com/services/…` | accepted |

Bell renders "Notifications, 2 unread" with both real regressions. `/settings` shows sessions with
real device strings ("Chrome on Windows", "Script") — rows predating the column show
"Unknown device", which is why those fields are nullable. Clean lint + build on both workspaces,
console clean.

## Not built

- **Email.** Needs the infrastructure named at the top. The `Notification` table is the right seam
  to hang it off when it exists.
- **Realtime notifications.** The bell polls once a minute and pauses while the tab is hidden.
  When the Sprint 3 issue stream lands, this should switch to it and the interval should go.
- **`sessionTimeout` enforcement** — blocked on 401-refresh (S-D2).
- **Alert kinds beyond regressions.** `NotificationKind` is an enum precisely so adding one later is
  not a migration on a table with rows.

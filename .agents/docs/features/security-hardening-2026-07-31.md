# Security hardening + refactor — 2026-07-31

> Status: **shipped 2026-07-31**. Owner: full-stack.
> An audit pass, not a feature. Two findings were live vulnerabilities; two were
> duplication that had already started to drift.

## S1 — JWT secret fell back to a value committed in this repository

**Severity: critical.** The signing secret was derived in three places, with three
different fallbacks:

```
api/auth.ts:32        JWT_SECRET || (isProduction ? 'REPLACE_IN_PRODUCTION' : 'mySecretKey')
middleware/auth.ts:4  JWT_SECRET || 'mySecretKey'     ← no production guard
server.ts:101         JWT_SECRET || 'mySecretKey'     ← no production guard
```

Two distinct failures fell out of that:

1. **A production deploy missing `JWT_SECRET` did not fail.** It signed tokens with a
   string that is in this repo's history, so anyone reading the source could forge a
   token for any user, including an admin.
2. **The fallbacks disagreed**, so signer and verifier would have used *different*
   secrets. The symptom would have been "nobody can log in" — which points nowhere near
   the actual cause, and invites someone to "fix" it by hardcoding the secret.

`api/auth.ts` did carry a `console.warn` for short secrets in production. A warning in a
log nobody reads is not a control.

**Fix.** [`lib/jwtSecrets.ts`](../../../app/server/src/lib/jwtSecrets.ts) is now the only
place the secrets are derived, and it **throws at import time** in production when they
are missing or under 32 characters. A server that will not boot is strictly better than
one that boots forgeable: the first fails at deploy time while someone is watching, the
second fails silently in production.

Also pinned `algorithms: ['HS256']` on **every** `jwt.verify` call. Without it a forged
token declaring `alg: none` can be accepted by a permissive verifier.

Verified: with `NODE_ENV=production` and no `JWT_SECRET`, importing the module throws
`[startup] JWT_SECRET is not set. Refusing to start in production…`.

## S2 — The socket `monitors` room was an unauthenticated broadcast

**Severity: high.** This is the same defect that got the `:8082` native relay deleted
(spec D6) — it simply survived in socket.io form, because the handshake auth is
deliberately *optional* so the SDK's `target-app` clients can connect.

```
socket.on('register') → clientType 'monitor' → socket.join('monitors')   // no auth check
socket.on('console-logs') → io.to('monitors').emit(...)                  // any socket
                          → prisma.log.create(...)                       // unauthenticated DB write
```

So any anonymous socket could join `monitors` and receive **every** target app's console
output — a cross-project leak in the feature whose entire purpose is per-project
isolation. And `console-logs` accepted writes from any socket at all, unbounded: the same
hole G2 closed on the HTTP side by 410-ing `POST /api/console-logs/realtime`.

**Fix.**

- `monitors` now requires an authenticated socket; unauthenticated `register` gets a
  `monitor-error` reply rather than silent membership.
- `console-logs` only relays from a socket that actually registered as a target-app, and
  is capped at `MAX_RELAYED_LOGS` per emit so one socket cannot flood every monitor.
- **The `prisma.log.create` fan-out is deleted.** Persistence has exactly one supported
  path now — `POST /api/ingest`, which is keyed, rate limited, size capped and project
  scoped. The socket channel is live-view only.
- Client side, `useBugTrackerSocket` now sends the token in the handshake and listens for
  `monitor-error`. **This mattered:** without it, registration would be refused and live
  updates would stop *silently*, which looks exactly like "nothing is happening" — the
  worst failure mode a monitoring view can have.

Verified against the running server:

| Socket | Result |
|---|---|
| anonymous | `REFUSED — Authentication required to monitor` |
| authenticated | `JOINED the monitors room` |

## C1 — Three copies of the same fetch helper

`services/projects.ts`, `services/notifications.ts` and `services/sessions.ts` each carried
a near-identical `request<T>`. The duplication was not the cost — **the drift was**: only
one of the three threw a typed `ApiError` carrying the status, so callers had no
consistent way to tell a 409 from a 500, and a fix in one never reached the others.

Extracted to [`api/request.ts`](../../../app/client/src/api/request.ts): one `apiRequest`,
one `ApiError`, plus `apiPost` and `buildQuery` for the shapes that were being
hand-rolled at every call site. `ApiError` is re-exported from `services/projects.ts` so
existing importers keep working.

## C2 — Three hand-rolled click-outside/Escape effects

`NotificationBell`, `ProjectSwitcher` and `ContextMenu` each implemented dismissal
separately, and had already diverged — only `ContextMenu` dismissed on scroll and
right-click-outside. Inconsistent dismissal is felt as jank without users being able to
name it.

Extracted to [`useDismissable`](../../../app/client/src/hooks/useDismissable.ts), with the
extra behaviours as options rather than forced on everyone. Uses `mousedown` rather than
`click`, matching native menus — a `click` listener fires after the press has already
landed on whatever was underneath.

Verified in-browser after the refactor: bell closes on Escape and outside click; context
menu opens with focus inside, closes on Escape and on scroll; console clean.

## Not done — named so it is not mistaken for done

- **`authorize()` still gates exactly one endpoint** (`DELETE /api/logs`). Roles remain
  close to meaningless, and token-invalidation-on-role-change is still unbuilt. See
  `settings.md` S-D5.
- **No 401-refresh-and-retry.** `AuthContext.refreshToken()` still has no caller, so a
  token expiring mid-session breaks the tab. This also blocks enforcing `sessionTimeout`.
- **DNS rebinding on webhooks** is still open (resolve-then-fetch) — documented in
  `alerting-and-account-settings.md` A-D3.
- **Rate limiting** exists on auth routes and ingest, but not on the general API surface.

# Build spec — Sprint 3 P0: 401 refresh-and-retry

> Fixes the carried-forward defect named in
> [`planning/sprint-plan.md`](.agents/docs/planning/sprint-plan.md) §"One correction to the Sprint 1
> record": Sprint 1 claimed *"wait past token expiry → still works."* It does not.

## Problem statement

The access token expires after **1 hour** (`JWT_EXPIRY`, `api/auth.ts:35`). Nothing in the client
ever refreshes it. `authApi.refreshToken()` exists and `AuthContext` wraps it, but **nothing calls
either** — no interval, no interceptor, and `fetchWithAuth` returns a 401 to its caller unchanged.

The failure mode is worse than being logged out. At the one-hour mark every request starts returning
401, and the app keeps rendering a signed-in shell: the nav rail, the project switcher and the user
menu are all still there, driven by a `user` object cached in `localStorage`. The user sees a
workspace where every panel has quietly become an error. Nothing tells them to sign in again, and a
reload is the only recovery — which they have no reason to try.

## Acceptance criteria

1. A request that receives **401 because the access token expired** is retried exactly once, with a
   freshly minted access token, and its caller receives the successful response — not the 401.
2. The retry happens on **every HTTP surface in the client**, not just `fetchWithAuth`. Today there
   are four: `fetchWithAuth`, the axios instance in `services/api.ts`, six modules calling `fetch`
   directly with `getAuthHeaders()`, and `services/auth.ts` itself.
3. **N concurrent 401s produce exactly one `POST /api/auth/refresh`.** Refresh tokens are single-use
   and rotate server-side (`api/auth.ts:164` deletes the presented token), so a second parallel
   refresh presents a row that no longer exists, gets a 401, and ends a session that was healthy.
4. **Two tabs racing do not log anybody out.** If a refresh fails but the stored access token changed
   while it was in flight, another tab won the race — adopt its token and continue.
5. A refresh that fails **because the session is genuinely over** (401 from `/refresh`, or no refresh
   token stored) clears the session *and tells React*, so the shell stops rendering as signed-in and
   `ProtectedRoute` bounces to `/login` with `state.from` intact.
6. A refresh that fails **because the network is unreachable** does **not** end the session. A wifi
   blip is not proof the session is invalid — this matches the rule `AuthContext`'s hydrate path
   already follows.
7. The retry never loops: one retry per request, and a 401 on the retry is terminal.
8. A 401 from `/api/auth/login` (wrong password) or from `/api/auth/refresh` itself never triggers a
   refresh attempt.

## Out of scope — deliberately

- **`useResource`** and the wider `apiFetch` refactor from the same sprint-plan row. This build is the
  401 half of that row; the hook half has no consumer until the issue stream lands.
- **Proactive background refresh on a timer.** Reactive refresh plus the pre-flight expiry check
  below covers every request the user's own actions generate, and a timer is a second mechanism that
  can disagree with the first.
- **Socket.io handshakes** (`useBugTrackerSocket`, `useChat`). The token is read once at connect time
  and the server verifies it once; an established connection survives expiry, but a *reconnect* after
  expiry fails. That belongs to Sprint 3's real-time-stream item, which owns the reconnect path. It
  is recorded here as a known gap, not silently left.
- Any server change. The `/refresh` route already rotates correctly.

## Edge cases the design must answer

| Case | Required behaviour |
| --- | --- |
| Token already expired before the request is sent | Refresh **first**, skip the guaranteed 401 round trip |
| Malformed token that cannot be decoded | Treat as not-expired; let the server decide. Never log out on a parse bug |
| No refresh token in storage | Do not attempt a refresh; the 401 is terminal |
| Refresh returns 401 | Terminal — clear session, notify React |
| Refresh fails on a network error | Keep the session; surface the original error |
| Two tabs both hit 401 in the same second | At most one spurious refresh; **no logout** (criterion 4) |
| Another tab signs out | This tab notices via `storage` and stops rendering signed-in |
| Retried request has a body | Body must survive the retry — JSON strings and `FormData` do; a consumed stream would not. No caller uses a stream |
| 401 on a request fired during app hydration | Same path; hydration is just another caller |

## Verification

The sprint's own exit line: **leave a tab open past token expiry — it keeps working.** Reproduced
here without waiting an hour by signing tokens with a short `JWT_EXPIRY` and by corrupting the stored
access token to force a 401 on demand.

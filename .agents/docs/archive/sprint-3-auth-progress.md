# Progress — Sprint 3 P0: 401 refresh-and-retry

Spec: [`build-spec.md`](build-spec.md) · Ledger: [`feature-list.json`](feature-list.json)

## 2026-08-03 — shipped. 9/9 features verified.

Closes the defect the sprint plan carried from Sprint 1: *"wait past token expiry → still works"* was
never true. `authApi.refreshToken()` existed and had no caller.

**Built** — client only. No server change; `/api/auth/refresh` already rotates correctly.

| File | Change |
| --- | --- |
| `lib/authSession.ts` | **new** — token storage, `exp` decoding, `refreshOnce()` with one in-flight promise, `SessionExpiredError`, `onSessionExpired()` |
| `api/client.ts` | `fetchWithAuth` gains a pre-flight refresh and a single 401 retry, with a path-based skip list |
| `services/api.ts` | axios request interceptor made async (pre-flight) + a new response interceptor with the same policy |
| `services/auth.ts` | profile / password / settings moved onto `fetchWithAuth`; `refreshToken()` deleted — `authSession` owns it now |
| `context/AuthContext.tsx` | subscribes to `onSessionExpired`, listens to `storage`, delegates its `refreshToken()` to `refreshOnce()` |
| 6 modules, 11 call sites | `noteApi`, `noteAi`, `calendarApi`, `chatApi`, `useDashboardStats`, `useNoteStatsOverview` migrated off raw `fetch` |

**Decisions worth keeping**

- **The refresh lives in a plain module, not in `AuthContext`.** That is *why* the existing
  `refreshToken()` never got a caller: the code that hits 401s is `services/*` and an axios instance,
  none of which can call a hook. The dependency now points the other way — `AuthContext` subscribes.
- **Scope went past `fetchWithAuth`.** Fixing only that surface would have left Bug Tracker, Notes,
  Calendar, Chat and the Dashboard still breaking at the one-hour mark, while the sprint's exit line
  read as satisfied. Four transports existed; all four are covered.
- **Network failure is survivable, 401 is terminal.** A wifi blip must not end a session — same rule
  `AuthContext`'s hydrate path already followed. A 5xx from `/refresh` is survivable too: the server
  being broken is not the user's session being over.
- **The cross-tab race is resolved by adopting the winner's token.** Refresh tokens are single-use, so
  the losing tab holds a 401 for a session that is actually healthy. Re-reading storage before
  treating that 401 as terminal is what stops the "random logouts" bug the plan priced this at 2d for.

**Verified in-browser against the running API**, with `JWT_EXPIRY` temporarily set to 20s and 45s and
**restored to 1h afterwards**: 6 concurrent requests past expiry → exactly one refresh, six 200s;
the reactive path isolated with a forged far-future-`exp` token → one 401, one refresh, 200 on retry;
axios recovered; five app surfaces walked past expiry → one refresh, zero failed requests; a terminal
failure redirected to `/login` with `state.from` intact, no reload; sign-out in a second tab logged
the first out; and with the API stopped the user was **not** logged out. `tsc -b` + `vite build` green,
no console errors.

## Known gaps (named, not hidden)

1. **Socket.io handshakes are not covered.** `useBugTrackerSocket` and `useChat` read the token once at
   connect time. An established connection survives expiry because the server verifies only at
   handshake — but a **reconnect** after expiry fails. This belongs to Sprint 3's real-time-stream
   item, which owns the reconnect path; it should call `refreshOnce()` before re-handshaking.
2. **`useResource`** — the other half of the sprint plan's API-layer row — is still unbuilt. It has no
   consumer until the issue stream lands.
3. No **automated** test covers any of this. Everything above was verified by driving the real app;
   the concurrency and cross-tab cases in particular are exactly the kind that rot silently, and
   `lib/authSession.ts` is written to be unit-testable (`__resetInFlight` exists for that) the moment
   a test runner is added. There is no test runner in the client workspace today.

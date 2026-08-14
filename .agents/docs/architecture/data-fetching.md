# Data fetching and error handling

## Where to fetch

- **Hooks** (preferred): put the request plus loading/error state in a hook — `useCalendarEvents`,
  `useBugTrackerData`, `useOverview`, `useNoteList`. Pages receive `{ data, loading, error, refetch }`
  and stay presentational.
- **Services**: one module per domain under `services/` — `projects.ts`, `notes.ts`, `calendar.ts`,
  `chat.ts`, `team.ts`, … Every module that talks to the network lives here.
- **Transport**: `api/client.ts` (`fetchWithAuth`) is the **default** and is used by ~25 modules. It
  owns base URL, bearer token, and refresh-and-retry on 401. `api/request.ts` wraps it with JSON
  handling and a typed `ApiError` carrying the status. `api/config.ts` holds base URL + token access.

## How to show errors

- **Toast**: `useToast()` from `ToastContext` for success/error feedback. The app is wrapped in
  `ToastProvider` (see `main.tsx`).
- **Error Boundary**: a top-level `ErrorBoundary` in `App.tsx` catches render errors.
- **Per-hook error**: hooks expose `error`; components render it inline or pass it to the toast.

## Pattern summary

1. Fetch in a hook or a service, never inline in a page component.
2. Hold loading/error in hook state.
3. Go through `fetchWithAuth` / `request.ts` so auth, base URL and 401 handling stay in one place.

---

## Known issue: two HTTP transports

**Recorded 2026-08-15. Not a bug today — a maintenance hazard worth knowing before touching auth.**

The client has **two** transports, and both implement 401 refresh-and-retry independently:

| | Transport | Refresh logic | Used by |
| --- | --- | --- | --- |
| Default | `fetchWithAuth` in `api/client.ts` | pre-flight expiry check + retry once on 401 | ~25 modules — everything except the row below |
| Legacy | an **axios** instance in `services/api.ts` | its own request + response interceptors | `logsAPI`, `ticketsAPI`, `consoleLogsAPI` |

Reached from `pages/BugTracker.tsx` and `hooks/useBugTrackerData.ts` — i.e. the Bug Tracker is the
only surface still on axios.

**Why it is not currently broken:** both route through `lib/authSession.ts`, which owns the single
in-flight refresh promise. So the two transports cannot race each other into a double refresh, and
that coordination is the property that matters most.

**Why it is still a hazard:** the *retry and expiry* logic around that shared coordinator is written
twice. A fix to the fetch path — a changed backoff, a new status code treated as retryable, a
different pre-flight rule — does not reach the axios path, and nothing in the type system or the
tests will say so. The Bug Tracker has no test coverage, so the failure would surface as a user
report, not a red build.

**The migration, if it is ever done:** port the three API objects in `services/api.ts` onto
`request.ts`, delete the axios instance and both interceptors, then drop `axios` from
`app/client/package.json` if nothing else claims it (`lib/authSession.ts` and `utils/offlineMock.ts`
both reference axios types today, so check those first). It is a contained change — three objects,
two call sites — but it touches live data paths with no tests behind them, which is exactly why it
was deliberately left out of the 2026-08-15 structural cleanup rather than folded into it.

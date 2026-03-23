# Data fetching and error handling

## Where to fetch

- **Hooks** (preferred): Put fetch + loading/error state in a hook (e.g. `useNoteStatsOverview`, `useCalendarEvents`, `useBugTrackerData`). Pages and components receive `{ data, loading, error, refetch }` and stay presentational.
- **Services**: Use `services/api.ts` (axios) for logs/tickets; use `services/auth.ts` for auth. Both use `api/config.ts` for base URL and auth headers.
- **API helpers**: Use `api/config.ts` (`getApiBaseUrl`, `getAuthHeaders`) or optional `api/client.ts` (`fetchWithAuth`) for raw fetch so base URL and token are in one place.

## How to show errors

- **Toast**: Use `useToast()` from `ToastContext` for success/error feedback (e.g. login failure, save success). Wrap the app in `ToastProvider` (see `main.tsx`).
- **Error Boundary**: A top-level `ErrorBoundary` in `App.tsx` catches render errors; use it to show a fallback instead of a white screen.
- **Per-hook error**: Hooks expose `error` state; components can show inline messages or call `showError(error.message)` when error is set.

## Pattern summary

1. Fetch in a hook or service, not inline in a large page component.
2. Hold loading/error in hook state; component renders loading/error UI or delegates to toast.
3. Use `api/config.ts` (and optionally `fetchWithAuth`) for all fetch so auth and base URL are consistent.

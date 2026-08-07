/**
 * Auth-aware fetch wrapper. Base URL + bearer token + **refresh-and-retry on 401**.
 *
 * Prefer hooks (e.g. useNoteStatsOverview, useCalendarEvents) to hold
 * loading/error state; components stay presentational.
 *
 * Sprint 3 (2026-08-03) added the 401 handling. Before it, a token that expired
 * mid-session left the app rendering a signed-in shell in which every request had
 * quietly become an error — worse than being logged out, because nothing told the
 * user to sign in again. See `lib/authSession.ts` for why the refresh lives in a
 * plain module and not in `AuthContext`.
 */

import { getApiBaseUrl, getAuthHeaders } from './config';
import { getAccessToken, isExpired, refreshOnce } from '@/lib/authSession';

export type FetchWithAuthOptions = RequestInit & {
    /** If true, appends Content-Type: application/json and allows body to be passed as object. */
    json?: boolean;
    /**
     * Opt out of the 401 refresh-and-retry. Set on the auth routes themselves:
     * `/refresh` would recurse, and a 401 from `/login` means "wrong password",
     * not "your token aged out" — refreshing there would turn a typo into a
     * logout.
     */
    skipAuthRetry?: boolean;
};

/**
 * Routes that must never trigger a refresh, whatever they answer.
 *
 * Matched by path so a caller cannot forget the flag. `/logout` is here because a
 * 401 on the way out is not worth minting a token to retry — we are discarding
 * the session either way.
 */
const NO_RETRY_PATHS = ['/api/auth/refresh', '/api/auth/login', '/api/auth/register', '/api/auth/logout'];

const isNoRetryPath = (url: string): boolean => NO_RETRY_PATHS.some((p) => url.includes(p));

function resolveUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('http')) return pathOrUrl;
    return `${getApiBaseUrl()}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

/**
 * Builds the request. Called twice when a retry happens, which is why it reads
 * the token *now* rather than taking one from the caller — the whole point of the
 * second attempt is that the token has changed.
 */
function buildInit(options: FetchWithAuthOptions): RequestInit {
    const { json, skipAuthRetry: _skip, ...init } = options;
    const headers = new Headers(init.headers as HeadersInit);
    const authHeaders = getAuthHeaders(json);
    Object.entries(authHeaders).forEach(([k, v]) => headers.set(k, v as string));
    if (json && init.body !== undefined && typeof init.body === 'object' && !(init.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
        init.body = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
    }
    return { ...init, headers };
}

/**
 * Fetch with base URL and auth headers applied. Relative paths are resolved
 * against getApiBaseUrl(); absolute URLs are used as-is (headers still applied).
 *
 * On a 401 it refreshes once and replays the request exactly once. A 401 on the
 * replay is returned to the caller — the session is genuinely over, and looping
 * would just turn one dead request into an infinite series of them.
 */
export async function fetchWithAuth(
    pathOrUrl: string,
    options: FetchWithAuthOptions = {}
): Promise<Response> {
    const url = resolveUrl(pathOrUrl);
    const retryable = !options.skipAuthRetry && !isNoRetryPath(url);

    // Pre-flight. If the token is already past `exp` the request is guaranteed to
    // come back 401, so spend the refresh instead of the round trip. Silently
    // ignored on failure: the request still goes out and the 401 path below gets
    // the same chance, rather than the caller eating an error we invented.
    if (retryable && isExpired(getAccessToken())) {
        try {
            await refreshOnce();
        } catch {
            /* fall through — the response path decides */
        }
    }

    // The body is serialized inside `buildInit`, so replaying re-serializes from
    // the caller's original value rather than re-reading a consumed stream.
    const first = await fetch(url, buildInit(options));
    if (first.status !== 401 || !retryable) return first;

    try {
        await refreshOnce();
    } catch {
        // Terminal (session over) or survivable (network) — either way the
        // honest thing to hand back is the 401 the server actually sent.
        // `authSession` has already notified `AuthContext` if it was terminal.
        return first;
    }

    return fetch(url, buildInit(options));
}

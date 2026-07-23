/**
 * Optional auth-aware fetch wrapper. Use for consistent base URL + auth headers
 * without adding a new network library. Prefer hooks (e.g. useNoteStatsOverview,
 * useCalendarEvents) to hold loading/error state; components stay presentational.
 */

import { getApiBaseUrl, getAuthHeaders } from './config';

export type FetchWithAuthOptions = RequestInit & {
    /** If true, appends Content-Type: application/json and allows body to be passed as object. */
    json?: boolean;
};

/**
 * Fetch with base URL and auth headers applied. Relative paths are resolved
 * against getApiBaseUrl(); absolute URLs are used as-is (headers still applied).
 * Use in hooks or services; surface loading/error in hook state and show errors
 * via toast or error boundary.
 */
export async function fetchWithAuth(
    pathOrUrl: string,
    options: FetchWithAuthOptions = {}
): Promise<Response> {
    const { json, ...init } = options;
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${getApiBaseUrl()}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
    const headers = new Headers(init.headers as HeadersInit);
    const authHeaders = getAuthHeaders(json);
    Object.entries(authHeaders).forEach(([k, v]) => headers.set(k, v as string));
    if (json && init.body !== undefined && typeof init.body === 'object' && !(init.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
        init.body = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
    }
    return fetch(url, { ...init, headers });
}

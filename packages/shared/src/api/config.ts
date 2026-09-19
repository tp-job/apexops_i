/**
 * API base URL and auth header helpers.
 * Single place for every fetch caller in the web app and the extension.
 */

import { getAccessToken } from '../auth/authSession';

// A runtime value with no default. Each consumer says where its API is: the web
// app from `VITE_API_URL` in `main.tsx`, the extension from the server the user
// connected to (extension spec X11). No default on purpose — a forgotten
// `configureApi` must fail loudly, not send relative `/api/...` requests to
// whatever origin happens to be serving the page.
let apiBaseUrl: string | null = null;

export function configureApi({ baseUrl }: { baseUrl: string }): void {
    apiBaseUrl = baseUrl.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
    if (apiBaseUrl === null) throw new Error('configureApi({ baseUrl }) has not been called');
    return apiBaseUrl;
}

/** The session module owns the token; this stays as the name the fetch callers already use. */
export function getAuthToken(): string | null {
    return getAccessToken();
}

export function getAuthHeaders(includeContentType = false): HeadersInit {
    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (includeContentType) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

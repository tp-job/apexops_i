/**
 * Centralized API base URL and auth header helpers.
 * Single place for noteApi, calendarApi, auth, and other fetch callers.
 */

import { getAccessToken } from '@/lib/authSession';

// A runtime value, not a build-time constant: the web app keeps the build-time
// default, and the browser extension calls `configureApi` with whatever server
// the user connected to (extension spec X11).
let apiBaseUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function configureApi({ baseUrl }: { baseUrl: string }): void {
    apiBaseUrl = baseUrl.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
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

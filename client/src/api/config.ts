/**
 * Centralized API base URL and auth header helpers.
 * Single place for noteApi, calendarApi, auth, and other fetch callers.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function getApiBaseUrl(): string {
    return API_BASE_URL;
}

export function getAuthToken(): string | null {
    try {
        return localStorage.getItem('accessToken');
    } catch {
        return null;
    }
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

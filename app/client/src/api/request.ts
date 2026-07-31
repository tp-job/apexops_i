import { fetchWithAuth } from './client';

/**
 * The one JSON request helper.
 *
 * Extracted from three near-identical copies (`services/projects.ts`,
 * `services/notifications.ts`, `services/sessions.ts`), each with its own
 * error-message extraction. The duplication was not the cost — the *drift* was:
 * only one of the three carried a typed `ApiError` with the status, so a caller
 * had no consistent way to tell a 409 from a 500, and the fix for one never
 * reached the others.
 *
 * Deliberately no offline-mock fallback (unlike `services/api.ts`): these
 * surfaces are monitoring data, and fabricating it is worse than admitting the
 * server is unreachable.
 */

export class ApiError extends Error {
    status: number;
    /** Extra server fields, e.g. `ticketId` on a 409 from promote. */
    data?: Record<string, unknown>;

    // Fields declared and assigned explicitly rather than via constructor
    // parameter properties: the client builds with `erasableSyntaxOnly`, which
    // rejects TypeScript syntax that emits runtime code.
    constructor(status: number, message: string, data?: Record<string, unknown>) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

export async function apiRequest<T>(
    path: string,
    init?: RequestInit & { json?: boolean }
): Promise<T> {
    const res = await fetchWithAuth(path, init);

    if (!res.ok) {
        let message = `Request failed (${res.status})`;
        let data: Record<string, unknown> | undefined;
        try {
            data = await res.json();
            if (data && typeof data.error === 'string') message = data.error;
        } catch {
            // A non-JSON error body (proxy HTML, gateway timeout) still has to
            // produce a usable message rather than a parse crash.
        }
        throw new ApiError(res.status, message, data);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}

/** POST with an empty JSON body — the shape every "do this now" action needs. */
export const apiPost = <T>(path: string): Promise<T> =>
    apiRequest<T>(path, { method: 'POST', json: true, body: {} as unknown as BodyInit });

/** Serializes defined, non-empty params. Skips `undefined`, `null` and `''`. */
export const buildQuery = (params: Record<string, unknown>): string => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
    });
    const s = search.toString();
    return s ? `?${s}` : '';
};

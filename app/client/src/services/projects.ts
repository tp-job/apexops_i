import { fetchWithAuth } from '@/api/client';
import type {
    CaptureLevel,
    Issue,
    IssueDetail,
    IssueFilters,
    IssueListResponse,
    IssueStats,
    IssueStatus,
    Project,
    PromotedTicket,
} from '@/types/projects';

/**
 * Project workspace + issue API.
 *
 * Built on `fetchWithAuth` rather than the axios instance in `services/api.ts`
 * because these surfaces need the server's *error message*, not just a status —
 * "That slug is already in use" is the entire content of a 409 here, and the UI
 * has to show it next to the field that caused it.
 *
 * Note there is no offline-mock fallback (unlike `services/api.ts`). Faking an
 * issue list would defeat the point: a monitoring tool showing invented data is
 * worse than one that admits it cannot reach the server.
 */

export class ApiError extends Error {
    status: number;
    /** Extra server fields, e.g. `ticketId` on a 409 from promote. */
    data?: Record<string, unknown>;

    // Fields are declared and assigned explicitly rather than via constructor
    // parameter properties: the client builds with `erasableSyntaxOnly`, which
    // rejects any TypeScript syntax that emits runtime code.
    constructor(status: number, message: string, data?: Record<string, unknown>) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

async function request<T>(path: string, init?: RequestInit & { json?: boolean }): Promise<T> {
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

const qs = (filters: Record<string, unknown>): string => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    const s = params.toString();
    return s ? `?${s}` : '';
};

export const projectsAPI = {
    list: (includeArchived = false): Promise<Project[]> =>
        request<Project[]>(`/api/projects${includeArchived ? '?includeArchived=true' : ''}`),

    get: (slug: string): Promise<Project> => request<Project>(`/api/projects/${slug}`),

    create: (body: { name: string; slug?: string }): Promise<Project> =>
        request<Project>('/api/projects', { method: 'POST', json: true, body: body as unknown as BodyInit }),

    update: (
        slug: string,
        body: {
            name?: string;
            captureLevels?: CaptureLevel[];
            allowedOrigins?: string[];
            retentionDays?: number;
        }
    ): Promise<Project> =>
        request<Project>(`/api/projects/${slug}`, {
            method: 'PATCH',
            json: true,
            body: body as unknown as BodyInit,
        }),

    rotateKey: (slug: string): Promise<{ rotated: boolean; project: Project }> =>
        request(`/api/projects/${slug}/rotate-key`, { method: 'POST', json: true, body: {} as unknown as BodyInit }),

    archive: (slug: string): Promise<{ archived: boolean; project: Project }> =>
        request(`/api/projects/${slug}`, { method: 'DELETE' }),

    restore: (slug: string): Promise<Project> =>
        request<Project>(`/api/projects/${slug}/restore`, { method: 'POST', json: true, body: {} as unknown as BodyInit }),
};

export const issuesAPI = {
    list: (slug: string, filters: IssueFilters = {}): Promise<IssueListResponse> =>
        request<IssueListResponse>(`/api/projects/${slug}/issues${qs(filters as Record<string, unknown>)}`),

    stats: (slug: string): Promise<IssueStats> =>
        request<IssueStats>(`/api/projects/${slug}/issues/stats`),

    get: (slug: string, id: number): Promise<IssueDetail> =>
        request<IssueDetail>(`/api/projects/${slug}/issues/${id}`),

    setStatus: (slug: string, id: number, status: IssueStatus): Promise<Issue> =>
        request<Issue>(`/api/projects/${slug}/issues/${id}`, {
            method: 'PATCH',
            json: true,
            body: { status } as unknown as BodyInit,
        }),

    /**
     * Promote to a tracked ticket — the seam between the SDK pipeline and the
     * Bug Tracker board. A 409 carries the existing `ticketId`, so a double
     * promote navigates to the ticket that already exists instead of failing.
     */
    promote: (
        slug: string,
        id: number,
        body: { title?: string; priority?: string; assigneeId?: number | null } = {}
    ): Promise<{ ticket: PromotedTicket; issue: Issue }> =>
        request(`/api/projects/${slug}/issues/${id}/ticket`, {
            method: 'POST',
            json: true,
            body: body as unknown as BodyInit,
        }),
};

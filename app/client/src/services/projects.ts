import { apiRequest, buildQuery, apiPost } from '@/api/request';
import type {
    CaptureLevel,
    Issue,
    IssueDetail,
    IssueFilters,
    IssueListResponse,
    IssueRange,
    IssueStats,
    IssueStatus,
    Project,
    ProjectOverview,
    PromotedTicket,
    RollupResponse,
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

/**
 * `ApiError` and the request helper now live in `api/request.ts` — they were
 * duplicated across three service modules with subtly different error handling.
 * Re-exported here so existing importers keep working.
 */
export { ApiError } from '@/api/request';

export const projectsAPI = {
    list: (includeArchived = false): Promise<Project[]> =>
        apiRequest<Project[]>(`/api/projects${includeArchived ? '?includeArchived=true' : ''}`),

    get: (slug: string): Promise<Project> => apiRequest<Project>(`/api/projects/${slug}`),

    create: (body: { name: string; slug?: string }): Promise<Project> =>
        apiRequest<Project>('/api/projects', { method: 'POST', json: true, body: body as unknown as BodyInit }),

    update: (
        slug: string,
        body: {
            name?: string;
            captureLevels?: CaptureLevel[];
            allowedOrigins?: string[];
            retentionDays?: number;
            alertOnRegression?: boolean;
            /** Empty string clears it — see project.schema.ts. */
            webhookUrl?: string;
        }
    ): Promise<Project> =>
        apiRequest<Project>(`/api/projects/${slug}`, {
            method: 'PATCH',
            json: true,
            body: body as unknown as BodyInit,
        }),

    rotateKey: (slug: string): Promise<{ rotated: boolean; project: Project }> =>
        apiPost(`/api/projects/${slug}/rotate-key`),

    archive: (slug: string): Promise<{ archived: boolean; project: Project }> =>
        apiRequest(`/api/projects/${slug}`, { method: 'DELETE' }),

    restore: (slug: string): Promise<Project> => apiPost<Project>(`/api/projects/${slug}/restore`),

    /** Cross-project ranking for the global dashboard. Server-side ranked. */
    rollup: (range: IssueRange = '24h'): Promise<RollupResponse> =>
        apiRequest<RollupResponse>(`/api/projects/rollup?range=${range}`),

    /** Single-project trend: volume, release markers, regressions, top issues. */
    overview: (slug: string, range: IssueRange = '24h'): Promise<ProjectOverview> =>
        apiRequest<ProjectOverview>(`/api/projects/${slug}/overview?range=${range}`),
};

export const issuesAPI = {
    list: (slug: string, filters: IssueFilters = {}): Promise<IssueListResponse> =>
        apiRequest<IssueListResponse>(`/api/projects/${slug}/issues${buildQuery(filters as Record<string, unknown>)}`),

    stats: (slug: string): Promise<IssueStats> =>
        apiRequest<IssueStats>(`/api/projects/${slug}/issues/stats`),

    get: (slug: string, id: number, range: IssueRange = '24h'): Promise<IssueDetail> =>
        apiRequest<IssueDetail>(`/api/projects/${slug}/issues/${id}?range=${range}`),

    setStatus: (slug: string, id: number, status: IssueStatus): Promise<Issue> =>
        apiRequest<Issue>(`/api/projects/${slug}/issues/${id}`, {
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
        apiRequest(`/api/projects/${slug}/issues/${id}/ticket`, {
            method: 'POST',
            json: true,
            body: body as unknown as BodyInit,
        }),
};

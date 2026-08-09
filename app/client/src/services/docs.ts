import { apiRequest } from '@/api/request';

/**
 * Documentation — the public read path and the admin CMS (spec S9-D1…D8).
 *
 * `apiRequest` attaches a bearer token when there is one and works fine without,
 * which is what the public routes need: `/docs` is read by people who may not
 * have an account, so a signed-out fetch has to be the ordinary case rather
 * than a fallback.
 */

export interface DocPageSummary {
    slug: string;
    title: string;
    group: string;
    groupOrder: number;
    order: number;
    summary: string;
}

export interface DocPageContent extends DocPageSummary {
    body: string;
    updatedAt: string;
}

export interface AdminDocPage extends DocPageSummary {
    id: number;
    status: 'draft' | 'published';
    body?: string;
    updatedAt: string;
    updatedBy: { id: number; firstName: string; lastName: string; email: string } | null;
}

export interface DocPageInput {
    slug?: string;
    title?: string;
    group?: string;
    groupOrder?: number;
    order?: number;
    summary?: string;
    body?: string;
    status?: 'draft' | 'published';
}

export const docsAPI = {
    /** Published pages only, in rail order. Works signed out. */
    list: (): Promise<{ pages: DocPageSummary[] }> => apiRequest('/api/docs'),

    /** One published page. A draft slug 404s like a slug that does not exist. */
    read: (slug: string): Promise<{ page: DocPageContent }> =>
        apiRequest(`/api/docs/${encodeURIComponent(slug)}`),
};

export const adminDocsAPI = {
    /** Every page including drafts. 403 for a non-admin, on every route here. */
    list: (): Promise<{ pages: AdminDocPage[] }> => apiRequest('/api/admin/docs'),

    read: (id: number): Promise<{ page: AdminDocPage & { body: string } }> =>
        apiRequest(`/api/admin/docs/${id}`),

    // `json: true` with an object body — the flag is what sets Content-Type, and
    // a pre-stringified body skips it, leaving `express.json()` with nothing to
    // parse and the route with an undefined `req.body`.
    create: (input: DocPageInput): Promise<{ page: AdminDocPage }> =>
        apiRequest('/api/admin/docs', { method: 'POST', json: true, body: input as unknown as BodyInit }),

    update: (id: number, input: DocPageInput): Promise<{ page: AdminDocPage }> =>
        apiRequest(`/api/admin/docs/${id}`, { method: 'PATCH', json: true, body: input as unknown as BodyInit }),

    remove: (id: number): Promise<void> => apiRequest(`/api/admin/docs/${id}`, { method: 'DELETE' }),

    /** The whole rail in one request — a partial reorder is an order nobody chose. */
    reorder: (
        pages: { id: number; group: string; groupOrder: number; order: number }[]
    ): Promise<{ updated: number }> =>
        apiRequest('/api/admin/docs/reorder', {
            method: 'POST',
            json: true,
            body: { pages } as unknown as BodyInit,
        }),
};

/**
 * Group the flat page list into the rail's shape.
 *
 * Shared by the public sidebar and the admin reorder screen so the admin is
 * arranging the thing a visitor will actually see, not a second model of it.
 */
export function groupDocPages<T extends DocPageSummary>(pages: T[]): { group: string; pages: T[] }[] {
    const groups: { group: string; pages: T[] }[] = [];
    for (const page of pages) {
        const existing = groups.find((g) => g.group === page.group);
        if (existing) existing.pages.push(page);
        else groups.push({ group: page.group, pages: [page] });
    }
    return groups;
}

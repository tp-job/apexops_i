import { apiRequest } from '@/api/request';

/**
 * User administration (spec D8).
 *
 * Every route here is `authorize('admin')` on the server, which resolves the role
 * from the database rather than the token — so an admin who is demoted while this
 * screen is open starts getting 403s on the next call, not when their token
 * happens to expire. The screen must handle that rather than assume it cannot
 * happen.
 */

export interface AdminUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string | null;
    isActive: boolean | null;
    avatarUrl: string | null;
    createdAt: string;
}

export interface UserPage {
    users: AdminUser[];
    total: number;
    page: number;
    pageSize: number;
}

export const usersAPI = {
    list: (params: { q?: string; page?: number; pageSize?: number } = {}): Promise<UserPage> => {
        const qs = new URLSearchParams();
        if (params.q) qs.set('q', params.q);
        if (params.page) qs.set('page', String(params.page));
        if (params.pageSize) qs.set('pageSize', String(params.pageSize));
        const suffix = qs.toString();
        return apiRequest(`/api/users${suffix ? `?${suffix}` : ''}`);
    },

    // `json: true` with an object body, matching services/projects.ts. Passing a
    // pre-stringified body instead skips the Content-Type header that flag sets,
    // so `express.json()` never parses it and the route sees `req.body`
    // undefined — a 400 that looks like a validation bug rather than a missing
    // header.
    setRole: (id: number, role: 'admin' | 'user'): Promise<{ user: AdminUser }> =>
        apiRequest(`/api/users/${id}/role`, {
            method: 'PATCH', json: true, body: { role } as unknown as BodyInit,
        }),

    setActive: (id: number, isActive: boolean): Promise<{ user: AdminUser }> =>
        apiRequest(`/api/users/${id}/active`, {
            method: 'PATCH', json: true, body: { isActive } as unknown as BodyInit,
        }),
};

export const fullName = (u: AdminUser): string =>
    [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;

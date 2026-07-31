import { apiRequest, apiPost, buildQuery } from '@/api/request';
import type { NotificationsResponse } from '@/types/projects';

/**
 * The in-app alert feed.
 *
 * Deliberately no offline-mock fallback (unlike `services/api.ts`): inventing
 * notifications would be worse than showing none. A monitoring tool that
 * fabricates "you have 3 alerts" is actively harmful.
 */
export const notificationsAPI = {
    list: (opts: { unread?: boolean; limit?: number } = {}): Promise<NotificationsResponse> =>
        apiRequest<NotificationsResponse>(
            `/api/notifications${buildQuery({ unread: opts.unread ? 'true' : '', limit: opts.limit })}`
        ),

    markRead: (id: number): Promise<{ read: boolean }> =>
        apiPost(`/api/notifications/${id}/read`),

    markAllRead: (): Promise<{ marked: number }> => apiPost('/api/notifications/read-all'),
};

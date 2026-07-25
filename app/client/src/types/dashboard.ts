/**
 * Dashboard workspace types.
 *
 * These mirror the real server responses exactly — verified against
 * `app/server/src/api/tickets.ts` (`GET /stats`) and `api/logs.ts` (`GET /stats`).
 * Do not add fields the backend doesn't send; the Dashboard is the one page
 * where an invented field silently renders as a confident zero.
 */

/** `GET /api/tickets/stats` */
export interface TicketStats {
    total: number;
    byStatus: {
        open: number;
        inProgress: number;
        resolved: number;
        closed: number;
    };
    byPriority: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
}

/** `GET /api/logs/stats` */
export interface LogStats {
    total: number;
    byLevel: {
        errors: number;
        warnings: number;
        info: number;
    };
    last24Hours: number;
    last7Days: number;
}

/** Aggregate consumed by the Dashboard workspace. */
export interface DashboardStats {
    tickets: TicketStats | null;
    logs: LogStats | null;
}

/** A single "needs attention" row in the workspace focus rail. */
export interface FocusItem {
    id: string;
    label: string;
    count: number;
    tone: 'danger' | 'warning' | 'accent' | 'neutral';
    hint: string;
}

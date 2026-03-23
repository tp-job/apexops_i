/**
 * Shared API and mock response types.
 */

/** Array response that carries a mock flag for offline/fallback data */
export type WithMockFlagArray<T> = T[] & { __isMock: true };

export function hasMockFlag<T>(data: T[] | WithMockFlagArray<T>): data is WithMockFlagArray<T> {
    return Array.isArray(data) && (data as WithMockFlagArray<T>).__isMock === true;
}

/** Logs stats API response shape */
export interface LogsStats {
    total: number;
    byLevel: { errors: number; warnings: number; info: number };
    last24Hours: number;
    last7Days: number;
}

/** Tickets stats API response shape */
export interface TicketsStats {
    total: number;
    byStatus: { open: number; inProgress: number; resolved: number; closed: number };
    byPriority: { critical: number; high: number; medium: number; low: number };
}

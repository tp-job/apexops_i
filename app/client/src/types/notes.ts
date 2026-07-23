/**
 * Shared types for note stats and overview API.
 */

export interface RecentActivity {
    id: string;
    title: string;
    type: string;
    createdAt: string;
    updatedAt: string;
}

export interface NoteStats {
    total: number;
    byType: {
        text: number;
        image: number;
        list: number;
        link: number;
    };
    pinned: {
        pinned: number;
        unpinned: number;
    };
    daily: Array<{ date: string; day: string; count: number }>;
    monthly: Array<{ month: string; monthName: string; count: number }>;
    recentActivity?: RecentActivity[];
}

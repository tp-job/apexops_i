/**
 * Shared types for calendar/optimization calendar feature.
 */

export type CategoryId = 'development' | 'server' | 'client' | 'marketing';

export interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    category: CategoryId;
    date: string; // YYYY-MM-DD
    hour: number;
    minute: number;
    amPm: 'AM' | 'PM';
    durationMinutes: number;
    pushNotification: boolean;
}

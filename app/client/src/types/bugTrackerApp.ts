export interface Log {
    id: string;
    timestamp: string;
    level: 'error' | 'warning' | 'info';
    message: string;
    stack?: string;
    source: string;
}

export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

/** Slim user shape the tickets API embeds for assignee/reporter/comment authors. */
export interface TicketUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
}

export interface Ticket {
    id: string;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    /** Display name, resolved from `assigneeUser` when present. Read-only — write `assigneeId`. */
    assignee?: string;
    assigneeId?: number | null;
    assigneeUser?: TicketUser | null;
    reporter: string;
    reporterId?: number | null;
    createdAt: string;
    updatedAt: string;
    relatedLogs?: string[];
    tags: string[];
    commentCount?: number;
    /** Non-null once soft-deleted; archived tickets are excluded from lists by default. */
    archivedAt?: string | null;
}

/**
 * One entry in a ticket's thread. `comment` is human-written; `activity` is
 * system-generated on a status/priority/assignee change, with `meta` carrying
 * `{ field, from, to }`.
 */
export interface TicketComment {
    id: number;
    ticketId: string;
    kind: 'comment' | 'activity';
    body: string;
    meta: { field?: string; from?: unknown; to?: unknown };
    author: (TicketUser & { name?: string }) | null;
    createdAt: string;
    updatedAt: string;
}
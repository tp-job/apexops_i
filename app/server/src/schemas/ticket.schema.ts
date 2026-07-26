import { z } from 'zod';

/**
 * Wire values stay hyphenated (`in-progress`) to keep the client's discriminated
 * unions in `types/bugTrackerApp.ts` unchanged; `api/tickets.ts` maps them to the
 * Prisma enum members (`in_progress`) on the way in and back out.
 */
export const TICKET_STATUSES = ['open', 'in-progress', 'resolved', 'closed'] as const;
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export type TicketStatusWire = (typeof TICKET_STATUSES)[number];
export type TicketPriorityWire = (typeof TICKET_PRIORITIES)[number];

const statusField = z.enum(TICKET_STATUSES);
const priorityField = z.enum(TICKET_PRIORITIES);

/** Accepts either a numeric user id or `null` to unassign. */
const userIdField = z.number().int().positive().nullable();

export const createTicketSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().default(''),
    status: statusField.optional().default('open'),
    priority: priorityField.optional().default('medium'),
    assigneeId: userIdField.optional(),
    tags: z.array(z.string()).optional().default([]),
    relatedLogs: z.array(z.string()).optional().default([]),
});

export const updateTicketSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: statusField.optional(),
    priority: priorityField.optional(),
    assigneeId: userIdField.optional(),
    tags: z.array(z.string()).optional(),
    relatedLogs: z.array(z.string()).optional(),
    /**
     * Optimistic concurrency (spec risk #1). When supplied, the update only
     * applies if the row's `updatedAt` still matches — otherwise 409, so two
     * triagers can't silently overwrite each other.
     */
    expectedUpdatedAt: z.string().datetime().optional(),
});

export const createTicketCommentSchema = z.object({
    // Trimmed *before* the length check — `min(1)` alone happily accepts "   ",
    // which posts a blank bubble into the thread.
    body: z.string().trim().min(1, 'Comment cannot be empty').max(10_000),
});

export const listTicketsQuerySchema = z.object({
    status: statusField.optional(),
    priority: priorityField.optional(),
    assigneeId: z.coerce.number().int().positive().optional(),
    /** Free-text assignee filter, transitional while the legacy column still exists. */
    assignee: z.string().optional(),
    includeArchived: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
    limit: z.coerce.number().int().min(1).max(200).optional().default(100),
    offset: z.coerce.number().int().min(0).optional().default(0),
});

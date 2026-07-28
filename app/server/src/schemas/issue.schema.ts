import { z } from 'zod';
import { CAPTURE_LEVELS, ISSUE_STATUSES } from './project.schema';

export const ISSUE_SORT_KEYS = ['lastSeen', 'firstSeen', 'count'] as const;

/**
 * List query for `GET /api/projects/:slug/issues`.
 *
 * `limit` is capped at 100. The issue list is the surface most likely to be hit
 * by a project with a runaway error loop, and an uncapped page size there is a
 * way to ask Postgres for a million rows through the UI.
 */
export const listIssuesQuerySchema = z.object({
    level: z.enum(CAPTURE_LEVELS).optional(),
    status: z.enum(ISSUE_STATUSES).optional(),
    /** Free-text match against the issue title and culprit. */
    q: z.string().trim().min(1).max(200).optional(),
    /** Only issues seen within the last N hours. */
    since: z.coerce.number().int().min(1).max(24 * 90).optional(),
    sort: z.enum(ISSUE_SORT_KEYS).optional().default('lastSeen'),
    direction: z.enum(['asc', 'desc']).optional().default('desc'),
    limit: z.coerce.number().int().min(1).max(100).optional().default(25),
    offset: z.coerce.number().int().min(0).optional().default(0),
});

/**
 * Status is the only mutable field on an issue. Everything else — title,
 * culprit, count, timestamps — is derived from ingested events, and letting a
 * user edit it would put the aggregate row out of step with the events it
 * summarizes.
 */
export const updateIssueSchema = z.object({
    status: z.enum(ISSUE_STATUSES),
});

/**
 * Promote-to-ticket. Every field is optional: the defaults come from the issue
 * itself, which is the whole point — the action should be one click from the
 * list, not a form.
 */
export const promoteIssueSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assigneeId: z.number().int().positive().nullable().optional(),
});

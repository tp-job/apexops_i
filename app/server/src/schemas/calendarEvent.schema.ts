import { z } from 'zod';

/** Titles are a line, not a document. */
export const EVENT_TITLE_MAX = 200;
export const EVENT_TEXT_MAX = 2000;

const iso = z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Must be an ISO datetime' });

const base = {
    title: z.string().trim().min(1, 'Title is required').max(EVENT_TITLE_MAX),
    description: z.string().trim().max(EVENT_TEXT_MAX).nullable().optional(),
    location: z.string().trim().max(EVENT_TITLE_MAX).nullable().optional(),
    isAllDay: z.boolean().optional(),
    color: z.string().trim().max(40).nullable().optional(),
};

/**
 * An event cannot end before it starts.
 *
 * Checked here rather than in the route so the message reaches the user as a
 * readable 400 instead of surfacing later as an event that renders with negative
 * height, or one the overlap query silently never matches.
 */
const ordered = <T extends { startAt?: string; endAt?: string }>(o: T): boolean =>
    !o.startAt || !o.endAt || Date.parse(o.endAt) >= Date.parse(o.startAt);

export const createEventSchema = z
    .object({ ...base, startAt: iso, endAt: iso })
    .refine(ordered, { message: 'The end time cannot be before the start time', path: ['endAt'] });

export const updateEventSchema = z
    .object({ ...base, startAt: iso.optional(), endAt: iso.optional() })
    .refine((o) => Object.keys(o).length > 0, { message: 'No fields to update' })
    .refine(ordered, { message: 'The end time cannot be before the start time', path: ['endAt'] });

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

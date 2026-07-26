import { z } from 'zod';

/**
 * Accepts either a date (`2026-08-03`) or a full ISO datetime, and `null` to clear.
 * Kept permissive on purpose: the calendar UI sends day-granularity values, while
 * a future time-of-day picker would send full timestamps.
 */
const isoDateField = z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Must be an ISO date or datetime' })
    .nullable()
    .optional();

export const createNoteSchema = z.object({
    title: z.string().optional().default(''),
    content: z.string().optional().default(''),
    type: z.string().optional().default('text'),
    isPinned: z.boolean().optional().default(false),
    color: z.string().nullable().optional(),
    tags: z.array(z.any()).optional().default([]),
    imageUrl: z.string().nullable().optional(),
    linkUrl: z.string().nullable().optional(),
    checklistItems: z.array(z.any()).optional().default([]),
    quote: z.any().optional().default({}),
    scheduledFor: isoDateField,
    dueDate: isoDateField,
}).refine((data) => data.title || data.content, {
    message: 'Title or content is required',
});

export const updateNoteSchema = z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    type: z.string().optional(),
    isPinned: z.boolean().optional(),
    color: z.string().nullable().optional(),
    tags: z.array(z.any()).optional(),
    imageUrl: z.string().nullable().optional(),
    linkUrl: z.string().nullable().optional(),
    checklistItems: z.array(z.any()).optional(),
    quote: z.any().optional(),
    scheduledFor: isoDateField,
    dueDate: isoDateField,
});

/** Path params for `GET /calendar/:year/:month`. */
export const calendarParamsSchema = z.object({
    year: z.coerce.number().int().min(1970).max(9999),
    month: z.coerce.number().int().min(1).max(12),
});

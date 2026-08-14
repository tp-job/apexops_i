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

/**
 * Ceiling on a rich note document, serialised.
 *
 * `content` was unbounded before rich text existed, which was survivable while a
 * note was a paragraph someone typed. A formatted document with pasted content
 * is how a request body reaches megabytes, so the bound lands here — at the
 * edge — rather than being discovered as a 500 from Postgres.
 */
export const RICH_TEXT_MAX_BYTES = 256 * 1024;

/**
 * A TipTap document, or `null` to clear it.
 *
 * Deliberately *not* a structural schema of ProseMirror nodes: the node set is
 * owned by the client's extension list and would have to be edited here every
 * time a mark is enabled, which is a contract that would silently rot. What the
 * server actually guarantees is what it can enforce forever — an object, within
 * a size bound. The document is never executed or rendered as HTML server-side,
 * so its shape is the client's problem; its *size* is the server's.
 */
const richTextField = z
    .any()
    .refine((v) => v === undefined || (typeof v === 'object' && v !== null && !Array.isArray(v)), {
        message: 'contentRich must be a document object',
    })
    .refine(
        (v) => {
            if (v === undefined) return true;
            try {
                return Buffer.byteLength(JSON.stringify(v), 'utf8') <= RICH_TEXT_MAX_BYTES;
            } catch {
                // Circular or otherwise unserialisable — reject rather than let
                // Prisma throw on it further in.
                return false;
            }
        },
        { message: 'This note is too large to save — remove some content (256 KB limit)' },
    )
    .nullable()
    .optional();

export const createNoteSchema = z.object({
    title: z.string().optional().default(''),
    content: z.string().optional().default(''),
    contentRich: richTextField,
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
}).refine((data) => data.title || data.content || data.contentRich, {
    // A rich document whose plain projection is empty (a lone image, say) still
    // has something in it, so `contentRich` counts as content here.
    message: 'Title or content is required',
});

export const updateNoteSchema = z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    contentRich: richTextField,
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

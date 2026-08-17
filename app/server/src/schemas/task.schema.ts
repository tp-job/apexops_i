import { z } from 'zod';

/**
 * Validation for `/api/tasks` (blueprint phase 1).
 *
 * Bounds live here rather than being discovered as a Postgres error further in,
 * which is the same reason `note.schema.ts` carries `RICH_TEXT_MAX_BYTES`.
 */

/** A todo is a line, not a document. Long enough for a real sentence, bounded. */
export const TASK_TEXT_MAX = 500;

/**
 * How many tasks one day may hold.
 *
 * The daily page reconciles a whole day in one request, so this is also the
 * ceiling on that payload. Without it, a scripted client could hand the server
 * an arbitrarily long array to diff inside a transaction.
 */
export const TASKS_PER_DAY_MAX = 200;

const isoDate = z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Must be an ISO date or datetime' });

const isoDateNullable = isoDate.nullable().optional();

/** `YYYY-MM-DD`, the day key the client works in. */
export const dayKeySchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Not a real date' });

const text = z.string().trim().min(1, 'Text is required').max(TASK_TEXT_MAX);

const priority = z.enum(['low', 'normal', 'high']).nullable().optional();

export const createTaskSchema = z.object({
    text,
    clientId: z.string().min(1).max(120).optional(),
    scheduledFor: isoDate,
    dueDate: isoDateNullable,
    isDone: z.boolean().optional(),
    priority,
    position: z.number().int().min(0).optional(),
    noteId: z.number().int().positive().nullable().optional(),
});

export const updateTaskSchema = z
    .object({
        text: text.optional(),
        isDone: z.boolean().optional(),
        scheduledFor: isoDate.optional(),
        dueDate: isoDateNullable,
        priority,
        position: z.number().int().min(0).optional(),
        noteId: z.number().int().positive().nullable().optional(),
    })
    // An empty PATCH is almost always a client bug. Answering 400 says so
    // instead of reporting a successful no-op.
    .refine((o) => Object.keys(o).length > 0, { message: 'No fields to update' });

/**
 * One item in a whole-day reconcile.
 *
 * `completedAt` is accepted but **not trusted** — the route derives it from
 * `isDone` so a client cannot report work finished at a time of its choosing,
 * and so the "done today" counts stay honest. See `api/tasks.ts`.
 */
const dayTaskSchema = z.object({
    clientId: z.string().min(1).max(120),
    text,
    isDone: z.boolean(),
    createdAt: isoDateNullable,
    completedAt: isoDateNullable,
});

export const syncDaySchema = z.object({
    tasks: z.array(dayTaskSchema).max(TASKS_PER_DAY_MAX),
    /** The daily note these belong to, when the client already has one. */
    noteId: z.number().int().positive().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type SyncDayInput = z.infer<typeof syncDaySchema>;

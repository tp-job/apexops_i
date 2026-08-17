import express, { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    createTaskSchema,
    dayKeySchema,
    syncDaySchema,
    updateTaskSchema,
    TASKS_PER_DAY_MAX,
} from '../schemas/task.schema';

/**
 * Tasks — the SSOT for "work to do" (blueprint D1, phase 1).
 *
 * Two shapes of write live here on purpose:
 *
 * - **Per-item CRUD** (`POST` / `PATCH /:id` / `DELETE /:id`) is what a master
 *   list needs: change one row, leave the rest alone.
 * - **Whole-day reconcile** (`PUT /day/:date`) is what the daily page needs. That
 *   page has always worked on an immutable array — `toggleTodo(todos, id)`
 *   returns a new list — and rebuilding it around per-item calls would mean a
 *   reorder firing N requests, any of which can fail on its own and leave the day
 *   half-written. Reconciling one array inside one transaction keeps the page's
 *   existing contract *and* makes a save atomic.
 *
 * Every row is scoped to `req.user.id`. There is deliberately no route that
 * accepts a user id: the absence of that path is what makes cross-user access
 * impossible rather than merely unimplemented.
 */

const router = express.Router();

/**
 * The wire shape.
 *
 * `clientId` is exposed as `id` because that is the identity the browser already
 * works in, and the daily page's pure functions key on it. The numeric `id` goes
 * out as `taskId` for callers that need to address a single row.
 */
const formatTask = (t: {
    id: number;
    clientId: string;
    text: string;
    isDone: boolean;
    completedAt: Date | null;
    scheduledFor: Date;
    dueDate: Date | null;
    position: number;
    priority: string | null;
    noteId: number | null;
    createdAt: Date;
    updatedAt: Date;
}) => ({
    id: t.clientId,
    taskId: t.id,
    text: t.text,
    checked: t.isDone,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    scheduledFor: t.scheduledFor.toISOString(),
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    position: t.position,
    priority: t.priority,
    noteId: t.noteId,
    updatedAt: t.updatedAt.toISOString(),
});

/** Soft-deleted rows are invisible to every read. */
const alive = { deletedAt: null };

const parseId = (raw: unknown): number | null => {
    if (typeof raw !== 'string') return null;
    const id = Number.parseInt(raw, 10);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/**
 * `YYYY-MM-DD` → the instant stored in `scheduledFor`: local **noon**.
 *
 * Midnight is within one UTC offset of the neighbouring day, so a task saved for
 * the 11th can read back as the 10th and the page stops finding what it just
 * wrote. Noon survives every real-world offset. This mirrors `dayAnchorIso` on
 * the client and `Note.scheduledFor`; the three must not drift apart.
 */
const dayAnchor = (dayKey: string): Date => new Date(`${dayKey}T12:00:00.000Z`);

/** The half-open range covering one day's anchors. */
const dayRange = (dayKey: string) => {
    const start = new Date(`${dayKey}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { gte: start, lt: end };
};

const newClientId = (): string =>
    `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * `completedAt` is derived, never taken from the request.
 *
 * A client that reports "done, at a time I chose" makes every "finished today"
 * count unauditable, and a client that forgets to clear it on un-tick leaves a
 * completion timestamp on unfinished work (blueprint EC-05).
 */
const completionFor = (isDone: boolean, existing: Date | null): Date | null => {
    if (!isDone) return null;
    return existing ?? new Date();
};

// ── list ──────────────────────────────────────────────────────

/**
 * `GET /api/tasks` — the master list (US-06).
 *
 * Every filter maps onto an index; none of this loads a day and filters in
 * memory, which is the whole reason tasks stopped being JSON on a note.
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { status, from, to, day, q } = req.query;

        const take = Math.min(Number.parseInt(String(req.query.limit ?? '100'), 10) || 100, 500);
        const skip = Math.max(Number.parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);

        const where: Prisma.TaskWhereInput = { userId, ...alive };

        if (typeof day === 'string' && dayKeySchema.safeParse(day).success) {
            where.scheduledFor = dayRange(day);
        } else {
            const range: Prisma.DateTimeFilter = {};
            if (typeof from === 'string' && !Number.isNaN(Date.parse(from))) range.gte = new Date(from);
            if (typeof to === 'string' && !Number.isNaN(Date.parse(to))) range.lt = new Date(to);
            if (range.gte || range.lt) where.scheduledFor = range;
        }

        if (status === 'open') where.isDone = false;
        if (status === 'done') where.isDone = true;
        if (status === 'overdue') {
            // Overdue is a real deadline that has passed on unfinished work — not
            // merely "planned for an earlier day", which is ordinary backlog.
            where.isDone = false;
            where.dueDate = { lt: new Date() };
        }

        if (typeof q === 'string' && q.trim()) {
            where.text = { contains: q.trim(), mode: 'insensitive' };
        }

        const [rows, total] = await Promise.all([
            prisma.task.findMany({
                where,
                orderBy: [{ scheduledFor: 'desc' }, { position: 'asc' }, { id: 'asc' }],
                take,
                skip,
            }),
            prisma.task.count({ where }),
        ]);

        res.json({ tasks: rows.map(formatTask), total, limit: take, offset: skip });
    } catch (err) {
        console.error('Error listing tasks:', err);
        res.status(500).json({ error: 'Failed to load tasks' });
    }
});

// ── one day ───────────────────────────────────────────────────

/** `GET /api/tasks/day/:date` — everything planned for one day, in order. */
router.get('/day/:date', authenticate, async (req: Request, res: Response): Promise<void> => {
    const parsed = dayKeySchema.safeParse(req.params.date);
    if (!parsed.success) {
        res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
        return;
    }
    try {
        const range = dayRange(parsed.data);
        const [rows, everWritten] = await Promise.all([
            prisma.task.findMany({
                where: { userId: req.user!.id, ...alive, scheduledFor: range },
                orderBy: [{ position: 'asc' }, { id: 'asc' }],
            }),
            // Soft-deleted rows included on purpose — see `migrated` below.
            prisma.task.count({ where: { userId: req.user!.id, scheduledFor: range } }),
        ]);

        /**
         * Has this day ever been written to the tasks table?
         *
         * The client still falls back to `Note.checklistItems` while the rollover
         * is in progress, and it needs to tell two states apart that both return
         * an empty list: a day that was never migrated, and a day whose tasks the
         * user has deleted. Falling back on the second would **resurrect deleted
         * todos** every time the page loaded. Counting soft-deleted rows as
         * evidence of a write is what separates them.
         */
        res.json({ date: parsed.data, tasks: rows.map(formatTask), migrated: everWritten > 0 });
    } catch (err) {
        console.error('Error loading day tasks:', err);
        res.status(500).json({ error: 'Failed to load tasks for that day' });
    }
});

/**
 * `PUT /api/tasks/day/:date` — reconcile a whole day in one transaction.
 *
 * The client sends the day as it should now be; the server works out the
 * difference. Matching is by `clientId`, which is why that column exists: it is
 * the only identity an item has before it has ever been saved, so without it
 * every save would delete and recreate the list and lose `createdAt`.
 *
 * **Deletes are soft and scoped to this day.** A row that has vanished from the
 * array is marked `deletedAt`, not removed, so a mis-click is recoverable and
 * history stays intact (blueprint D5).
 */
router.put(
    '/day/:date',
    authenticate,
    validate(syncDaySchema),
    async (req: Request, res: Response): Promise<void> => {
        const parsed = dayKeySchema.safeParse(req.params.date);
        if (!parsed.success) {
            res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
            return;
        }
        const dayKey = parsed.data;
        const userId = req.user!.id;
        const { tasks, noteId } = req.body as {
            tasks: Array<{ clientId: string; text: string; isDone: boolean; createdAt?: string | null }>;
            noteId?: number | null;
        };

        // Two items claiming the same identity would make the reconcile
        // order-dependent, and the unique index would reject it further in with a
        // message nobody can act on.
        const seen = new Set<string>();
        for (const t of tasks) {
            if (seen.has(t.clientId)) {
                res.status(400).json({ error: `Duplicate task id in payload: ${t.clientId}` });
                return;
            }
            seen.add(t.clientId);
        }

        try {
            const anchor = dayAnchor(dayKey);

            const result = await prisma.$transaction(async (tx) => {
                const existing = await tx.task.findMany({
                    where: { userId, ...alive, scheduledFor: dayRange(dayKey) },
                });
                const byClientId = new Map(existing.map((t) => [t.clientId, t]));

                let created = 0;
                let updated = 0;

                for (const [index, item] of tasks.entries()) {
                    const prev = byClientId.get(item.clientId);

                    if (!prev) {
                        await tx.task.create({
                            data: {
                                userId,
                                clientId: item.clientId,
                                text: item.text,
                                isDone: item.isDone,
                                completedAt: completionFor(item.isDone, null),
                                scheduledFor: anchor,
                                position: index,
                                noteId: noteId ?? null,
                                ...(item.createdAt ? { createdAt: new Date(item.createdAt) } : {}),
                            },
                        });
                        created += 1;
                        continue;
                    }

                    // Only write when something actually changed: an untouched
                    // save would otherwise bump `updatedAt` on every row of the
                    // day and make "recently changed" meaningless.
                    const same =
                        prev.text === item.text &&
                        prev.isDone === item.isDone &&
                        prev.position === index &&
                        (noteId === undefined || prev.noteId === (noteId ?? null));
                    if (same) continue;

                    await tx.task.update({
                        where: { id: prev.id },
                        data: {
                            text: item.text,
                            isDone: item.isDone,
                            completedAt: completionFor(item.isDone, prev.completedAt),
                            position: index,
                            ...(noteId !== undefined ? { noteId: noteId ?? null } : {}),
                        },
                    });
                    updated += 1;
                }

                const removed = existing.filter((t) => !seen.has(t.clientId));
                if (removed.length > 0) {
                    await tx.task.updateMany({
                        where: { id: { in: removed.map((t) => t.id) } },
                        data: { deletedAt: new Date() },
                    });
                }

                const fresh = await tx.task.findMany({
                    where: { userId, ...alive, scheduledFor: dayRange(dayKey) },
                    orderBy: [{ position: 'asc' }, { id: 'asc' }],
                });

                return { fresh, created, updated, deleted: removed.length };
            });

            res.json({
                date: dayKey,
                tasks: result.fresh.map(formatTask),
                changes: { created: result.created, updated: result.updated, deleted: result.deleted },
            });
        } catch (err) {
            console.error('Error syncing day tasks:', err);
            res.status(500).json({ error: 'Failed to save tasks for that day' });
        }
    },
);

// ── per-item CRUD ─────────────────────────────────────────────

router.post('/', authenticate, validate(createTaskSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { text, clientId, scheduledFor, dueDate, isDone, priority, position, noteId } = req.body;

        const dayTasks = await prisma.task.count({
            where: { userId, ...alive, scheduledFor: dayRange(String(scheduledFor).slice(0, 10)) },
        });
        if (dayTasks >= TASKS_PER_DAY_MAX) {
            res.status(400).json({ error: `A day can hold at most ${TASKS_PER_DAY_MAX} tasks` });
            return;
        }

        const done = isDone === true;
        const task = await prisma.task.create({
            data: {
                userId,
                clientId: clientId || newClientId(),
                text,
                isDone: done,
                completedAt: completionFor(done, null),
                scheduledFor: new Date(scheduledFor),
                dueDate: dueDate ? new Date(dueDate) : null,
                priority: priority ?? null,
                position: position ?? dayTasks,
                noteId: noteId ?? null,
            },
        });
        res.status(201).json({ task: formatTask(task) });
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            res.status(409).json({ error: 'A task with that id already exists' });
            return;
        }
        console.error('Error creating task:', err);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

router.patch('/:id', authenticate, validate(updateTaskSchema), async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    try {
        // Ownership is checked by reading first rather than trusted to the update
        // filter, so another user's id answers 404 and not 200-with-zero-rows.
        const existing = await prisma.task.findFirst({ where: { id, userId: req.user!.id, ...alive } });
        if (!existing) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        const b = req.body;
        const nextDone = b.isDone === undefined ? existing.isDone : b.isDone;

        const task = await prisma.task.update({
            where: { id },
            data: {
                ...(b.text !== undefined && { text: b.text }),
                ...(b.isDone !== undefined && { isDone: b.isDone }),
                ...(b.isDone !== undefined && { completedAt: completionFor(nextDone, existing.completedAt) }),
                ...(b.scheduledFor !== undefined && { scheduledFor: new Date(b.scheduledFor) }),
                ...(b.dueDate !== undefined && { dueDate: b.dueDate ? new Date(b.dueDate) : null }),
                ...(b.priority !== undefined && { priority: b.priority ?? null }),
                ...(b.position !== undefined && { position: b.position }),
                ...(b.noteId !== undefined && { noteId: b.noteId ?? null }),
            },
        });
        res.json({ task: formatTask(task) });
    } catch (err) {
        console.error('Error updating task:', err);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

/** Soft delete. `?hard=true` is not offered — nothing in the product needs it. */
router.delete('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
        res.status(404).json({ error: 'Task not found' });
        return;
    }
    try {
        const existing = await prisma.task.findFirst({ where: { id, userId: req.user!.id, ...alive } });
        if (!existing) {
            // Idempotent: deleting an already-deleted task is not an error, and a
            // retry after a dropped response must not 404.
            res.status(204).send();
            return;
        }
        await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
        res.status(204).send();
    } catch (err) {
        console.error('Error deleting task:', err);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

export default router;

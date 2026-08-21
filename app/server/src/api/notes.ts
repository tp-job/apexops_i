import express, { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createNoteSchema, updateNoteSchema, calendarParamsSchema } from '../schemas/note.schema';
import { resolveTimeZone, zonedDayOfMonth, zonedMonthRange } from '../utils/timezone';
import { overlapWhere } from './calendarEvents';

const router = express.Router();

const formatNote = (n: any) => ({
    id: n.id,
    userId: n.userId,
    title: n.title,
    content: n.content,
    /** Null for a plain-text note; readers fall back to `content`. */
    contentRich: n.contentRich ?? null,
    type: n.type,
    isPinned: n.isPinned,
    color: n.color,
    tags: n.tags || [],
    imageUrl: n.imageUrl,
    linkUrl: n.linkUrl,
    quote: n.quote || {},
    scheduledFor: n.scheduledFor ?? null,
    dueDate: n.dueDate ?? null,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
});

/**
 * Parses a route id, returning null for anything non-numeric so the caller can
 * answer 404 instead of handing `NaN` to Prisma and 500-ing.
 */
const parseNoteId = (raw: string | string[] | undefined): number | null => {
    if (typeof raw !== 'string') return null;
    const id = Number.parseInt(raw, 10);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/** Optional date fields arrive as ISO strings or explicit null; both are meaningful. */
const toDateOrNull = (v: unknown): Date | null => (typeof v === 'string' ? new Date(v) : null);

/**
 * Coerces a nullable `Json` column's value for Prisma.
 *
 * On a `Json?` field a bare `null` is ambiguous — Prisma cannot tell "store the
 * JSON value null" from "store SQL NULL" — and rejects it. `DbNull` is the one
 * that means "this note has no rich document", which is what clearing it is.
 */
const toJsonOrDbNull = (v: unknown) => (v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue));

// ── GET / ────────────────────────────────────────────────────
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const notes = await prisma.note.findMany({
            where: { userId: req.user!.id },
            orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        });
        res.json(notes.map(formatNote));
    } catch (err: any) {
        console.error('Error fetching notes:', err);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// ── GET /stats/overview ──────────────────────────────────────
router.get('/stats/overview', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const now = new Date();
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last6m = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

        const [total, byType, pinnedData, daily, monthly, byColor, recent] = await Promise.all([
            prisma.note.count({ where: { userId } }),
            prisma.note.groupBy({ by: ['type'], where: { userId }, _count: true }),
            prisma.note.groupBy({ by: ['isPinned'], where: { userId }, _count: true }),
            prisma.note.findMany({
                where: { userId, createdAt: { gte: last7d } },
                select: { createdAt: true },
            }),
            prisma.note.findMany({
                where: { userId, createdAt: { gte: last6m } },
                select: { createdAt: true },
            }),
            prisma.note.groupBy({ by: ['color'], where: { userId }, _count: true }),
            prisma.note.findMany({
                where: { userId },
                select: { id: true, title: true, type: true, createdAt: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' },
                take: 10,
            }),
        ]);

        // Format type stats
        const typeStats: Record<string, number> = { text: 0, image: 0, list: 0, link: 0 };
        byType.forEach((r) => { if (r.type) typeStats[r.type] = r._count; });

        // Format pinned
        let pinned = 0, unpinned = 0;
        pinnedData.forEach((r) => { if (r.isPinned) pinned = r._count; else unpinned = r._count; });

        // Daily stats (last 7 days)
        const dailyMap: Record<string, number> = {};
        daily.forEach((n) => {
            const d = n.createdAt.toISOString().split('T')[0];
            dailyMap[d] = (dailyMap[d] || 0) + 1;
        });
        const dailyStats = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now); date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            dailyStats.push({ date: dateStr, day: dayName, count: dailyMap[dateStr] || 0 });
        }

        // Monthly stats
        const monthlyMap: Record<string, { month: string; monthName: string; count: number }> = {};
        monthly.forEach((n) => {
            const d = n.createdAt;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap[key]) {
                monthlyMap[key] = { month: key, monthName: d.toLocaleDateString('en-US', { month: 'short' }), count: 0 };
            }
            monthlyMap[key].count++;
        });

        res.json({
            total,
            byType: typeStats,
            pinned: { pinned, unpinned },
            daily: dailyStats,
            monthly: Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)),
            byColor: byColor.map((r) => ({ color: r.color || 'default', count: r._count })),
            recentActivity: recent.map((r) => ({
                id: r.id, title: r.title, type: r.type, createdAt: r.createdAt, updatedAt: r.updatedAt,
            })),
        });
    } catch (err: any) {
        console.error('Error fetching note stats:', err);
        res.status(500).json({ error: 'Failed to fetch note statistics' });
    }
});

// ── GET /calendar/:year/:month ───────────────────────────────
router.get('/calendar/:year/:month', authenticate, async (req: Request, res: Response): Promise<void> => {
    const params = calendarParamsSchema.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: 'Invalid year or month' });
        return;
    }
    const { year, month } = params.data;

    try {
        const userId = req.user!.id;

        // Buckets resolve in the *user's* zone, not the server's.
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
        const timeZone = resolveTimeZone(user?.timezone);
        const { start, end } = zonedMonthRange(year, month, timeZone);

        // A note's calendar date is `scheduledFor` when set, otherwise `createdAt`.
        // The fallback is what keeps every pre-existing note exactly where it was
        // before scheduling existed, instead of emptying the calendar on migration.
        const inMonth = { gte: start, lt: end };
        const notes = await prisma.note.findMany({
            where: {
                userId,
                OR: [
                    { scheduledFor: inMonth },
                    { scheduledFor: null, createdAt: inMonth },
                ],
            },
            select: {
                id: true, title: true, type: true, color: true,
                scheduledFor: true, dueDate: true, createdAt: true, updatedAt: true,
            },
        });

        const notesByDay: Record<number, any[]> = {};
        notes
            .map((note) => ({ note, on: note.scheduledFor ?? note.createdAt }))
            .sort((a, b) => a.on.getTime() - b.on.getTime())
            .forEach(({ note, on }) => {
                const day = zonedDayOfMonth(on, timeZone);
                (notesByDay[day] ??= []).push({
                    id: note.id, title: note.title, type: note.type, color: note.color,
                    scheduledFor: note.scheduledFor, dueDate: note.dueDate,
                    createdAt: note.createdAt, updatedAt: note.updatedAt,
                    /** False when the note is only shown here because it was written that day. */
                    isScheduled: note.scheduledFor !== null,
                });
            });

        /**
         * Tasks and events for the same window (phase 3, F005).
         *
         * **`notesByDay` is untouched.** The two new maps sit beside it, so every
         * existing reader keeps working unchanged — this is additive, not a
         * reshape. That matters more than it looks: the calendar grid is the
         * oldest consumer here and the one most likely to be quietly depended on.
         *
         * Events use the overlap predicate, not a match on `startAt`, so a
         * meeting that crosses midnight is counted on both days it touches
         * (EC-12). Tasks cannot span days, so a plain range is right for them.
         */
        const [dayTasks, dayEvents] = await Promise.all([
            prisma.task.findMany({
                where: { userId, deletedAt: null, scheduledFor: inMonth },
                select: { id: true, text: true, isDone: true, scheduledFor: true, dueDate: true },
            }),
            prisma.calendarEvent.findMany({
                where: { userId, deletedAt: null, ...overlapWhere(start, end) },
                select: { id: true, title: true, startAt: true, endAt: true, isAllDay: true, color: true },
            }),
        ]);

        const tasksByDay: Record<number, any[]> = {};
        for (const t of dayTasks) {
            const day = zonedDayOfMonth(t.scheduledFor, timeZone);
            (tasksByDay[day] ??= []).push({
                id: t.id, text: t.text, checked: t.isDone,
                dueDate: t.dueDate, scheduledFor: t.scheduledFor,
            });
        }

        const eventsByDay: Record<number, any[]> = {};
        for (const e of dayEvents) {
            // One event lands on every day it covers, so this walks the span
            // rather than bucketing by its start.
            const last = new Date(Math.min(e.endAt.getTime(), end.getTime() - 1));
            for (let cursor = new Date(Math.max(e.startAt.getTime(), start.getTime())); cursor <= last; ) {
                const day = zonedDayOfMonth(cursor, timeZone);
                const bucket = (eventsByDay[day] ??= []);
                if (!bucket.some((x) => x.id === e.id)) {
                    bucket.push({
                        id: e.id, title: e.title, startAt: e.startAt, endAt: e.endAt,
                        isAllDay: e.isAllDay, color: e.color,
                    });
                }
                cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
            }
        }

        res.json({
            year, month, timeZone, notesByDay, totalNotes: notes.length,
            tasksByDay, eventsByDay,
            totalTasks: dayTasks.length, totalEvents: dayEvents.length,
        });
    } catch (err: any) {
        console.error('Error fetching calendar notes:', err);
        res.status(500).json({ error: 'Failed to fetch calendar notes' });
    }
});

// ── GET /:id ─────────────────────────────────────────────────
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
    const noteId = parseNoteId(req.params.id);
    if (noteId === null) { res.status(404).json({ error: 'Note not found' }); return; }

    try {
        const note = await prisma.note.findFirst({
            where: { id: noteId, userId: req.user!.id },
        });
        if (!note) { res.status(404).json({ error: 'Note not found' }); return; }
        res.json(formatNote(note));
    } catch (err: any) {
        console.error('Error fetching note:', err);
        res.status(500).json({ error: 'Failed to fetch note' });
    }
});

// ── POST / ───────────────────────────────────────────────────
router.post('/', authenticate, validate(createNoteSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        // `checklistItems` is deliberately absent: the column is gone (Phase 4).
        // An old client that still sends it is not an error — zod strips the
        // unknown key and the note is created without it.
        const { title, content, contentRich, type, isPinned, color, tags, imageUrl, linkUrl, quote, scheduledFor, dueDate } = req.body;

        const note = await prisma.note.create({
            data: {
                userId: req.user!.id, title, content, type,
                ...(contentRich !== undefined && { contentRich: toJsonOrDbNull(contentRich) }),
                isPinned, color: color || null, tags,
                imageUrl: imageUrl || null, linkUrl: linkUrl || null,
                quote,
                scheduledFor: toDateOrNull(scheduledFor),
                dueDate: toDateOrNull(dueDate),
            },
        });

        res.status(201).json(formatNote(note));
    } catch (err: any) {
        console.error('Error creating note:', err);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

const updateNoteHandler = async (req: Request, res: Response): Promise<void> => {
    const noteId = parseNoteId(req.params.id);
    if (noteId === null) { res.status(404).json({ error: 'Note not found' }); return; }

    try {
        const data: any = {};
        const fields = ['title', 'content', 'type', 'isPinned', 'color', 'tags', 'imageUrl', 'linkUrl', 'quote'];
        for (const f of fields) {
            if (req.body[f] !== undefined) data[f] = req.body[f];
        }
        // Nullable Json can't ride along above — a bare `null` is ambiguous to Prisma.
        if (req.body.contentRich !== undefined) data.contentRich = toJsonOrDbNull(req.body.contentRich);
        // Date fields need coercion, and an explicit `null` means "unschedule" —
        // so they can't ride along in the loop above.
        for (const f of ['scheduledFor', 'dueDate'] as const) {
            if (req.body[f] !== undefined) data[f] = toDateOrNull(req.body[f]);
        }

        if (Object.keys(data).length === 0) {
            res.status(400).json({ error: 'No fields to update' }); return;
        }

        const note = await prisma.note.updateMany({
            where: { id: noteId, userId: req.user!.id },
            data,
        });

        if (note.count === 0) { res.status(404).json({ error: 'Note not found or no changes made' }); return; }

        const updated = await prisma.note.findUnique({ where: { id: noteId } });
        res.json(formatNote(updated));
    } catch (err: any) {
        console.error('Error updating note:', err);
        res.status(500).json({ error: 'Failed to update note' });
    }
};

// ── PUT /:id ─────────────────────────────────────────────────
router.put('/:id', authenticate, validate(updateNoteSchema), updateNoteHandler);

// ── PATCH /:id ───────────────────────────────────────────────
router.patch('/:id', authenticate, validate(updateNoteSchema), updateNoteHandler);

// ── DELETE /:id ──────────────────────────────────────────────
router.delete('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
    const noteId = parseNoteId(req.params.id);
    if (noteId === null) { res.status(404).json({ error: 'Note not found' }); return; }

    try {
        const result = await prisma.note.deleteMany({
            where: { id: noteId, userId: req.user!.id },
        });
        if (result.count === 0) { res.status(404).json({ error: 'Note not found' }); return; }
        res.json({ message: 'Note deleted successfully', deleted: true, id: req.params.id });
    } catch (err: any) {
        console.error('Error deleting note:', err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

export default router;

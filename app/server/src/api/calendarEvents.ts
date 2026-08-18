import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createEventSchema, updateEventSchema } from '../schemas/calendarEvent.schema';

/**
 * Calendar events — the SSOT for "appointments" (blueprint D2, phase 3).
 *
 * Every row is scoped to `req.user.id`, and no route accepts a user id. That
 * absence is the access control: cross-user reads are impossible rather than
 * merely unimplemented.
 */

const router = express.Router();

const formatEvent = (e: {
    id: number;
    title: string;
    description: string | null;
    location: string | null;
    startAt: Date;
    endAt: Date;
    isAllDay: boolean;
    color: string | null;
    createdAt: Date;
    updatedAt: Date;
}) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt.toISOString(),
    isAllDay: e.isAllDay,
    color: e.color,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
});

const alive = { deletedAt: null };

const parseId = (raw: unknown): number | null => {
    if (typeof raw !== 'string') return null;
    const id = Number.parseInt(raw, 10);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/**
 * Everything that **overlaps** a window, not everything that starts in it.
 *
 * A meeting from 23:00 to 01:00 belongs to both days; a three-day trip belongs
 * to all three. Matching on `startAt`'s day would show each of those exactly
 * once, on its first day, and every day after would look empty (blueprint
 * EC-12).
 *
 * The comparison is deliberately asymmetric — `startAt < end` but
 * `endAt > start`, both strict — so an event finishing exactly at midnight does
 * not bleed into the following day, and one starting exactly at midnight is not
 * claimed by the day before.
 */
export const overlapWhere = (start: Date, end: Date) => ({
    startAt: { lt: end },
    endAt: { gt: start },
});

// ── list over a range ─────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { from, to } = req.query;
        if (typeof from !== 'string' || typeof to !== 'string' || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
            res.status(400).json({ error: 'from and to must be ISO datetimes' });
            return;
        }
        const rows = await prisma.calendarEvent.findMany({
            where: { userId: req.user!.id, ...alive, ...overlapWhere(new Date(from), new Date(to)) },
            orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
            take: 500,
        });
        res.json({ events: rows.map(formatEvent) });
    } catch (err) {
        console.error('Error listing calendar events:', err);
        res.status(500).json({ error: 'Failed to load events' });
    }
});

// ── create ────────────────────────────────────────────────────

router.post('/', authenticate, validate(createEventSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const b = req.body;
        const event = await prisma.calendarEvent.create({
            data: {
                userId: req.user!.id,
                title: b.title,
                description: b.description ?? null,
                location: b.location ?? null,
                startAt: new Date(b.startAt),
                endAt: new Date(b.endAt),
                isAllDay: b.isAllDay === true,
                color: b.color ?? null,
            },
        });
        res.status(201).json({ event: formatEvent(event) });
    } catch (err) {
        console.error('Error creating calendar event:', err);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// ── update ────────────────────────────────────────────────────

router.patch('/:id', authenticate, validate(updateEventSchema), async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    try {
        // Read first so another user's id answers 404 rather than a silent
        // zero-row update reported as success.
        const existing = await prisma.calendarEvent.findFirst({ where: { id, userId: req.user!.id, ...alive } });
        if (!existing) {
            res.status(404).json({ error: 'Event not found' });
            return;
        }

        const b = req.body;
        const nextStart = b.startAt ? new Date(b.startAt) : existing.startAt;
        const nextEnd = b.endAt ? new Date(b.endAt) : existing.endAt;
        // The schema can only compare fields present in the same request. A patch
        // touching one side has to be checked against the stored other side.
        if (nextEnd < nextStart) {
            res.status(400).json({ error: 'The end time cannot be before the start time' });
            return;
        }

        const event = await prisma.calendarEvent.update({
            where: { id },
            data: {
                ...(b.title !== undefined && { title: b.title }),
                ...(b.description !== undefined && { description: b.description ?? null }),
                ...(b.location !== undefined && { location: b.location ?? null }),
                ...(b.startAt !== undefined && { startAt: nextStart }),
                ...(b.endAt !== undefined && { endAt: nextEnd }),
                ...(b.isAllDay !== undefined && { isAllDay: b.isAllDay }),
                ...(b.color !== undefined && { color: b.color ?? null }),
            },
        });
        res.json({ event: formatEvent(event) });
    } catch (err) {
        console.error('Error updating calendar event:', err);
        res.status(500).json({ error: 'Failed to update event' });
    }
});

// ── delete ────────────────────────────────────────────────────

/** Soft, and idempotent: deleting twice is not an error (D5). */
router.delete('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params.id);
    if (id === null) {
        res.status(404).json({ error: 'Event not found' });
        return;
    }
    try {
        const existing = await prisma.calendarEvent.findFirst({ where: { id, userId: req.user!.id, ...alive } });
        if (!existing) {
            res.status(204).send();
            return;
        }
        await prisma.calendarEvent.update({ where: { id }, data: { deletedAt: new Date() } });
        res.status(204).send();
    } catch (err) {
        console.error('Error deleting calendar event:', err);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

export default router;

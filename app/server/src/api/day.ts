import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { dayKeySchema } from '../schemas/task.schema';
import { overlapWhere } from './calendarEvents';
import { resolveTimeZone, zonedDayRange } from '../utils/timezone';

/**
 * One day, whole (blueprint US-07, phase 3).
 *
 * The day panel needs a note, its tasks and its events together. Three separate
 * requests would render the panel in three stages — the note, then a jump as
 * tasks arrive, then another as events do — and any one of them can fail on its
 * own, leaving a panel that is partly true. One call is one paint and one
 * failure mode.
 *
 * This does not duplicate the other endpoints; it composes them. Nothing is
 * copied between tables — the three collections are joined by the date and
 * nothing else (D3).
 */

const router = express.Router();

const DAILY_TAG = 'daily';

router.get('/:date', authenticate, async (req: Request, res: Response): Promise<void> => {
    const parsed = dayKeySchema.safeParse(req.params.date);
    if (!parsed.success) {
        res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
        return;
    }

    const dayKey = parsed.data;
    const userId = req.user!.id;

    try {
        /**
         * The day window is resolved in the **user's** timezone, not UTC.
         *
         * The month calendar already buckets by `zonedDayOfMonth`, and a naive
         * UTC window here made the two disagree: an event ending at 00:00Z on the
         * 26th was listed on the 25th by this endpoint and the 26th by the
         * calendar. One question, one answer — blueprint D4.
         */
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
        const { start, end } = zonedDayRange(dayKey, resolveTimeZone(user?.timezone));

        const [notes, tasks, events] = await Promise.all([
            // A day's note is matched the same way the client matches it — type,
            // tag and schedule — so the panel and `/daily` never disagree about
            // which note belongs to a day.
            prisma.note.findMany({
                where: { userId, type: 'list', scheduledFor: { gte: start, lt: end } },
                select: { id: true, title: true, content: true, tags: true, updatedAt: true },
                orderBy: { id: 'asc' },
            }),
            prisma.task.findMany({
                where: { userId, deletedAt: null, scheduledFor: { gte: start, lt: end } },
                orderBy: [{ position: 'asc' }, { id: 'asc' }],
            }),
            prisma.calendarEvent.findMany({
                where: { userId, deletedAt: null, ...overlapWhere(start, end) },
                orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
            }),
        ]);

        const daily = notes.find((n) => Array.isArray(n.tags) && (n.tags as unknown[]).includes(DAILY_TAG)) ?? null;

        res.json({
            date: dayKey,
            // Absence is a normal state, not a 404: most days have no note.
            note: daily
                ? {
                      id: daily.id,
                      title: daily.title,
                      // Preview only. The panel shows a couple of lines and links
                      // to `/daily`; shipping the whole document to render three
                      // lines is waste on a panel that opens on every day click.
                      preview: (daily.content ?? '').slice(0, 240),
                      updatedAt: daily.updatedAt.toISOString(),
                  }
                : null,
            tasks: tasks.map((t) => ({
                id: t.clientId,
                taskId: t.id,
                text: t.text,
                checked: t.isDone,
                completedAt: t.completedAt ? t.completedAt.toISOString() : null,
                createdAt: t.createdAt.toISOString(),
                scheduledFor: t.scheduledFor.toISOString(),
                dueDate: t.dueDate ? t.dueDate.toISOString() : null,
                position: t.position,
            })),
            events: events.map((e) => ({
                id: e.id,
                title: e.title,
                description: e.description,
                location: e.location,
                startAt: e.startAt.toISOString(),
                endAt: e.endAt.toISOString(),
                isAllDay: e.isAllDay,
                color: e.color,
            })),
        });
    } catch (err) {
        console.error('Error loading day:', err);
        res.status(500).json({ error: 'Failed to load that day' });
    }
});

export default router;

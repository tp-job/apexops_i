import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createNoteSchema, updateNoteSchema } from '../schemas/note.schema';

const router = express.Router();

const formatNote = (n: any) => ({
    id: n.id,
    userId: n.userId,
    title: n.title,
    content: n.content,
    type: n.type,
    isPinned: n.isPinned,
    color: n.color,
    tags: n.tags || [],
    imageUrl: n.imageUrl,
    linkUrl: n.linkUrl,
    checklistItems: n.checklistItems || [],
    quote: n.quote || {},
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
});

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
    try {
        const year = parseInt(req.params.year as string);
        const month = parseInt(req.params.month as string);
        const userId = req.user!.id;

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        const notes = await prisma.note.findMany({
            where: { userId, createdAt: { gte: startDate, lt: endDate } },
            select: { id: true, title: true, type: true, color: true, createdAt: true, updatedAt: true },
            orderBy: { createdAt: 'asc' },
        });

        const notesByDay: Record<number, any[]> = {};
        notes.forEach((note) => {
            const day = note.createdAt.getDate();
            if (!notesByDay[day]) notesByDay[day] = [];
            notesByDay[day].push({
                id: note.id, title: note.title, type: note.type,
                color: note.color, createdAt: note.createdAt, updatedAt: note.updatedAt,
            });
        });

        res.json({ year, month, notesByDay, totalNotes: notes.length });
    } catch (err: any) {
        console.error('Error fetching calendar notes:', err);
        res.status(500).json({ error: 'Failed to fetch calendar notes' });
    }
});

// ── GET /:id ─────────────────────────────────────────────────
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const note = await prisma.note.findFirst({
            where: { id: parseInt(req.params.id as string), userId: req.user!.id },
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
        const { title, content, type, isPinned, color, tags, imageUrl, linkUrl, checklistItems, quote } = req.body;

        const note = await prisma.note.create({
            data: {
                userId: req.user!.id, title, content, type,
                isPinned, color: color || null, tags,
                imageUrl: imageUrl || null, linkUrl: linkUrl || null,
                checklistItems, quote,
            },
        });

        res.status(201).json(formatNote(note));
    } catch (err: any) {
        console.error('Error creating note:', err);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

const updateNoteHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const data: any = {};
        const fields = ['title', 'content', 'type', 'isPinned', 'color', 'tags', 'imageUrl', 'linkUrl', 'checklistItems', 'quote'];
        for (const f of fields) {
            if (req.body[f] !== undefined) data[f] = req.body[f];
        }

        if (Object.keys(data).length === 0) {
            res.status(400).json({ error: 'No fields to update' }); return;
        }

        const note = await prisma.note.updateMany({
            where: { id: parseInt(req.params.id as string), userId: req.user!.id },
            data,
        });

        if (note.count === 0) { res.status(404).json({ error: 'Note not found or no changes made' }); return; }

        const updated = await prisma.note.findUnique({ where: { id: parseInt(req.params.id as string) } });
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
    try {
        const result = await prisma.note.deleteMany({
            where: { id: parseInt(req.params.id as string), userId: req.user!.id },
        });
        if (result.count === 0) { res.status(404).json({ error: 'Note not found' }); return; }
        res.json({ message: 'Note deleted successfully', deleted: true, id: req.params.id });
    } catch (err: any) {
        console.error('Error deleting note:', err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

export default router;

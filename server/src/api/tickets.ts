import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTicketSchema, updateTicketSchema } from '../schemas/ticket.schema';
import { Prisma } from '@prisma/client';

const router = express.Router();
router.use(authenticate);

const formatTicket = (t: any) => ({
    id: t.id ? `TICK-${String(t.id).padStart(3, '0')}` : t.id,
    title: t.title || '',
    description: t.description || '',
    status: t.status || 'open',
    priority: t.priority || 'medium',
    assignee: t.assignee || undefined,
    reporter: t.reporter || 'System',
    createdAt: t.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: t.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    tags: Array.isArray(t.tags) ? t.tags : [],
    relatedLogs: Array.isArray(t.relatedLogs) ? t.relatedLogs : [],
});

// ── GET / ────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { status, priority, assignee, limit = '100', offset = '0' } = req.query;

        const where: Prisma.TicketWhereInput = {};
        if (status) where.status = status as string;
        if (priority) where.priority = priority as string;
        if (assignee) where.assignee = assignee as string;

        const tickets = await prisma.ticket.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string),
            skip: parseInt(offset as string),
        });

        res.json(tickets.map(formatTicket));
    } catch (err: any) {
        console.error('Error fetching tickets:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch tickets' });
    }
});

// ── GET /stats ───────────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
    try {
        const [total, open, inProgress, resolved, closed, critical, high, medium, low] = await Promise.all([
            prisma.ticket.count(),
            prisma.ticket.count({ where: { status: 'open' } }),
            prisma.ticket.count({ where: { status: 'in-progress' } }),
            prisma.ticket.count({ where: { status: 'resolved' } }),
            prisma.ticket.count({ where: { status: 'closed' } }),
            prisma.ticket.count({ where: { priority: 'critical' } }),
            prisma.ticket.count({ where: { priority: 'high' } }),
            prisma.ticket.count({ where: { priority: 'medium' } }),
            prisma.ticket.count({ where: { priority: 'low' } }),
        ]);

        res.json({
            total,
            byStatus: { open, inProgress, resolved, closed },
            byPriority: { critical, high, medium, low },
        });
    } catch (err: any) {
        console.error('Error fetching ticket stats:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch stats' });
    }
});

// ── GET /:id ─────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const ticketId = parseInt((req.params.id as string).replace('TICK-', ''));
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }
        res.json(formatTicket(ticket));
    } catch (err: any) {
        console.error('Error fetching ticket:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch ticket' });
    }
});

// ── POST / ───────────────────────────────────────────────────
router.post('/', validate(createTicketSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, status, priority, assignee, reporter, tags, relatedLogs } = req.body;

        const ticket = await prisma.ticket.create({
            data: { title, description, status, priority, assignee: assignee || null, reporter, tags, relatedLogs },
        });

        res.status(201).json(formatTicket(ticket));
    } catch (err: any) {
        console.error('Error creating ticket:', err);
        res.status(500).json({ error: err.message || 'Failed to create ticket' });
    }
});

// ── PUT /:id ─────────────────────────────────────────────────
router.put('/:id', validate(updateTicketSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const ticketId = parseInt((req.params.id as string).replace('TICK-', ''));
        const { title, description, status, priority, assignee, tags } = req.body;

        const ticket = await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(status !== undefined && { status }),
                ...(priority !== undefined && { priority }),
                ...(assignee !== undefined && { assignee: assignee || null }),
                ...(tags !== undefined && { tags }),
            },
        });

        res.json(formatTicket(ticket));
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Ticket not found' }); return; }
        console.error('Error updating ticket:', err);
        res.status(500).json({ error: err.message || 'Failed to update ticket' });
    }
});

// ── DELETE /:id ──────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const ticketId = parseInt((req.params.id as string).replace('TICK-', ''));
        await prisma.ticket.delete({ where: { id: ticketId } });
        res.json({ deleted: true, id: req.params.id });
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Ticket not found' }); return; }
        console.error('Error deleting ticket:', err);
        res.status(500).json({ error: err.message || 'Failed to delete ticket' });
    }
});

export default router;

import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createLogSchema, batchLogSchema } from '../schemas/log.schema';
import { Prisma } from '@prisma/client';

const router = express.Router();
router.use(authenticate);

const formatLog = (row: any) => ({
    id: row.id.toString(),
    timestamp: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
    level: row.level || 'info',
    message: row.message || '',
    source: row.source || 'unknown',
    stack: row.stack || undefined,
});

// ── GET / ────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { level, source, limit = '100', offset = '0' } = req.query;

        const where: Prisma.LogWhereInput = {};
        if (level) where.level = level as string;
        if (source) where.source = { contains: source as string, mode: 'insensitive' };

        const logs = await prisma.log.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string),
            skip: parseInt(offset as string),
        });

        res.json(logs.map(formatLog));
    } catch (err: any) {
        console.error('Error fetching logs:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch logs' });
    }
});

// ── GET /stats ───────────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [total, errors, warnings, info, last24Hours, last7Days] = await Promise.all([
            prisma.log.count(),
            prisma.log.count({ where: { level: 'error' } }),
            prisma.log.count({ where: { level: 'warning' } }),
            prisma.log.count({ where: { level: 'info' } }),
            prisma.log.count({ where: { createdAt: { gt: last24h } } }),
            prisma.log.count({ where: { createdAt: { gt: last7d } } }),
        ]);

        res.json({ total, byLevel: { errors, warnings, info }, last24Hours, last7Days });
    } catch (err: any) {
        console.error('Error fetching log stats:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch stats' });
    }
});

// ── GET /:id ─────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const log = await prisma.log.findUnique({ where: { id: parseInt(req.params.id as string) } });
        if (!log) { res.status(404).json({ error: 'Log not found' }); return; }
        res.json(formatLog(log));
    } catch (err: any) {
        console.error('Error fetching log:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch log' });
    }
});

// ── POST / ───────────────────────────────────────────────────
router.post('/', validate(createLogSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const { level, message, source, stack } = req.body;
        const log = await prisma.log.create({ data: { level, message, source, stack: stack || null } });
        res.status(201).json(formatLog(log));
    } catch (err: any) {
        console.error('Error creating log:', err);
        res.status(500).json({ error: err.message || 'Failed to create log' });
    }
});

// ── POST /batch ──────────────────────────────────────────────
router.post('/batch', validate(batchLogSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const { logs: logEntries } = req.body;
        const created: any[] = [];

        for (const entry of logEntries) {
            if (entry.message) {
                const log = await prisma.log.create({
                    data: { level: entry.level || 'info', message: entry.message, source: entry.source || 'unknown', stack: entry.stack || null },
                });
                created.push(formatLog(log));
            }
        }

        res.status(201).json({ created: created.length, logs: created });
    } catch (err: any) {
        console.error('Error creating batch logs:', err);
        res.status(500).json({ error: err.message || 'Failed to create logs' });
    }
});

// ── DELETE /:id ──────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        await prisma.log.delete({ where: { id: parseInt(req.params.id as string) } });
        res.json({ deleted: true, id: req.params.id });
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Log not found' }); return; }
        console.error('Error deleting log:', err);
        res.status(500).json({ error: err.message || 'Failed to delete log' });
    }
});

// ── DELETE / ─────────────────────────────────────────────────
router.delete('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { level, olderThan } = req.query;
        const where: Prisma.LogWhereInput = {};
        if (level) where.level = level as string;
        if (olderThan) where.createdAt = { lt: new Date(olderThan as string) };

        const result = await prisma.log.deleteMany({ where });
        res.json({ deleted: result.count });
    } catch (err: any) {
        console.error('Error deleting logs:', err);
        res.status(500).json({ error: err.message || 'Failed to delete logs' });
    }
});

export default router;

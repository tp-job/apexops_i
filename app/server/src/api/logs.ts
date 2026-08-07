import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
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
/**
 * Gated 2026-08-04 (Sprint 5, criterion 14).
 *
 * The workspaces sprint closed the *bulk* delete below but left this one on
 * `authenticate` alone — so any signed-in user could delete any log row by
 * guessing an integer. Logs are instance-wide and carry no owner to check
 * against, which leaves the role as the only boundary available.
 *
 * Found by the sweep that S-D5 asked for: gate the endpoints in the same pass
 * that makes the role mean something, rather than filing it as a security ticket
 * for a later sprint that has not been scheduled.
 */
router.delete('/:id', authorize('admin'), async (req: Request, res: Response): Promise<void> => {
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
/**
 * Bulk log deletion. Closed 2026-07-27 (spec G2).
 *
 * This route previously took `authenticate` only and built `where` from optional
 * query params — so `DELETE /api/logs` with no parameters was `deleteMany({})`,
 * an unrecoverable wipe of every log row, reachable by **any** signed-in user.
 * Two independent problems, so two independent fixes:
 *
 *   1. `authorize('admin')` — bulk destruction is not a normal-user action.
 *   2. A filter is now REQUIRED. Even an admin cannot issue an unfiltered wipe by
 *      accident; deleting everything has to be spelled out as `all=true`.
 *
 * Defence in depth on purpose: the role check is the boundary, and the required
 * filter is what stops a mis-typed curl from an account that legitimately holds
 * the role.
 */
router.delete('/', authorize('admin'), async (req: Request, res: Response): Promise<void> => {
    try {
        const { level, olderThan, all } = req.query;

        const where: Prisma.LogWhereInput = {};
        if (level) where.level = level as string;
        if (olderThan) {
            const cutoff = new Date(olderThan as string);
            if (Number.isNaN(cutoff.getTime())) {
                res.status(400).json({ error: 'olderThan must be a valid date' });
                return;
            }
            where.createdAt = { lt: cutoff };
        }

        if (!Object.keys(where).length && all !== 'true') {
            res.status(400).json({
                error: 'Refusing to delete every log without an explicit filter',
                detail: 'Pass level and/or olderThan, or all=true to confirm a full wipe.',
            });
            return;
        }

        const result = await prisma.log.deleteMany({ where });
        console.warn(`⚠️  ${req.user?.email} deleted ${result.count} log(s) with filter ${JSON.stringify(req.query)}`);
        res.json({ deleted: result.count });
    } catch (err: any) {
        console.error('Error deleting logs:', err);
        res.status(500).json({ error: err.message || 'Failed to delete logs' });
    }
});

export default router;

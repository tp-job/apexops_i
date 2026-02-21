import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = express.Router();

interface SessionData {
    url: string;
    appName: string;
    userId: number;
    startedAt: string;
    logCount: number;
    status: string;
}

// Store active monitoring sessions
export const activeSessions = new Map<string, SessionData>();

// ── GET /sessions ────────────────────────────────────────────
router.get('/sessions', authenticate, async (_req: Request, res: Response): Promise<void> => {
    try {
        const sessions = Array.from(activeSessions.entries()).map(([id, data]) => ({ sessionId: id, ...data }));
        res.json({ total: sessions.length, sessions });
    } catch (err) {
        console.error('Error getting sessions:', err);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

// ── POST /sessions ───────────────────────────────────────────
router.post('/sessions', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { url, appName } = req.body;
        if (!url) { res.status(400).json({ error: 'URL is required' }); return; }
        try { new URL(url); } catch { res.status(400).json({ error: 'Invalid URL format' }); return; }

        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        activeSessions.set(sessionId, {
            url, appName: appName || url, userId: req.user!.id,
            startedAt: new Date().toISOString(), logCount: 0, status: 'active',
        });

        res.status(201).json({ sessionId, url, appName: appName || url, startedAt: new Date().toISOString() });
    } catch (err) {
        console.error('Error creating session:', err);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// ── DELETE /sessions/:sessionId ──────────────────────────────
router.delete('/sessions/:sessionId', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const sessionId = req.params.sessionId as string;
        if (!activeSessions.has(sessionId)) { res.status(404).json({ error: 'Session not found' }); return; }
        const session = activeSessions.get(sessionId)!;
        if (session.userId !== req.user!.id) { res.status(403).json({ error: 'Unauthorized' }); return; }
        activeSessions.delete(sessionId);
        res.json({ message: 'Session stopped', sessionId, logCount: session.logCount });
    } catch (err) {
        console.error('Error stopping session:', err);
        res.status(500).json({ error: 'Failed to stop session' });
    }
});

// ── GET /logs/:sessionId ─────────────────────────────────────
router.get('/logs/:sessionId', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const sessionId = req.params.sessionId as string;
        const level = req.query.level as string | undefined;
        const limit = (req.query.limit as string) || '100';
        const offset = (req.query.offset as string) || '0';
        if (!activeSessions.has(sessionId)) { res.status(404).json({ error: 'Session not found' }); return; }
        const session = activeSessions.get(sessionId)!;

        const where: Prisma.LogWhereInput = { source: session.url };
        if (level) where.level = level;

        const logs = await prisma.log.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset),
        });

        res.json({
            sessionId, total: logs.length,
            logs: logs.map((r) => ({
                id: r.id.toString(), timestamp: r.createdAt.toISOString(),
                level: r.level, message: r.message, source: r.source, stack: r.stack || undefined,
            })),
        });
    } catch (err) {
        console.error('Error getting logs:', err);
        res.status(500).json({ error: 'Failed to get logs' });
    }
});

// ── GET /stats/:sessionId ────────────────────────────────────
router.get('/stats/:sessionId', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const sessionId = req.params.sessionId as string;
        if (!activeSessions.has(sessionId)) { res.status(404).json({ error: 'Session not found' }); return; }
        const session = activeSessions.get(sessionId)!;

        const [total, errors, warnings, info] = await Promise.all([
            prisma.log.count({ where: { source: session.url } }),
            prisma.log.count({ where: { source: session.url, level: 'error' } }),
            prisma.log.count({ where: { source: session.url, level: 'warning' } }),
            prisma.log.count({ where: { source: session.url, level: 'info' } }),
        ]);

        const firstLog = await prisma.log.findFirst({ where: { source: session.url }, orderBy: { createdAt: 'asc' } });
        const lastLog = await prisma.log.findFirst({ where: { source: session.url }, orderBy: { createdAt: 'desc' } });

        res.json({
            sessionId, url: session.url, startedAt: session.startedAt,
            stats: { total, errors, warnings, info, firstLog: firstLog?.createdAt, lastLog: lastLog?.createdAt },
        });
    } catch (err) {
        console.error('Error getting stats:', err);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// ── POST /clear/:sessionId ──────────────────────────────────
router.post('/clear/:sessionId', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const sessionId = req.params.sessionId as string;
        if (!activeSessions.has(sessionId)) { res.status(404).json({ error: 'Session not found' }); return; }
        const session = activeSessions.get(sessionId)!;
        if (session.userId !== req.user!.id) { res.status(403).json({ error: 'Unauthorized' }); return; }

        const result = await prisma.log.deleteMany({ where: { source: session.url } });
        res.json({ message: 'Logs cleared', sessionId, deleted: result.count });
    } catch (err) {
        console.error('Error clearing logs:', err);
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});

// Helper
export function updateSessionLogCount(url: string): void {
    for (const [, session] of activeSessions.entries()) {
        if (session.url === url) session.logCount++;
    }
}

export default router;

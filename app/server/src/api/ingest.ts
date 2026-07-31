import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import prisma from '../lib/prisma';
import { fingerprintEvent } from '../lib/fingerprint';
import { ingestSchema, MAX_BATCH_EVENTS } from '../schemas/ingest.schema';
import { isIngestKeyShaped } from '../lib/projectKeys';
import { dispatchRegressionAlert, type RegressionAlertInput } from '../lib/alerts';
import { Prisma } from '@prisma/client';

/**
 * `POST /api/ingest` — the SDK's only endpoint.
 *
 * Replaces `POST /api/console-logs/realtime`, which had no auth, no rate limit and
 * no project scope: anyone who viewed source on a monitored page could write
 * unbounded rows into `logs`.
 *
 * Trust model (spec D4): the key here is PUBLIC. It authorizes writing events into
 * exactly one project and nothing else — it can never read. So the defences are
 * blast-radius defences, not secrecy: per-key rate limit, per-IP burst cap, hard
 * body cap, bounded batch size, and an optional origin allowlist.
 */

const router = express.Router();

// ── CORS: scoped to this route only ──────────────────────────
// The app's CORS is pinned to the frontend origin (`server.ts`) and must stay
// that way. Ingest is the one endpoint that legitimately accepts cross-origin
// posts from arbitrary sites, so it gets its own permissive policy here rather
// than the global one being loosened — that distinction is the whole point.
//
// `origin: true` reflects the caller's origin instead of `*` and `credentials`
// stays off: the key travels in the body or a custom header, never a cookie, so
// there is nothing for a browser to attach ambiently and no CSRF surface.
const ingestCors = cors({
    origin: true,
    credentials: false,
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Apexops-Key'],
    maxAge: 86_400,
});

router.use(ingestCors);
router.options('/', ingestCors);

// Overrides the app-level `express.json()` default of 100kB. A full batch of
// stack traces legitimately exceeds that; beyond 1MB it is abuse, not telemetry.
router.use(express.json({ limit: '1mb' }));

// A body over the cap surfaces as a raw 413 from body-parser with an HTML-ish
// error. The SDK needs a JSON answer it can back off on, not a parser stack.
router.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err?.type === 'entity.too.large') {
        res.status(413).json({ error: 'Payload too large', maxBytes: 1_048_576 });
        return;
    }
    next(err);
});

// ── Rate limiting ────────────────────────────────────────────
/**
 * Two independent buckets, because they stop different things:
 *   - per key   — one misbehaving integration cannot fill the database
 *   - per IP    — one host cannot burn through many projects' budgets at once
 *
 * In-memory and therefore per-process: this is a blast-radius limiter, not a
 * billing meter, and a restart resetting it is acceptable. Moving it to Redis is
 * only worth doing when the server actually runs multi-instance.
 */
const WINDOW_MS = 60_000;
const DEFAULT_PER_KEY = 300;
const DEFAULT_PER_IP = 600;

interface Bucket { count: number; windowStart: number }
const keyBuckets = new Map<string, Bucket>();
const ipBuckets = new Map<string, Bucket>();

function overLimit(store: Map<string, Bucket>, id: string, limit: number): boolean {
    const now = Date.now();
    const b = store.get(id);
    if (!b || now - b.windowStart >= WINDOW_MS) {
        store.set(id, { count: 1, windowStart: now });
        return false;
    }
    b.count += 1;
    return b.count > limit;
}

/**
 * Unbounded Maps keyed by attacker-supplied values are a memory leak with extra
 * steps — a script cycling fake keys would grow the map forever. Sweeping on a
 * timer keeps it proportional to *active* clients rather than to every value
 * ever seen. `unref()` so this never holds the process open.
 */
const sweeper = setInterval(() => {
    const cutoff = Date.now() - WINDOW_MS * 2;
    for (const store of [keyBuckets, ipBuckets]) {
        for (const [id, b] of store) if (b.windowStart < cutoff) store.delete(id);
    }
}, WINDOW_MS);
sweeper.unref();

const clientIp = (req: Request): string =>
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || req.ip || 'unknown';

// ── POST / ───────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response): Promise<void> => {
    const headerKey = req.header('X-Apexops-Key');
    const bodyKey = typeof req.body?.key === 'string' ? req.body.key : undefined;
    const key = headerKey || bodyKey;

    // Shape-check before touching the database so a flood of garbage keys costs
    // a regex rather than an indexed lookup each.
    if (!key || !isIngestKeyShaped(key)) {
        res.status(401).json({ error: 'Missing or malformed ingest key' });
        return;
    }

    const ip = clientIp(req);
    if (overLimit(ipBuckets, ip, DEFAULT_PER_IP)) {
        res.setHeader('Retry-After', '60');
        res.status(429).json({ error: 'Rate limit exceeded' });
        return;
    }
    if (overLimit(keyBuckets, key, DEFAULT_PER_KEY)) {
        res.setHeader('Retry-After', '60');
        res.status(429).json({ error: 'Rate limit exceeded for this project' });
        return;
    }

    const parsed = ingestSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            error: 'Invalid payload',
            details: parsed.error.issues.slice(0, 10).map((e) => ({ field: e.path.join('.'), message: e.message })),
            maxEvents: MAX_BATCH_EVENTS,
        });
        return;
    }

    try {
        const project = await prisma.project.findUnique({
            where: { ingestKey: key },
            select: { id: true, archivedAt: true, allowedOrigins: true, captureLevels: true },
        });

        // Same answer for "no such key" and "archived project": a distinguishable
        // response would let someone probe which keys are live.
        if (!project || project.archivedAt) {
            res.status(401).json({ error: 'Invalid ingest key' });
            return;
        }

        const allowed = Array.isArray(project.allowedOrigins)
            ? project.allowedOrigins.filter((o): o is string => typeof o === 'string')
            : [];
        if (allowed.length && !allowed.includes('*')) {
            const origin = req.header('Origin');
            // A missing Origin is not treated as permission. Browsers always send
            // it on cross-origin POSTs, so absence means a non-browser caller —
            // exactly what an allowlist is meant to exclude.
            if (!origin || !allowed.includes(origin)) {
                res.status(403).json({ error: 'Origin not allowed for this project' });
                return;
            }
        }

        const levels = Array.isArray(project.captureLevels)
            ? project.captureLevels.filter((l): l is string => typeof l === 'string')
            : ['error', 'warn'];

        // Server-side level filtering, even though the SDK filters too. The SDK's
        // config is a hint from a client we do not control; this is the enforcement.
        const events = parsed.data.events.filter((e) => levels.includes(e.level));
        if (!events.length) {
            res.status(202).json({ accepted: 0, dropped: parsed.data.events.length, reason: 'level not captured' });
            return;
        }

        // Group in memory first so a batch containing the same error 50 times
        // becomes one issue upsert, not 50.
        const groups = new Map<string, { fingerprint: string; title: string; culprit: string | null; level: string; count: number; events: typeof events }>();
        for (const e of events) {
            const g = fingerprintEvent({ projectId: project.id, level: e.level, message: e.message, stack: e.stack });
            const existing = groups.get(g.fingerprint);
            if (existing) {
                existing.count += e.count;
                existing.events.push(e);
            } else {
                groups.set(g.fingerprint, { ...g, level: e.level, count: e.count, events: [e] });
            }
        }

        const now = new Date();
        let accepted = 0;
        const issueIds: number[] = [];
        const regressionAlerts: RegressionAlertInput[] = [];

        for (const g of groups.values()) {
            // Upsert on @@unique([projectId, fingerprint]) — concurrent batches for
            // the same error converge on one row instead of racing to insert two.
            const issue = await prisma.issue.upsert({
                where: { projectId_fingerprint: { projectId: project.id, fingerprint: g.fingerprint } },
                create: {
                    projectId: project.id,
                    fingerprint: g.fingerprint,
                    level: g.level,
                    title: g.title,
                    culprit: g.culprit,
                    count: g.count,
                    firstSeen: now,
                    lastSeen: now,
                },
                update: {
                    count: { increment: g.count },
                    lastSeen: now,
                },
                select: { id: true, status: true },
            });

            // A resolved issue that happens again is a REGRESSION and has to come
            // back to the top of the list, or the tracker quietly hides recurring
            // bugs. `ignored` deliberately stays ignored — that is the user asking
            // not to be told, which a regression should not override.
            //
            // The flip and its audit row are written together: `Issue.status` holds
            // only the current value, so without the audit row the regression is
            // invisible the moment it happens, and "regressions this week" — the
            // most actionable number on a project overview — is uncomputable.
            if (issue.status === 'resolved') {
                const [reopened] = await prisma.$transaction([
                    prisma.issue.update({
                        where: { id: issue.id },
                        data: {
                            status: 'unresolved',
                            reopenCount: { increment: 1 },
                            lastReopenedAt: now,
                        },
                        select: { id: true, title: true, culprit: true, reopenCount: true },
                    }),
                    prisma.issueStatusChange.create({
                        data: {
                            issueId: issue.id,
                            projectId: project.id,
                            fromStatus: 'resolved',
                            toStatus: 'unresolved',
                            reason: 'regression',
                            // No actor: ingest is a key, not a signed-in user.
                            createdAt: now,
                        },
                    }),
                ]);

                // Alert AFTER the transaction commits, and deliberately not awaited
                // into the response path beyond its own bounded work: the reporting
                // client is a third-party page waiting on a 202, and it should not
                // wait on our webhook to someone's Slack. `dispatchRegressionAlert`
                // never throws (see lib/alerts.ts).
                regressionAlerts.push({
                    projectId: project.id,
                    issueId: reopened.id,
                    issueTitle: reopened.title,
                    culprit: reopened.culprit,
                    reopenCount: reopened.reopenCount,
                });
            }

            issueIds.push(issue.id);

            // createMany, not a create per row: the endpoint this replaces issued
            // one round trip per log in a sequential await loop.
            const { count } = await prisma.event.createMany({
                data: g.events.map((e) => ({
                    projectId: project.id,
                    issueId: issue.id,
                    level: e.level,
                    message: e.message.slice(0, 8_192),
                    stack: e.stack ?? null,
                    url: e.url ?? null,
                    userAgent: e.userAgent ?? req.header('User-Agent')?.slice(0, 512) ?? null,
                    release: e.release ?? null,
                    context: (e.context ?? {}) as Prisma.InputJsonValue,
                    createdAt: now,
                })),
            });
            accepted += count;
        }

        res.status(202).json({
            accepted,
            issues: issueIds.length,
            dropped: parsed.data.events.length - events.length,
            regressions: regressionAlerts.length,
        });

        // Dispatched after the response is sent. The SDK on a third-party page is
        // waiting on this request; it must not also wait on our outbound webhook.
        // Errors are contained inside dispatchRegressionAlert.
        for (const alert of regressionAlerts) {
            void dispatchRegressionAlert(alert);
        }
    } catch (err: any) {
        console.error('Ingest error:', err);
        res.status(500).json({ error: 'Failed to ingest events' });
    }
});

export default router;

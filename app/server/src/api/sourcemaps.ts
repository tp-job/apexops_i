import express, { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { canAdminister, resolveMembership } from '../lib/projectAccess';
import { invalidateSourceMap } from '../lib/sourcemaps';

/**
 * Source-map upload, list and delete.
 *
 * Mounted on the projects router root alongside `api/team.ts`, so every route
 * here sits behind `authenticate` (parent router) **and** `resolveMembership`.
 * That placement is the security control, not a convenience: the ingest key is
 * public by design — it ships inside a `<script>` tag on pages we do not
 * control — and it can reach `/api/ingest` and nothing else. It cannot reach
 * this file, which is the difference between a monitoring tool and a service
 * that publishes its customers' source code.
 *
 * **The request body IS the map** (build-spec D2). A `.map` file is JSON, so
 * asking for it wrapped in an envelope would mean double-encoding several
 * megabytes for no reason, and adding multipart would mean a file-upload
 * dependency and a temp-file lifecycle for one endpoint. The recipe is one
 * `curl --data-binary @dist/app.js.map`, which is the difference between a
 * feature people wire into CI and a feature people mean to wire into CI.
 */
const router = express.Router();

/**
 * 12 MB. A large production React bundle's map runs 1–6 MB; twice the biggest
 * realistic case leaves room without turning the endpoint into a way to fill
 * the disk.
 *
 * Applied **per route**, so the global `express.json()` 100 kB default that
 * protects every other endpoint stays exactly where it is.
 */
const MAX_MAP_BYTES = 12 * 1024 * 1024;
const MAX_MAP_LABEL = '12 MB';

const mapBodyParser = express.json({ limit: MAX_MAP_BYTES, type: () => true });

/**
 * Turns body-parser's failures into answers the uploader can act on.
 *
 * Without this they surface as the generic 500 handler, and "something went
 * wrong" is a uniquely bad response to a CI step that just uploaded 40 MB by
 * mistake.
 */
const handleBodyErrors = (err: any, _req: Request, res: Response, next: NextFunction): void => {
    if (err?.type === 'entity.too.large') {
        res.status(413).json({ error: `Source map is too large. The limit is ${MAX_MAP_LABEL}.` });
        return;
    }
    if (err?.type === 'entity.parse.failed') {
        res.status(400).json({ error: 'Body is not valid JSON. A .map file should be uploaded verbatim.' });
        return;
    }
    next(err);
};

/** A single path segment. Rejects traversal and directories outright. */
const isSafeFileName = (name: string): boolean =>
    /^[\w.\-+@]{1,255}$/.test(name) && !name.includes('..');

/**
 * Is this actually a source map?
 *
 * Checked because the alternative is storing whatever was posted and finding out
 * at read time, during an incident. `version`, `sources` and `mappings` are the
 * three fields the spec requires; a file with all three and nothing else useful
 * will simply resolve nothing, which is a survivable outcome.
 */
const looksLikeSourceMap = (body: unknown): body is Record<string, unknown> => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
    const m = body as Record<string, unknown>;
    return (
        (m.version === 3 || m.version === '3') &&
        Array.isArray(m.sources) &&
        typeof m.mappings === 'string'
    );
};

const asString = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null;

// ── POST /:slug/sourcemaps ───────────────────────────────────
router.post(
    '/:slug/sourcemaps',
    mapBodyParser,
    handleBodyErrors,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const found = await resolveMembership(req.params.slug, req.user!.id);
            if (!found) { res.status(404).json({ error: 'Project not found' }); return; }
            // A `member` overwriting the map for a release would silently corrupt
            // every stack trace the whole team reads. Same bar as rotate-key.
            if (!canAdminister(found.role)) {
                res.status(403).json({ error: 'Only a project owner or admin can upload source maps' });
                return;
            }

            const release = asString(req.query.release);
            const file = asString(req.query.file);
            if (!release || !file) {
                res.status(400).json({
                    error: 'Both `release` and `file` query parameters are required. A map with no release can never be matched to a stack frame.',
                });
                return;
            }
            if (!isSafeFileName(file)) {
                res.status(400).json({ error: '`file` must be a bare file name, e.g. index-BwlN_KfP.js' });
                return;
            }
            if (!looksLikeSourceMap(req.body)) {
                res.status(400).json({
                    error: 'That is not a source map. Expected a v3 map with `sources` and `mappings` — upload the .map file itself, not the bundle.',
                });
                return;
            }

            // Re-serialized rather than kept as the raw request text: it has
            // already been parsed and validated, and this guarantees what is
            // stored is exactly what will be re-parsed at read time.
            const content = JSON.stringify(req.body);
            const size = Buffer.byteLength(content, 'utf8');

            const existing = await prisma.sourceMap.findUnique({
                where: { projectId_release_fileName: { projectId: found.project.id, release, fileName: file } },
                select: { id: true },
            });

            const row = await prisma.sourceMap.upsert({
                where: { projectId_release_fileName: { projectId: found.project.id, release, fileName: file } },
                create: {
                    projectId: found.project.id,
                    release,
                    fileName: file,
                    content,
                    size,
                    uploadedById: req.user!.id,
                },
                update: { content, size, uploadedById: req.user!.id },
                select: { id: true, release: true, fileName: true, size: true, createdAt: true, updatedAt: true },
            });

            // The row id survives an overwrite, so a cached consumer would go on
            // serving the previous deploy's mappings until eviction.
            if (existing) invalidateSourceMap(existing.id);

            res.status(existing ? 200 : 201).json({
                sourceMap: {
                    id: row.id,
                    release: row.release,
                    fileName: row.fileName,
                    size: row.size,
                    createdAt: row.createdAt.toISOString(),
                    updatedAt: row.updatedAt.toISOString(),
                },
                replaced: !!existing,
            });
        } catch (err: any) {
            console.error('Error uploading source map:', err);
            res.status(500).json({ error: err.message || 'Failed to upload source map' });
        }
    }
);

// ── GET /:slug/sourcemaps ────────────────────────────────────
router.get('/:slug/sourcemaps', async (req: Request, res: Response): Promise<void> => {
    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }
        if (!canAdminister(found.role)) {
            res.status(403).json({ error: 'Only a project owner or admin can manage source maps' });
            return;
        }

        const maps = await prisma.sourceMap.findMany({
            where: { projectId: found.project.id },
            // METADATA ONLY. `content` is the customer's original source and is
            // never returned by any endpoint — see lib/sourcemaps.ts, which is
            // the one place permitted to read it.
            select: {
                id: true,
                release: true,
                fileName: true,
                size: true,
                createdAt: true,
                updatedAt: true,
                uploadedBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: [{ release: 'desc' }, { fileName: 'asc' }],
        });

        res.json({
            sourceMaps: maps.map((m) => ({
                id: m.id,
                release: m.release,
                fileName: m.fileName,
                size: m.size,
                uploadedBy: m.uploadedBy
                    ? [m.uploadedBy.firstName, m.uploadedBy.lastName].filter(Boolean).join(' ').trim()
                    : null,
                createdAt: m.createdAt.toISOString(),
                updatedAt: m.updatedAt.toISOString(),
            })),
            totalBytes: maps.reduce((sum, m) => sum + m.size, 0),
            maxBytes: MAX_MAP_BYTES,
        });
    } catch (err: any) {
        console.error('Error listing source maps:', err);
        res.status(500).json({ error: err.message || 'Failed to list source maps' });
    }
});

// ── DELETE /:slug/sourcemaps/:id ─────────────────────────────
router.delete('/:slug/sourcemaps/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }
        if (!canAdminister(found.role)) {
            res.status(403).json({ error: 'Only a project owner or admin can delete source maps' });
            return;
        }

        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) { res.status(404).json({ error: 'Source map not found' }); return; }

        // Scoped by projectId, not addressed by bare id: a map id from another
        // project must 404 here rather than be deletable by anyone who can
        // administer any project.
        const { count } = await prisma.sourceMap.deleteMany({
            where: { id, projectId: found.project.id },
        });
        if (!count) { res.status(404).json({ error: 'Source map not found' }); return; }

        invalidateSourceMap(id);
        res.json({ deleted: true, id });
    } catch (err: any) {
        console.error('Error deleting source map:', err);
        res.status(500).json({ error: err.message || 'Failed to delete source map' });
    }
});

// ── GET /:slug/releases ──────────────────────────────────────
/**
 * Releases this project has actually reported, newest activity first, each
 * annotated with whether source maps exist for it.
 *
 * The join is the point. A release list on its own is trivia; a release list
 * that says *"this one is producing errors and has no maps"* is the thing that
 * makes an unresolved stack trace someone's next action. Reading it from
 * `events` rather than from a `Release` table is deliberate — a release exists
 * because something reported it, and a table would immediately drift from that.
 */
router.get('/:slug/releases', async (req: Request, res: Response): Promise<void> => {
    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }

        // `COUNT(*)` comes back as `bigint`, which JSON.stringify throws on.
        const rows = await prisma.$queryRaw<
            { release: string; events: bigint; first_seen: Date; last_seen: Date }[]
        >`
            SELECT "release",
                   COUNT(*)            AS events,
                   MIN("created_at")   AS first_seen,
                   MAX("created_at")   AS last_seen
              FROM "events"
             WHERE "project_id" = ${found.project.id}
               AND "release" IS NOT NULL
             GROUP BY "release"
             ORDER BY MAX("created_at") DESC
             LIMIT 50
        `;

        // Metadata only — never `content`. Grouped in memory because the list is
        // capped at 50 releases and a second GROUP BY query would cost more than
        // the loop.
        const maps = canAdminister(found.role)
            ? await prisma.sourceMap.findMany({
                  where: { projectId: found.project.id },
                  select: { release: true, fileName: true },
              })
            : [];
        const mapCount = maps.reduce<Record<string, number>>((acc, m) => {
            acc[m.release] = (acc[m.release] ?? 0) + 1;
            return acc;
        }, {});

        res.json({
            releases: rows.map((r) => ({
                release: r.release,
                events: Number(r.events),
                firstSeen: r.first_seen.toISOString(),
                lastSeen: r.last_seen.toISOString(),
                // Null rather than 0 for a `member`: they cannot see the map list
                // at all, and reporting "0 maps" to someone who is not allowed to
                // know would be a wrong answer rather than a hidden one.
                sourceMaps: canAdminister(found.role) ? (mapCount[r.release] ?? 0) : null,
            })),
            canManage: canAdminister(found.role),
        });
    } catch (err: any) {
        console.error('Error listing releases:', err);
        res.status(500).json({ error: err.message || 'Failed to list releases' });
    }
});

export default router;

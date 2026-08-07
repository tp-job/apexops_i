import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { urlScanLimiter } from '../middleware/rateLimit';
import { assertFetchableUrl } from '../lib/urlGuard';

const router = express.Router();

// ── POST / ── Fetch console logs from URL via Puppeteer ──────
/**
 * Gated 2026-08-04 (Sprint 7, F005). It was a hole, and a bigger one than
 * "missing auth".
 *
 * Until now this took an arbitrary URL from an **unauthenticated** request and
 * drove a headless Chrome to it. That is server-side request forgery by
 * construction: the caller chooses any address the *server* can reach, including
 * every address they cannot — `http://localhost:5432`, an internal admin panel,
 * or `http://169.254.169.254/`, which on most cloud providers hands instance
 * credentials to anything asking from inside the instance. It also spawned a
 * browser per request with `--no-sandbox` and wrote unbounded rows into `logs`,
 * so it was a denial-of-service lever as well.
 *
 * `/realtime` below was retired in the workspaces sprint for a strictly smaller
 * version of the same problem. This one was missed.
 *
 * Three controls, because no single one is sufficient:
 *
 *  1. **`authenticate` + `authorize('admin')`** — this reaches the internal
 *     network, which makes it an operator tool, not a user feature. Nothing in
 *     the client calls it: `consoleLogsAPI.fetchFromUrl` in `services/api.ts` has
 *     no caller, so gating it breaks nothing that exists today.
 *  2. **`assertFetchableUrl`** — resolves the hostname and refuses private,
 *     loopback, link-local and reserved addresses. See `lib/urlGuard.ts` for what
 *     it does not solve.
 *  3. **Rate limit** — each call is a browser launch and a 30-second navigation.
 *
 * Deliberately gated rather than retired. A hardening sprint should not delete a
 * feature; retiring this in favour of `api/console-monitor.ts` is a product
 * decision, and it is reversible in a way that deletion is not.
 */
router.post('/', authenticate, authorize('admin'), urlScanLimiter, async (req: Request, res: Response): Promise<void> => {
    const { url } = req.body;

    if (!url || typeof url !== 'string') { res.status(400).json({ error: 'URL is required' }); return; }

    const guard = await assertFetchableUrl(url);
    if (!guard.ok) { res.status(400).json({ error: guard.reason }); return; }

    let puppeteer: any;
    let browser: any = null;

    try {
        try { puppeteer = require('puppeteer'); } catch (e: any) {
            res.status(500).json({ error: 'Puppeteer is not installed.', details: e.message }); return;
        }

        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-zygote', '--single-process'],
                timeout: 30000,
            });
        } catch (e: any) {
            res.status(500).json({ error: 'Failed to launch browser', details: e.message }); return;
        }

        const page = await browser.newPage();
        const consoleMessages: Array<{ level: string; message: string; source: string; stack?: string }> = [];

        page.on('console', (msg: any) => {
            try {
                const type = msg.type();
                const text = msg.text();
                let stackTrace: string | undefined;
                try {
                    const trace = msg.stackTrace();
                    if (trace?.length) stackTrace = trace.map((f: any) => `${f.url || 'unknown'}:${f.lineNumber || 0}:${f.columnNumber || 0}`).join('\n');
                } catch {}
                consoleMessages.push({
                    level: type === 'error' ? 'error' : type === 'warn' ? 'warning' : 'info',
                    message: text || 'No message',
                    source: url,
                    stack: type === 'error' ? stackTrace : undefined,
                });
            } catch {
                consoleMessages.push({ level: 'info', message: 'Error processing console message', source: url });
            }
        });

        page.on('pageerror', (error: Error) => {
            consoleMessages.push({ level: 'error', message: error.message, source: url, stack: error.stack });
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 2000));
        await browser.close();
        browser = null;

        // Save to DB
        if (consoleMessages.length > 0) {
            await Promise.all(consoleMessages.map((log) =>
                prisma.log.create({ data: { level: log.level, message: log.message, source: log.source, stack: log.stack || null } }).catch(() => {})
            ));
        }

        res.json(consoleMessages.map((log, i) => ({
            id: `console-${Date.now()}-${i}`,
            timestamp: new Date().toISOString(),
            level: log.level, message: log.message, source: log.source, stack: log.stack,
        })));
    } catch (err: any) {
        if (browser) { try { await browser.close(); } catch {} }
        res.status(500).json({ error: err.message || 'Failed to fetch console logs', details: err.toString() });
    }
});

// ── POST /realtime — RETIRED ─────────────────────────────────
/**
 * Replaced by `POST /api/ingest` (spec G2).
 *
 * This endpoint had no authentication, no rate limit and no project scope: anyone
 * who viewed source on a monitored page could write unbounded rows into `logs`.
 * It also issued one `create` per log inside a sequential `await` loop, so a
 * 50-log batch was 50 round trips.
 *
 * It answers 410 rather than 404 so an old embedded snippet gets a clear,
 * actionable signal instead of looking like a routing mistake.
 */
router.post('/realtime', (_req: Request, res: Response): void => {
    res.status(410).json({
        error: 'This endpoint has been replaced by POST /api/ingest',
        detail: 'Update the embedded script to the current SDK; ingest now requires a per-project key.',
    });
});

// ── GET /script ──────────────────────────────────────────────
router.get('/script', (req: Request, res: Response) => {
    const { appName } = req.query;
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    const scriptContent = `
<!-- ApexOps Bug Tracker - Copy this to your target app -->
<script>
    window.BUG_TRACKER_SERVER = '${serverUrl}';
    window.BUG_TRACKER_APP_NAME = '${appName || 'My App'}';
</script>
<script src="${serverUrl}/bug-tracker-client.js"></script>
`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(scriptContent);
});

export default router;

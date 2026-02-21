import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

// ── POST / ── Fetch console logs from URL via Puppeteer ──────
router.post('/', async (req: Request, res: Response): Promise<void> => {
    const { url } = req.body;

    if (!url) { res.status(400).json({ error: 'URL is required' }); return; }

    try { new URL(url); } catch { res.status(400).json({ error: 'Invalid URL format' }); return; }

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

// ── POST /realtime ───────────────────────────────────────────
router.post('/realtime', async (req: Request, res: Response): Promise<void> => {
    const { logs } = req.body;
    if (!logs || !Array.isArray(logs)) { res.status(400).json({ error: 'logs array is required' }); return; }

    try {
        for (const log of logs) {
            await prisma.log.create({
                data: { level: log.level, message: log.message, source: log.source, stack: log.stack || null },
            }).catch(() => {});
        }
        res.json({ success: true, count: logs.length });
    } catch (err: any) {
        console.error('Error processing realtime logs:', err);
        res.status(500).json({ error: 'Failed to process logs' });
    }
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

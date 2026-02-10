// api/console-logs.js - Console Logs API (Browser monitoring)
const express = require('express');
const router = express.Router();
const { getPool } = require('../utils/db');

const pool = getPool();

/**
 * POST /api/console-logs
 * Fetch console logs from a URL using Puppeteer
 */
router.post('/', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
        new URL(url);
    } catch (err) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    let puppeteer;
    let browser = null;

    try {
        // Try to require puppeteer
        try {
            puppeteer = require('puppeteer');
        } catch (requireErr) {
            return res.status(500).json({
                error: 'Puppeteer is not installed. Please run: npm install puppeteer',
                details: requireErr.message
            });
        }

        // Launch headless browser with better error handling
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process'
                ],
                timeout: 30000
            });
        } catch (launchErr) {
            console.error('Puppeteer launch error:', launchErr);
            return res.status(500).json({
                error: 'Failed to launch browser',
                details: launchErr.message,
                hint: 'Make sure Puppeteer dependencies are installed correctly'
            });
        }

        const page = await browser.newPage();

        // Store console messages
        const consoleMessages = [];

        // Listen to console messages
        page.on('console', msg => {
            try {
                const type = msg.type(); // 'log', 'error', 'warn', 'info', etc.
                const text = msg.text();

                // Get stack trace for errors safely
                let location = null;
                let stackTrace = undefined;
                try {
                    location = msg.location();
                } catch (e) {
                    // Location may not be available
                }

                try {
                    const trace = msg.stackTrace();
                    if (trace && trace.length > 0) {
                        stackTrace = trace.map(frame =>
                            `${frame.url || 'unknown'}:${frame.lineNumber || 0}:${frame.columnNumber || 0}`
                        ).join('\n');
                    }
                } catch (e) {
                    // Stack trace may not be available
                }

                consoleMessages.push({
                    level: type === 'error' ? 'error' : type === 'warn' ? 'warning' : 'info',
                    message: text || 'No message',
                    source: location?.url || url || 'unknown',
                    stack: type === 'error' ? stackTrace : undefined
                });
            } catch (err) {
                console.error('Error processing console message:', err);
                // Still add basic log even if processing fails
                consoleMessages.push({
                    level: 'info',
                    message: 'Error processing console message',
                    source: url || 'unknown',
                    stack: undefined
                });
            }
        });

        // Listen to page errors
        page.on('pageerror', error => {
            consoleMessages.push({
                level: 'error',
                message: error.message,
                source: url,
                stack: error.stack
            });
        });

        // Navigate to the URL with timeout
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        }).catch(() => {
            // Continue even if navigation times out
            console.warn('Navigation timeout, continuing...');
        });

        // Wait a bit to capture any delayed console messages
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Close browser
        await browser.close();
        browser = null;

        // Save console logs to database
        if (consoleMessages.length > 0) {
            const insertPromises = consoleMessages.map(log =>
                pool.query(
                    'INSERT INTO logs (level, message, source, stack) VALUES ($1, $2, $3, $4)',
                    [log.level, log.message, log.source, log.stack || null]
                ).catch(err => console.error('Error saving log to DB:', err))
            );
            await Promise.all(insertPromises);
        }

        // Format response
        const formattedLogs = consoleMessages.map((log, index) => ({
            id: `console-${Date.now()}-${index}`,
            timestamp: new Date().toISOString(),
            level: log.level,
            message: log.message,
            source: log.source,
            stack: log.stack
        }));

        res.json(formattedLogs);

    } catch (err) {
        console.error('Error fetching console logs:', err);
        console.error('Error stack:', err.stack);

        // Ensure browser is closed even on error
        if (browser) {
            try {
                await browser.close();
            } catch (closeErr) {
                console.error('Error closing browser:', closeErr);
            }
        }

        // Return more detailed error information
        res.status(500).json({
            error: err.message || 'Failed to fetch console logs',
            details: err.toString(),
            type: err.name || 'UnknownError',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }
});

/**
 * POST /api/console-logs/realtime
 * Receive real-time console logs from injected script
 */
router.post('/realtime', async (req, res) => {
    const { logs } = req.body;
    
    if (!logs || !Array.isArray(logs)) {
        return res.status(400).json({ error: 'logs array is required' });
    }
    
    try {
        // Save to database
        for (const log of logs) {
            await pool.query(
                'INSERT INTO logs (level, message, source, stack) VALUES ($1, $2, $3, $4)',
                [log.level, log.message, log.source, log.stack || null]
            ).catch(err => console.error('Error saving log:', err.message));
        }
        
        res.json({ success: true, count: logs.length });
    } catch (err) {
        console.error('Error processing realtime logs:', err);
        res.status(500).json({ error: 'Failed to process logs' });
    }
});

/**
 * GET /api/console-logs/script
 * Generate inject script with custom config
 */
router.get('/script', (req, res) => {
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

module.exports = router;


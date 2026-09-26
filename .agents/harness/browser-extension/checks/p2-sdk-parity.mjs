// P2: the rebuilt /sdk/v1.js must send exactly what the hand-written one sent.
//
//   node .agents/harness/browser-extension/checks/p2-sdk-parity.mjs [baseRef]
//
// Loads the OLD script (git show <baseRef>:app/server/public/sdk/v1.js, default
// ext/dev) and the NEW one (the working-tree file) into the same page, runs the
// same scenario in Chrome for Testing, and diffs every request that reached a
// fake /api/ingest. Only `timestamp` is normalised; everything else must match.
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const root = new URL('../../../../', import.meta.url);
const require = createRequire(new URL('app/server/package.json', root));
const puppeteer = require('puppeteer');

const baseRef = process.argv[2] ?? 'ext/dev';
const scripts = {
    old: execFileSync('git', ['show', `${baseRef}:app/server/public/sdk/v1.js`], { cwd: root, encoding: 'utf8' }),
    new: readFileSync(new URL('app/server/public/sdk/v1.js', root), 'utf8'),
};
if (scripts.old === scripts.new) throw new Error('old and new are the same file — nothing to compare');

// The same page for both runs; only the script it loads differs, via a cookie,
// so the page URL (which lands in every event) is identical.
const PAGE = `<!doctype html><html><head>
<script src="/sdk/v1.js" data-project="pk_parity" data-levels="error,warn" data-release="parity@1"></script>
</head><body><script>
window.run = function () {
    console.error(new Error('E1 with stack'));
    console.warn('W1', { a: 1, list: [1, 2] });
    console.log('L1 not captured');
    var loop = { name: 'loop' }; loop.self = loop;
    console.error('circular', loop);
    for (var i = 0; i < 30; i++) console.error('flood');
    console.error('big ' + 'x'.repeat(20000));
    console.warn(undefined, null, 42, true);
    setTimeout(function () { null.explode; }, 0);
    Promise.reject(new Error('R1 rejected'));
    Promise.reject('R2 plain');
};
window.lastWords = function () { console.error('last words before unload'); };
</script></body></html>`;

let requests = [];
let which = 'old';
const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url.startsWith('/page')) {
        res.writeHead(200, { 'content-type': 'text/html' });
        return res.end(PAGE);
    }
    if (req.method === 'GET' && req.url === '/sdk/v1.js') {
        res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' });
        return res.end(scripts[which]);
    }
    if (req.url === '/api/ingest') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
            requests.push({
                method: req.method,
                contentType: req.headers['content-type'],
                keyHeader: req.headers['x-apexops-key'] ?? null,
                body: body ? JSON.parse(body) : null,
            });
            res.writeHead(202, { 'content-type': 'application/json' });
            res.end('{}');
        });
        return;
    }
    res.writeHead(404);
    res.end();
});
await new Promise((r) => server.listen(8798, '127.0.0.1', r));

const normalise = (reqs) =>
    reqs.map((r) => ({
        ...r,
        body: r.body && {
            ...r.body,
            events: r.body.events.map(({ timestamp, ...rest }) => {
                if (!/^\d{4}-\d\d-\d\dT/.test(timestamp)) throw new Error(`bad timestamp ${timestamp}`);
                return rest;
            }),
        },
    }));

const runOnce = async (browser, label) => {
    which = label;
    requests = [];
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.goto('http://127.0.0.1:8798/page', { waitUntil: 'load' });
    await page.evaluate(() => window.run());
    await new Promise((r) => setTimeout(r, 6500)); // one 5s interval flush
    await page.evaluate(() => window.lastWords());
    await page.goto('about:blank'); // pagehide → sendBeacon
    await new Promise((r) => setTimeout(r, 1500));
    await page.close();
    return { requests: normalise(requests), pageErrors };
};

const browser = await puppeteer.launch({ headless: true });
let failed = false;
try {
    const oldRun = await runOnce(browser, 'old');
    const newRun = await runOnce(browser, 'new');

    const summary = (run) =>
        run.requests.map((r) => `${r.method} key-header=${!!r.keyHeader} events=${r.body?.events.length}`).join(' | ');
    console.log(`old: ${summary(oldRun)}`);
    console.log(`new: ${summary(newRun)}`);
    console.log(`page errors old=${JSON.stringify(oldRun.pageErrors)} new=${JSON.stringify(newRun.pageErrors)}`);

    const a = JSON.stringify(oldRun.requests, null, 1);
    const b = JSON.stringify(newRun.requests, null, 1);
    if (!oldRun.requests.length) {
        console.log('FAIL  the old script sent nothing — the check proves nothing');
        failed = true;
    } else if (a === b) {
        const events = oldRun.requests.reduce((n, r) => n + (r.body?.events.length ?? 0), 0);
        console.log(`PASS  ${oldRun.requests.length} requests, ${events} events, identical apart from timestamps`);
    } else {
        failed = true;
        const al = a.split('\n');
        const bl = b.split('\n');
        const i = al.findIndex((line, n) => line !== bl[n]);
        console.log(`FAIL  first difference at line ${i}:\n  old: ${al[i]}\n  new: ${bl[i]}`);
    }
    if (JSON.stringify(oldRun.pageErrors) !== JSON.stringify(newRun.pageErrors)) {
        failed = true;
        console.log('FAIL  the page saw different uncaught errors');
    }
} finally {
    await browser.close();
    server.close();
}
process.exit(failed ? 1 : 0);

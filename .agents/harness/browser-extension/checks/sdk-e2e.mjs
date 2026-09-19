// End-to-end: the generated /sdk/v1.js against the real server and database,
// driven through the server's own harness page, /sdk/test.
//
//   node .agents/harness/browser-extension/checks/sdk-e2e.mjs
//
// Needs the rig API on :3013 (launch.json "rig-server") and a project the dev
// user can see (default: sprint2-demo). Two parts, as on the page:
//   A. load the SDK, fire console.error / uncaught TypeError / rejection, and
//      confirm each reached ingest and landed on its issue in the database;
//   B. the page's own regression → alert loop.
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../../../app/server/package.json', import.meta.url));
const puppeteer = require('puppeteer');

const API = 'http://localhost:3013';
const SLUG = process.argv[2] ?? 'sprint2-demo';
const PROBES = {
    consoleError: 'Harness: cart total failed to compute',
    uncaught: "reading 'explode'",
    rejection: 'Harness: payment provider timed out',
};

const results = [];
const check = (name, pass, detail) => {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: true });
try {
    const page = await browser.newPage();
    const ingests = [];
    page.on('response', (r) => {
        if (r.url() === `${API}/api/ingest` && r.request().method() === 'POST') {
            ingests.push({ status: r.status(), body: r.request().postData() });
        }
    });

    await page.goto(`${API}/sdk/test`, { waitUntil: 'load' });
    await page.$eval('#api', (el, v) => (el.value = v), API);
    await page.$eval('#slug', (el, v) => (el.value = v), SLUG);
    await page.click('#connect');
    await page.waitForFunction(() => /Connected|Failed/.test(document.getElementById('connectState').textContent), {
        timeout: 15_000,
    });
    const connected = await page.$eval('#connectState', (el) => el.textContent);
    check('connect to the rig and load the project', connected.includes('Connected'), connected.trim());
    if (!connected.includes('Connected')) throw new Error('cannot continue');

    // Reads go through the page's own signed-in helper.
    const issueFor = (q) =>
        page.evaluate(
            async (slug, text) => {
                const list = await window.api(`/api/projects/${slug}/issues?q=${encodeURIComponent(text)}&limit=5`);
                const hit = list.issues.find((i) => i.title.includes(text));
                return hit ? { id: hit.id, count: hit.count, lastSeen: hit.lastSeen } : null;
            },
            SLUG,
            q
        );

    // ── A. the generated SDK, for real ───────────────────────
    const served = await page.evaluate(async (api) => (await fetch(`${api}/sdk/v1.js`)).text(), API);
    check('the server serves the generated v1.js', served.includes('GENERATED FILE'));

    const before = {};
    for (const [k, q] of Object.entries(PROBES)) before[k] = await issueFor(q);
    const startedAt = Date.now();

    await page.click('#loadSdk');
    await page.waitForFunction(() => window.state.sdkLoaded === true, { timeout: 10_000 });
    await page.click('#throwOnce');
    await page.click('#throwUncaught');
    await page.click('#throwReject');
    await sleep(7000); // one 5s flush interval, plus slack

    const sdkIngests = ingests.filter((i) => i.body && i.body.includes('test-harness@1.0.0'));
    check(
        'the SDK flushed to /api/ingest and was accepted',
        sdkIngests.length >= 1 && sdkIngests.every((i) => i.status === 202),
        sdkIngests.map((i) => `${i.status}:${JSON.parse(i.body).events.length} events`).join(', ') || 'none'
    );

    for (const [k, q] of Object.entries(PROBES)) {
        const after = await issueFor(q);
        const grew = after && (!before[k] || after.count > before[k].count);
        const fresh = after && new Date(after.lastSeen).getTime() >= startedAt - 2000;
        check(
            `${k} landed on its issue in the database`,
            !!(grew && fresh),
            after ? `issue #${after.id} count ${before[k]?.count ?? 0} → ${after.count}` : 'no issue found'
        );
    }

    // ── B. the page's regression → alert loop ────────────────
    await page.click('#runAll');
    await page.waitForFunction(() => !document.getElementById('runAll').disabled, { timeout: 30_000 });
    const steps = await page.$$eval('#steps .step', (els) =>
        els.map((e) => ({ status: e.className.replace('step', '').trim(), text: e.textContent.trim() }))
    );
    for (const s of steps) check(`loop: ${s.text.slice(2, 90)}`, s.status === 'done');
    check('loop ran to the end', steps.length >= 6, `${steps.length} steps`);
} finally {
    await browser.close();
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

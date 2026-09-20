// P3 close-out: the extension captures on bound sites only, and delivers to
// the real /api/ingest, through everything the spec's exit list names.
//
//   npm run build:e2e --workspace app/extension
//   node .agents/harness/browser-extension/checks/p3-extension.mjs [slug]
//
// Needs the rig API on :3013. Starts its own:
//   :8797  a site under test that gets BOUND
//   :8796  the same site, NOT bound (the control)
//   :8795  a proxy in front of the API that can be switched to 503, so the
//          check can hold events in the worker's queue and stop the worker.
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = new URL('../../../../', import.meta.url);
const require = createRequire(new URL('app/server/package.json', root));
const puppeteer = require('puppeteer');

const API = 'http://localhost:3013';
const SLUG = process.argv[2] ?? 'sprint2-demo';
const BOUND = 'http://127.0.0.1:8797';
const UNBOUND = 'http://127.0.0.1:8796';
const PROXY = 'http://127.0.0.1:8795';
const EXT = fileURLToPath(new URL('app/extension/.output/chrome-mv3-e2e', root));
const RUN = `p3-${Date.now().toString(36)}`;

const results = [];
const check = (name, pass, detail) => {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms, step = 500) => {
    const end = Date.now() + ms;
    for (;;) {
        const v = await fn();
        if (v || Date.now() > end) return v;
        await sleep(step);
    }
};

// ── API access for assertions (one login per run: login is throttled) ──
const login = await (
    await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dev.user@apexops.local', password: 'DevPass123' }),
    })
).json();
if (!login.accessToken) throw new Error(`login failed: ${JSON.stringify(login)}`);
const apiGet = async (path) =>
    (await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${login.accessToken}` } })).json();
const project = await apiGet(`/api/projects/${SLUG}`);
if (!project.ingestKey) throw new Error(`no project ${SLUG}`);

const issue = async (tag) => {
    const list = await apiGet(`/api/projects/${SLUG}/issues?q=${encodeURIComponent(tag)}&limit=5`);
    return list.issues?.find((i) => i.title.includes(tag)) ?? null;
};

// ── Sites under test ─────────────────────────────────────
const PAGE_JS = `
window.fire = function (tag) { console.error(tag); };
window.evil = function () {
    // toJSON and toString both throw, so stringify's own fallback throws too:
    // the exception is raised inside the capture path itself.
    var bad = { toJSON: function () { throw new Error('toJSON'); }, toString: function () { throw new Error('toString'); } };
    console.error('evil', bad);
    window.__after = true;
};
window.loadSdk = function () {
    var s = document.createElement('script');
    s.src = '${API}/sdk/v1.js';
    s.setAttribute('data-project', '${project.ingestKey}');
    document.head.appendChild(s);
};`;
const html = (head = '') =>
    `<!doctype html><html><head><script src="/page.js"></script>${head}</head><body><h1>site under test</h1></body></html>`;

const site = http.createServer((req, res) => {
    const path = req.url.split('?')[0];
    if (path === '/page.js') {
        res.writeHead(200, { 'content-type': 'text/javascript' });
        return res.end(PAGE_JS);
    }
    const pages = {
        '/plain': [html(), {}],
        '/csp': [html(), { 'content-security-policy': "default-src 'self'; script-src 'self'; connect-src 'self'; style-src 'self'" }],
        '/with-sdk': [html(`<script src="${API}/sdk/v1.js" data-project="${project.ingestKey}"></script>`), {}],
    };
    if (!pages[path]) {
        res.writeHead(404);
        return res.end();
    }
    res.writeHead(200, { 'content-type': 'text/html', ...pages[path][1] });
    res.end(pages[path][0]);
});
await new Promise((r) => site.listen(8797, '127.0.0.1', r));
const siteControl = http.createServer(site.listeners('request')[0]);
await new Promise((r) => siteControl.listen(8796, '127.0.0.1', r));

// ── Proxy that can play "server down" ────────────────────
let proxyUp = true;
const proxyLog = [];
const proxy = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
        if (!proxyUp) {
            proxyLog.push({ status: 503, body });
            res.writeHead(503);
            return res.end();
        }
        const upstream = await fetch(`${API}${req.url}`, {
            method: req.method,
            headers: { 'content-type': req.headers['content-type'] ?? 'application/json', 'x-apexops-key': req.headers['x-apexops-key'] ?? '' },
            body: req.method === 'POST' ? body : undefined,
        });
        proxyLog.push({ status: upstream.status, body });
        res.writeHead(upstream.status, { 'content-type': 'application/json' });
        res.end(await upstream.text());
    });
});
await new Promise((r) => proxy.listen(8795, '127.0.0.1', r));

const browser = await puppeteer.launch({
    headless: false,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--window-position=-2400,0'],
});

const worker = async () => {
    const t = await browser.waitForTarget((t) => t.type() === 'service_worker' && t.url().endsWith('/background.js'), {
        timeout: 15_000,
    });
    return t.worker();
};

/** Opens a page and records the extension isolated worlds created in it. */
const open = async (url) => {
    const page = await browser.newPage();
    const cdp = await page.createCDPSession();
    const worlds = [];
    cdp.on('Runtime.executionContextCreated', ({ context }) => {
        // Puppeteer adds its own utility worlds; only ours counts.
        if (context.auxData?.type === 'isolated' && context.name === 'ApexOps') worlds.push(context.name);
    });
    await cdp.send('Runtime.enable');
    await page.goto(url, { waitUntil: 'load' });
    return { page, worlds };
};

try {
    // ── Bind :8797 by writing the binding the P4 connect flow will write ──
    let sw = await worker();
    await sw.evaluate(
        (origin, binding) => chrome.storage.local.set({ bindings: { [origin]: binding } }),
        BOUND,
        { apiUrl: PROXY, slug: SLUG, projectId: project.id, name: project.name, ingestKey: project.ingestKey }
    );
    const registered = await until(
        async () => (await sw.evaluate(() => chrome.scripting.getRegisteredContentScripts())).length === 2,
        5000
    );
    const scripts = await sw.evaluate(() => chrome.scripting.getRegisteredContentScripts());
    check(
        'binding registers the two scripts for the bound origin only',
        registered && scripts.every((s) => s.matches.length === 1 && s.matches[0] === `${BOUND}/*`),
        scripts.map((s) => `${s.id}:${s.world ?? 'ISOLATED'}:${s.matches.join(',')}`).join(' | ')
    );

    // ── (b) not bound → nothing injected; bound → injected (control) ──
    const control = await open(`${UNBOUND}/plain`);
    const bound = await open(`${BOUND}/plain`);
    const nativeUnbound = await control.page.evaluate(() => console.error.toString().includes('[native code]'));
    const nativeBound = await bound.page.evaluate(() => console.error.toString().includes('[native code]'));
    check(
        'unbound site: no content script, console untouched',
        nativeUnbound && control.worlds.length === 0,
        `console native=${nativeUnbound}, isolated worlds=${JSON.stringify(control.worlds)}`
    );
    check(
        'bound site (control for the above): console patched, bridge world present',
        !nativeBound && bound.worlds.includes('ApexOps'),
        `console native=${nativeBound}, isolated worlds=${JSON.stringify(bound.worlds)}`
    );

    // ── (a) console.error on a bound site becomes an issue ──
    const tagA = `${RUN}-plain`;
    const t0 = Date.now();
    await bound.page.evaluate((t) => window.fire(t), tagA);
    const a = await until(() => issue(tagA), 20_000);
    check('bound site: console.error becomes an issue', !!a, a ? `issue #${a.id} after ${((Date.now() - t0) / 1000).toFixed(1)}s` : 'not found in 20s');

    // ── (e) the stored URL has no query or fragment ──
    const withQuery = await open(`${BOUND}/plain?token=secret123&u=me#frag`);
    const tagE = `${RUN}-query`;
    await withQuery.page.evaluate((t) => window.fire(t), tagE);
    const e = await until(() => issue(tagE), 20_000);
    const detail = e ? await apiGet(`/api/projects/${SLUG}/issues/${e.id}`) : null;
    check(
        'stored URL has no query string or fragment',
        detail?.latestEvent?.url === `${BOUND}/plain`,
        `url=${detail?.latestEvent?.url ?? 'n/a'}`
    );

    // ── (c) a page whose CSP allows connect-src 'self' only ──
    const csp = await open(`${BOUND}/csp`);
    const cspViolations = [];
    csp.page.on('console', (m) => m.text().includes('Content Security Policy') && cspViolations.push(m.text()));
    const tagC = `${RUN}-csp`;
    await csp.page.evaluate((t) => window.fire(t), tagC);
    const c = await until(() => issue(tagC), 20_000);
    check("CSP connect-src 'self' does not stop delivery", !!c && cspViolations.length === 0, c ? `issue #${c.id}` : `violations=${cspViolations.length}`);

    // ── (d) the page runs its own SDK → exactly one copy of each event ──
    const withSdk = await open(`${BOUND}/with-sdk`);
    await withSdk.page.waitForFunction(() => '__apexopsSdk' in window, { timeout: 10_000 });
    const tagD = `${RUN}-sdk`;
    await withSdk.page.evaluate((t) => window.fire(t), tagD);
    await until(() => issue(tagD), 20_000);
    await sleep(8000); // past both flush windows, so a duplicate would have landed
    const d = await issue(tagD);
    check('page with its own SDK: event counted once, not twice', d?.count === 1, `count=${d?.count ?? 'none'}`);

    // Late SDK: before it loads the extension owns capture, after it the SDK does.
    const late = await open(`${BOUND}/plain`);
    const tagBefore = `${RUN}-before-sdk`;
    const tagAfter = `${RUN}-after-sdk`;
    await late.page.evaluate((t) => window.fire(t), tagBefore);
    await late.page.evaluate(() => window.loadSdk());
    await late.page.waitForFunction(() => '__apexopsSdk' in window, { timeout: 10_000 });
    await late.page.evaluate((t) => window.fire(t), tagAfter);
    await until(async () => (await issue(tagBefore)) && (await issue(tagAfter)), 20_000);
    await sleep(8000);
    const [lb, la] = [await issue(tagBefore), await issue(tagAfter)];
    check(
        'SDK loaded late: each event once — before via extension, after via SDK',
        lb?.count === 1 && la?.count === 1,
        `before=${lb?.count ?? 'none'} after=${la?.count ?? 'none'}`
    );

    // ── (g) an exception inside capture never reaches the page ──
    const evil = await bound.page.evaluate(() => {
        try {
            window.evil();
            return window.__after === true ? 'ok' : 'did not continue';
        } catch (err) {
            return `threw: ${err.message}`;
        }
    });
    check('a throw inside capture does not break the page', evil === 'ok', evil);

    // ── (f) worker stopped with events queued → none lost, none doubled ──
    proxyUp = false;
    const tagF = `${RUN}-queued`;
    const beforeAttempts = proxyLog.length;
    await bound.page.evaluate((t) => window.fire(t), tagF);
    const attempted = await until(() => proxyLog.slice(beforeAttempts).some((r) => r.body.includes(tagF)), 15_000);
    const queued = await sw.evaluate(async () => (await chrome.storage.session.get('ingestQueue')).ingestQueue ?? []);
    check(
        'server down: the batch is kept in the worker queue',
        attempted && JSON.stringify(queued).includes(tagF),
        `attempted=${!!attempted}, queued batches=${queued.length}`
    );

    // A marker in the worker's memory: a worker that really stopped and was
    // started again has lost it. Stopped the way the spec's exit list says, from
    // chrome://serviceworker-internals. (Tried first and rejected:
    // ServiceWorker.stopAllWorkers from a page session does not reach an
    // extension's worker, and Target.closeTarget left it hung.)
    await sw.evaluate(() => {
        globalThis.__p3Alive = 'before-stop';
    });
    // Detach first. With Puppeteer's DevTools session still attached, a stopped
    // worker is never woken again — measured: no request in 45s attached, the
    // alarm's flush at ~31s detached. Real users have no debugger on it.
    await sw.client.detach();
    const internals = await browser.newPage();
    await internals.goto('chrome://serviceworker-internals/', { waitUntil: 'load' });
    await sleep(1500);
    const stoppedScopes = await internals.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('.serviceworker-registration')) {
            const stop = [...el.querySelectorAll('button')].find((b) => /stop/i.test(b.textContent));
            if (el.textContent.includes('chrome-extension://') && stop) {
                stop.click();
                out.push(el.textContent.match(/chrome-extension:\/\/[a-z]+/)?.[0]);
            }
        }
        return out;
    });
    await internals.close();
    check('the worker was stopped', stoppedScopes.length === 1, `stop clicked for ${JSON.stringify(stoppedScopes)}`);

    proxyUp = true;
    const proxyMark = proxyLog.length;
    // Nothing pokes the worker: the retry alarm (30s) has to wake it on its own.
    const f = await until(() => issue(tagF), 75_000, 1000);
    if (process.env.P3_DEBUG) {
        const swNow = browser.targets().filter((t) => t.type() === 'service_worker').map((t) => t.url());
        console.log('DEBUG workers:', JSON.stringify(swNow));
        console.log('DEBUG proxy since up:', JSON.stringify(proxyLog.slice(proxyMark).map((r) => r.status)));
    }
    await sleep(8000);
    const fAfter = await issue(tagF);
    const delivered = proxyLog.filter((r) => r.status === 202 && r.body.includes(tagF)).length;
    check(
        'after restart: the queued event arrives exactly once',
        !!f && fAfter?.count === 1 && delivered === 1,
        `found=${!!f}, count=${fAfter?.count ?? 'none'}, 202s through proxy=${delivered}`
    );
    sw = await worker();
    const memory = await sw.evaluate(() => globalThis.__p3Alive ?? null);
    check('it was a fresh worker that delivered it (in-memory state gone)', memory === null, `marker=${memory}`);
    const leftover = await sw.evaluate(async () => (await chrome.storage.session.get('ingestQueue')).ingestQueue ?? []);
    check('queue empty afterwards', leftover.length === 0, `batches=${leftover.length}`);
} finally {
    await browser.close();
    site.close();
    siteControl.close();
    proxy.close();
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

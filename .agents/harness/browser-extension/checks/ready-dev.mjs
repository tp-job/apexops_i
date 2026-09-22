// "Is it ready to use on this machine?" — the whole connect flow against the
// developer's OWN dev servers (client :5173, API :3000), not the isolated rig.
//
//   npm run dev:server && npm run dev:client      (or the launch.json entries)
//   npm run build:e2e --workspace app/extension
//   node .agents/harness/browser-extension/checks/ready-dev.mjs [slug]
//
// The e2e build is used because it pre-grants localhost: the permission dialog
// is native UI that nothing can click. Everything else here is what a person
// gets — the same popup, the same worker, the same API.
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = new URL('../../../../', import.meta.url);
const require = createRequire(new URL('app/server/package.json', root));
const puppeteer = require('puppeteer');

const APP = process.env.READY_APP ?? 'http://localhost:5173';
const API = process.env.READY_API ?? 'http://localhost:3000';
const SITE = 'http://127.0.0.1:8792'; // a stand-in for "the site you are testing"
const IMPOSTOR = 'http://127.0.0.1:8791'; // a web app pointing at a non-ApexOps API
const EXT = fileURLToPath(new URL('app/extension/.output/chrome-mv3-e2e', root));
const RUN = `ready-${Date.now().toString(36)}`;
const USER = { email: 'dev.user@apexops.local', password: 'DevPass123' };

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

// ── the dev servers must be the ones we think they are ──
const health = await fetch(`${API}/api/health`).then((r) => r.json()).catch(() => null);
check('the API on this port is ApexOps, with its database connected', health?.app === 'apexops' && health?.database === 'connected', JSON.stringify(health));

const discovery = await fetch(`${APP}/apexops.json`).then((r) => r.json()).catch(() => null);
check('the web app publishes the same API the extension will use', discovery?.app === 'apexops' && discovery?.apiUrl === API, JSON.stringify(discovery));

const login = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(USER),
}).then((r) => r.json());
if (!login.accessToken) throw new Error(`cannot sign in as ${USER.email}: ${login.error ?? 'unknown'} — run: npm run seed:dev --workspace app/server`);
const call = async (method, path, body) =>
    (
        await fetch(`${API}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.accessToken}` },
            body: body === undefined ? undefined : JSON.stringify(body),
        })
    ).json();

// The list endpoint answers a bare array on this deploy; older shapes wrap it.
const listed = await call('GET', '/api/projects');
const SLUG = process.argv[2] ?? (Array.isArray(listed) ? listed : (listed?.projects ?? []))[0]?.slug;
if (!SLUG) throw new Error('no project to connect to — create one in the web app first');
const issue = async (tag) => {
    const list = await call('GET', `/api/projects/${SLUG}/issues?q=${encodeURIComponent(tag)}&limit=5`);
    return (list?.issues ?? [])?.find((i) => i.title.includes(tag)) ?? null;
};

// ── fixtures: a site to test, and a web app that names a non-ApexOps API ──
const site = http
    .createServer((_req, res) => {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end('<!doctype html><html><head><script>window.fire=t=>console.error(t)</script></head><body><h1>site under test</h1></body></html>');
    })
    .listen(8792, '127.0.0.1');

// Stands in for "another project is on that port": it answers /apexops.json and
// points at ITSELF as the API, but its /api/health is not ApexOps, and it
// records anything posted to its login route.
const posted = [];
const impostor = http
    .createServer((req, res) => {
        if (req.url === '/apexops.json') {
            res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
            return res.end(JSON.stringify({ app: 'apexops', v: 1, apiUrl: IMPOSTOR }));
        }
        if (req.url === '/api/health') {
            res.writeHead(404, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
            return res.end(JSON.stringify({ success: false, message: 'Route not found' }));
        }
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
            posted.push({ url: req.url, body });
            res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
            res.end('{}');
        });
    })
    .listen(8791, '127.0.0.1');

const browser = await puppeteer.launch({
    headless: false,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--window-position=-2400,0'],
});
try {
    const swTarget = await browser.waitForTarget((t) => t.type() === 'service_worker' && t.url().endsWith('/background.js'), { timeout: 15_000 });
    const sw = await swTarget.worker();
    const EXT_ORIGIN = `chrome-extension://${new URL(swTarget.url()).host}`;
    // A clean slate, so this says something about the flow and not about leftovers.
    await sw.evaluate(() => chrome.storage.local.clear());
    console.log(`browser: ${await browser.version()}   extension: ${EXT_ORIGIN}   project: ${SLUG}`);

    const sitePage = await browser.newPage();
    await sitePage.goto(`${SITE}/`, { waitUntil: 'load' });
    const popup = async () => {
        await sitePage.bringToFront();
        const p = await browser.newPage();
        await p.goto(`${EXT_ORIGIN}/popup.html`, { waitUntil: 'load' });
        await p.waitForFunction(() => document.getElementById('app')?.getAttribute('aria-busy') === 'false', { timeout: 10_000 });
        return p;
    };
    const settled = (p) => p.waitForFunction(() => document.getElementById('app')?.getAttribute('aria-busy') === 'false', { timeout: 20_000 });
    const text = (p) => p.evaluate(() => document.getElementById('app').innerText);
    const submitUrl = async (p, url) => {
        // A popup reopened after a failed attempt resumes at the sign-in step
        // with the URL it was given (the draft). Go back to the field first.
        if (!(await p.$('#project-url'))) {
            await p.evaluate(() => {
                const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Back');
                b?.click();
            });
            await settled(p);
        }
        await p.$eval('#project-url', (el) => (el.value = ''));
        await p.type('#project-url', url);
        await p.click('form button[type=submit]');
        await settled(p);
        await sleep(400);
    };

    // ── the wrong server never sees the password ──
    let pop = await popup();
    await submitUrl(pop, `${IMPOSTOR}/p/anything`);
    await pop.type('#email', USER.email);
    await pop.type('#password', USER.password);
    await pop.click('form button[type=submit]');
    await settled(pop);
    await sleep(800);
    const refusal = await text(pop);
    check(
        'a web app naming a server that is not ApexOps: refused, and that server got nothing',
        /did not answer as an ApexOps API/.test(refusal) && posted.length === 0,
        `posted=${JSON.stringify(posted).slice(0, 80)}`
    );
    await pop.close();

    // ── the real thing: connect this site to a project ──
    pop = await popup();
    await submitUrl(pop, `${APP}/p/${SLUG}/issues`);
    const hostShown = await pop.$eval('.host', (e) => e.textContent).catch(() => null);
    check('the sign-in step names the real API host', hostShown === new URL(API).host, `host=${hostShown}`);
    await pop.type('#email', USER.email);
    await pop.type('#password', USER.password);
    await pop.click('form button[type=submit]');
    await settled(pop);
    const connected = (await until(async () => /Connected to/.test(await text(pop)), 20_000)) ? await text(pop) : await text(pop);
    check('connect succeeds and says it is capturing now', /Connected to/.test(connected) && /being captured now/.test(connected), connected.replace(/\s+/g, ' ').slice(0, 110));
    await pop.close();

    // ── an error on the site becomes an issue in the project ──
    const tag = `${RUN}-hello`;
    const t0 = Date.now();
    await sitePage.evaluate((x) => window.fire(x), tag);
    const found = await until(() => issue(tag), 25_000);
    check('an error on the site appears as an issue in the project', !!found, found ? `issue #${found.id} in ${((Date.now() - t0) / 1000).toFixed(1)}s` : 'not found in 25s');

    // ── and the session is recognisable in the web app ──
    const sessions = (await call('GET', '/api/auth/sessions'))?.sessions ?? [];
    check('the extension has its own labelled session', sessions.some((s) => /^ApexOps-extension\//.test(s.userAgent ?? '')), `sessions=${sessions.length}`);

    // ── leave nothing behind ──
    pop = await popup();
    await pop.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /Disconnect this site/.test(x.textContent));
        b?.click();
    });
    await settled(pop);
    await pop.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Sign out');
        b?.click();
    });
    await settled(pop);
    const left = await sw.evaluate(async () => (await chrome.storage.local.get('bindings')).bindings ?? {});
    check('disconnect and sign out clear the extension again', Object.keys(left).length === 0);
} finally {
    await browser.close();
    site.close();
    impostor.close();
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

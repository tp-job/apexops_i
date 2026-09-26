// P1-04 / P1-06 browser close-out, against the isolated rig:
//   rig-server (API :3013) + rig-client (Vite :5199) from .claude/launch.json.
// Run: node .agents/harness/browser-extension/checks/p1-browser.mjs [rounds]
//
// Real Chrome (Puppeteer's Chrome for Testing), two tabs of one profile, so
// they share localStorage and see each other's `storage` events — the only
// way to exercise the cross-tab paths authSession depends on.
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../../../app/server/package.json', import.meta.url));
const puppeteer = require('puppeteer');

const APP = 'http://localhost:5199';
const API = 'http://localhost:3013';
const CREDS = { email: 'dev.user@apexops.local', password: 'DevPass123' };
const ROUNDS = Number(process.argv[2] ?? 5);

const results = [];
const check = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const login = async () => {
    const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CREDS),
    });
    if (!res.ok) throw new Error(`login ${res.status}`);
    return res.json();
};

// Structurally a JWT, `exp` in the past: the client's isExpired() says yes, so
// the next request refreshes first. The server never sees it.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const expiredJwt = () => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ id: 0, exp: Math.floor(Date.now() / 1000) - 3600 })}.x`;

// Every route the tab visits, kept in sessionStorage so it survives reloads.
const recordRoutes = () => {
    const log = () => {
        const all = JSON.parse(sessionStorage.getItem('__routes') || '[]');
        all.push(location.pathname);
        sessionStorage.setItem('__routes', JSON.stringify(all));
    };
    for (const m of ['pushState', 'replaceState']) {
        const orig = history[m];
        history[m] = function (...args) {
            const r = orig.apply(this, args);
            log();
            return r;
        };
    }
    log();
};

const openTab = async (browser, refreshLog, label) => {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(recordRoutes);
    page.on('response', (r) => {
        if (r.url().endsWith('/api/auth/refresh') && r.request().method() === 'POST') {
            refreshLog.push({ tab: label, status: r.status(), at: Date.now() });
        }
    });
    return page;
};

const routes = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem('__routes') || '[]'));
const clearRoutes = (page) => page.evaluate(() => sessionStorage.removeItem('__routes'));
const spaNavigate = (page, path) =>
    page.evaluate((p) => {
        history.pushState({}, '', p);
        dispatchEvent(new PopStateEvent('popstate'));
    }, path);

const browser = await puppeteer.launch({ headless: true });
try {
    const refreshLog = [];

    // ── signed out → /login ──────────────────────────────────
    const a = await openTab(browser, refreshLog, 'A');
    await a.goto(`${APP}/dashboard`, { waitUntil: 'networkidle0' });
    check('signed out: /dashboard lands on /login', new URL(a.url()).pathname === '/login', a.url());

    // ── signed in → reload never visits /login (P1-04) ───────
    const session = await login();
    await a.evaluate((s) => {
        localStorage.setItem('accessToken', s.accessToken);
        localStorage.setItem('refreshToken', s.refreshToken);
        localStorage.setItem('user', JSON.stringify(s.user));
    }, session);
    await a.goto(`${APP}/dashboard`, { waitUntil: 'networkidle0' });
    await clearRoutes(a);
    // "Never visited /login" is also true of an app that failed to boot and
    // rendered nothing — P2 got exactly that past this check once. So the
    // reload must also have validated the session with the server.
    const profile = a
        .waitForResponse((r) => r.url().endsWith('/api/auth/profile'), { timeout: 10_000 })
        .catch(() => null);
    await a.reload({ waitUntil: 'networkidle0' });
    const profileRes = await profile;
    await sleep(1000);
    const afterReload = await routes(a);
    check(
        'signed in: reload validates the session and never passes through /login',
        profileRes?.status() === 200 && !afterReload.includes('/login') && new URL(a.url()).pathname === '/dashboard',
        `profile=${profileRes?.status() ?? 'none'} routes=${JSON.stringify(afterReload)}`
    );

    // ── two tabs, both expired, both request at once (P1-06) ─
    const b = await openTab(browser, refreshLog, 'B');
    await b.goto(`${APP}/dashboard`, { waitUntil: 'networkidle0' });

    for (let round = 1; round <= ROUNDS; round += 1) {
        const expired = expiredJwt();
        // A setItem fires `storage` in the OTHER tab only, so write from both
        // to get the expired token into both tabs' in-memory session.
        await a.evaluate((t) => localStorage.setItem('accessToken', t), expired);
        await b.evaluate((t) => localStorage.setItem('accessToken', t), expired);
        await clearRoutes(a);
        await clearRoutes(b);
        const before = refreshLog.length;

        await Promise.all([spaNavigate(a, '/projects'), spaNavigate(b, '/projects')]);
        await sleep(4000);

        const round_ = refreshLog.slice(before).map((r) => `${r.tab}:${r.status}`);
        const [ra, rb] = [await routes(a), await routes(b)];
        const stored = await a.evaluate(() => localStorage.getItem('accessToken'));
        const storedOk = !!stored && stored !== expired;
        const noLogin = !ra.includes('/login') && !rb.includes('/login');
        check(
            `race round ${round}: both tabs stay signed in`,
            noLogin && storedOk,
            `refreshes=[${round_.join(', ')}] routesA=${JSON.stringify(ra)} routesB=${JSON.stringify(rb)} tokenRenewed=${storedOk}`
        );
        // Reset both tabs to a known place for the next round.
        if (!noLogin) break;
        await Promise.all([spaNavigate(a, '/dashboard'), spaNavigate(b, '/dashboard')]);
        await sleep(1500);
    }

    // ── revoke from elsewhere → next call lands on /login ────
    const elsewhere = await login();
    const revoke = await fetch(`${API}/api/auth/sessions/revoke-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${elsewhere.accessToken}`, 'Content-Type': 'application/json' },
    });
    await clearRoutes(a);
    await spaNavigate(a, '/projects');
    await sleep(4000);
    check(
        'revoked elsewhere: next call in the tab lands on /login',
        new URL(a.url()).pathname === '/login',
        `revoke-all=${revoke.status} url=${a.url()} routes=${JSON.stringify(await routes(a))}`
    );
} finally {
    await browser.close();
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

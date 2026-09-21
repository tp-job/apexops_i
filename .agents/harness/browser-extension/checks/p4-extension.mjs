// P4 close-out: connect a site to a project by pasting a project URL, through the
// REAL popup, against the real API and database.
//
//   npm run build:e2e --workspace app/extension
//   (rig) API on :3013 and the Vite client on :5199 from .claude/launch.json
//   node .agents/harness/browser-extension/checks/p4-extension.mjs [slug]      # Chrome for Testing
//   P4_BROWSER=edge node ...                                                    # Edge
//
// Restart the rig API first: login is throttled to 10 per 15 minutes per IP, in
// memory, and this run spends about 5.
//
// The e2e build pre-grants localhost/127.0.0.1, so `permissions.request`
// resolves without a prompt. The prompt itself is NOT exercised here.
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = new URL('../../../../', import.meta.url);
const require = createRequire(new URL('app/server/package.json', root));
const puppeteer = require('puppeteer');

const API = 'http://localhost:3013';
const APP = 'http://localhost:5199';
const SLUG = process.argv[2] ?? 'sprint2-demo';
const SITE = 'http://127.0.0.1:8797';
const SITE2 = 'http://127.0.0.1:8796';
const FAKE_OTHER = 'http://127.0.0.1:8794';
const FAKE_INSECURE = 'http://127.0.0.1:8793';
const EXT = fileURLToPath(new URL('app/extension/.output/chrome-mv3-e2e', root));
const EDGE = process.env.P4_BROWSER === 'edge';
const RUN = `p4-${Date.now().toString(36)}`;
const USER = { email: 'dev.user@apexops.local', password: 'DevPass123' };
const ADMIN = { email: 'dev.admin@apexops.local', password: 'DevPass123' };

const results = [];
const check = (name, pass, detail) => {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms, step = 400) => {
    const end = Date.now() + ms;
    for (;;) {
        const v = await fn();
        if (v || Date.now() > end) return v;
        await sleep(step);
    }
};

// ── API access for assertions ────────────────────────────
const post = async (path, body, token) => {
    const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
};
const call = async (method, path, token, body) => {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
};
const userLogin = await post('/api/auth/login', USER);
if (!userLogin.body?.accessToken) throw new Error(`login failed (${userLogin.status}) — restart the rig API to clear the login throttle`);
const T = userLogin.body.accessToken;
const project = (await call('GET', `/api/projects/${SLUG}`, T)).body;
if (!project?.ingestKey) throw new Error(`no project ${SLUG}`);
const issue = async (tag) => {
    const list = (await call('GET', `/api/projects/${SLUG}/issues?q=${encodeURIComponent(tag)}&limit=5`, T)).body;
    return list?.issues?.find((i) => i.title.includes(tag)) ?? null;
};

// A project the dev user is NOT a member of, made by the admin.
const adminLogin = await post('/api/auth/login', ADMIN);
const privateSlug = (
    await call('POST', '/api/projects', adminLogin.body.accessToken, { name: `Private ${RUN}` })
).body?.slug;
// A project (owned by the dev user) whose name is markup, for the escaping check.
const xssName = `<img src=x onerror="window.__xss=1"> ${RUN}`;
const xssProject = (await call('POST', '/api/projects', T, { name: xssName })).body;

// ── Fixture servers ──────────────────────────────────────
const siteHtml = `<!doctype html><html><head><script>window.fire=function(t){console.error(t)}</script></head><body><h1>site</h1></body></html>`;
const mkSite = (port) =>
    http.createServer((req, res) => {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(siteHtml);
    }).listen(port, '127.0.0.1');
const mkDiscovery = (port, doc) =>
    http.createServer((req, res) => {
        if (req.url === '/apexops.json') {
            res.writeHead(200, { 'content-type': 'application/json' });
            return res.end(JSON.stringify(doc));
        }
        res.writeHead(404);
        res.end();
    }).listen(port, '127.0.0.1');
const servers = [
    mkSite(8797),
    mkSite(8796),
    mkDiscovery(8794, { app: 'other', v: 1, apiUrl: API }),
    mkDiscovery(8793, { app: 'apexops', v: 1, apiUrl: 'http://evil.example.test' }),
];

const browser = await puppeteer.launch({
    headless: false,
    executablePath: EDGE ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--window-position=-2400,0'],
});

const swTarget = () => browser.waitForTarget((t) => t.type() === 'service_worker' && t.url().endsWith('/background.js'), { timeout: 15_000 });
let sw = await (await swTarget()).worker();
const EXT_ID = new URL((await swTarget()).url()).host;
const EXT_ORIGIN = `chrome-extension://${EXT_ID}`;

const openSite = async (origin) => {
    const page = await browser.newPage();
    await page.goto(`${origin}/`, { waitUntil: 'load' });
    return page;
};
/** The popup, opened after `sitePage` was the last web tab in use. */
const openPopup = async (sitePage) => {
    await sitePage.bringToFront();
    const p = await browser.newPage();
    await p.goto(`${EXT_ORIGIN}/popup.html`, { waitUntil: 'load' });
    await p.waitForFunction(() => document.getElementById('app')?.getAttribute('aria-busy') === 'false', { timeout: 10_000 });
    return p;
};
const text = (p) => p.evaluate(() => document.getElementById('app').innerText);
const waitText = (p, re, ms = 10_000) =>
    until(async () => re.test(await text(p)), ms).then(async (ok) => (ok ? await text(p) : null));
const settled = (p) => p.waitForFunction(() => document.getElementById('app')?.getAttribute('aria-busy') === 'false', { timeout: 15_000 });
const submitUrl = async (p, url) => {
    await p.$eval('#project-url', (el) => (el.value = ''));
    await p.type('#project-url', url);
    await p.click('form button[type=submit]');
    await settled(p);
    await sleep(300);
};
const clickButton = async (p, label) => {
    const ok = await p.evaluate((l) => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === l && !x.disabled);
        if (!b) return false;
        b.click();
        return true;
    }, label);
    if (!ok) throw new Error(`no enabled button "${label}"`);
};
const stored = (keys) => sw.evaluate((k) => chrome.storage.local.get(k), keys);
const bindings = async () => (await stored('bindings')).bindings ?? {};

// WCAG contrast of every visible piece of text against its effective background.
const contrast = (p, scheme) =>
    p
        .emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }])
        .then(() =>
            p.evaluate(() => {
                const parse = (c) => c.match(/[\d.]+/g).map(Number);
                const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
                const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
                const bgOf = (el) => {
                    for (let e = el; e; e = e.parentElement) {
                        const c = parse(getComputedStyle(e).backgroundColor);
                        if ((c[3] ?? 1) > 0.5) return c;
                    }
                    return parse(getComputedStyle(document.body).backgroundColor);
                };
                const bad = [];
                let n = 0;
                for (const el of document.querySelectorAll('#app *')) {
                    const own = [...el.childNodes].some((x) => x.nodeType === 3 && x.textContent.trim());
                    if (!own && !['INPUT'].includes(el.tagName)) continue;
                    if (el.disabled || getComputedStyle(el).visibility === 'hidden') continue;
                    const fg = parse(getComputedStyle(el).color);
                    const bg = bgOf(el);
                    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
                    const ratio = (a + 0.05) / (b + 0.05);
                    n += 1;
                    if (ratio < 4.5) bad.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.value || '').trim().slice(0, 24)}" ${ratio.toFixed(2)}`);
                }
                return { n, bad };
            })
        );
const SHOTS = process.env.P4_SHOTS; // optional: a directory for popup screenshots
const shot = async (p, label, scheme) => {
    if (!SHOTS) return;
    const { mkdirSync } = await import('node:fs');
    mkdirSync(SHOTS, { recursive: true });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await (await p.$('body')).screenshot({ path: `${SHOTS}/popup-${label.replace(/\W+/g, '-')}-${scheme}.png` });
};
const contrastBoth = async (p, label) => {
    await shot(p, label, 'light');
    await shot(p, label, 'dark');
    const [l, d] = [await contrast(p, 'light'), await contrast(p, 'dark')];
    check(`contrast >= 4.5:1, ${label} (${l.n} + ${d.n} text elements)`, !l.bad.length && !d.bad.length, [...l.bad.map((x) => `light ${x}`), ...d.bad.map((x) => `dark ${x}`)].join('; '));
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
};

try {
    console.log(`browser: ${await browser.version()}   extension: ${EXT_ORIGIN}`);

    // ── A. the web app publishes where its API is ──
    const doc = await (await fetch(`${APP}/apexops.json`)).json().catch(() => null);
    check('web app serves /apexops.json with its API', doc?.app === 'apexops' && doc?.v === 1 && doc?.apiUrl === API, JSON.stringify(doc));

    // ── B. before connecting ──
    const site = await openSite(SITE);
    let pop = await openPopup(site);
    let t = await text(pop);
    check('popup: unconnected site shows the connect form and "not signed in"', /127\.0\.0\.1:8797/.test(t) && /Not connected/.test(t) && /Not signed in/.test(t) && !!(await pop.$('#project-url')), t.replace(/\s+/g, ' ').slice(0, 110));
    check('popup shows its own origin for a project allowlist (R6)', (await pop.$eval('#extension-origin', (e) => e.textContent)) === EXT_ORIGIN);
    check('every field has a label (a11y)', await pop.evaluate(() => [...document.querySelectorAll('input')].every((i) => i.labels.length === 1)));
    await contrastBoth(pop, 'unconnected view');

    // ── C/D/E. bad input is refused in words, before anything is trusted ──
    await submitUrl(pop, 'nope');
    check('malformed URL: says so, nothing else happens', /not a full URL/.test(await text(pop)) && !(await pop.$('#email')));
    await submitUrl(pop, `${APP}/dashboard`);
    check('a non-project page is refused', /not a project page/.test(await text(pop)));
    await submitUrl(pop, 'http://localhost:5198/p/x');
    check('unreachable address: says it could not read /apexops.json', /Could not read/.test((await waitText(pop, /Could not read/)) ?? ''));
    await submitUrl(pop, `${FAKE_OTHER}/p/x`);
    check('a site that is not ApexOps is refused', /does not look like an ApexOps web app/.test((await waitText(pop, /does not look like/)) ?? ''));
    await submitUrl(pop, `${FAKE_INSECURE}/p/x`);
    const insecure = (await waitText(pop, /not https/)) ?? '';
    check(
        'R19: an API on plain http at a real host is refused before any password field exists',
        /not https/.test(insecure) && !(await pop.$('#password')),
        `password field present=${!!(await pop.$('#password'))}`
    );
    await contrastBoth(pop, 'error state');

    // ── F. sign-in step names the host, wrong password / not a member / success ──
    await submitUrl(pop, `${APP}/p/${SLUG}/issues`);
    t = (await waitText(pop, /will be sent to/)) ?? '';
    const hostShown = await pop.$eval('.host', (e) => e.textContent).catch(() => null);
    check('sign-in step names the host the password goes to', hostShown === 'localhost:3013' && /Your email and password will be sent to/.test(t), `host=${hostShown}`);
    await contrastBoth(pop, 'sign-in step');

    await pop.type('#email', USER.email);
    await pop.type('#password', 'definitely-wrong');
    await pop.click('form button[type=submit]');
    await settled(pop);
    check('wrong password: says so, no binding, still on the sign-in step', /Wrong email or password/.test(await text(pop)) && Object.keys(await bindings()).length === 0 && !!(await pop.$('#password')));

    // Not a member: sign in succeeds, the project is refused, nothing is bound.
    await clickButton(pop, 'Back');
    await submitUrl(pop, `${APP}/p/${privateSlug}`);
    await waitText(pop, /will be sent to/);
    await pop.$eval('#email', (e) => (e.value = ''));
    await pop.type('#email', USER.email);
    await pop.type('#password', USER.password);
    await pop.click('form button[type=submit]');
    await settled(pop);
    t = await text(pop);
    check('project the user is not a member of: refused in words, nothing bound', /that you are a member of/.test(t) && Object.keys(await bindings()).length === 0, t.replace(/\s+/g, ' ').slice(0, 100));

    // Now the real project. Signed in already, so no password is asked for.
    await clickButton(pop, 'Back');
    await submitUrl(pop, `${APP}/p/${SLUG}/issues`);
    await waitText(pop, /You are signed in to/);
    check('already signed in to that API: no password field, plain "Connect"', !(await pop.$('#password')) && /You are signed in to:/.test(await text(pop)));
    await clickButton(pop, 'Connect');
    await settled(pop);
    t = (await waitText(pop, /Connected to/)) ?? (await text(pop));
    check('connect succeeds', /Connected to/.test(t) && new RegExp(project.name).test(t), t.replace(/\s+/g, ' ').slice(0, 110));

    // ── G. what was written ──
    const b = (await bindings())[SITE];
    check(
        'binding holds the server\'s key, the API, the project and the web app',
        !!b && b.ingestKey === project.ingestKey && b.apiUrl === API && b.projectId === project.id && b.slug === SLUG && b.appOrigin === APP,
        b ? `slug=${b.slug} api=${b.apiUrl}` : 'no binding'
    );
    const scripts = await sw.evaluate(() => chrome.scripting.getRegisteredContentScripts());
    check('capture scripts registered for exactly this site', scripts.length === 2 && scripts.every((s) => s.matches.join() === `${SITE}/*`), scripts.map((s) => s.matches.join()).join(' | '));
    await pop.reload();
    await settled(pop);
    t = await text(pop);
    check('reopened popup shows the bound project and a link to it', /Sending errors to/.test(t) && !!(await pop.$(`a[href="${APP}/p/${SLUG}/issues"]`)));
    check('the popup was never given the ingest key', !(await pop.evaluate(() => document.documentElement.outerHTML)).includes(project.ingestKey));
    await contrastBoth(pop, 'bound view + signed-in account');
    await pop.close();

    // ── H. it works: an error on the site reaches the project ──
    await site.reload({ waitUntil: 'load' });
    const tagA = `${RUN}-first`;
    await site.evaluate((x) => window.fire(x), tagA);
    const a = await until(() => issue(tagA), 20_000);
    check('an error on the connected site becomes an issue in that project', !!a, a ? `issue #${a.id}` : 'not found');

    // ── I. the extension\'s session is its own, and labelled ──
    const sessions = (await call('GET', '/api/auth/sessions', T)).body?.sessions ?? [];
    const extSession = sessions.find((s) => /^ApexOps-extension\//.test(s.userAgent ?? ''));
    check('extension has its own session, labelled extension/<version>, apart from this one', !!extSession && !extSession.current && sessions.length >= 2, `sessions=${sessions.length}, label=${extSession?.userAgent?.slice(0, 40)}`);

    // ── K. key rotated on the web → the extension recovers by itself (X13) ──
    const rotated = (await call('POST', `/api/projects/${SLUG}/rotate-key`, T)).body;
    const newKey = rotated?.ingestKey ?? rotated?.project?.ingestKey;
    const tagK = `${RUN}-rotated`;
    await site.evaluate((x) => window.fire(x), tagK);
    const k = await until(() => issue(tagK), 25_000);
    const bk = (await bindings())[SITE];
    check('after the key is rotated, the next event is delivered and the binding has the new key', !!newKey && newKey !== project.ingestKey && !!k && bk?.ingestKey === newKey, `delivered=${!!k}, binding updated=${bk?.ingestKey === newKey}`);

    // ── L. a project that only accepts listed origins (R6) ──
    await call('PATCH', `/api/projects/${SLUG}`, T, { allowedOrigins: ['https://only.example.test'] });
    const tagL = `${RUN}-refused`;
    await site.evaluate((x) => window.fire(x), tagL);
    const refused = await until(async () => Object.keys((await stored('ingestProblems')).ingestProblems ?? {}).length > 0, 20_000);
    const l = await issue(tagL);
    pop = await openPopup(site);
    t = await text(pop);
    check(
        'origin allowlist: events are refused, and the popup says why and names the extension origin',
        !!refused && !l && t.includes(EXT_ORIGIN) && /only accepts events from listed origins/.test(t),
        `refused=${!!refused} delivered=${!!l}`
    );
    await contrastBoth(pop, 'bound view with an error message');
    await pop.close();
    await call('PATCH', `/api/projects/${SLUG}`, T, { allowedOrigins: [] });
    const tagL2 = `${RUN}-allowed-again`;
    await site.evaluate((x) => window.fire(x), tagL2);
    const l2 = await until(() => issue(tagL2), 20_000);
    check('allowlist lifted: delivery resumes and the warning clears', !!l2 && Object.keys((await stored('ingestProblems')).ingestProblems ?? {}).length === 0);

    // ── Q. a project name that is markup is shown as text, never run ──
    const site2 = await openSite(SITE2);
    pop = await openPopup(site2);
    await submitUrl(pop, `${APP}/p/${xssProject.slug}`);
    await waitText(pop, /You are signed in to/);
    await clickButton(pop, 'Connect');
    await settled(pop);
    await waitText(pop, /Connected to/);
    await pop.reload();
    await settled(pop);
    const esc = await pop.evaluate(() => ({ img: !!document.querySelector('#app img'), xss: window.__xss === 1, shows: document.getElementById('app').innerText.includes('<img src=x') }));
    check('a project named with markup is shown as literal text and nothing runs', !esc.img && !esc.xss && esc.shows, JSON.stringify(esc));
    await clickButton(pop, 'Disconnect this site');
    await settled(pop);
    await pop.close();
    await site2.close();

    // ── M. one refresh however many callers, then the session survives ──
    await sw.evaluate(() => {
        globalThis.__refreshes = 0;
        const real = globalThis.fetch;
        globalThis.fetch = (u, i) => {
            if (String(u).endsWith('/api/auth/refresh')) globalThis.__refreshes += 1;
            return real(u, i);
        };
    });
    const expired = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ id: 0, exp: 1 })).toString('base64url')}.x`;
    await sw.evaluate((tok) => chrome.storage.local.set({ accessToken: tok }), expired);
    await sleep(300);
    const popA = await openPopup(site);
    const popB = await openPopup(site);
    const sends = (p, n) => p.evaluate((count) => Promise.all(Array.from({ length: count }, () => chrome.runtime.sendMessage({ type: 'status' }))), n);
    const replies = (await Promise.all([sends(popA, 3), sends(popB, 3)])).flat();
    const refreshes = await sw.evaluate(() => globalThis.__refreshes);
    check(
        'expired token + two popups asking at once: exactly one refresh, nobody signed out',
        refreshes === 1 && replies.length === 6 && replies.every((r) => r.ok && r.data.session.signedIn),
        `refreshes=${refreshes}, signedIn=${replies.filter((r) => r.ok && r.data.session.signedIn).length}/6`
    );
    await popA.close();
    await popB.close();

    // ── N. session revoked from the web app → the popup falls back to signed-out ──
    const sessions2 = (await call('GET', '/api/auth/sessions', T)).body?.sessions ?? [];
    const target = sessions2.find((s) => /^ApexOps-extension\//.test(s.userAgent ?? ''));
    const del = await call('DELETE', `/api/auth/sessions/${target?.id}`, T);
    pop = await openPopup(site);
    t = await text(pop);
    check('extension session revoked from Settings: popup goes to "not signed in" on the next call', del.status === 200 && /Not signed in/.test(t), `delete=${del.status}`);
    // The documented behaviour: capture is keyed by the public ingest key, not the login.
    const tagN = `${RUN}-after-signout`;
    await site.evaluate((x) => window.fire(x), tagN);
    const n = await until(() => issue(tagN), 20_000);
    check('capture on a connected site continues after sign-out (by design)', !!n);

    // ── O. disconnect really disconnects ──
    await clickButton(pop, 'Disconnect this site');
    await settled(pop);
    const left = Object.keys(await bindings());
    await until(async () => (await sw.evaluate(() => chrome.scripting.getRegisteredContentScripts())).length === 0, 8000);
    const scriptsAfter = await sw.evaluate(() => chrome.scripting.getRegisteredContentScripts());
    await site.reload({ waitUntil: 'load' });
    const native = await site.evaluate(() => console.error.toString().includes('[native code]'));
    check('disconnect: binding gone, scripts unregistered, the site\'s console is untouched again', left.length === 0 && scriptsAfter.length === 0 && native, `bindings=${left.length} scripts=${scriptsAfter.length} nativeConsole=${native}`);
    await pop.close();
} finally {
    await call('PATCH', `/api/projects/${SLUG}`, T, { allowedOrigins: [] }).catch(() => undefined);
    for (const s of [privateSlug, xssProject?.slug].filter(Boolean)) {
        await call('DELETE', `/api/projects/${s}`, adminLogin.body.accessToken).catch(() => undefined);
        await call('DELETE', `/api/projects/${s}`, T).catch(() => undefined);
    }
    await browser.close();
    servers.forEach((s) => s.close());
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

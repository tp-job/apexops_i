// P5a close-out: the rail and the ApexOps panel on a bound site, driven through
// real mouse and keyboard input, against the real API and database.
//
//   npm run build:e2e --workspace app/extension
//   (rig) API on :3013 and the Vite client on :5199 from .claude/launch.json
//   node .agents/harness/browser-extension/checks/p5a-rail.mjs [slug]      # Chrome for Testing
//   P5_BROWSER=edge node ...                                                # Edge
//   P5_SHOTS=<dir> node ...                                                 # screenshots of the panel, both schemes
//
// The site fixture is hostile on purpose: it patches attachShadow before the
// extension runs and scans everything it can reach for ApexOps data.
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
const SITE_UNBOUND = 'http://127.0.0.1:8796';
const EXT = fileURLToPath(new URL('app/extension/.output/chrome-mv3-e2e', root));
const EDGE = process.env.P5_BROWSER === 'edge';
const SHOTS = process.env.P5_SHOTS;
const RUN = `p5a-${Date.now().toString(36)}`;
const USER = { email: 'dev.user@apexops.local', password: 'DevPass123' };

const results = [];
const check = (name, pass, detail) => {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms, step = 300) => {
    const end = Date.now() + ms;
    for (;;) {
        const v = await fn().catch(() => null);
        if (v || Date.now() > end) return v;
        await sleep(step);
    }
};

// ── API access for assertions ────────────────────────────
const call = async (method, path, token, body) => {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
};
const login = await call('POST', '/api/auth/login', null, USER);
if (!login.body?.accessToken) throw new Error(`login failed (${login.status}) — restart the rig API to clear the login throttle`);
const T = login.body.accessToken;
const project = (await call('GET', `/api/projects/${SLUG}`, T)).body;
if (!project?.ingestKey) throw new Error(`no project ${SLUG}`);
const other = (await call('POST', '/api/projects', T, { name: `Switch target ${RUN}` })).body;
if (!other?.slug) throw new Error('could not create the second project');
const issueIn = async (slug, tag) => {
    const list = (await call('GET', `/api/projects/${slug}/issues?q=${encodeURIComponent(tag)}&limit=5`, T)).body;
    return list?.issues?.find((i) => i.title.includes(tag)) ?? null;
};

// ── Fixture: a hostile site with a fixed button in the rail's default corner ──
const siteHtml = `<!doctype html><html><head><title>Checkout — ${RUN}</title><script>
  // Patched before any extension code runs: every shadow root made from THIS
  // world is captured. (A closed root made from the extension's world is not.)
  window.__roots = [];
  const real = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) { const r = real.call(this, init); window.__roots.push(r); return r; };
  window.fire = (t) => console.error(t);
  window.pageClicks = 0; window.docClicks = 0; window.escapes = 0;
  document.addEventListener('click', () => { window.docClicks += 1; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.escapes += 1; });
  // Everything the page can read, as one string.
  window.scan = () => {
    const parts = [document.documentElement.outerHTML, document.body.innerText];
    for (const el of document.querySelectorAll('*')) {
      if (el.shadowRoot) parts.push(el.shadowRoot.innerHTML);
      if (el.tagName === 'IFRAME') { try { parts.push(el.contentDocument ? el.contentDocument.documentElement.outerHTML : ''); } catch (e) {} }
    }
    for (const r of window.__roots) parts.push(r.innerHTML);
    return parts.join('\\n');
  };
  if (location.search.includes('throwing')) {
    setInterval(() => { console.error('storm ' + Math.random()); }, 20);
    setInterval(() => { throw new Error('storm-throw'); }, 50);
  }
</script></head><body style="margin:0;height:2000px">
<h1>site</h1>
<button id="corner" style="position:fixed;right:0;bottom:0;width:140px;height:90px;z-index:1000" onclick="window.pageClicks += 1">page button</button>
</body></html>`;
const servers = [SITE, SITE_UNBOUND].map((o) =>
    http
        .createServer((req, res) => {
            res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
            res.end(siteHtml);
        })
        .listen(Number(new URL(o).port), '127.0.0.1')
);

const browser = await puppeteer.launch({
    headless: false,
    executablePath: EDGE ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined,
    defaultViewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--window-position=-2400,0', '--window-size=1300,900'],
});

const swTarget = () => browser.waitForTarget((t) => t.type() === 'service_worker' && t.url().endsWith('/background.js'), { timeout: 15_000 });
const sw = await (await swTarget()).worker();
const EXT_ID = new URL((await swTarget()).url()).host;
const EXT_ORIGIN = `chrome-extension://${EXT_ID}`;
const stored = (keys) => sw.evaluate((k) => chrome.storage.local.get(k), keys);

/** An extension page in a tab: the popup's own request channel. */
const extPage = await browser.newPage();
await extPage.goto(`${EXT_ORIGIN}/popup.html`, { waitUntil: 'load' });
const ask = (req) => extPage.evaluate((r) => chrome.runtime.sendMessage(r).catch((e) => ({ rejected: String(e.message ?? e) })), req);

const railPoint = (p) =>
    p.evaluate(() => {
        // The rail is inside a closed root; from the page all that is visible is
        // the host element under the point. Scan the viewport for it.
        const hits = [];
        for (let y = 0; y < innerHeight; y += 6) {
            for (let x = 0; x < innerWidth; x += 6) {
                if (document.elementFromPoint(x, y)?.tagName === 'APEXOPS-TOOLBAR') hits.push([x, y]);
            }
        }
        if (!hits.length) return null;
        const xs = hits.map((h) => h[0]);
        const ys = hits.map((h) => h[1]);
        return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys), n: hits.length, vw: innerWidth, vh: innerHeight };
    });
/** The rail's logo button: the top of the rail (the whole rail, in P5a). */
const logoAt = async (p) => {
    const r = await railPoint(p);
    return r ? { x: Math.round((r.left + r.right) / 2), y: Math.round(r.top + 16) } : null;
};
const panelFrame = (p) => p.frames().find((f) => /\/panel\.html/.test(f.url()));
/**
 * Open = the page sees far more of the toolbar host than a rail's worth.
 * (Not the frame's innerWidth: an out-of-process frame keeps its size while
 * display:none.)
 */
const panelOpen = async (p) =>
    (await p.evaluate(() => {
        let n = 0;
        for (let y = 0; y < innerHeight; y += 10) for (let x = 0; x < innerWidth; x += 10) if (document.elementFromPoint(x, y)?.tagName === 'APEXOPS-TOOLBAR') n += 1;
        return n;
    })) > 200;
const panelText = async (p) => (await panelFrame(p)?.evaluate(() => document.getElementById('app').innerText).catch(() => '')) ?? '';
const waitPanelText = (p, re, ms = 10_000) => until(async () => re.test(await panelText(p)) && (await panelText(p)), ms);
const panelClick = (p, label) =>
    panelFrame(p).evaluate((l) => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === l && !x.disabled);
        if (!b) return false;
        b.click();
        return true;
    }, label);
const openPanel = async (p) => {
    const at = await logoAt(p);
    if (!at) return false;
    await p.mouse.click(at.x, at.y);
    return until(() => panelOpen(p), 5000);
};
const tabIdOf = (url) => sw.evaluate((u) => chrome.tabs.query({}).then((ts) => ts.find((t) => t.url?.startsWith(u))?.id), url);

// WCAG contrast of every piece of text in the panel against its background.
const contrast = (f) =>
    f.evaluate(() => {
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
            if (!own && !['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) continue;
            if (el.disabled || getComputedStyle(el).visibility === 'hidden') continue;
            const [a, b] = [lum(parse(getComputedStyle(el).color)), lum(bgOf(el))].sort((x, y) => y - x);
            const ratio = (a + 0.05) / (b + 0.05);
            n += 1;
            if (ratio < 4.5) bad.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.value || '').trim().slice(0, 24)}" ${ratio.toFixed(2)}`);
        }
        return { n, bad, dark: matchMedia('(prefers-color-scheme: dark)').matches };
    });
const panelSession = async () => {
    const t = browser.targets().find((x) => /\/panel\.html/.test(x.url()));
    return t ? t.createCDPSession() : null;
};
const contrastBoth = async (p, label) => {
    const f = panelFrame(p);
    const s = await panelSession();
    const out = {};
    for (const scheme of ['light', 'dark']) {
        const media = { features: [{ name: 'prefers-color-scheme', value: scheme }] };
        await p.emulateMediaFeatures(media.features);
        if (s) await s.send('Emulation.setEmulatedMedia', media);
        await sleep(150);
        out[scheme] = await contrast(f);
        if (SHOTS) {
            const { mkdirSync } = await import('node:fs');
            mkdirSync(SHOTS, { recursive: true });
            await p.screenshot({ path: `${SHOTS}/p5a-${label.replace(/\W+/g, '-')}-${scheme}.png` });
        }
    }
    const applied = !out.light.dark && out.dark.dark;
    check(
        `panel contrast >= 4.5:1 in both schemes, ${label} (${out.light.n} + ${out.dark.n} text elements)`,
        applied && !out.light.bad.length && !out.dark.bad.length,
        applied ? [...out.light.bad.map((x) => `light ${x}`), ...out.dark.bad.map((x) => `dark ${x}`)].join('; ') : 'dark scheme did not reach the frame'
    );
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    if (s) await s.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
};

try {
    console.log(`browser: ${await browser.version()}   extension: ${EXT_ORIGIN}`);

    // ── A. an unbound site gets nothing ──
    const unbound = await browser.newPage();
    await unbound.goto(`${SITE_UNBOUND}/`, { waitUntil: 'load' });
    await sleep(800);
    check('unbound site: no toolbar element at all', !(await unbound.$('apexops-toolbar')));

    // ── B. connecting shows the toolbar on the open tab, no reload ──
    const site = await browser.newPage();
    await site.goto(`${SITE}/checkout?secret=abc#frag`, { waitUntil: 'load' });
    const tabId = await tabIdOf(SITE);
    const connected = await ask({ type: 'connect', projectUrl: `${APP}/p/${SLUG}`, siteOrigin: SITE, tabId, credentials: USER });
    check('connect (set-up, through the worker)', connected?.ok === true, JSON.stringify(connected).slice(0, 120));
    const railNow = await until(() => railPoint(site), 5000);
    check('toolbar appears on the already-open tab without a reload', !!railNow);

    // ── C. default place, and what the page can see ──
    await site.reload({ waitUntil: 'load' });
    const r0 = await until(() => railPoint(site), 5000);
    check(
        'after a reload: one rail, in the bottom-right corner by default',
        !!r0 && (await site.$$('apexops-toolbar')).length === 1 && r0.vw - r0.right < 70 && r0.vh - r0.bottom < 70,
        r0 ? `right gap ${r0.vw - r0.right}px, bottom gap ${r0.vh - r0.bottom}px` : 'no rail'
    );
    const hostInfo = await site.evaluate(() => {
        const h = document.querySelector('apexops-toolbar');
        return { shadowRoot: h.shadowRoot === null, captured: window.__roots.length };
    });
    check('the rail\'s shadow root is closed and the page\'s patched attachShadow did not capture it', hostInfo.shadowRoot && hostInfo.captured === 0, JSON.stringify(hostInfo));

    // ── D. clicking the rail is not a click on the page ──
    const before = await site.evaluate(() => ({ doc: window.docClicks, page: window.pageClicks }));
    check('rail covers the page button in the corner before it is moved', (await site.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, await logoAt(site))) === 'APEXOPS-TOOLBAR');
    const opened = await openPanel(site);
    const after = await site.evaluate(() => ({ doc: window.docClicks, page: window.pageClicks }));
    check('clicking the ApexOps button opens the panel', !!opened);
    check('...and the page\'s own click handlers never saw that click', after.doc === before.doc && after.page === before.page, JSON.stringify({ before, after }));

    // ── E. the panel: project, count, and nothing of it readable from the page ──
    let t = (await waitPanelText(site, new RegExp(project.name))) || (await panelText(site));
    check('panel shows the bound project', t.includes(project.name), t.replace(/\s+/g, ' ').slice(0, 120));
    const tagE = `${RUN}-panel-issue`;
    await site.evaluate((x) => window.fire(x), tagE);
    const e1 = await until(() => issueIn(SLUG, tagE), 20_000);
    t = (await waitPanelText(site, /[1-9]\d* events? sent from this tab/, 10_000)) || (await panelText(site));
    check('panel counts the events this tab has sent', /[1-9]\d* events? sent from this tab/.test(t) && !!e1, (t.match(/\d+ events? sent from this tab/) ?? ['none'])[0]);
    await panelClick(site, 'Refresh');
    t = (await waitPanelText(site, new RegExp(tagE), 10_000)) || (await panelText(site));
    const issueLink = await panelFrame(site).evaluate((tag) => [...document.querySelectorAll('.issues a')].find((a) => a.textContent.includes(tag))?.href ?? null, tagE);
    check('recent issues list the new one, linked to it in the web app', !!issueLink && issueLink === `${APP}/p/${SLUG}/issues/${e1?.id}`, issueLink ?? 'not listed');
    const scan = await site.evaluate(() => window.scan());
    check(
        'the page can read none of it: no project name, ingest key, issue title or panel markup (R16)',
        !scan.includes(project.name) && !scan.includes(project.ingestKey) && !scan.includes(`${tagE}"`) && !/Report a bug|sent from this tab/.test(scan),
        `scan ${scan.length} chars`
    );
    check('the panel iframe is cross-origin to the page', await site.evaluate(() => [...document.querySelectorAll('*')].every((e) => !e.shadowRoot || !e.shadowRoot.querySelector('iframe'))));
    await contrastBoth(site, 'signed in');

    // ── F. Report bug → a ticket in this project, with the page (no query) and the tab title ──
    const f = panelFrame(site);
    await f.click('#bug-title');
    await f.type('#bug-title', `Button misaligned ${RUN}`);
    await f.type('#bug-description', 'The pay button overlaps the total.');
    await f.select('#bug-priority', 'high');
    await panelClick(site, 'Create ticket');
    t = (await waitPanelText(site, /Ticket TICK-\d+ created/, 10_000)) || (await panelText(site));
    const ticketId = (t.match(/Ticket (TICK-\d+) created/) ?? [])[1];
    const ticket = ticketId ? (await call('GET', `/api/tickets/${ticketId}`, T)).body : null;
    check(
        'Report bug creates a ticket in the bound project, priority kept',
        !!ticket && ticket.projectId === project.id && ticket.title === `Button misaligned ${RUN}` && ticket.priority === 'high',
        ticket ? `#${ticket.id} project=${ticket.projectId} priority=${ticket.priority}` : t.replace(/\s+/g, ' ').slice(0, 100)
    );
    check(
        'ticket says which page — without its query or fragment — and the tab title',
        !!ticket && ticket.description.includes(`Page: ${SITE}/checkout\n`) && !ticket.description.includes('secret') && ticket.description.includes(`Tab title: Checkout — ${RUN}`),
        ticket ? JSON.stringify(ticket.description.split('---')[1] ?? '').slice(0, 140) : ''
    );
    check('the success message links to the board', (await panelFrame(site).$(`a[href="${APP}/p/${SLUG}/board"]`)) !== null);

    // ── G. Esc closes the panel; with it closed the page gets its keys untouched ──
    await panelFrame(site).click('#bug-title');
    await site.keyboard.press('Escape');
    const closedByEsc = await until(async () => !(await panelOpen(site)), 3000);
    check('Esc inside the panel closes it', !!closedByEsc);
    await site.evaluate(() => document.body.focus());
    const escBefore = await site.evaluate(() => window.escapes);
    await site.keyboard.press('Escape');
    check('with the panel closed, the page still receives its own Escape', (await site.evaluate(() => window.escapes)) === escBefore + 1);
    await openPanel(site);
    await site.evaluate(() => document.body.focus());
    await site.keyboard.press('Escape');
    check('Esc on the page closes an open panel too', !!(await until(async () => !(await panelOpen(site)), 3000)));
    await sw.evaluate(() => {
        globalThis.__panelPolls = 0;
        chrome.runtime.onMessage.addListener((m) => {
            if (m?.type === 'panel-state') globalThis.__panelPolls += 1;
        });
    });
    await sleep(9000);
    const polls = await sw.evaluate(() => globalThis.__panelPolls);
    check('a closed panel stops polling the worker (it would otherwise keep it awake)', polls === 0, `${polls} polls in 9 s`);

    // ── H. a page cannot drive the rail with a forged panel message ──
    await site.evaluate(() => window.postMessage({ tag: 'apexops-panel', action: 'hide' }, '*'));
    await sleep(600);
    check('a forged "hide" posted by the page is ignored', !!(await railPoint(site)) && !(await stored('toolbarPrefs')).toolbarPrefs?.[SITE]?.hidden);

    // ── I. drag it out of the way; the page button works; the place is remembered ──
    const at = await logoAt(site);
    await site.mouse.move(at.x, at.y);
    await site.mouse.down();
    for (let i = 1; i <= 12; i++) await site.mouse.move(at.x - i * 60, at.y - i * 40);
    await site.mouse.up();
    await sleep(500);
    const r1 = await railPoint(site);
    check('dragged: the rail moved and the panel did not open', !!r1 && r1.right < r0.right - 500 && !(await panelOpen(site)), r1 ? `now at ${r1.left},${r1.top}` : 'gone');
    const clicksBefore = await site.evaluate(() => window.pageClicks);
    await site.click('#corner');
    check('the site\'s own button in that corner is clickable now', (await site.evaluate(() => window.pageClicks)) === clicksBefore + 1);
    const pref = (await stored('toolbarPrefs')).toolbarPrefs?.[SITE];
    await site.reload({ waitUntil: 'load' });
    const r2 = await until(() => railPoint(site), 5000);
    check('position is remembered for this site across a reload', !!pref && !!r2 && Math.abs(r2.left - r1.left) <= 6 && Math.abs(r2.top - r1.top) <= 6, pref ? `stored right=${Math.round(pref.right)} bottom=${Math.round(pref.bottom)}` : 'nothing stored');
    await site.setViewport({ width: 500, height: 400 });
    await sleep(400);
    const r3 = await railPoint(site);
    check('a smaller window keeps the rail on screen', !!r3 && r3.right <= 500 && r3.bottom <= 400, r3 ? `${r3.left},${r3.top}` : 'off screen');
    await site.setViewport({ width: 1280, height: 800 });

    // ── J. the keyboard way in (Alt+Shift+A → worker → toolbar) ──
    await site.bringToFront();
    await site.keyboard.down('Alt');
    await site.keyboard.down('Shift');
    await site.keyboard.press('KeyA');
    await site.keyboard.up('Shift');
    await site.keyboard.up('Alt');
    const byShortcut = await until(() => panelOpen(site), 2000);
    console.log(`INFO  Alt+Shift+A through synthetic input: ${byShortcut ? 'opened the panel' : 'not delivered (browser accelerators are not reachable from CDP input)'}`);
    if (!byShortcut) {
        // The browser half cannot be driven from here; the worker half can.
        await sw.evaluate((id) => chrome.tabs.sendMessage(id, { type: 'apexops-toolbar-toggle' }), await tabIdOf(SITE));
    }
    const viaCommand = await until(() => panelOpen(site), 3000);
    // Where focus is, from both sides: the page sees only the host element; the
    // panel sees which of its controls has it.
    const focus = viaCommand
        ? await until(async () => {
              const page = await site.evaluate(() => document.activeElement?.tagName);
              const inPanel = await panelFrame(site).evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
              return page === 'APEXOPS-TOOLBAR' && inPanel !== 'BODY' ? `page=${page} panel=${inPanel}` : null;
          }, 3000)
        : null;
    check('the toggle command opens the panel with keyboard focus on its first control', !!viaCommand && !!focus, focus ?? 'focus not in the panel');
    await sw.evaluate((id) => chrome.tabs.sendMessage(id, { type: 'apexops-toolbar-toggle' }), await tabIdOf(SITE));
    check('...and the same command closes it', !!(await until(async () => !(await panelOpen(site)), 3000)));

    // ── K. switch project from the panel; the next event goes to the new one ──
    await openPanel(site);
    await waitPanelText(site, /Switch project/);
    await panelClick(site, 'Switch project');
    await until(() => panelFrame(site).$('#switch-project'), 8000);
    await panelFrame(site).select('#switch-project', other.slug);
    await panelClick(site, 'Switch');
    t = (await waitPanelText(site, /now sends to/, 10_000)) || (await panelText(site));
    const tagK = `${RUN}-after-switch`;
    await site.evaluate((x) => window.fire(x), tagK);
    const kNew = await until(() => issueIn(other.slug, tagK), 20_000);
    await sleep(2000);
    const kOld = await issueIn(SLUG, tagK);
    check('switch project: the next error lands in the new project and not the old one', !!kNew && !kOld, `new=${!!kNew} old=${!!kOld}`);
    check('...and the binding says so', (await stored('bindings')).bindings?.[SITE]?.slug === other.slug);
    await panelClick(site, 'Switch project');
    await until(() => panelFrame(site).$('#switch-project'), 8000);
    await panelFrame(site).select('#switch-project', SLUG);
    await panelClick(site, 'Switch');
    await waitPanelText(site, /now sends to/, 10_000);

    // ── L. the panel cannot do what only the popup may (R18), and vice versa ──
    const fromPanel = await panelFrame(site).evaluate((o) => chrome.runtime.sendMessage({ type: 'disconnect', siteOrigin: o }).then((r) => r ?? null, (e) => ({ rejected: true })), SITE);
    const stillBound = !!(await stored('bindings')).bindings?.[SITE];
    check('the panel cannot disconnect a site (a popup-only request)', stillBound && !(fromPanel && fromPanel.ok), JSON.stringify(fromPanel));
    const panelFromPopup = await ask({ type: 'panel-state' });
    check('a panel request from a page that is not the panel gets no answer', !(panelFromPopup && panelFromPopup.ok), String(JSON.stringify(panelFromPopup)).slice(0, 80));

    // ── M. hide on this site; stays hidden; the popup brings it back ──
    await panelClick(site, 'Hide toolbar on this site');
    const hidden = await until(async () => !(await railPoint(site)), 3000);
    await site.reload({ waitUntil: 'load' });
    await sleep(1200);
    const stillHidden = !(await railPoint(site));
    check('hide: the rail goes, and stays gone after a reload', !!hidden && stillHidden);
    const pop = await browser.newPage();
    pop.on('pageerror', (e) => console.log(`popup error: ${e.message}`));
    pop.on('console', (m) => m.type() === 'error' && console.log(`popup console: ${m.text()}`));
    await site.bringToFront();
    await pop.goto(`${EXT_ORIGIN}/popup.html`, { waitUntil: 'load' });
    // Polled from here, not with waitForFunction: that polls on requestAnimationFrame,
    // which never runs in a background tab, and the site's tab is the one in front.
    await until(() => pop.evaluate(() => document.getElementById('app')?.getAttribute('aria-busy') === 'false'), 10_000);
    const showBtn = await pop.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Show toolbar');
        b?.click();
        return !!b;
    });
    const back = await until(() => railPoint(site), 5000);
    check('the popup offers "Show toolbar" and the rail comes back live', showBtn && !!back);
    await pop.close();

    // ── N. signed out: the panel asks to sign in, naming the host; signing in works ──
    await ask({ type: 'logout' });
    await site.reload({ waitUntil: 'load' });
    await until(() => railPoint(site), 5000);
    await openPanel(site);
    t = (await waitPanelText(site, /will be sent to/, 8000)) || (await panelText(site));
    const hostShown = await panelFrame(site).$eval('.host', (e) => e.textContent).catch(() => null);
    check('signed out: panel shows sign-in and the host the password goes to (R19)', hostShown === 'localhost:3013' && !(await panelFrame(site).$('#bug-title')), `host=${hostShown}`);
    await contrastBoth(site, 'sign-in');
    await panelFrame(site).type('#email', USER.email);
    await panelFrame(site).type('#password', USER.password);
    await panelFrame(site).click('form button[type=submit]');
    // Case-insensitive: section headings are uppercased by CSS, and innerText follows it.
    t = (await waitPanelText(site, /Report a bug/i, 10_000)) || (await panelText(site));
    check('signing in from the panel brings back the project view', /Report a bug/i.test(t) && /Recent issues/i.test(t), t.replace(/\s+/g, ' ').slice(0, 160));

    // ── O. a page that never stops throwing does not wedge the panel ──
    await site.goto(`${SITE}/storm?throwing=1`, { waitUntil: 'load' });
    await until(() => railPoint(site), 5000);
    const t0 = Date.now();
    await openPanel(site);
    t = (await waitPanelText(site, new RegExp(project.name), 10_000)) || '';
    const ms = Date.now() - t0;
    await panelClick(site, 'Refresh');
    const refreshed = await waitPanelText(site, /Recent issues/i, 10_000);
    check('a page throwing 70 errors a second: the panel opens and answers', !!t && !!refreshed && ms < 8000, `${ms} ms to show the project`);
    await site.goto(`${SITE}/`, { waitUntil: 'load' });

    // ── P. disconnect from the popup: the rail leaves the open page ──
    await until(() => railPoint(site), 5000);
    await ask({ type: 'disconnect', siteOrigin: SITE });
    const gone = await until(async () => !(await site.$('apexops-toolbar')), 5000);
    check('disconnect: the rail removes itself from the open tab', !!gone);
} finally {
    await ask({ type: 'disconnect', siteOrigin: SITE }).catch(() => undefined);
    await call('DELETE', `/api/projects/${other.slug}`, T).catch(() => undefined);
    await browser.close();
    servers.forEach((s) => s.close());
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

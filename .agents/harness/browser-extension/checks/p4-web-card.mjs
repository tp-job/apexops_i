// P4: the "Browser extension" card on /p/:slug/settings, and the Settings
// sessions list, in the real web app on the isolated rig.
//
//   rig: API :3013 + Vite client :5199 (.claude/launch.json)
//   node .agents/harness/browser-extension/checks/p4-web-card.mjs [slug] [screenshotDir]
//
// Logs in once through the API (login is throttled) and puts the session in
// localStorage, as p1-browser.mjs does.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const root = new URL('../../../../', import.meta.url);
const require = createRequire(new URL('app/server/package.json', root));
const puppeteer = require('puppeteer');

const API = 'http://localhost:3013';
const APP = 'http://localhost:5199';
const SLUG = process.argv[2] ?? 'sprint2-demo';
const SHOTS = process.argv[3];
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, pass, detail) => {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

const login = await (
    await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Apexops-Client': 'extension/0.1.0' },
        body: JSON.stringify({ email: 'dev.user@apexops.local', password: 'DevPass123' }),
    })
).json();
if (!login.accessToken) throw new Error('login failed — restart the rig API to clear the throttle');
const patch = (body) =>
    fetch(`${API}/api/projects/${SLUG}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.accessToken}` },
        body: JSON.stringify(body),
    });

const browser = await puppeteer.launch({ headless: true });
try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 1400 });
    await page.goto(`${APP}/login`, { waitUntil: 'load' });
    await page.evaluate((s) => {
        localStorage.setItem('accessToken', s.accessToken);
        localStorage.setItem('refreshToken', s.refreshToken);
        localStorage.setItem('user', JSON.stringify(s.user));
    }, login);

    const card = async () => {
        await page.goto(`${APP}/p/${SLUG}/settings`, { waitUntil: 'networkidle0' });
        return page.evaluate(() => {
            const h = [...document.querySelectorAll('h2')].find((x) => x.textContent.trim() === 'Browser extension');
            // The h2 sits in a header div inside the card's Surface: two levels up.
            const section = h?.parentElement?.parentElement;
            return h ? { text: section.innerText, code: section.querySelector('code')?.textContent ?? null } : null;
        });
    };

    let c = await card();
    check('settings page shows the Browser extension card with this project\'s URL', !!c && c.code === `${APP}/p/${SLUG}`, `code=${c?.code}`);
    check('card lists the three steps and does not mention the allowlist by default', !!c && /Connect this site/.test(c.text) && /Sign in once/.test(c.text) && !/allowlist/i.test(c.text));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/card-default.png`, fullPage: true });

    await patch({ allowedOrigins: ['https://only.example.test'] });
    c = await card();
    check('with an origin allowlist the card says the extension must be listed, and where to set it', !!c && /allowlist/i.test(c.text) && /allowedOrigins/.test(c.text) && /PATCH/.test(c.text));
    await patch({ allowedOrigins: [] });

    // The clipboard button.
    await page.goto(`${APP}/p/${SLUG}/settings`, { waitUntil: 'networkidle0' });
    // Headless Chrome has no focused document, so the real clipboard refuses both
    // writes and reads. What this code controls is the value handed to
    // `writeText`, so that is what is captured; that the OS clipboard then
    // receives it is the browser's job and is not tested here.
    const clicked = await page.evaluate(() => {
        window.__copied = null;
        navigator.clipboard.writeText = async (v) => void (window.__copied = v);
        const b = [...document.querySelectorAll('button')].find((x) => /Copy project URL/.test(x.textContent));
        b?.click();
        return !!b;
    });
    await new Promise((r) => setTimeout(r, 300));
    const copied = await page.evaluate(() => window.__copied);
    const label = await page.evaluate(() => [...document.querySelectorAll('button')].some((x) => x.textContent.trim() === 'Copied'));
    check('"Copy project URL" hands the project URL to the clipboard and says "Copied"', clicked && copied === `${APP}/p/${SLUG}` && label, `writeText(${copied})`);

    // Settings → sessions: the extension's session is named as such.
    await page.goto(`${APP}/settings`, { waitUntil: 'networkidle0' });
    const rows = await page.evaluate(() => document.body.innerText);
    check('Settings lists the extension session as "ApexOps extension · …"', /ApexOps extension · /.test(rows));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/settings-sessions.png`, fullPage: true });
} finally {
    await patch({ allowedOrigins: [] }).catch(() => undefined);
    await browser.close();
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

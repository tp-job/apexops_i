// The build a person actually installs: app/extension/.output/chrome-mv3,
// loaded unpacked, with NO site access granted to it.
//
//   npm run build --workspace app/extension
//   (rig) client :5199 — the API is not needed for this one
//   node .agents/harness/browser-extension/checks/unpacked-build.mjs
//   P4_BROWSER=edge node ...
//
// What this proves that the e2e checks cannot: that build asks for nothing at
// install time, and the connect flow gets as far as the sign-in step without a
// single permission prompt. Everything past that point needs a native dialog
// that automation cannot answer — see the ledger.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const root = new URL('../../../../', import.meta.url);
const require = createRequire(new URL('app/server/package.json', root));
const puppeteer = require('puppeteer');

const APP = 'http://localhost:5199';
const SLUG = process.argv[2] ?? 'sprint2-demo';
const EXT = fileURLToPath(new URL('app/extension/.output/chrome-mv3', root));
const EDGE = process.env.P4_BROWSER === 'edge';

const results = [];
const check = (name, pass, detail) => {
    results.push(pass);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const manifest = JSON.parse(readFileSync(`${EXT}/manifest.json`, 'utf8'));
check(
    'the shipped manifest asks for no site access and registers no content scripts',
    !manifest.host_permissions && !manifest.content_scripts && Array.isArray(manifest.optional_host_permissions),
    `permissions=${manifest.permissions.join(',')} optional=${manifest.optional_host_permissions?.join(',')}`
);
check(
    'it has a toolbar icon and a popup',
    !!manifest.action?.default_popup && !!manifest.icons?.['128'] && !!manifest.icons?.['16'],
    `icons=${Object.keys(manifest.icons ?? {}).join(',')}`
);

const browser = await puppeteer.launch({
    headless: false,
    executablePath: EDGE ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--window-position=-2400,0'],
});
try {
    const swTarget = await browser.waitForTarget((t) => t.type() === 'service_worker' && t.url().endsWith('/background.js'), { timeout: 15_000 });
    const sw = await swTarget.worker();
    const EXT_ORIGIN = `chrome-extension://${new URL(swTarget.url()).host}`;
    console.log(`browser: ${await browser.version()}   extension: ${EXT_ORIGIN}`);

    const granted = await sw.evaluate(() => chrome.permissions.getAll());
    check('nothing is granted at install: no site access at all', (granted.origins ?? []).length === 0, `origins=${JSON.stringify(granted.origins ?? [])}`);

    const pop = await browser.newPage();
    await pop.goto(`${EXT_ORIGIN}/popup.html`, { waitUntil: 'load' });
    await pop.waitForFunction(() => document.getElementById('app')?.getAttribute('aria-busy') === 'false', { timeout: 10_000 });
    const first = await pop.evaluate(() => document.getElementById('app').innerText);
    check('the popup opens and asks for a project URL', /Not connected|Open the website/.test(first) && /ApexOps/.test(first), first.replace(/\s+/g, ' ').slice(0, 90));

    // The web app serves /apexops.json cross-origin, so finding the API needs no
    // permission. Without that header this step would prompt.
    // The popup shows no "This site" here on purpose: reading a tab's URL needs
    // `activeTab`, which only a real click on the toolbar icon grants, and no
    // automation can click it. So the connect flow is exercised by sending the
    // worker the same message the form sends, from the popup page itself.
    const cors = await pop.evaluate(async (app) => {
        try {
            // ACAO is not a readable response header, so the header value cannot
            // be asserted from here; that the read succeeds at all is the point.
            const res = await fetch(`${app}/apexops.json`);
            return { ok: res.ok, body: await res.json() };
        } catch (e) {
            return { ok: false, error: String(e) };
        }
    }, APP);
    check('the web app is readable cross-origin, with no site access granted', cors.ok === true && cors.body?.app === 'apexops', JSON.stringify(cors).slice(0, 90));

    const reply = await pop.evaluate(
        (url) => chrome.runtime.sendMessage({ type: 'discover', projectUrl: url }),
        `${APP}/p/${SLUG}/issues`
    );
    const after = await sw.evaluate(() => chrome.permissions.getAll());
    check(
        'a pasted project URL finds the API with no permission prompt',
        reply?.ok === true && reply.data.apiOrigin === 'http://localhost:3013' && (after.origins ?? []).length === 0,
        `${reply?.ok ? `api=${reply.data.apiOrigin}` : JSON.stringify(reply?.error)}; origins=${JSON.stringify(after.origins ?? [])}`
    );
} finally {
    await browser.close();
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

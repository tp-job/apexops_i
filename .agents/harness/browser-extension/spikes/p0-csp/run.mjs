// node run.mjs [chrome|edge]
// Chrome for Testing (puppeteer's download) still honours --load-extension;
// branded Chrome 137+ ignores it, so "chrome" here means CfT.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { start, variants } from './server.mjs';

const require = createRequire(new URL('../../../../../app/server/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const extPath = fileURLToPath(new URL('./ext', import.meta.url));
const which = process.argv[2] ?? 'chrome';
const executablePath = which === 'edge'
    ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
    : undefined;

const server = start();
const browser = await puppeteer.launch({
    headless: false,
    executablePath,
    args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`, '--window-position=-2400,0'],
});
console.log('browser', await browser.version());
try {
    for (const path of variants) {
        const page = await browser.newPage();
        await page.goto(`http://127.0.0.1:8799${path}`, { waitUntil: 'load' });
        await new Promise((r) => setTimeout(r, 1500));
        const result = await page.evaluate(() => window.__attack());
        const panel = page.frames().find((f) => f.url().startsWith('chrome-extension://') || f.url().startsWith('extension://'));
        // Read the closed root's computed style through CDP (pierce), which a
        // page cannot do — this only checks that styling survived the CSP.
        const cdp = await page.createCDPSession();
        const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
        const find = (n) => (n.nodeName === 'BUTTON' ? n : [...(n.children ?? []), ...(n.shadowRoots ?? [])].map(find).find(Boolean));
        const btn = find(root);
        if (btn) {
            await cdp.send('CSS.enable');
            const { computedStyle } = await cdp.send('CSS.getComputedStyleForNode', { nodeId: (await cdp.send('DOM.pushNodesByBackendIdsToFrontend', { backendNodeIds: [btn.backendNodeId] })).nodeIds[0] });
            const get = (k) => computedStyle.find((s) => s.name === k)?.value;
            result.launcherBg = get('background-color');
            result.launcherRadius = get('border-top-left-radius');
        }
        result.panelLoaded = panel ? await panel.evaluate(() => document.body.dataset.ok === '1').catch((e) => 'error ' + e.message) : false;
        result.panelUrl = panel ? panel.url().replace(/\/\/[a-z]+\//, '//<id>/') : null;
        console.log(path, JSON.stringify(result, null, 1));
        await page.close();
    }
} finally {
    await browser.close();
    server.close();
}

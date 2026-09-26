import { patternFor, readBindings } from './bindings';

/**
 * Which pages get the capture scripts: bound origins the user has granted, and
 * nothing else (spec P3 step 3 — never `<all_urls>`).
 *
 * Registered at runtime rather than in the manifest because the set is the
 * user's to change. Rebuilt from scratch on every change: two content scripts
 * and a handful of origins is cheaper to re-register than to diff, and a
 * rebuild cannot drift from the bindings it was built from.
 */

export const CAPTURE_SCRIPT_ID = 'apexops-capture';
export const BRIDGE_SCRIPT_ID = 'apexops-bridge';
export const TOOLBAR_SCRIPT_ID = 'apexops-toolbar';
const SCRIPT_IDS = [CAPTURE_SCRIPT_ID, BRIDGE_SCRIPT_ID, TOOLBAR_SCRIPT_ID];

let chain: Promise<void> = Promise.resolve();

/** Serialized: overlapping register calls fail with "duplicate script ID". */
export function syncRegistrations(): Promise<void> {
    chain = chain.then(doSync, doSync);
    return chain;
}

async function doSync(): Promise<void> {
    const bindings = await readBindings();
    const matches: string[] = [];
    for (const origin of Object.keys(bindings)) {
        const pattern = patternFor(origin);
        // A binding whose permission was revoked (chrome://extensions → Site
        // access) stays in storage but gets no scripts.
        if (await browser.permissions.contains({ origins: [pattern] })) matches.push(pattern);
    }

    const existing = await browser.scripting.getRegisteredContentScripts({ ids: SCRIPT_IDS });
    if (existing.length) {
        await browser.scripting.unregisterContentScripts({ ids: existing.map((s) => s.id) });
    }
    if (!matches.length) return;

    await browser.scripting.registerContentScripts([
        {
            // MAIN world: it has to patch the page's own console. Holds no
            // ApexOps data — spec section 10, zone 1.
            id: CAPTURE_SCRIPT_ID,
            js: ['content-scripts/capture.js'],
            matches,
            runAt: 'document_start',
            world: 'MAIN',
            persistAcrossSessions: true,
        },
        {
            id: BRIDGE_SCRIPT_ID,
            js: ['content-scripts/bridge.js'],
            matches,
            runAt: 'document_start',
            persistAcrossSessions: true,
        },
        {
            // ISOLATED world, top frame only (the default). Spec P5a.
            id: TOOLBAR_SCRIPT_ID,
            js: ['content-scripts/toolbar.js'],
            matches,
            runAt: 'document_idle',
            persistAcrossSessions: true,
        },
    ]);
}

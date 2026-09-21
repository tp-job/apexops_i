import { patternFor } from './bindings';

/**
 * Start capturing on a tab that is already open (spec P4 connect flow).
 *
 * Registered content scripts only run on a *navigation*, so without this the
 * site a person just connected keeps quiet until they reload it — which reads
 * as "nothing happened". Injecting once into the live tab removes that step.
 *
 * Both scripts set a marker in their own world and return early if it is
 * already there, so this can never double-patch a page that was reloaded
 * between connecting and injecting.
 */
export type InjectResult = 'injected' | 'skipped';

export async function injectIntoTab(tabId: number, origin: string): Promise<InjectResult> {
    // The tab may have navigated away between the click and here; and access to
    // the site may have been declined. Either way this is not an error.
    const tab = await browser.tabs.get(tabId).catch(() => null);
    if (!tab?.url) return 'skipped';
    try {
        if (new URL(tab.url).origin !== origin) return 'skipped';
    } catch {
        return 'skipped';
    }
    if (!(await browser.permissions.contains({ origins: [patternFor(origin)] }))) return 'skipped';

    try {
        // Bridge first: the capture starts sending as soon as it is patched.
        await browser.scripting.executeScript({ target: { tabId }, files: ['/content-scripts/bridge.js'] });
        await browser.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: ['/content-scripts/capture.js'] });
        return 'injected';
    } catch {
        // A page the browser will not script (an error page, a PDF viewer).
        return 'skipped';
    }
}

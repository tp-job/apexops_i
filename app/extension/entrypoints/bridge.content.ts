import { CAPTURE_EVENT } from '@/lib/channel';
import { MAX_BODY_CHARS } from '@/lib/sanitize';

/**
 * Carries captured batches from the page to the service worker (spec P3).
 *
 * ISOLATED world, so it can reach `browser.runtime`, which the MAIN-world
 * capture cannot. It is deliberately dumb: it forwards one string and nothing
 * else, never says which project or origin the batch is for (the worker reads
 * that from the sender), and has no path by which the page can make the
 * worker do anything but ingest (spec R5).
 */
export default defineContentScript({
    registration: 'runtime',
    runAt: 'document_start',
    main() {
        // One listener per frame, however many times this is injected.
        const w = window as unknown as Record<string, unknown>;
        if (w.__apexopsExtensionBridge) return;
        w.__apexopsExtensionBridge = true;

        document.addEventListener(CAPTURE_EVENT, (e) => {
            const body = (e as CustomEvent).detail;
            if (typeof body !== 'string' || body.length > MAX_BODY_CHARS) return;
            try {
                // Rejects once the extension is reloaded or updated under a
                // page that is still open — nothing to do about it from here.
                void browser.runtime.sendMessage({ type: 'ingest', body }).catch(() => undefined);
            } catch {
                /* extension context invalidated */
            }
        });
    },
});

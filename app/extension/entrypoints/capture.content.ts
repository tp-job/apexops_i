import { startCapture } from '@apexops/shared/sdk-core';
import { CAPTURE_EVENT } from '@/lib/channel';
import { stripUrl } from '@/lib/sanitize';

/**
 * Console + error capture on a bound site, in the page's own JS world.
 *
 * MAIN world is the only place the page's `console` can be patched, which also
 * means the page can read and tamper with everything here — so there is nothing
 * of ApexOps here to read (spec section 10, zone 1). No project, no ingest key:
 * batches go out with `key: ''` and the service worker supplies the key from
 * the binding for this origin.
 *
 * Registered at runtime for bound origins only (`lib/registration.ts`); no
 * `matches` here on purpose — see `wxt.config.ts`.
 */
export default defineContentScript({
    registration: 'runtime',
    world: 'MAIN',
    runAt: 'document_start',
    main() {
        // Already capturing here (registered script, or a previous inject).
        const w = window as unknown as Record<string, unknown>;
        if (w.__apexopsExtensionCapture) return;
        w.__apexopsExtensionCapture = true;

        const hand = (body: string) => {
            document.dispatchEvent(new CustomEvent(CAPTURE_EVENT, { detail: body }));
        };

        startCapture(
            {
                key: '',
                // Server-side `Project.captureLevels` still decides what is kept;
                // this is only what is worth sending (spec X5 / project D5).
                levels: ['error', 'warn'],
                release: null,
                sample: 1,
                context: { source: 'extension' },
                mapUrl: stripUrl,
                // X9: the moment the page's own SDK is present, it owns capture.
                shouldCapture: () => !('__apexopsSdk' in window),
            },
            {
                send: async (body) => {
                    hand(body);
                    return 'ok';
                },
                sendOnUnload: hand,
            }
        );
    },
});

/**
 * ApexOps browser SDK v1 (spec G3).
 *
 *   <script src="https://your-apexops/sdk/v1.js" data-project="pk_..." defer></script>
 *
 * The entry point `scripts/build-sdk.mjs` bundles into
 * `app/server/public/sdk/v1.js`. The capture itself lives in `capture.ts` and is
 * shared with the browser extension; this file is only what is specific to
 * being a `<script>` tag on someone's page: finding its own tag, reading config
 * from its `data-*` attributes, and sending over `fetch` / `sendBeacon`.
 *
 * Transport is HTTP only. The v0 script's WebSocket path was deleted with the
 * :8082 relay (spec D6), which broadcast every app's logs to every listener.
 *
 * Config comes from this script tag's own `data-*` attributes, not from
 * `window.BUG_TRACKER_*` globals. Globals had to be set *before* the script
 * loaded, which is a foot-gun with `defer`/`async` and silently yielded the
 * default project for everyone who got the order wrong.
 *
 * Deliberately no `window.__BugTracker` global: it was a hook for the host page
 * to tamper with capture. Nothing here needs to be reachable from outside.
 */
import { startCapture, type CaptureTransport } from './capture';

function findOwnScript(): HTMLScriptElement | null {
    const current = document.currentScript as HTMLScriptElement | null;
    if (current) return current;
    const all = document.getElementsByTagName('script');
    for (let i = all.length - 1; i >= 0; i--) {
        if (all[i].src && all[i].src.indexOf('/sdk/v1.js') !== -1) return all[i];
    }
    return null;
}

function boot(): void {
    const script = findOwnScript();
    if (!script) return;

    const d = script.dataset || {};
    const key = d.project || '';
    // No key means no identity, so there is nothing useful to do. Fail silently:
    // a missing attribute is a host-page mistake, and shouting about it in their
    // console is the SDK making its problem into their problem.
    if (!key) return;

    const origin = (() => {
        if (d.endpoint) return d.endpoint.replace(/\/$/, '');
        try {
            return new URL(script.src).origin;
        } catch {
            return '';
        }
    })();
    const endpoint = `${origin}/api/ingest`;

    const levels = (d.levels || 'error,warn')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    let sample = d.sample !== undefined ? parseFloat(d.sample) : 1.0;
    if (isNaN(sample) || sample < 0 || sample > 1) sample = 1.0;

    const transport: CaptureTransport = {
        send: (body) =>
            fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Apexops-Key': key },
                body,
                keepalive: true,
                mode: 'cors',
                credentials: 'omit',
            }).then((res) => (res && (res.status === 429 || res.status >= 500) ? 'failure' : 'ok')),
    };
    // `sendBeacon` cannot set headers, which is why the key also travels in the body.
    if (navigator.sendBeacon) {
        transport.sendOnUnload = (body) => {
            navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
        };
    }

    startCapture({ key, levels, release: d.release || null, sample }, transport);
}

boot();

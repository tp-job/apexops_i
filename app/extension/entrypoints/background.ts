import { setClientLabel } from '@apexops/shared/api';
import { readBindings, BINDINGS_KEY, type Binding } from '@/lib/bindings';
import { refreshBindingKey } from '@/lib/connect';
import { clearIngestProblem, recordIngestProblem } from '@/lib/ingestProblems';
import { createIngestQueue, type QueueItem, type SendResult } from '@/lib/ingestQueue';
import type { Request } from '@/lib/messages';
import { syncRegistrations } from '@/lib/registration';
import { handleRequest } from '@/lib/requests';
import { sanitizeBatch } from '@/lib/sanitize';
import { ensureSession } from '@/lib/session';

/**
 * The service worker: the only part of the extension that talks to ApexOps.
 *
 * It keeps the content-script registrations in step with the bindings, accepts
 * captured batches from the bridge, delivers them to /api/ingest with the bound
 * project's key (surviving its own shutdown), and answers the popup. Sessions,
 * refresh and every JWT call live here and nowhere else (spec X2).
 */

const QUEUE_KEY = 'ingestQueue';
const RETRY_ALARM = 'ingest-retry';

const extensionOrigin = () => new URL(browser.runtime.getURL('/')).origin;

/**
 * Is this message from one of the extension's own pages (popup, options)?
 *
 * Decided by the sender's URL, not by `sender.tab`: an extension page opened in
 * a tab has one, and a content script running in a web page has one too. A
 * content script's `sender.url` is the web page's, which is what tells them
 * apart — and a web page can never make that URL start with our origin.
 */
const isExtensionPage = (sender: Browser.runtime.MessageSender): boolean =>
    sender.id === browser.runtime.id && typeof sender.url === 'string' && sender.url.startsWith(`${extensionOrigin()}/`);

const queue = createIngestQueue(
    {
        // storage.session: survives the worker being stopped, not the browser
        // being closed — right for events that are only worth sending soon.
        load: async () => ((await browser.storage.session.get(QUEUE_KEY))[QUEUE_KEY] as QueueItem[]) ?? [],
        save: (items) => browser.storage.session.set({ [QUEUE_KEY]: items }),
    },
    deliver
);

async function post(binding: Binding, item: QueueItem): Promise<Response> {
    return fetch(`${binding.apiUrl}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Apexops-Key': binding.ingestKey },
        body: JSON.stringify({ key: binding.ingestKey, events: item.events }),
        credentials: 'omit',
    });
}

async function deliver(item: QueueItem): Promise<SendResult> {
    const binding = (await readBindings())[item.origin];
    // Unbound since it was captured: the user no longer wants this site sent.
    if (!binding) return 'drop';

    let res = await post(binding, item);

    // 401 = the key is no longer valid. If the owner rotated it, the binding can
    // learn the new one from the API (spec X13) — once, then try again straight
    // away rather than waiting for the retry alarm.
    if (res.status === 401 && (await refreshBindingKey(item.origin)) === 'changed') {
        const fresh = (await readBindings())[item.origin];
        if (fresh) res = await post(fresh, item);
    }

    if (res.ok) {
        await clearIngestProblem(item.origin);
        return 'sent';
    }
    if (res.status === 429 || res.status >= 500) return 'retry';

    // 400/401/403/413: repeating it changes nothing. Say why, where a person will see it.
    const reason =
        res.status === 401
            ? 'The project rejected the ingest key, and it could not be refreshed. Sign in to the extension again, or reconnect this site.'
            : res.status === 403
              ? `The project only accepts events from listed origins, and this extension is not on the list. Add ${extensionOrigin()} to its allowed origins.`
              : `The server refused the events (${res.status}).`;
    await recordIngestProblem(item.origin, res.status, reason);
    return 'drop';
}

async function onIngest(body: unknown, sender: Browser.runtime.MessageSender): Promise<void> {
    // Only our own content scripts, running in a tab — and not an extension
    // page, which is what the popup is and has no business sending events.
    if (sender.id !== browser.runtime.id || !sender.tab || isExtensionPage(sender)) return;
    // The origin comes from the browser's record of the sender, never from the
    // message: a page must not be able to pick which project it writes into.
    const origin = sender.origin ?? (sender.url ? new URL(sender.url).origin : null);
    if (!origin) return;
    if (!(await readBindings())[origin]) return;

    const events = sanitizeBatch(body);
    await queue.enqueue(origin, events);
    await queue.flush();
}

export default defineBackground(() => {
    // Before anything can log in or refresh: every session this worker mints or
    // rotates is labelled as the extension's (spec F12).
    setClientLabel(`extension/${browser.runtime.getManifest().version}`);

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const msg = message as { type?: unknown; body?: unknown } | null;

        if (msg?.type === 'ingest') {
            void onIngest(msg.body, sender);
            return undefined; // the page side never waits on the worker
        }

        // Everything else is a request from the popup, and only the popup.
        if (!isExtensionPage(sender)) return undefined;
        void (async () => {
            try {
                const reply = await handleRequest(message as Request, {
                    version: browser.runtime.getManifest().version,
                    extensionOrigin: extensionOrigin(),
                });
                sendResponse(reply);
            } catch (err) {
                console.error('[apexops] request failed', err);
                sendResponse({ ok: false, error: { code: 'internal', message: 'Something went wrong inside the extension.' } });
            }
        })();
        return true; // keep the channel open for the async reply
    });

    browser.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[BINDINGS_KEY]) void syncRegistrations();
    });

    // A site's access can be revoked from the browser's own extension settings,
    // or granted again. Registrations must follow, or a revoked site keeps its
    // scripts registered until the next worker start.
    browser.permissions.onRemoved.addListener(() => void syncRegistrations());
    browser.permissions.onAdded.addListener(() => void syncRegistrations());

    // Chrome's floor for alarms is 30s. It is the safety net for batches that
    // could not be sent, including across a worker restart.
    void browser.alarms.create(RETRY_ALARM, { periodInMinutes: 0.5 });
    browser.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === RETRY_ALARM) void queue.flush();
    });

    // Every worker start: registrations persist across sessions, but a start is
    // also the moment to repair them, load the session, and drain the queue.
    void ensureSession();
    void syncRegistrations();
    void queue.flush();
});

import { BINDINGS_KEY, readBindings } from '@/lib/bindings';
import { createIngestQueue, type QueueItem, type SendResult } from '@/lib/ingestQueue';
import { syncRegistrations } from '@/lib/registration';
import { sanitizeBatch } from '@/lib/sanitize';

/**
 * The service worker: the only part of the extension that talks to ApexOps.
 *
 * P3 scope — capture. It keeps the content-script registrations in step with
 * the bindings, accepts batches from the bridge, and delivers them to
 * /api/ingest with the bound project's key, surviving its own shutdown.
 * Sessions, refresh and every JWT call arrive in P4 and live here too (X2).
 */

const QUEUE_KEY = 'ingestQueue';
const RETRY_ALARM = 'ingest-retry';

const queue = createIngestQueue(
    {
        // storage.session: survives the worker being stopped, not the browser
        // being closed — right for events that are only worth sending soon.
        load: async () => ((await browser.storage.session.get(QUEUE_KEY))[QUEUE_KEY] as QueueItem[]) ?? [],
        save: (items) => browser.storage.session.set({ [QUEUE_KEY]: items }),
    },
    deliver
);

async function deliver(item: QueueItem): Promise<SendResult> {
    const binding = (await readBindings())[item.origin];
    // Unbound since it was captured: the user no longer wants this site sent.
    if (!binding) return 'drop';

    const res = await fetch(`${binding.apiUrl}/api/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Apexops-Key': binding.ingestKey },
        body: JSON.stringify({ key: binding.ingestKey, events: item.events }),
        credentials: 'omit',
    });
    if (res.ok) return 'sent';
    if (res.status === 429 || res.status >= 500) return 'retry';
    // 400/401/403/413: repeating it changes nothing. P4 turns 401/403 into
    // "fetch the key again once" (X13) for a key rotated since binding.
    console.warn(`[apexops] ingest rejected a batch for ${item.origin}: ${res.status}`);
    return 'drop';
}

async function onIngest(body: unknown, sender: Browser.runtime.MessageSender): Promise<void> {
    // Only our own content scripts, only from a tab.
    if (sender.id !== browser.runtime.id || !sender.tab) return;
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
    browser.runtime.onMessage.addListener((message, sender) => {
        const msg = message as { type?: unknown; body?: unknown } | null;
        if (msg?.type === 'ingest') void onIngest(msg.body, sender);
        // No response to anything: the page side never waits on the worker.
        return undefined;
    });

    browser.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[BINDINGS_KEY]) void syncRegistrations();
    });

    // Chrome's floor for alarms is 30s. It is the safety net for batches that
    // could not be sent, including across a worker restart.
    void browser.alarms.create(RETRY_ALARM, { periodInMinutes: 0.5 });
    browser.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === RETRY_ALARM) void queue.flush();
    });

    // Every worker start: registrations persist across sessions, but a start
    // is also the moment to repair them and to drain anything left queued.
    void syncRegistrations();
    void queue.flush();
});

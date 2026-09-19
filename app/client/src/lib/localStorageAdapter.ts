import type { StorageAdapter } from '@/lib/authSession';

/**
 * The web app's session store: `localStorage`, wrapped in the async shape
 * `authSession` expects so the extension can pass `chrome.storage` in its place.
 *
 * `subscribe` rides the `storage` event, which fires only in the *other* tabs of
 * this origin — exactly the "someone else changed it" signal `authSession` wants.
 * The event carries the new value, so the cache is updated from the event itself
 * rather than by a read that could land after a listener has already looked.
 *
 * The store is looked up per call, not captured up front: merely *touching*
 * `window.localStorage` throws in a sandboxed frame or with storage blocked, and
 * that must surface as a rejected call `authSession` shrugs off — not as an
 * exception at startup that leaves a blank page.
 */
export function createLocalStorageAdapter(
    storeOverride?: Storage,
    events: Pick<Window, 'addEventListener' | 'removeEventListener'> | undefined = globalThis.window
): StorageAdapter {
    const store = () => storeOverride ?? globalThis.localStorage;

    return {
        get: async (key) => store().getItem(key),
        set: async (key, value) => store().setItem(key, value),
        remove: async (keys) => keys.forEach((k) => store().removeItem(k)),
        subscribe: (onChange) => {
            if (!events) return () => undefined;
            const handler = (e: StorageEvent) => {
                try {
                    // sessionStorage fires the same event; only localStorage is ours.
                    if (e.storageArea && e.storageArea !== store()) return;
                } catch {
                    return;
                }
                onChange(e.key, e.newValue);
            };
            events.addEventListener('storage', handler as EventListener);
            return () => events.removeEventListener('storage', handler as EventListener);
        },
    };
}

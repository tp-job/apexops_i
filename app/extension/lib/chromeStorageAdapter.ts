import type { StorageAdapter } from '@apexops/shared/auth';

/**
 * The extension's session store: `chrome.storage.local` behind the same
 * `StorageAdapter` the web app fills with `localStorage` (spec X1).
 *
 * `storage.local` and not `storage.session`: the session has to survive the
 * browser being closed, or every morning starts with a login. Web pages cannot
 * read either area, unlike the `localStorage` of the site being tested.
 *
 * `onChanged` fires in every context including the one that wrote, so
 * `authSession` sees its own writes echoed back. That is harmless — an echo
 * carries the value it already holds — but it means `onSessionChanged` is not
 * "another context" here as it is on the web; nothing in the worker listens.
 */
export function createChromeStorageAdapter(): StorageAdapter {
    const area = () => browser.storage.local;
    return {
        get: async (key) => {
            const found = (await area().get(key))[key];
            return typeof found === 'string' ? found : null;
        },
        set: (key, value) => area().set({ [key]: value }),
        remove: (keys) => area().remove(keys),
        subscribe: (onChange) => {
            const listener = (changes: Record<string, { newValue?: unknown }>, areaName: string) => {
                if (areaName !== 'local') return;
                for (const [key, change] of Object.entries(changes)) {
                    onChange(key, typeof change.newValue === 'string' ? change.newValue : null);
                }
            };
            browser.storage.onChanged.addListener(listener);
            return () => browser.storage.onChanged.removeListener(listener);
        },
    };
}

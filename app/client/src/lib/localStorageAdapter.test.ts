import { describe, expect, it } from 'vitest';
import { getAccessToken, initSession } from '@apexops/shared/auth';
import { createLocalStorageAdapter } from '@/lib/localStorageAdapter';

/**
 * The web app's session store. The session module it plugs into is tested in
 * packages/shared; this covers the localStorage-specific part: the `storage`
 * event filter and surviving a Storage that throws on access.
 */

describe('createLocalStorageAdapter', () => {
    const fakeStorage = () => {
        const m = new Map<string, string>();
        return {
            getItem: (k: string) => m.get(k) ?? null,
            setItem: (k: string, v: string) => void m.set(k, v),
            removeItem: (k: string) => void m.delete(k),
        } as unknown as Storage;
    };

    it('reads and writes through to the given Storage', async () => {
        const store = fakeStorage();
        const adapter = createLocalStorageAdapter(store, undefined);
        await adapter.set('accessToken', 'a');
        expect(await adapter.get('accessToken')).toBe('a');
        await adapter.remove(['accessToken']);
        expect(await adapter.get('accessToken')).toBeNull();
    });

    it('reports storage events for its own store only', () => {
        const store = fakeStorage();
        const other = fakeStorage();
        const target = new EventTarget();
        const adapter = createLocalStorageAdapter(store, target as unknown as Window);
        const seen: [string | null, string | null][] = [];
        const off = adapter.subscribe!((k, v) => seen.push([k, v]));

        const fire = (init: { key: string | null; newValue: string | null; storageArea: Storage }) =>
            target.dispatchEvent(Object.assign(new Event('storage'), init));
        fire({ key: 'accessToken', newValue: 'x', storageArea: store });
        fire({ key: 'accessToken', newValue: 'y', storageArea: other });
        fire({ key: null, newValue: null, storageArea: store });
        off();
        fire({ key: 'accessToken', newValue: 'z', storageArea: store });

        expect(seen).toEqual([
            ['accessToken', 'x'],
            [null, null],
        ]);
    });

    it('a Storage that throws on access rejects the call instead of throwing at creation', async () => {
        const adapter = createLocalStorageAdapter(
            new Proxy({} as Storage, {
                get() {
                    throw new DOMException('denied', 'SecurityError');
                },
            }),
            undefined
        );
        await expect(adapter.get('accessToken')).rejects.toThrow('denied');
        // And through the session module, that is simply "signed out".
        await initSession(adapter);
        expect(getAccessToken()).toBeNull();
    });
});

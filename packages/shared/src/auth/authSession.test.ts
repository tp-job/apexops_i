import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    __resetInFlight,
    endSession,
    getAccessToken,
    getRefreshToken,
    getStoredUser,
    initSession,
    onSessionChanged,
    onSessionExpired,
    persistTokens,
    refreshOnce,
    SessionExpiredError,
    type StorageAdapter,
} from './authSession';
import { configureApi, getApiBaseUrl } from '../api/config';

/**
 * The session module after it moved behind a StorageAdapter (extension spec P1).
 *
 * What these protect is the behaviour the web app already depended on — one
 * refresh for many callers, adopting a token another tab rotated, ending the
 * session only when the server says so — plus the two new promises: the store
 * can be async, and a store that throws is "signed out", never a crash.
 */

/** An adapter over a Map, with a hook to play "another tab wrote this". */
function memoryAdapter(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial));
    let emit: ((key: string | null, value: string | null) => void) | null = null;
    const adapter: StorageAdapter = {
        get: async (k) => data.get(k) ?? null,
        set: async (k, v) => void data.set(k, v),
        remove: async (keys) => keys.forEach((k) => data.delete(k)),
        subscribe: (onChange) => {
            emit = onChange;
            return () => {
                emit = null;
            };
        },
    };
    return {
        adapter,
        data,
        /** Another context writes: the store changes and the change event fires. */
        external(key: string, value: string | null) {
            if (value === null) data.delete(key);
            else data.set(key, value);
            emit?.(key, value);
        },
    };
}

const throwingAdapter: StorageAdapter = {
    get: async () => {
        throw new Error('storage blocked');
    },
    set: async () => {
        throw new Error('storage blocked');
    },
    remove: async () => {
        throw new Error('storage blocked');
    },
};

const json = (status: number, body: unknown) =>
    ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    __resetInFlight();
    configureApi({ baseUrl: 'http://api.test' });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('storage adapter', () => {
    it('loads the stored session and round-trips writes', async () => {
        const mem = memoryAdapter({ accessToken: 'a1', refreshToken: 'r1', user: '{"email":"x@y.z"}' });
        await initSession(mem.adapter);

        expect(getAccessToken()).toBe('a1');
        expect(getRefreshToken()).toBe('r1');
        expect(getStoredUser<{ email: string }>()?.email).toBe('x@y.z');

        await persistTokens({ accessToken: 'a2', refreshToken: 'r2' });
        expect(getAccessToken()).toBe('a2');
        expect(mem.data.get('accessToken')).toBe('a2');
        expect(mem.data.get('refreshToken')).toBe('r2');
    });

    it('updates memory before the store write resolves', async () => {
        const mem = memoryAdapter();
        await initSession(mem.adapter);
        const pending = persistTokens({ accessToken: 'now' });
        expect(getAccessToken()).toBe('now');
        await pending;
    });

    it('a store that throws reads as signed out and does not crash writes', async () => {
        await expect(initSession(throwingAdapter)).resolves.toBeUndefined();
        expect(getAccessToken()).toBeNull();

        await expect(persistTokens({ accessToken: 'a' })).resolves.toBeUndefined();
        // The current context still has its session even though nothing persisted.
        expect(getAccessToken()).toBe('a');
        expect(() => endSession()).not.toThrow();
        expect(getAccessToken()).toBeNull();
    });

    it("follows another context's writes and tells listeners after the cache has them", async () => {
        const mem = memoryAdapter({ accessToken: 'a1' });
        await initSession(mem.adapter);

        const seen: (string | null)[] = [];
        const off = onSessionChanged(() => seen.push(getAccessToken()));

        mem.external('accessToken', 'from-other-tab');
        mem.external('accessToken', null);
        mem.external('theme', 'dark'); // not a session key: no notice
        off();

        expect(seen).toEqual(['from-other-tab', null]);
    });

    it('a garbled stored user is null, not a throw', async () => {
        await initSession(memoryAdapter({ user: '{not json' }).adapter);
        expect(getStoredUser()).toBeNull();
    });
});

describe('refreshOnce', () => {
    it('two concurrent callers produce exactly one refresh request', async () => {
        await initSession(memoryAdapter({ accessToken: 'old', refreshToken: 'r1' }).adapter);
        fetchMock.mockResolvedValue(json(200, { accessToken: 'new', refreshToken: 'r2' }));

        const [a, b] = await Promise.all([refreshOnce(), refreshOnce()]);

        expect(a).toBe('new');
        expect(b).toBe('new');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ refreshToken: 'r1' });
        expect(getRefreshToken()).toBe('r2');
    });

    it('waits for the stored session instead of deciding there is no refresh token', async () => {
        // A store slow enough that the refresh starts before the initial read ends —
        // the extension service worker waking straight into a refresh.
        let release!: () => void;
        const gate = new Promise<void>((r) => (release = r));
        const slow: StorageAdapter = {
            ...memoryAdapter({ refreshToken: 'r1' }).adapter,
            get: async (k) => {
                await gate;
                return k === 'refreshToken' ? 'r1' : null;
            },
        };
        void initSession(slow);
        fetchMock.mockResolvedValue(json(200, { accessToken: 'new' }));

        const result = refreshOnce();
        release();
        await expect(result).resolves.toBe('new');
    });

    it('401 ends the session: tokens cleared and listeners told', async () => {
        const mem = memoryAdapter({ accessToken: 'old', refreshToken: 'r1' });
        await initSession(mem.adapter);
        fetchMock.mockResolvedValue(json(401, { error: 'nope' }));
        const ended = vi.fn();
        const off = onSessionExpired(ended);

        await expect(refreshOnce()).rejects.toBeInstanceOf(SessionExpiredError);
        off();

        expect(ended).toHaveBeenCalledTimes(1);
        expect(getAccessToken()).toBeNull();
        await vi.waitFor(() => expect(mem.data.size).toBe(0));
    });

    it('a 500 keeps the session', async () => {
        await initSession(memoryAdapter({ accessToken: 'old', refreshToken: 'r1' }).adapter);
        fetchMock.mockResolvedValue(json(500, {}));

        await expect(refreshOnce()).rejects.not.toBeInstanceOf(SessionExpiredError);
        expect(getAccessToken()).toBe('old');
        expect(getRefreshToken()).toBe('r1');
    });

    it('a network failure keeps the session', async () => {
        await initSession(memoryAdapter({ accessToken: 'old', refreshToken: 'r1' }).adapter);
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

        await expect(refreshOnce()).rejects.toThrow('Failed to fetch');
        expect(getAccessToken()).toBe('old');
    });

    it('adopts the token another tab rotated instead of ending the session on 401', async () => {
        const mem = memoryAdapter({ accessToken: 'old', refreshToken: 'r1' });
        await initSession(mem.adapter);
        const ended = vi.fn();
        const off = onSessionExpired(ended);
        // The other tab won the race: by the time our 401 lands, its new token
        // has already reached us through the change event.
        fetchMock.mockImplementation(async () => {
            mem.external('accessToken', 'rotated-by-other-tab');
            return json(401, {});
        });

        await expect(refreshOnce()).resolves.toBe('rotated-by-other-tab');
        off();
        expect(ended).not.toHaveBeenCalled();
    });

    it('with no refresh token at all, the session is over without a request', async () => {
        await initSession(memoryAdapter({ accessToken: 'a' }).adapter);
        await expect(refreshOnce()).rejects.toBeInstanceOf(SessionExpiredError);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe('configureApi', () => {
    it('has no default: an unconfigured base URL throws instead of going relative', async () => {
        vi.resetModules();
        const fresh = await import('../api/config');
        expect(() => fresh.getApiBaseUrl()).toThrow('configureApi');
    });

    it('changes where requests go, including the refresh', async () => {
        const before = getApiBaseUrl();
        try {
            configureApi({ baseUrl: 'https://ops.example.test/' });
            expect(getApiBaseUrl()).toBe('https://ops.example.test');

            await initSession(memoryAdapter({ refreshToken: 'r1' }).adapter);
            fetchMock.mockResolvedValue(json(200, { accessToken: 'n' }));
            await refreshOnce();
            expect(fetchMock.mock.calls[0][0]).toBe('https://ops.example.test/api/auth/refresh');
        } finally {
            configureApi({ baseUrl: before });
        }
    });
});

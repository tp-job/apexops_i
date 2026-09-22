import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setClientLabel } from '@apexops/shared/api';
import { __resetInFlight, getAccessToken } from '@apexops/shared/auth';
import { readBindings } from './bindings';
import { __resetRefetchForTests, connectSite, refreshBindingKey } from './connect';
import { handleRequest } from './requests';
import { __resetSessionForTests, login, logout, SessionProblem, whoami } from './session';
import type { Discovered } from './discovery';
import type { Status } from './messages';

/**
 * The worker's session, connect and request layers, driven with a fake `browser`
 * (real read/write semantics, in memory) and a routed fake `fetch`. What is
 * asserted is the contract with the server and with storage — which URL got the
 * password, which header labelled the session, what was written where — because
 * that is what a person's account and a project's key depend on.
 */

const API = 'http://localhost:3013';
const APP = 'http://localhost:5199';
const D: Discovered = { appOrigin: APP, slug: 'demo', apiUrl: API, apiOrigin: API };
const CTX = { version: '0.1.0', extensionOrigin: 'chrome-extension://abc' };

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (expSecondsFromNow: number) =>
    `${b64({ alg: 'HS256' })}.${b64({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow })}.sig`;

type Handler = (url: string, init: RequestInit) => { status: number; body?: unknown } | Promise<{ status: number; body?: unknown }>;

function fakeBrowser() {
    const areas = { local: new Map<string, unknown>(), session: new Map<string, unknown>() };
    const listeners: ((c: Record<string, { newValue?: unknown }>, a: string) => void)[] = [];
    const area = (name: 'local' | 'session') => ({
        get: async (key: string) => (areas[name].has(key) ? { [key]: structuredClone(areas[name].get(key)) } : {}),
        set: async (items: Record<string, unknown>) => {
            const changes: Record<string, { newValue?: unknown }> = {};
            for (const [k, v] of Object.entries(items)) {
                areas[name].set(k, structuredClone(v));
                changes[k] = { newValue: v };
            }
            listeners.forEach((l) => l(changes, name));
        },
        // Like the real API, accepts one key or a list.
        remove: async (keys: string | string[]) => {
            const changes: Record<string, { newValue?: unknown }> = {};
            for (const k of Array.isArray(keys) ? keys : [keys]) {
                areas[name].delete(k);
                changes[k] = {};
            }
            listeners.forEach((l) => l(changes, name));
        },
    });
    return {
        areas,
        browser: {
            storage: {
                local: area('local'),
                session: area('session'),
                onChanged: {
                    addListener: (l: (typeof listeners)[number]) => void listeners.push(l),
                    removeListener: (l: (typeof listeners)[number]) => void listeners.splice(listeners.indexOf(l), 1),
                },
            },
        },
    };
}

let world: ReturnType<typeof fakeBrowser>;
let calls: { method: string; url: string; headers: Record<string, string>; body: unknown; credentials?: string }[];
let routes: Record<string, Handler>;

beforeEach(() => {
    world = fakeBrowser();
    vi.stubGlobal('browser', world.browser);
    calls = [];
    routes = {};
    vi.stubGlobal('fetch', async (input: string, init: RequestInit = {}) => {
        const method = init.method ?? 'GET';
        const headers = Object.fromEntries(new Headers(init.headers as HeadersInit).entries());
        calls.push({ method, url: input, headers, body: init.body ? JSON.parse(init.body as string) : undefined, credentials: init.credentials });
        const handler = routes[`${method} ${input}`];
        if (!handler) throw new TypeError(`no route for ${method} ${input}`);
        const r = await handler(input, init);
        return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
    });
    __resetSessionForTests();
    __resetRefetchForTests();
    __resetInFlight();
    // What the worker does once at start (`background.ts`).
    setClientLabel('extension/0.1.0');
    // The API identifies itself; the suite below replaces this to test the refusal.
    healthy();
});

afterEach(() => {
    setClientLabel(null);
    vi.unstubAllGlobals();
});

/** The API saying it is ApexOps, which `login` checks before sending anything. */
const healthy = () => {
    routes[`GET ${API}/api/health`] = () => ({ status: 200, body: { app: 'apexops', status: 'ok' } });
};

const LOGIN_OK = { accessToken: jwt(3600), refreshToken: 'r1', user: { email: 'me@test.dev', firstName: 'Me' } };
const PROJECT = { id: 7, name: 'Demo', slug: 'demo', ingestKey: 'pk_' + 'a'.repeat(48) };

describe('login refuses an API that has not said it is ApexOps', () => {
    it.each([
        ['answers 404 (a different project on that port)', { status: 404, body: { success: false, message: 'Route not found' } }],
        ['answers ok but is some other app', { status: 200, body: { status: 'ok' } }],
        ['answers ok for a different ApexOps-shaped app', { status: 200, body: { app: 'other', status: 'ok' } }],
    ])('%s: nothing is sent and nothing is stored', async (_name, health) => {
        routes[`GET ${API}/api/health`] = () => health;
        routes[`POST ${API}/api/auth/login`] = () => ({ status: 200, body: LOGIN_OK });

        await expect(login(API, 'me@test.dev', 'pw', '0.1.0')).rejects.toMatchObject({ code: 'not-apexops-api' });

        expect(calls.some((c) => c.url.endsWith('/api/auth/login'))).toBe(false);
        expect(JSON.stringify(calls)).not.toContain('pw');
        expect(getAccessToken()).toBeNull();
    });

    it('a server that cannot be reached at all is a network problem, and still sends nothing', async () => {
        delete routes[`GET ${API}/api/health`];
        await expect(login(API, 'me@test.dev', 'pw', '0.1.0')).rejects.toMatchObject({ code: 'network' });
        expect(calls.some((c) => c.url.endsWith('/api/auth/login'))).toBe(false);
    });
});

describe('login', () => {
    it('sends the password to the given API only, labelled as the extension, and stores a session of its own', async () => {
        routes[`POST ${API}/api/auth/login`] = () => ({ status: 200, body: LOGIN_OK });
        await login(API, 'me@test.dev', 'pw', '0.1.0');

        // The identity check, then the sign-in, and nothing else.
        expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([`GET ${API}/api/health`, `POST ${API}/api/auth/login`]);
        const post = calls[1];
        expect(post).toMatchObject({ method: 'POST', credentials: 'omit', body: { email: 'me@test.dev', password: 'pw' } });
        expect(post?.headers['x-apexops-client']).toBe('extension/0.1.0');
        expect(getAccessToken()).toBe(LOGIN_OK.accessToken);
        expect(world.areas.local.get('apiUrl')).toBe(API);
        expect(world.areas.local.get('refreshToken')).toBe('r1');
    });

    it.each([
        [401, 'bad-credentials'],
        [429, 'throttled'],
        [403, 'deactivated'],
        [500, 'server'],
    ])('a %i answer is %s, and nothing is stored', async (status, code) => {
        routes[`POST ${API}/api/auth/login`] = () => ({ status, body: {} });
        await expect(login(API, 'me@test.dev', 'pw', '0.1.0')).rejects.toMatchObject({ code });
        expect(getAccessToken()).toBeNull();
        expect(world.areas.local.has('apiUrl')).toBe(false);
    });

    it('an unreachable server is a network problem, not a wrong password', async () => {
        await expect(login(API, 'a@b.c', 'pw', '0.1.0')).rejects.toMatchObject({ code: 'network' });
    });

    it('a malformed success response stores nothing', async () => {
        routes[`POST ${API}/api/auth/login`] = () => ({ status: 200, body: { accessToken: 5 } });
        await expect(login(API, 'a@b.c', 'pw', '0.1.0')).rejects.toBeInstanceOf(SessionProblem);
        expect(getAccessToken()).toBeNull();
    });

    it('will not send the password to a second server while signed in to the first', async () => {
        routes[`POST ${API}/api/auth/login`] = () => ({ status: 200, body: LOGIN_OK });
        await login(API, 'me@test.dev', 'pw', '0.1.0');
        calls.length = 0;
        await expect(login('https://other.example.test', 'me@test.dev', 'pw', '0.1.0')).rejects.toMatchObject({ code: 'other-server' });
        expect(calls).toHaveLength(0);
    });
});

describe('whoami and the single refresher (spec X2)', () => {
    async function signedInWithExpiredAccess() {
        routes[`POST ${API}/api/auth/login`] = () => ({ status: 200, body: { ...LOGIN_OK, accessToken: jwt(-3600) } });
        await login(API, 'me@test.dev', 'pw', '0.1.0');
        calls.length = 0;
    }

    it('signed out when nothing is stored, with no request', async () => {
        expect(await whoami()).toEqual({ signedIn: false });
        expect(calls).toHaveLength(0);
    });

    it('five concurrent callers with an expired access token cause exactly one refresh', async () => {
        await signedInWithExpiredAccess();
        routes[`POST ${API}/api/auth/refresh`] = async () => {
            await new Promise((r) => setTimeout(r, 20));
            return { status: 200, body: { accessToken: jwt(3600), refreshToken: 'r2' } };
        };
        routes[`GET ${API}/api/auth/profile`] = () => ({ status: 200, body: { user: { email: 'me@test.dev' } } });

        const results = await Promise.all(Array.from({ length: 5 }, () => whoami()));

        expect(results.every((r) => r.signedIn && !r.offline)).toBe(true);
        const refreshes = calls.filter((c) => c.url.endsWith('/api/auth/refresh'));
        expect(refreshes).toHaveLength(1);
        // The rotated session must keep its "extension" label (spec F12).
        expect(refreshes[0]?.headers['x-apexops-client']).toBe('extension/0.1.0');
        expect(world.areas.local.get('refreshToken')).toBe('r2');
    });

    it('a refresh the server rejects ends the session', async () => {
        await signedInWithExpiredAccess();
        routes[`POST ${API}/api/auth/refresh`] = () => ({ status: 401, body: {} });
        routes[`GET ${API}/api/auth/profile`] = () => ({ status: 401, body: {} });

        expect(await whoami()).toEqual({ signedIn: false });
        expect(getAccessToken()).toBeNull();
    });

    it('a server error or an outage keeps the session and says it is unverified', async () => {
        routes[`POST ${API}/api/auth/login`] = () => ({ status: 200, body: LOGIN_OK });
        await login(API, 'me@test.dev', 'pw', '0.1.0');

        routes[`GET ${API}/api/auth/profile`] = () => ({ status: 200, body: { user: { email: 'me@test.dev' } } });
        expect(await whoami()).toMatchObject({ signedIn: true, offline: false });

        routes[`GET ${API}/api/auth/profile`] = () => ({ status: 503, body: {} });
        expect(await whoami()).toMatchObject({ signedIn: true, offline: true });

        delete routes[`GET ${API}/api/auth/profile`];
        expect(await whoami()).toMatchObject({ signedIn: true, offline: true });
        expect(getAccessToken()).not.toBeNull();
    });
});

describe('logout', () => {
    it('tells the server, then clears the session and the API it belonged to', async () => {
        routes[`POST ${API}/api/auth/login`] = () => ({ status: 200, body: LOGIN_OK });
        routes[`POST ${API}/api/auth/logout`] = () => ({ status: 200, body: {} });
        await login(API, 'me@test.dev', 'pw', '0.1.0');
        await logout();
        expect(calls.at(-1)).toMatchObject({ method: 'POST', url: `${API}/api/auth/logout`, body: { refreshToken: 'r1' } });
        expect(calls.at(-1)?.headers.authorization).toBe(`Bearer ${LOGIN_OK.accessToken}`);
        expect(getAccessToken()).toBeNull();
        expect(world.areas.local.has('apiUrl')).toBe(false);
    });

    it('signs out locally even when the server cannot be reached', async () => {
        routes[`POST ${API}/api/auth/login`] = () => ({ status: 200, body: LOGIN_OK });
        await login(API, 'me@test.dev', 'pw', '0.1.0');
        await logout(); // no logout route: fetch throws
        expect(getAccessToken()).toBeNull();
    });
});

describe('connectSite', () => {
    beforeEach(async () => {
        routes[`POST ${API}/api/auth/login`] = () => ({ status: 200, body: LOGIN_OK });
        await login(API, 'me@test.dev', 'pw', '0.1.0');
        calls.length = 0;
    });

    it('binds the site with the key the server returned — never one the caller supplied', async () => {
        routes[`GET ${API}/api/projects/demo`] = () => ({ status: 200, body: PROJECT });
        const b = await connectSite(D, 'http://127.0.0.1:8797/some/page?x=1#y');
        expect(b).toEqual({ apiUrl: API, slug: 'demo', projectId: 7, name: 'Demo', ingestKey: PROJECT.ingestKey, appOrigin: APP });
        // Keyed by the site's ORIGIN, not the page it was connected from.
        expect(Object.keys(await readBindings())).toEqual(['http://127.0.0.1:8797']);
    });

    it('a project the user is not a member of is refused and writes nothing', async () => {
        routes[`GET ${API}/api/projects/demo`] = () => ({ status: 404, body: {} });
        await expect(connectSite(D, 'http://127.0.0.1:8797')).rejects.toMatchObject({ code: 'no-access' });
        expect(await readBindings()).toEqual({});
    });

    it('refuses sites that are not http(s) origins', async () => {
        for (const bad of ['chrome://extensions', 'file:///etc/passwd', 'javascript:1', 'not a url', undefined, 7]) {
            await expect(connectSite(D, bad as string)).rejects.toMatchObject({ code: 'bad-site' });
        }
        expect(calls).toHaveLength(0);
    });

    it('signed out, or signed in to a different server, is said so and writes nothing', async () => {
        await expect(connectSite({ ...D, apiUrl: 'https://other.example.test' }, 'http://127.0.0.1:8797')).rejects.toMatchObject({ code: 'other-server' });
        await logout();
        await expect(connectSite(D, 'http://127.0.0.1:8797')).rejects.toMatchObject({ code: 'signed-out' });
        expect(await readBindings()).toEqual({});
    });
});

describe('refreshBindingKey (spec X13)', () => {
    beforeEach(async () => {
        routes[`POST ${API}/api/auth/login`] = () => ({ status: 200, body: LOGIN_OK });
        await login(API, 'me@test.dev', 'pw', '0.1.0');
        routes[`GET ${API}/api/projects/demo`] = () => ({ status: 200, body: PROJECT });
        await connectSite(D, 'http://127.0.0.1:8797');
        calls.length = 0;
    });

    it('learns a rotated key', async () => {
        const rotated = 'pk_' + 'b'.repeat(48);
        routes[`GET ${API}/api/projects/demo`] = () => ({ status: 200, body: { ...PROJECT, ingestKey: rotated } });
        expect(await refreshBindingKey('http://127.0.0.1:8797')).toBe('changed');
        expect((await readBindings())['http://127.0.0.1:8797']?.ingestKey).toBe(rotated);
    });

    it('reports an unchanged key as such, so the caller does not retry for nothing', async () => {
        expect(await refreshBindingKey('http://127.0.0.1:8797')).toBe('same');
    });

    it('asks the API at most once a minute for a key that stays wrong', async () => {
        const t = 1_000_000;
        await refreshBindingKey('http://127.0.0.1:8797', t);
        await refreshBindingKey('http://127.0.0.1:8797', t + 30_000);
        expect(calls.filter((c) => c.url.endsWith('/api/projects/demo'))).toHaveLength(1);
        await refreshBindingKey('http://127.0.0.1:8797', t + 61_000);
        expect(calls.filter((c) => c.url.endsWith('/api/projects/demo'))).toHaveLength(2);
    });

    it('is unavailable — not an error — when signed out, or the origin is not bound', async () => {
        expect(await refreshBindingKey('http://127.0.0.1:1')).toBe('unavailable');
        await logout();
        expect(await refreshBindingKey('http://127.0.0.1:8797', 9_000_000)).toBe('unavailable');
    });
});

describe('handleRequest', () => {
    beforeEach(() => {
        routes[`GET ${APP}/apexops.json`] = () => ({ status: 200, body: { app: 'apexops', v: 1, apiUrl: API } });
        routes[`POST ${API}/api/auth/login`] = () => ({ status: 200, body: LOGIN_OK });
        routes[`GET ${API}/api/projects/demo`] = () => ({ status: 200, body: PROJECT });
        routes[`GET ${API}/api/auth/profile`] = () => ({ status: 200, body: { user: { email: 'me@test.dev' } } });
    });

    it('discover reads only the pasted web app, never the API', async () => {
        const reply = await handleRequest({ type: 'discover', projectUrl: `${APP}/p/demo/issues` }, CTX);
        expect(reply).toEqual({ ok: true, data: { appOrigin: APP, slug: 'demo', apiUrl: API, apiOrigin: API, signedInHere: false, signedInElsewhere: null } });
        expect(calls.map((c) => c.url)).toEqual([`${APP}/apexops.json`]);
    });

    it('connect with credentials signs in to the DISCOVERED api, binds the site, and hides the key from the reply', async () => {
        const reply = await handleRequest(
            { type: 'connect', projectUrl: `${APP}/p/demo`, siteOrigin: 'http://127.0.0.1:8797', credentials: { email: 'me@test.dev', password: 'pw' } },
            CTX
        );
        expect(reply).toEqual({ ok: true, data: { siteOrigin: 'http://127.0.0.1:8797', name: 'Demo', slug: 'demo', capturing: false } });
        expect(calls.find((c) => c.url.endsWith('/api/auth/login'))?.url).toBe(`${API}/api/auth/login`);
        expect(JSON.stringify(reply)).not.toContain('pk_');

        const status = (await handleRequest({ type: 'status' }, CTX)) as { ok: true; data: Status };
        expect(status.data.session).toMatchObject({ signedIn: true, apiUrl: API });
        expect(status.data.bindings['http://127.0.0.1:8797']).toEqual({ name: 'Demo', slug: 'demo', apiUrl: API, appOrigin: APP });
        expect(JSON.stringify(status)).not.toContain('pk_');
    });

    it('a wrong password comes back as a reply with a code, and binds nothing', async () => {
        routes[`POST ${API}/api/auth/login`] = () => ({ status: 401, body: {} });
        const reply = await handleRequest(
            { type: 'connect', projectUrl: `${APP}/p/demo`, siteOrigin: 'http://127.0.0.1:8797', credentials: { email: 'me@test.dev', password: 'nope' } },
            CTX
        );
        expect(reply).toMatchObject({ ok: false, error: { code: 'bad-credentials' } });
        expect(await readBindings()).toEqual({});
    });

    it('an API the web app names that is plain http on a real host is refused before any password is sent', async () => {
        routes[`GET ${APP}/apexops.json`] = () => ({ status: 200, body: { app: 'apexops', v: 1, apiUrl: 'http://evil.example.test' } });
        const reply = await handleRequest(
            { type: 'connect', projectUrl: `${APP}/p/demo`, siteOrigin: 'http://127.0.0.1:8797', credentials: { email: 'me@test.dev', password: 'pw' } },
            CTX
        );
        expect(reply).toMatchObject({ ok: false, error: { code: 'insecure-api-url' } });
        expect(calls.some((c) => c.url.includes('evil.example.test'))).toBe(false);
    });

    it('disconnect removes the binding, and only that one', async () => {
        await handleRequest(
            { type: 'connect', projectUrl: `${APP}/p/demo`, siteOrigin: 'http://127.0.0.1:8797', credentials: { email: 'me@test.dev', password: 'pw' } },
            CTX
        );
        await handleRequest({ type: 'connect', projectUrl: `${APP}/p/demo`, siteOrigin: 'http://127.0.0.1:8798' }, CTX);
        await handleRequest({ type: 'disconnect', siteOrigin: 'http://127.0.0.1:8797/any/path' }, CTX);
        expect(Object.keys(await readBindings())).toEqual(['http://127.0.0.1:8798']);
    });

    it('an unknown request type is refused, not thrown', async () => {
        expect(await handleRequest({ type: 'format-disk' } as never, CTX)).toMatchObject({ ok: false, error: { code: 'unknown-request' } });
    });
});

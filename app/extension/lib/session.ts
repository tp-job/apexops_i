import { configureApi, fetchWithAuth } from '@apexops/shared/api';
import {
    clearTokens,
    endSession,
    getAccessToken,
    getRefreshToken,
    getStoredUser,
    initSession,
    persistTokens,
    setStoredUser,
} from '@apexops/shared/auth';
import { createChromeStorageAdapter } from './chromeStorageAdapter';

/**
 * The extension's own login (spec P4, X2).
 *
 * **A session of its own, never borrowed from the web app.** Refresh tokens are
 * single-use with reuse detection, so two clients sharing one would each look
 * like the other's replay and get the family revoked (auth phase 3, F22). Login
 * here mints a separate session, labelled `extension/<version>` so it shows up
 * as such in Settings → sessions.
 *
 * **Only the service worker ever calls this.** Refresh must have one owner
 * (X2): the popup and content scripts ask the worker over messages and never
 * touch the token, so the in-flight-refresh guard in `authSession` — which is
 * per JS context — covers every caller there is.
 */

export const API_URL_KEY = 'apiUrl';

export type SessionProblemCode = 'bad-credentials' | 'throttled' | 'deactivated' | 'server' | 'network' | 'other-server';

export class SessionProblem extends Error {
    code: SessionProblemCode;
    constructor(code: SessionProblemCode, message: string) {
        super(message);
        this.name = 'SessionProblem';
        this.code = code;
    }
}

export type Whoami =
    | { signedIn: false }
    | { signedIn: true; user: { email: string; firstName?: string; lastName?: string }; apiUrl: string; offline: boolean };

let ready: Promise<void> | null = null;

/**
 * Load the stored session and the API it belongs to. Idempotent, and safe to
 * call first thing from every entry point: MV3 wakes the worker straight into an
 * alarm or a message with nothing in memory, and a call that ran before this
 * would decide "signed out" about a session that is sitting in storage.
 */
export function ensureSession(): Promise<void> {
    ready ??= (async () => {
        await initSession(createChromeStorageAdapter());
        const apiUrl = await storedApiUrl();
        if (apiUrl) configureApi({ baseUrl: apiUrl });
    })();
    return ready;
}

export async function storedApiUrl(): Promise<string | null> {
    const found = (await browser.storage.local.get(API_URL_KEY))[API_URL_KEY];
    return typeof found === 'string' ? found : null;
}

/** Test seam. */
export function __resetSessionForTests(): void {
    ready = null;
}

export async function login(apiUrl: string, email: string, password: string, version: string): Promise<void> {
    await ensureSession();

    // One session at a time, bound to one API. Quietly replacing it would strand
    // whatever is bound to the old server.
    const current = await storedApiUrl();
    if (current && current !== apiUrl && getAccessToken()) {
        throw new SessionProblem('other-server', `Already signed in to ${new URL(current).host}. Sign out first to use ${new URL(apiUrl).host}.`);
    }

    let res: Response;
    try {
        res = await fetch(`${apiUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Apexops-Client': `extension/${version}` },
            body: JSON.stringify({ email, password }),
            credentials: 'omit',
        });
    } catch {
        throw new SessionProblem('network', `Could not reach ${new URL(apiUrl).host}. Is the server running?`);
    }

    if (!res.ok) {
        if (res.status === 401) throw new SessionProblem('bad-credentials', 'Wrong email or password.');
        if (res.status === 429) throw new SessionProblem('throttled', 'Too many sign-in attempts. Wait a few minutes and try again.');
        if (res.status === 403) throw new SessionProblem('deactivated', 'This account cannot sign in.');
        throw new SessionProblem('server', `The server answered ${res.status}.`);
    }

    const data = (await res.json().catch(() => null)) as {
        accessToken?: unknown;
        refreshToken?: unknown;
        user?: unknown;
    } | null;
    if (!data || typeof data.accessToken !== 'string' || typeof data.refreshToken !== 'string' || !data.user) {
        throw new SessionProblem('server', 'The server sent an unexpected sign-in response.');
    }

    configureApi({ baseUrl: apiUrl });
    // The token write is awaited: a worker that stops before it lands has thrown
    // away a login the server already considers made.
    await persistTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
    await browser.storage.local.set({ [API_URL_KEY]: apiUrl });
}

/**
 * Who is signed in, checked with the server.
 *
 * Goes through `fetchWithAuth`, so an expired access token is refreshed here —
 * by the one refresher — before the answer comes back. A network failure keeps
 * the session and reports the cached user as `offline`: not being able to reach
 * the server is not evidence the session ended.
 */
export async function whoami(): Promise<Whoami> {
    await ensureSession();
    const apiUrl = await storedApiUrl();
    if (!apiUrl || !getAccessToken()) return { signedIn: false };

    const cached = getStoredUser<{ email: string }>();
    const unverified = (): Whoami =>
        cached ? { signedIn: true, user: cached, apiUrl, offline: true } : { signedIn: false };

    let res: Response;
    try {
        res = await fetchWithAuth('/api/auth/profile');
    } catch {
        return unverified();
    }

    if (res.ok) {
        const body = (await res.json().catch(() => null)) as { user?: { email: string } } | null;
        if (body?.user) {
            await setStoredUser(body.user);
            return { signedIn: true, user: body.user, apiUrl, offline: false };
        }
        return unverified();
    }
    // A 401 that survived the refresh-and-replay: the session is over. Any other
    // status is the server having a bad moment, which says nothing about us.
    if (res.status === 401 || res.status === 403) {
        endSession();
        return { signedIn: false };
    }
    return unverified();
}

export async function logout(): Promise<void> {
    await ensureSession();
    const apiUrl = await storedApiUrl();
    const token = getAccessToken();
    const refreshToken = getRefreshToken();
    // Best effort: a server that cannot be reached must not keep someone signed
    // in on this machine. The local session goes either way.
    if (apiUrl && token) {
        try {
            await fetch(`${apiUrl}/api/auth/logout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
                credentials: 'omit',
            });
        } catch {
            /* offline: see above */
        }
    }
    await clearTokens();
    await browser.storage.local.remove(API_URL_KEY);
}

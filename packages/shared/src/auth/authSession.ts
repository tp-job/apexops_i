import { getApiBaseUrl } from '../api/config';
import type { RefreshResponse } from '../types/auth';

/**
 * Token lifecycle, owned outside React.
 *
 * **Why this is not in `AuthContext`.** The things that need a fresh token are
 * `services/*`, `utils/*` and the axios instance — none of which are components
 * and none of which can call a hook. `AuthContext` already *has* a
 * `refreshToken()`; it has had one since Sprint 1, and it has never had a caller,
 * because there was nowhere for a service to reach it from. Putting the mechanism
 * in a plain module is what makes it callable from the places that actually hit
 * 401s. `AuthContext` subscribes to this module rather than the other way round.
 *
 * **Why a single in-flight promise is the whole point.** The server's `/refresh`
 * route is single-use: it deletes the presented refresh-token row and issues a
 * new one (`api/auth.ts`). Two concurrent refreshes therefore mean the second
 * presents a row that no longer exists, receives a 401, and ends a session that
 * was perfectly healthy. That is the "random logouts" bug the sprint plan priced
 * this item at two days for. One promise, shared by every caller, is the fix.
 *
 * **Why storage is an adapter behind a cache (extension P1, 2026-09-19).** The
 * browser extension's service worker has no `localStorage`, only the async
 * `chrome.storage`. Making every getter async would push `await` into axios
 * interceptors, socket handshakes and React's first render. Instead the adapter
 * is async and this module keeps an in-memory copy: `initSession()` fills it once
 * before anything reads it, writes update it synchronously and then persist, and
 * changes made by *another* context (a second tab, the extension's popup) arrive
 * through `adapter.subscribe`. The getters stay synchronous and are exactly as
 * fresh as before, because the cache is updated from the change event itself
 * rather than from a later read.
 */

/**
 * Where a session is persisted. Web: `localStorage`. Extension: `chrome.storage.local`.
 *
 * Every method may reject; this module treats a failing store as "nothing stored"
 * and keeps the in-memory session working for the current context.
 */
export interface StorageAdapter {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(keys: string[]): Promise<void>;
    /**
     * Report writes made by *other* contexts. `key: null` means the whole store was
     * cleared. Optional: a store with a single context has nothing to report.
     */
    subscribe?(onChange: (key: string | null, value: string | null) => void): () => void;
}

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';
const SESSION_KEYS = [ACCESS_KEY, REFRESH_KEY, USER_KEY];

/**
 * Treat a token as expired this long before it actually is.
 *
 * Covers clock skew between browser and server plus the flight time of the
 * request we are about to send. Without it, a token with 200ms of life left
 * passes the check here and is rejected by the time it lands.
 */
const EXPIRY_SKEW_MS = 10_000;

// ── storage ──────────────────────────────────────────────────

let adapter: StorageAdapter | null = null;
let unsubscribeAdapter: (() => void) | null = null;
let ready: Promise<void> = Promise.resolve();
const cache = new Map<string, string>();

type Listener = () => void;
const changeListeners = new Set<Listener>();

const notifyChanged = () => {
    changeListeners.forEach((l) => {
        try {
            l();
        } catch (err) {
            console.error('Session-changed listener threw:', err);
        }
    });
};

// A failing store is "nothing stored" (Safari private mode, a blocked embedding,
// a quota error). A missing token is a correct answer here; throwing is not.
const safely = async <T>(op: () => Promise<T>, fallback: T): Promise<T> => {
    try {
        return await op();
    } catch {
        return fallback;
    }
};

const setCached = (key: string, value: string | null) => {
    if (value === null) cache.delete(key);
    else cache.set(key, value);
};

/**
 * Load the stored session into memory and start following other contexts' writes.
 *
 * Must resolve before anything reads a token — the web app calls it before React
 * mounts (`main.tsx`). Calling it again swaps the adapter (tests do this).
 */
export function initSession(next: StorageAdapter): Promise<void> {
    unsubscribeAdapter?.();
    adapter = next;
    cache.clear();

    unsubscribeAdapter =
        next.subscribe?.((key, value) => {
            if (key === null) cache.clear();
            else if (SESSION_KEYS.includes(key)) setCached(key, value);
            else return;
            notifyChanged();
        }) ?? null;

    ready = (async () => {
        const values = await Promise.all(SESSION_KEYS.map((k) => safely(() => next.get(k), null)));
        SESSION_KEYS.forEach((k, i) => {
            // A write that landed while we were reading is newer than what we read.
            if (!cache.has(k)) setCached(k, values[i]);
        });
    })();
    return ready;
}

/** Resolves once `initSession`'s initial read has finished. */
export const whenSessionReady = (): Promise<void> => ready;

export const getAccessToken = (): string | null => cache.get(ACCESS_KEY) ?? null;
export const getRefreshToken = (): string | null => cache.get(REFRESH_KEY) ?? null;

/** The last user a login, refresh or profile call returned. Display only — never an authorization input. */
export function getStoredUser<T>(): T | null {
    const raw = cache.get(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

/**
 * Writes what a login/refresh response returned. `user` and `refreshToken` are optional.
 *
 * Memory is updated before this returns, so this context sees the new token even
 * if the caller does not await. Awaiting guarantees it reached storage — which
 * matters in an extension service worker that can be stopped at any moment.
 */
export async function persistTokens(data: {
    accessToken: string;
    refreshToken?: string;
    user?: unknown;
}): Promise<void> {
    const writes: [string, string][] = [[ACCESS_KEY, data.accessToken]];
    if (data.refreshToken) writes.push([REFRESH_KEY, data.refreshToken]);
    if (data.user) writes.push([USER_KEY, JSON.stringify(data.user)]);

    writes.forEach(([k, v]) => setCached(k, v));
    const store = adapter;
    if (!store) return;
    await Promise.all(writes.map(([k, v]) => safely(() => store.set(k, v), undefined)));
}

/** Replace the stored user (after a profile read or update) without touching the tokens. */
export async function setStoredUser(user: unknown): Promise<void> {
    const value = JSON.stringify(user);
    setCached(USER_KEY, value);
    const store = adapter;
    if (!store) return;
    await safely(() => store.set(USER_KEY, value), undefined);
}

export async function clearTokens(): Promise<void> {
    cache.clear();
    const store = adapter;
    if (!store) return;
    await safely(() => store.remove(SESSION_KEYS), undefined);
}

/**
 * Another context changed the stored session — signed out, or signed in as
 * someone else. Fires after the in-memory copy is updated, so listeners can read
 * the getters. Does not fire for this context's own writes.
 */
export function onSessionChanged(listener: Listener): () => void {
    changeListeners.add(listener);
    return () => changeListeners.delete(listener);
}

// ── expiry ───────────────────────────────────────────────────

/**
 * Is this access token past its `exp`?
 *
 * Decodes the payload; it does **not** verify the signature, and must not be
 * mistaken for authorization — the server is the only thing that decides whether
 * a token is good. This exists purely to skip a request we already know will
 * come back 401.
 *
 * A token that cannot be parsed returns `false` — "not known to be expired".
 * Erring the other way would mean a malformed-token bug logs people out, which
 * is a far worse failure than one wasted round trip.
 */
export function isExpired(token: string | null, skewMs = EXPIRY_SKEW_MS): boolean {
    if (!token) return false;
    try {
        const payload = token.split('.')[1];
        if (!payload) return false;
        // base64url → base64, then a UTF-8-safe decode: `atob` alone mangles any
        // non-ASCII character that ended up in the payload.
        const json = decodeURIComponent(
            atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
                .split('')
                .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
                .join('')
        );
        const { exp } = JSON.parse(json) as { exp?: number };
        if (typeof exp !== 'number') return false;
        return exp * 1000 - skewMs <= Date.now();
    } catch {
        return false;
    }
}

// ── session-ended notification ───────────────────────────────

const listeners = new Set<Listener>();

/**
 * Called when the session is over for good.
 *
 * `AuthContext` subscribes so React drops `user` and the guard bounces to
 * `/login`. Without this the tokens would be gone from storage while the shell
 * kept rendering a nav rail and a project switcher for a session that no longer
 * exists — which is the exact symptom this build is fixing, just moved.
 */
export function onSessionExpired(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function endSession(): void {
    // Memory is cleared synchronously inside; the store catches up on its own.
    void clearTokens();
    listeners.forEach((l) => {
        try {
            l();
        } catch (err) {
            // One bad subscriber must not stop the others from finding out.
            console.error('Session-expired listener threw:', err);
        }
    });
}

// ── the refresh itself ───────────────────────────────────────

/**
 * Thrown when the session is over: the refresh token was rejected, or there was
 * never one to present. Callers should stop retrying and let the guard redirect.
 * Distinct from a network failure, which leaves the session intact.
 */
export class SessionExpiredError extends Error {
    constructor(message = 'Your session has ended. Please sign in again.') {
        super(message);
        this.name = 'SessionExpiredError';
    }
}

let inFlight: Promise<string> | null = null;

/**
 * Mint a new access token. Concurrent callers share one request.
 *
 * Resolves with the new access token. Rejects with `SessionExpiredError` when the
 * session is genuinely over — and with the underlying error when the *network*
 * failed, because a wifi blip is not proof that a session is invalid. That
 * distinction is the difference between "the app recovered when you got signal
 * back" and "the app logged you out on the train".
 */
export function refreshOnce(): Promise<string> {
    if (inFlight) return inFlight;

    const attempt = (async () => {
        // An extension service worker can wake straight into a refresh; never
        // decide "no refresh token" before the stored one has been read.
        await ready;
        const presented = getRefreshToken();
        if (!presented) throw new SessionExpiredError();

        // Snapshotted before the request so we can tell, if this fails, whether
        // another tab rotated the token out from under us (see below).
        const accessAtStart = getAccessToken();

        // A network-level failure throws straight out of here on purpose: the
        // session is not known to be bad, so it survives and the caller surfaces
        // an error. That is the difference between "it recovered when you got
        // signal back" and "it logged you out on the train".
        const res = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: presented }),
        });

        if (res.ok) {
            const data = (await res.json()) as RefreshResponse;
            if (!data.accessToken) throw new SessionExpiredError('Refresh returned no token.');
            // Awaited: the server has already burned the old refresh token, so a
            // context that stops before this write lands has lost the session (R3).
            await persistTokens(data);
            return data.accessToken;
        }

        // The refresh token is single-use. If two tabs raced, the loser lands
        // here holding a 401 for a session that is actually fine — the winner
        // already wrote a working token to the storage both tabs share, and the
        // adapter's change event has put it in our cache. Adopt it rather than
        // ending a live session.
        const current = getAccessToken();
        if (current && current !== accessAtStart) return current;

        if (res.status === 401 || res.status === 403) {
            endSession();
            throw new SessionExpiredError();
        }

        // 5xx and anything else: the server is having a problem, which is not the
        // same as the user's session being over. Leave the session alone.
        throw new Error(`Could not refresh the session (${res.status}).`);
    })();

    // Cleared on both paths. A rejected promise left in the slot would make every
    // later call re-throw the same stale failure forever. The `catch` is only
    // there to keep this bookkeeping chain from counting as an unhandled
    // rejection — the real error still reaches whoever awaited `attempt`.
    void attempt.catch(() => undefined).finally(() => {
        inFlight = null;
    });

    inFlight = attempt;
    return attempt;
}

/** Test seam — resets the in-flight slot. Not used by application code. */
export function __resetInFlight(): void {
    inFlight = null;
}

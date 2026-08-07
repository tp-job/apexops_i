import { getApiBaseUrl } from '@/api/config';
import type { RefreshResponse } from '@/types/auth';

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
 */

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';

/**
 * Treat a token as expired this long before it actually is.
 *
 * Covers clock skew between browser and server plus the flight time of the
 * request we are about to send. Without it, a token with 200ms of life left
 * passes the check here and is rejected by the time it lands.
 */
const EXPIRY_SKEW_MS = 10_000;

// ── storage ──────────────────────────────────────────────────

const read = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch {
        // Safari in private mode, and any embedding that blocks storage. A
        // missing token is a correct answer here; throwing is not.
        return null;
    }
};

export const getAccessToken = (): string | null => read(ACCESS_KEY);
export const getRefreshToken = (): string | null => read(REFRESH_KEY);

/** Writes what a login/refresh response returned. `user` and `refreshToken` are optional. */
export function persistTokens(data: {
    accessToken: string;
    refreshToken?: string;
    user?: unknown;
}): void {
    try {
        localStorage.setItem(ACCESS_KEY, data.accessToken);
        if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
        if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch {
        // Nothing useful to do — the in-memory session still works for this tab.
    }
}

export function clearTokens(): void {
    try {
        [ACCESS_KEY, REFRESH_KEY, USER_KEY].forEach((k) => localStorage.removeItem(k));
    } catch {
        /* see above */
    }
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

type Listener = () => void;
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
    clearTokens();
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
            persistTokens(data);
            return data.accessToken;
        }

        // The refresh token is single-use. If two tabs raced, the loser lands
        // here holding a 401 for a session that is actually fine — the winner
        // already wrote a working token to the storage both tabs share. Adopt it
        // rather than ending a live session.
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

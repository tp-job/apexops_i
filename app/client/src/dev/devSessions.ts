/**
 * Two live sessions at once, for local development.
 *
 * ## Why this is safe to have in the tree
 *
 * Everything here is behind `import.meta.env.DEV`. Vite replaces that with the
 * literal `false` in a production build, so the guarded branches are statically
 * dead and get dropped — the switcher's code never reaches a shipped bundle. Each
 * exported function *also* checks at runtime, so this can't be defeated by
 * importing it from somewhere the bundler didn't tree-shake.
 *
 * ## What it does not do
 *
 * It does not forge, elevate, or invent a session. Both sessions come from real
 * `POST /api/auth/login` calls against real seeded accounts, and the admin one is
 * only admin because `seed-dev-users.ts` set that role in the database. Switching
 * swaps which real token is active. If the server says a token is no good, it's no
 * good — there is no client-side path to privilege here, which is the property
 * that makes this a convenience and not a backdoor.
 *
 * Run `npm run seed:dev --workspace app/server` once to create the accounts.
 */
import { getApiBaseUrl } from '@/api/config';
import type { User } from '@/types/auth';

export type DevRole = 'user' | 'admin';

export interface DevSession {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export type DevSessionMap = Partial<Record<DevRole, DevSession>>;

/** Matches `DEV_ACCOUNTS` in `app/server/src/scripts/seed-dev-users.ts`. */
export const DEV_CREDENTIALS: Record<DevRole, { email: string; password: string }> = {
    user: { email: 'dev.user@apexops.local', password: 'DevPass123' },
    admin: { email: 'dev.admin@apexops.local', password: 'DevPass123' },
};

const SESSIONS_KEY = 'devSessions';
const ACTIVE_KEY = 'devActiveRole';

/** Belt-and-braces: `import.meta.env.DEV` already dead-codes these away in a build. */
export function devSwitcherEnabled(): boolean {
    return import.meta.env.DEV;
}

export function readSessions(): DevSessionMap {
    if (!devSwitcherEnabled()) return {};
    try {
        const raw = localStorage.getItem(SESSIONS_KEY);
        return raw ? (JSON.parse(raw) as DevSessionMap) : {};
    } catch {
        return {};
    }
}

function writeSessions(sessions: DevSessionMap): void {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function readActiveRole(): DevRole | null {
    if (!devSwitcherEnabled()) return null;
    const value = localStorage.getItem(ACTIVE_KEY);
    return value === 'user' || value === 'admin' ? value : null;
}

export function clearDevSessions(): void {
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(ACTIVE_KEY);
}

/** Seconds left on a JWT, or 0 if it can't be read. Unsigned parse — display only. */
function secondsUntilExpiry(token: string): number {
    try {
        const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
        if (!payload.exp) return 0;
        return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
    } catch {
        return 0;
    }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
    if (!res.ok) throw new Error(data.error || `${path} responded ${res.status}`);
    return data;
}

async function loginAs(role: DevRole): Promise<DevSession> {
    const { email, password } = DEV_CREDENTIALS[role];
    const data = await postJson<DevSession>('/api/auth/login', { email, password });
    if (!data.accessToken || !data.user) throw new Error(`Unexpected login response for ${role}`);

    if (data.user.role !== role) {
        // The seeded account exists but carries the wrong role — re-running the seed
        // script fixes it. Saying so beats a mystifying 403 later.
        throw new Error(
            `${email} has role "${data.user.role ?? 'none'}", expected "${role}". ` +
                'Re-run: npm run seed:dev --workspace app/server'
        );
    }
    return data;
}

/**
 * Sign into both accounts and keep both sessions.
 *
 * Both are logged in for real and stay that way — that's the point of holding two
 * token pairs rather than signing out of one to sign into the other.
 */
export async function establishBothSessions(): Promise<DevSessionMap> {
    if (!devSwitcherEnabled()) throw new Error('Dev role switcher is disabled');

    // Sequential, not Promise.all: `authLoginLimiter` rate-limits per IP, and two
    // simultaneous logins from one machine is exactly the shape it watches for.
    const user = await loginAs('user');
    const admin = await loginAs('admin');

    const sessions: DevSessionMap = { user, admin };
    writeSessions(sessions);
    return sessions;
}

/**
 * Refresh a stored session whose access token is close to expiring.
 *
 * This is what "logged in at all times" actually requires: access tokens last an
 * hour, and Sprint 1 deliberately deferred app-wide refresh-on-401. Without this,
 * the *inactive* role would quietly rot while you worked in the other one, and
 * switching would dump you at `/login`.
 *
 * Returns the session unchanged if it's still fresh, or null if it can't be saved.
 */
async function refreshIfStale(session: DevSession): Promise<DevSession | null> {
    if (secondsUntilExpiry(session.accessToken) > 120) return session;

    try {
        const data = await postJson<{ accessToken: string; refreshToken?: string; user?: User }>(
            '/api/auth/refresh',
            { refreshToken: session.refreshToken }
        );
        return {
            accessToken: data.accessToken,
            // The server rotates refresh tokens (single-use); keeping the old one
            // would make the *next* refresh fail.
            refreshToken: data.refreshToken ?? session.refreshToken,
            user: data.user ?? session.user,
        };
    } catch {
        return null;
    }
}

/**
 * Make `role` the active session.
 *
 * Refreshes it first if needed, then writes it into the canonical
 * `accessToken`/`refreshToken`/`user` keys that `AuthContext` and every hook read.
 * Returns the session so the caller can decide how to apply it.
 *
 * Throws if that role has no stored session — call `establishBothSessions` first.
 */
export async function activateRole(role: DevRole): Promise<DevSession> {
    if (!devSwitcherEnabled()) throw new Error('Dev role switcher is disabled');

    const sessions = readSessions();
    const stored = sessions[role];
    if (!stored) throw new Error(`No stored ${role} session. Sign in to both first.`);

    const fresh = await refreshIfStale(stored);
    if (!fresh) {
        throw new Error(`The ${role} session expired and could not be refreshed. Sign in to both again.`);
    }

    writeSessions({ ...sessions, [role]: fresh });
    localStorage.setItem(ACTIVE_KEY, role);
    localStorage.setItem('accessToken', fresh.accessToken);
    localStorage.setItem('refreshToken', fresh.refreshToken);
    localStorage.setItem('user', JSON.stringify(fresh.user));

    return fresh;
}

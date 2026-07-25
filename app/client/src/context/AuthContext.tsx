import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '@/services/auth';
import type { User, UserSettings } from '@/types/auth';
import { getApiBaseUrl } from '@/api/config';
import { isMockEnabled, isNetworkFailure, readOnlyOfflineMessage } from '@/utils/offlineMock';
import { AuthContext, type AuthContextType } from './auth-context';

const STORAGE_KEYS = ['accessToken', 'refreshToken', 'user'] as const;

function clearSession(): void {
    STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
}

function persistSession(accessToken: string, refreshToken: string, user: User): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
}

/** Last-known user, for painting the shell while `/profile` is still in flight. */
function readCachedUser(): User | null {
    try {
        const raw = localStorage.getItem('user');
        return raw ? (JSON.parse(raw) as User) : null;
    } catch {
        return null;
    }
}

/**
 * Turns a thrown error into something a person can act on.
 *
 * A bare "Failed to fetch" tells the user nothing; naming the API base URL tells
 * them the backend isn't running, which is the actual cause nine times in ten.
 */
function toUserMessage(err: unknown): Error {
    if (isNetworkFailure(err)) {
        return new Error(`Cannot reach the server at ${getApiBaseUrl()}. Is the backend running?`);
    }
    return err instanceof Error ? err : new Error('Something went wrong. Please try again.');
}

/**
 * Session state for the app.
 *
 * **Sprint 1 (2026-07-25) removed a hardcoded login bypass here.** This provider
 * used to seed `user` from `getMockLoginResponse()` and keep its mount effect
 * empty (`// BYPASS LOGIN`), which made `isAuthenticated` permanently true — any
 * route guard on top of it would have been decorative. It now hydrates from
 * `localStorage` and validates against `GET /api/auth/profile`.
 *
 * The offline-mock fallback was also removed from `login`/`register`. Everywhere
 * else in the app, falling back to fixtures on a network failure degrades a panel;
 * in auth it would hand out a session the server never issued. A failed login must
 * fail.
 *
 * Navigation is deliberately *not* done here. This provider sits outside the
 * router (see `main.tsx`), so it owns state only; `ProtectedRoute` and the auth
 * pages react to `user` changing. That's why `logout()` no longer sets
 * `window.location.href` — it used to point at `/auth`, a route that doesn't exist.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(readCachedUser);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    // Starts true only when there's a token worth validating; otherwise the app is
    // immediately, knowably signed out and there is nothing to wait for.
    const [loading, setLoading] = useState(() => !!localStorage.getItem('accessToken'));

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch (err) {
            // A failed logout call must not strand the user in a signed-in shell.
            console.error('Logout request failed; clearing local session anyway:', err);
        } finally {
            clearSession();
            setUser(null);
            setSettings(null);
        }
    }, []);

    // Validate the stored token once on mount. A cached user is shown meanwhile so
    // a reload doesn't flash an empty shell, but the server has the final say.
    useEffect(() => {
        let cancelled = false;

        const hydrate = async () => {
            if (!localStorage.getItem('accessToken')) {
                clearSession();
                if (!cancelled) {
                    setUser(null);
                    setLoading(false);
                }
                return;
            }

            try {
                const data = await authApi.getProfile();
                if (cancelled) return;
                setUser(data.user);
                setSettings(data.settings);
                localStorage.setItem('user', JSON.stringify(data.user));
            } catch (err) {
                if (cancelled) return;
                // A network blip is not proof the session is invalid — keep the
                // cached user and let the next real 401 end it. Only an actual
                // rejection from the server clears the session.
                if (isNetworkFailure(err)) {
                    console.warn('Could not verify session (server unreachable); keeping cached user.');
                } else {
                    clearSession();
                    setUser(null);
                    setSettings(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        hydrate();
        return () => {
            cancelled = true;
        };
    }, []);

    const refreshToken = useCallback(async () => {
        try {
            const data = await authApi.refreshToken();
            localStorage.setItem('accessToken', data.accessToken);
            if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
            if (data.user) {
                setUser(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
            }
        } catch (err) {
            console.error('Error refreshing token:', err);
            await logout();
        }
    }, [logout]);

    const login = useCallback(async (email: string, password: string) => {
        try {
            const data = await authApi.login(email, password);
            persistSession(data.accessToken, data.refreshToken, data.user);
            setUser(data.user);
        } catch (err) {
            throw toUserMessage(err);
        }
    }, []);

    const register = useCallback(
        async (firstName: string, lastName: string, email: string, password: string) => {
            try {
                const data = await authApi.register(firstName, lastName, email, password);
                persistSession(data.accessToken, data.refreshToken, data.user);
                setUser(data.user);
            } catch (err) {
                throw toUserMessage(err);
            }
        },
        []
    );

    const updateProfile = useCallback(async (data: Partial<User>) => {
        try {
            const result = await authApi.updateProfile(data);
            setUser(result.user);
            localStorage.setItem('user', JSON.stringify(result.user));
        } catch (err: unknown) {
            console.error('Update profile error:', err);
            if (isMockEnabled() && isNetworkFailure(err)) {
                throw new Error(readOnlyOfflineMessage());
            }
            throw err;
        }
    }, []);

    const updateSettings = useCallback(async (data: Partial<UserSettings>) => {
        try {
            const result = await authApi.updateSettings(data);
            setSettings(result.settings);
        } catch (err: unknown) {
            console.error('Update settings error:', err);
            if (isMockEnabled() && isNetworkFailure(err)) {
                throw new Error(readOnlyOfflineMessage());
            }
            throw err;
        }
    }, []);

    const value: AuthContextType = {
        user,
        settings,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        updateSettings,
        refreshToken,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

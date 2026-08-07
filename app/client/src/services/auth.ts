/**
 * Auth API: all HTTP calls for authentication and user profile/settings.
 * AuthContext uses this module and updates state; no React here.
 *
 * **Two transports on purpose (Sprint 3, 2026-08-03).**
 *
 * The *session* calls — login, register, logout — use raw `fetch`, because they
 * are precisely the requests that must never trigger a token refresh: a 401 from
 * `/login` means "wrong password", and refreshing there would turn a typo into a
 * logout. `api/client.ts` also skips them by path, so this is belt and braces.
 *
 * Everything else — profile, password, settings — goes through `fetchWithAuth`
 * and therefore recovers from an expired access token like the rest of the app.
 * Before this they hand-rolled their own `Authorization` header, which made them
 * the last authed surface with no retry.
 *
 * `refreshToken()` used to live here. It now lives in `lib/authSession.ts`,
 * because a refresh needs the single-in-flight coordination that a plain API
 * wrapper cannot provide — and having two implementations of it was a live risk
 * of them disagreeing about when a session is over.
 */

import { getApiBaseUrl } from '@/api/config';
import { fetchWithAuth } from '@/api/client';
import type { LoginResponse, ProfileResponse, User, UserSettings } from '@/types/auth';

export const authApi = {
    async getProfile(): Promise<ProfileResponse> {
        // No local token check: `fetchWithAuth` may mint one on the way in, and
        // a stale guard here would reject a request that was about to succeed.
        const response = await fetchWithAuth('/api/auth/profile', { json: true });

        if (response.ok) {
            return (await response.json()) as ProfileResponse;
        }
        if (response.status === 401) {
            const e = new Error('Unauthorized') as Error & { status?: number };
            e.status = 401;
            throw e;
        }
        throw new Error('Failed to fetch profile');
    },

    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        let data: { error?: string } & Partial<LoginResponse> = {};
        if (response.headers.get('content-type')?.includes('application/json')) {
            data = (await response.json()) as { error?: string } & Partial<LoginResponse>;
        }
        if (!response.ok) {
            throw new Error(data.error || `Login failed (${response.status})`);
        }
        if (data.accessToken && data.refreshToken && data.user) {
            return {
                user: data.user,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
            };
        }
        throw new Error('Invalid login response');
    },

    async register(firstName: string, lastName: string, email: string, password: string): Promise<LoginResponse> {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, password }),
        });

        let data: { error?: string } & Partial<LoginResponse> = {};
        if (response.headers.get('content-type')?.includes('application/json')) {
            data = (await response.json()) as { error?: string } & Partial<LoginResponse>;
        }
        if (!response.ok) {
            throw new Error(data.error || `Registration failed (${response.status})`);
        }
        if (data.accessToken && data.refreshToken && data.user) {
            return {
                user: data.user,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
            };
        }
        throw new Error('Invalid register response');
    },

    async logout(): Promise<void> {
        const refreshTokenValue = typeof localStorage !== 'undefined' ? localStorage.getItem('refreshToken') : null;
        if (!refreshTokenValue) return;

        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
        await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: refreshTokenValue }),
        });
    },

    async updateProfile(data: Partial<User>): Promise<{ user: User }> {
        const response = await fetchWithAuth('/api/auth/profile', {
            method: 'PUT',
            json: true,
            body: JSON.stringify(data),
        });

        const result = (await response.json()) as { error?: string; user?: User };
        if (!response.ok) {
            throw new Error(result.error || 'Failed to update profile');
        }
        if (result.user) return { user: result.user };
        throw new Error('Invalid profile response');
    },

    /**
     * Change password. The server re-verifies `currentPassword` — this is not a
     * client-side confirmation step, it is what stops a hijacked session from
     * silently changing the credential and locking the real owner out.
     */
    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        const response = await fetchWithAuth('/api/auth/password', {
            method: 'PUT',
            json: true,
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        if (!response.ok) {
            const result = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(result.error || 'Failed to change password');
        }
    },

    async updateSettings(data: Partial<UserSettings>): Promise<{ settings: UserSettings }> {
        const response = await fetchWithAuth('/api/auth/settings', {
            method: 'PUT',
            json: true,
            body: JSON.stringify(data),
        });

        const result = (await response.json()) as { error?: string; settings?: UserSettings };
        if (!response.ok) {
            throw new Error(result.error || 'Failed to update settings');
        }
        if (result.settings) return { settings: result.settings };
        throw new Error('Invalid settings response');
    },
};

/*
 * `getMockLoginResponse` / `getMockUserSettings` were removed in Sprint 1
 * (2026-07-25). Their only consumer was `AuthContext`'s login bypass — a helper
 * that mints a session the server never issued has no place next to the real auth
 * calls. Fixtures for non-auth surfaces still live in `utils/mockData.ts`.
 */

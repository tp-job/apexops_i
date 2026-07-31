/**
 * Auth API: all HTTP calls for authentication and user profile/settings.
 * AuthContext uses this module and updates state; no React here.
 */

import { getApiBaseUrl, getAuthToken } from '@/api/config';
import type { LoginResponse, ProfileResponse, RefreshResponse, User, UserSettings } from '@/types/auth';

export const authApi = {
    async getProfile(): Promise<ProfileResponse> {
        const token = getAuthToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

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

    async refreshToken(): Promise<RefreshResponse> {
        const refreshTokenValue = typeof localStorage !== 'undefined' ? localStorage.getItem('refreshToken') : null;
        if (!refreshTokenValue) throw new Error('No refresh token');

        const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: refreshTokenValue }),
        });

        if (response.ok) {
            return (await response.json()) as RefreshResponse;
        }
        throw new Error('Failed to refresh token');
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

        const token = getAuthToken();
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
        const token = getAuthToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
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
        const token = getAuthToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${getApiBaseUrl()}/api/auth/password`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ currentPassword, newPassword }),
        });

        if (!response.ok) {
            const result = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(result.error || 'Failed to change password');
        }
    },

    async updateSettings(data: Partial<UserSettings>): Promise<{ settings: UserSettings }> {
        const token = getAuthToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`${getApiBaseUrl()}/api/auth/settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
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

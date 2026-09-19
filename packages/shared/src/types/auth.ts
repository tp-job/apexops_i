/**
 * Shared auth domain types. Used by AuthContext and authApi.
 */

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    position?: string;
    location?: string;
    timezone?: string;
    bio?: string;
    avatarUrl?: string;
    role?: string;
    gender?: string;
    birthDate?: string;
    language?: string;
    /**
     * `'light' | 'dark' | 'system'`. Persisted per account so the choice follows
     * you to another browser (spec D7); `ThemeProvider` still keeps a local copy
     * so the signed-out pages do not flash the wrong theme.
     *
     * `language` above is intentionally never rendered as a control: there is no
     * i18n framework, so a language select would promise something that cannot
     * happen.
     */
    theme?: 'light' | 'dark' | 'system';
    isActive?: boolean;
    emailVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Account settings — **only what is enforced** (spec S-D1, criterion 10).
 *
 * This used to declare eleven fields. Ten of them (`emailNotifications`,
 * `pushNotifications`, `bugAlerts`, `weeklyReports`, `teamUpdates`,
 * `twoFactorAuth`, `loginAlerts`, `profileVisibility`, `activityStatus`,
 * `dataCollection`) were written to Postgres and read by nothing — and a type
 * that names them is an invitation to render a switch for them. The server
 * stopped accepting them on 2026-07-31 and stopped returning them in Sprint 5.
 *
 * The columns still exist; they are inert, and dropping them buys nothing. Adding
 * a field back here is a *decision*, and it belongs with the feature that reads it.
 */
export interface UserSettings {
    /**
     * Idle timeout in minutes, 5–480. Enforced: it sizes both the access token
     * and the refresh token's sliding window.
     */
    sessionTimeout: number;
}

export interface LoginResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface ProfileResponse {
    user: User;
    settings: UserSettings;
}

export interface RefreshResponse {
    accessToken: string;
    refreshToken?: string;
    user?: User;
}

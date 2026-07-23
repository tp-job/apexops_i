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
    isActive?: boolean;
    emailVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserSettings {
    emailNotifications: boolean;
    pushNotifications: boolean;
    bugAlerts: boolean;
    weeklyReports: boolean;
    teamUpdates: boolean;
    twoFactorAuth: boolean;
    sessionTimeout: number;
    loginAlerts: boolean;
    profileVisibility: boolean;
    activityStatus: boolean;
    dataCollection: boolean;
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

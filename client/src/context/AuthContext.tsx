import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { isMockEnabled, isNetworkFailure, readOnlyOfflineMessage } from '@/utils/offlineMock';
import { mockAccessToken, mockRefreshToken, mockUser, mockUserSettings } from '@/utils/mockData';

interface User {
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

interface UserSettings {
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

interface AuthContextType {
    user: User | null;
    settings: UserSettings | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
    updateSettings: (data: Partial<UserSettings>) => Promise<void>;
    refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedUser = localStorage.getItem('user');
                const storedToken = localStorage.getItem('accessToken');

                if (storedUser && storedToken) {
                    setUser(JSON.parse(storedUser));
                    // Verify token and get fresh user data
                    await fetchProfile();
                }
            } catch (err) {
                console.error('Error loading user:', err);
                localStorage.removeItem('user');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    // Fetch user profile
    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                setSettings(data.settings);
                localStorage.setItem('user', JSON.stringify(data.user));
            } else if (response.status === 401) {
                // Token expired, try to refresh
                await refreshToken();
            } else {
                throw new Error('Failed to fetch profile');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            if (isMockEnabled() && isNetworkFailure(err)) {
                // Keep local user; provide default mock settings if missing
                setSettings((prev) => prev ?? (mockUserSettings as UserSettings));
                return;
            }
            logout();
        }
    };

    // Refresh access token
    const refreshToken = async () => {
        try {
            const refreshTokenValue = localStorage.getItem('refreshToken');
            if (!refreshTokenValue) {
                throw new Error('No refresh token');
            }

            const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: refreshTokenValue })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
                if (data.user) {
                    setUser(data.user);
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
            } else {
                throw new Error('Failed to refresh token');
            }
        } catch (err) {
            console.error('Error refreshing token:', err);
            if (isMockEnabled() && isNetworkFailure(err)) {
                // Offline: keep existing local tokens/user
                return;
            }
            logout();
        }
    };

    // Login
    const login = async (email: string, password: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            let data: { error?: string; accessToken?: string; refreshToken?: string; user?: User } = {};
            if (response.headers.get('content-type')?.includes('application/json')) {
                data = await response.json();
            }
            if (!response.ok) {
                throw new Error(data.error || `Login failed (${response.status})`);
            }

            localStorage.setItem('accessToken', data.accessToken!);
            localStorage.setItem('refreshToken', data.refreshToken!);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user!);
            window.location.href = '/';
        } catch (err: any) {
            console.error('Login error:', err);
            if (isMockEnabled() && isNetworkFailure(err)) {
                localStorage.setItem('accessToken', mockAccessToken);
                localStorage.setItem('refreshToken', mockRefreshToken);
                localStorage.setItem('user', JSON.stringify(mockUser));
                setUser(mockUser as User);
                setSettings(mockUserSettings as UserSettings);
                window.location.href = '/dashboard';
                return;
            }
            if (err?.message === 'Failed to fetch' || err?.name === 'TypeError') {
                throw new Error('Cannot reach server. Ensure backend is running at ' + API_BASE_URL);
            }
            throw err;
        }
    };

    // Register
    const register = async (firstName: string, lastName: string, email: string, password: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, email, password }),
            });

            let data: { error?: string; accessToken?: string; refreshToken?: string; user?: User } = {};
            if (response.headers.get('content-type')?.includes('application/json')) {
                data = await response.json();
            }
            if (!response.ok) {
                throw new Error(data.error || `Registration failed (${response.status})`);
            }

            localStorage.setItem('accessToken', data.accessToken!);
            localStorage.setItem('refreshToken', data.refreshToken!);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user!);
            window.location.href = '/';
        } catch (err: any) {
            console.error('Registration error:', err);
            if (isMockEnabled() && isNetworkFailure(err)) {
                localStorage.setItem('accessToken', mockAccessToken);
                localStorage.setItem('refreshToken', mockRefreshToken);
                localStorage.setItem('user', JSON.stringify(mockUser));
                setUser(mockUser as User);
                setSettings(mockUserSettings as UserSettings);
                window.location.href = '/dashboard';
                return;
            }
            if (err?.message === 'Failed to fetch' || err?.name === 'TypeError') {
                throw new Error('Cannot reach server. Ensure backend is running at ' + API_BASE_URL);
            }
            throw err;
        }
    };

    // Logout
    const logout = async () => {
        try {
            const refreshTokenValue = localStorage.getItem('refreshToken');
            if (refreshTokenValue) {
                await fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ refreshToken: refreshTokenValue })
                });
            }
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
            setSettings(null);
            window.location.href = '/auth';
        }
    };

    // Update profile
    const updateProfile = async (data: Partial<User>) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update profile');
            }

            setUser(result.user);
            localStorage.setItem('user', JSON.stringify(result.user));
        } catch (err: any) {
            console.error('Update profile error:', err);
            if (isMockEnabled() && isNetworkFailure(err)) {
                throw new Error(readOnlyOfflineMessage());
            }
            throw err;
        }
    };

    // Update settings
    const updateSettings = async (data: Partial<UserSettings>) => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) throw new Error('Not authenticated');

            const response = await fetch(`${API_BASE_URL}/api/auth/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update settings');
            }

            setSettings(result.settings);
        } catch (err: any) {
            console.error('Update settings error:', err);
            if (isMockEnabled() && isNetworkFailure(err)) {
                throw new Error(readOnlyOfflineMessage());
            }
            throw err;
        }
    };

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
        refreshToken
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};


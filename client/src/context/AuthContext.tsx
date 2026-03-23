import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getAuthToken } from '@/api/config';
import {
    authApi,
    getMockLoginResponse,
    getMockUserSettings,
} from '@/services/auth';
import type { User, UserSettings } from '@/types/auth';
import { isMockEnabled, isNetworkFailure, readOnlyOfflineMessage } from '@/utils/offlineMock';

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const loadUser = async () => {
            try {
                const storedUser = localStorage.getItem('user');
                const storedToken = getAuthToken();

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

    const fetchProfile = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const data = await authApi.getProfile();
            setUser(data.user);
            setSettings(data.settings);
            localStorage.setItem('user', JSON.stringify(data.user));
        } catch (err) {
            console.error('Error fetching profile:', err);
            if (isMockEnabled() && isNetworkFailure(err)) {
                setSettings((prev) => prev ?? getMockUserSettings());
                return;
            }
            if (err instanceof Error && err.message === 'Unauthorized') {
                await refreshToken();
                return;
            }
            logout();
        }
    };

    const refreshToken = async () => {
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
            if (isMockEnabled() && isNetworkFailure(err)) return;
            logout();
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const data = await authApi.login(email, password);
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            window.location.href = '/';
        } catch (err: unknown) {
            console.error('Login error:', err);
            if (isMockEnabled() && isNetworkFailure(err)) {
                const mock = getMockLoginResponse();
                localStorage.setItem('accessToken', mock.accessToken);
                localStorage.setItem('refreshToken', mock.refreshToken);
                localStorage.setItem('user', JSON.stringify(mock.user));
                setUser(mock.user);
                setSettings(getMockUserSettings());
                window.location.href = '/dashboard';
                return;
            }
            const msg = err instanceof Error ? err.message : '';
            const name = err instanceof Error ? err.name : '';
            if (msg === 'Failed to fetch' || name === 'TypeError') {
                const { getApiBaseUrl } = await import('@/api/config');
                throw new Error('Cannot reach server. Ensure backend is running at ' + getApiBaseUrl());
            }
            throw err;
        }
    };

    const register = async (firstName: string, lastName: string, email: string, password: string) => {
        try {
            const data = await authApi.register(firstName, lastName, email, password);
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            window.location.href = '/';
        } catch (err: unknown) {
            console.error('Registration error:', err);
            if (isMockEnabled() && isNetworkFailure(err)) {
                const mock = getMockLoginResponse();
                localStorage.setItem('accessToken', mock.accessToken);
                localStorage.setItem('refreshToken', mock.refreshToken);
                localStorage.setItem('user', JSON.stringify(mock.user));
                setUser(mock.user);
                setSettings(getMockUserSettings());
                window.location.href = '/dashboard';
                return;
            }
            const msg = err instanceof Error ? err.message : '';
            const name = err instanceof Error ? err.name : '';
            if (msg === 'Failed to fetch' || name === 'TypeError') {
                const { getApiBaseUrl } = await import('@/api/config');
                throw new Error('Cannot reach server. Ensure backend is running at ' + getApiBaseUrl());
            }
            throw err;
        }
    };

    const logout = async () => {
        try {
            await authApi.logout();
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

    const updateProfile = async (data: Partial<User>) => {
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
    };

    const updateSettings = async (data: Partial<UserSettings>) => {
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


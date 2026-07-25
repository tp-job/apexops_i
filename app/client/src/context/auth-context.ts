import { createContext, useContext } from 'react';
import type { User, UserSettings } from '@/types/auth';

/**
 * Split from `AuthContext.tsx` so that file can export only the `AuthProvider`
 * component — a file mixing component and non-component exports (the context
 * object, this hook) breaks Vite Fast Refresh for it (`react-refresh/only-export-components`).
 */
export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

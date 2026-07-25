import { createContext, useContext } from 'react';

/** Split from `ThemeContext.tsx` — see `auth-context.ts` for why. */
export interface ThemeContextType {
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (theme: 'dark' | 'light') => void;
    theme: 'dark' | 'light';
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

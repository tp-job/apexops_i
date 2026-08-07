import { createContext, useContext } from 'react';

/** Split from `ThemeContext.tsx` — see `auth-context.ts` for why. */

/**
 * What the user asked for. `'system'` is a preference, not a value: it resolves
 * to light or dark from the OS and keeps tracking it, which is why it cannot be
 * collapsed into `isDark` at write time.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeContextType {
    /** The resolved answer — what is painted right now. */
    isDark: boolean;
    /** The resolved answer, as a name. */
    theme: 'dark' | 'light';
    /** What the user chose, which may be `'system'`. */
    preference: ThemePreference;
    /**
     * Set the preference locally.
     *
     * This provider deliberately does **not** talk to the API: it wraps
     * `AuthProvider` in `main.tsx`, so it must not depend on it. Persisting the
     * choice to the account is `useThemeControl`'s job.
     */
    setPreference: (preference: ThemePreference) => void;
    /** Flips between explicit light and dark. Never lands on `'system'`. */
    toggleTheme: () => void;
    /** Kept for existing callers; equivalent to `setPreference` with an explicit value. */
    setTheme: (theme: 'dark' | 'light') => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

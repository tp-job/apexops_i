import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext, type ThemeContextType, type ThemePreference } from './theme-context';

interface ThemeProviderProps {
    children: ReactNode;
}

const STORAGE_KEY = 'theme';

function readStored(): ThemePreference {
    const saved = localStorage.getItem(STORAGE_KEY);
    // 'light' and 'dark' are what the previous implementation wrote, so existing
    // browsers keep the theme they had. Anything else — including a missing key —
    // means "follow the OS", which is the honest default for someone who has never
    // expressed a preference.
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
}

const prefersDark = (): boolean =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
    const [systemDark, setSystemDark] = useState<boolean>(prefersDark);

    // `'system'` has to keep tracking the OS, not sample it once at mount —
    // otherwise it is just "whatever the OS said when this tab opened", and the
    // one thing that option promises is that it follows along.
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const isDark = preference === 'system' ? systemDark : preference === 'dark';

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
    }, [isDark]);

    // Written on every change, including 'system'. The signed-out pages read this
    // before any API call can happen, which is what stops /login flashing the
    // wrong theme for the duration of a profile fetch.
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, preference);
    }, [preference]);

    const setPreference = useCallback((next: ThemePreference) => setPreferenceState(next), []);

    const value = useMemo<ThemeContextType>(
        () => ({
            isDark,
            theme: isDark ? 'dark' : 'light',
            preference,
            setPreference,
            // Toggling resolves to an explicit choice on purpose: someone reaching
            // for the switch wants *this* theme now, not "follow the OS starting
            // from the opposite of what it currently says".
            toggleTheme: () => setPreferenceState(isDark ? 'light' : 'dark'),
            setTheme: (theme: 'dark' | 'light') => setPreferenceState(theme),
        }),
        [isDark, preference, setPreference],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

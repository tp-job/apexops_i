import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext, type ThemeContextType } from './theme-context';

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const [isDark, setIsDark] = useState<boolean>(() => {
        const saved = localStorage.getItem('theme');
        if (saved) {
            return saved === 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);


    const toggleTheme = () => {
        setIsDark(prev => !prev);
    };

    const setTheme = (theme: 'dark' | 'light') => {
        setIsDark(theme === 'dark');
    };

    const value: ThemeContextType = {
        isDark,
        toggleTheme,
        setTheme,
        theme: isDark ? 'dark' : 'light'
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import type { ThemePreference } from '@/context/theme-context';

/**
 * The join between the theme *provider* and the *account* (spec D7).
 *
 * `ThemeProvider` wraps `AuthProvider`, so it cannot read the signed-in user, and
 * inverting that order would make the theme unavailable to the auth screens
 * themselves. This hook sits below both and owns the two directions:
 *
 * - **account → UI**: when the profile arrives (sign-in, reload, a second
 *   browser), the stored preference is applied. This is what makes the setting
 *   follow you rather than living in one browser's localStorage.
 * - **UI → account**: a change writes locally first, so the switch is instant,
 *   then persists. A failed write is left applied for the session rather than
 *   snapped back — reverting the theme under someone because a request failed is
 *   a worse outcome than a preference that does not survive a reload.
 *
 * Use it anywhere a control changes the theme. Reading it alone is fine too;
 * plain `useTheme()` is enough when you only need `isDark`.
 */
export function useThemeControl() {
    const { user, updateProfile } = useAuth();
    const { preference, setPreference, isDark } = useTheme();

    // Applied once per account. Without this guard the effect would fight the
    // user: every profile refresh would stamp the server's value back over a
    // choice made seconds ago and not yet persisted.
    const appliedFor = useRef<number | null>(null);

    useEffect(() => {
        if (!user?.id) { appliedFor.current = null; return; }
        if (appliedFor.current === user.id) return;
        appliedFor.current = user.id;
        if (user.theme && user.theme !== preference) setPreference(user.theme);
    }, [user?.id, user?.theme, preference, setPreference, user]);

    const changeTheme = useCallback(
        async (next: ThemePreference) => {
            setPreference(next);
            if (!user) return;
            try {
                await updateProfile({ theme: next });
            } catch {
                // Deliberately swallowed: the theme is applied and localStorage
                // holds it, so the visible state is correct for this session. A
                // toast here would interrupt someone for a cosmetic setting.
            }
        },
        [setPreference, updateProfile, user],
    );

    return { preference, isDark, changeTheme };
}

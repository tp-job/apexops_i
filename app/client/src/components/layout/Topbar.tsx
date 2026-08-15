import type { FC, RefObject } from 'react';
import { FiCpu, FiLogOut, FiMenu, FiMoon, FiSun } from 'react-icons/fi';
import { useAuth } from '@/context/auth-context';
import { useThemeControl } from '@/hooks/useThemeControl';
import { Badge } from '@/components/design-system';
import ProjectSwitcher from './ProjectSwitcher';
import NotificationBell from './NotificationBell';

/**
 * Workspace top bar: mobile nav trigger, project switcher, alert bell, theme
 * toggle, identity, sign-out.
 *
 * Kept intentionally thin — **search is still absent** because it is not wired
 * to anything real, and a control that does nothing is worse than no control.
 * The bell is here precisely because it now is real: it reads the notification
 * feed, which regressions actually write to.
 */
interface TopbarProps {
    onOpenNav: () => void;
    assistantOpen: boolean;
    onToggleAssistant: () => void;
    /** Owned by `AppLayout` so it can return focus here when the panel closes. */
    assistantTriggerRef?: RefObject<HTMLButtonElement | null>;
}

const Topbar: FC<TopbarProps> = ({ onOpenNav, assistantOpen, onToggleAssistant, assistantTriggerRef }) => {
    const { user, logout } = useAuth();
    // `useThemeControl`, not `useTheme`: the top bar is rendered on every
    // authenticated page, so this is also where the account's stored theme gets
    // applied after sign-in (spec D7). Toggling here persists to the account
    // rather than to this browser only.
    const { isDark, changeTheme } = useThemeControl();

    const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Signed in';

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-black/5 bg-light-bg/80 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-dark-bg/80 md:px-6">
            <button
                type="button"
                onClick={onOpenNav}
                aria-label="Open navigation"
                className="grid h-9 w-9 place-items-center rounded-xl text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10 lg:hidden"
            >
                <FiMenu size={18} />
            </button>

            <ProjectSwitcher />

            <div className="ml-auto flex items-center gap-2">
                {/*
                  * Assistant trigger. Leads the right-hand cluster because it opens a
                  * workspace surface, where the controls after it act on the current
                  * session. The active fill is `Sidebar`'s active-nav treatment
                  * reused, so "this thing is open" reads the same in both rails.
                  */}
                <button
                    ref={assistantTriggerRef}
                    type="button"
                    onClick={onToggleAssistant}
                    aria-label={assistantOpen ? 'Close AI assistant' : 'Open AI assistant'}
                    aria-expanded={assistantOpen}
                    aria-controls="assistant-panel"
                    className={[
                        'grid h-9 w-9 place-items-center rounded-xl transition-colors',
                        assistantOpen
                            ? 'bg-brand-accent text-brand-dark'
                            : 'text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10',
                    ].join(' ')}
                >
                    <FiCpu size={17} />
                </button>

                <NotificationBell />

                <button
                    type="button"
                    onClick={() => void changeTheme(isDark ? 'light' : 'dark')}
                    aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                    className="grid h-9 w-9 place-items-center rounded-xl text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
                >
                    {isDark ? <FiSun size={17} /> : <FiMoon size={17} />}
                </button>

                <div className="mx-1 hidden h-6 w-px bg-black/10 dark:bg-white/10 sm:block" />

                <div className="hidden items-center gap-2.5 sm:flex">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-dark text-xs font-bold text-brand-accent dark:bg-brand-accent dark:text-brand-dark">
                        {initials}
                    </span>
                    <div className="flex flex-col leading-tight">
                        <span className="text-sm font-semibold text-brand-dark dark:text-white">{fullName}</span>
                        {user?.role === 'admin' && <Badge tone="neutral">Admin</Badge>}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => void logout()}
                    aria-label="Sign out"
                    className="grid h-9 w-9 place-items-center rounded-xl text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
                >
                    <FiLogOut size={17} />
                </button>
            </div>
        </header>
    );
};

export default Topbar;

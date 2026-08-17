import type { FC, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    FiList,
    FiActivity,
    FiAlertTriangle,
    FiBookOpen,
    FiCalendar,
    FiCheckSquare,
    FiFolder,
    FiGrid,
    FiMessageSquare,
    FiMonitor,
    FiSettings,
    FiUsers,
} from 'react-icons/fi';
import { useAuth } from '@/context/auth-context';
import { SPRING } from '@/lib/motion';

/**
 * Workspace navigation rail.
 *
 * Primary nav is held short (see `.agents/docs/product/user-flow.md`), with
 * admin-only entries rendered from `user.role` in a separate labelled group so
 * the split is legible rather than hidden.
 *
 * Security note: hiding a link is presentation, not access control. Every admin
 * route is gated server-side by `authorize('admin')`; this rail only decides what
 * is worth showing. Never the reverse.
 */

export interface NavItem {
    to: string;
    label: string;
    icon: ReactNode;
    /** Routes not yet built are shown, disabled, so the shell reads as complete. */
    ready?: boolean;
}

const PRIMARY: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: <FiGrid size={18} />, ready: true },
    { to: '/projects', label: 'Projects', icon: <FiFolder size={18} />, ready: true },
    { to: '/bug-tracker', label: 'Bug Tracker', icon: <FiAlertTriangle size={18} />, ready: true },
    { to: '/daily', label: 'Daily Note', icon: <FiCheckSquare size={18} />, ready: true },
    { to: '/tasks', label: 'Tasks', icon: <FiList size={18} />, ready: true },
    { to: '/notes', label: 'Notes & Calendar', icon: <FiCalendar size={18} />, ready: true },
    { to: '/chat', label: 'Chat', icon: <FiMessageSquare size={18} />, ready: true },
];

const ADMIN: NavItem[] = [
    { to: '/admin/users', label: 'Users', icon: <FiUsers size={18} />, ready: true },
    { to: '/admin/docs', label: 'Documentation', icon: <FiBookOpen size={18} />, ready: true },
    { to: '/admin/console', label: 'Console Monitor', icon: <FiMonitor size={18} />, ready: true },
];

const ACCOUNT: NavItem[] = [
    { to: '/docs/overview', label: 'Documentation', icon: <FiBookOpen size={18} />, ready: true },
    { to: '/settings', label: 'Settings', icon: <FiSettings size={18} />, ready: true },
];

const NavRow: FC<{ item: NavItem; onNavigate?: () => void }> = ({ item, onNavigate }) => {
    if (!item.ready) {
        return (
            <span
                aria-disabled="true"
                title="Not built yet"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 dark:text-gray-600 cursor-not-allowed select-none"
            >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider opacity-70">soon</span>
            </span>
        );
    }

    return (
        <NavLink
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
                [
                    'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                        ? 'text-brand-dark dark:text-brand-dark'
                        : 'text-gray-600 hover:text-brand-dark hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5',
                ].join(' ')
            }
        >
            {({ isActive }) => (
                <>
                    {isActive && (
                        <motion.span
                            layoutId="nav-active"
                            transition={SPRING}
                            className="absolute inset-0 rounded-xl bg-brand-accent"
                            aria-hidden
                        />
                    )}
                    <span className="relative shrink-0">{item.icon}</span>
                    <span className="relative truncate">{item.label}</span>
                </>
            )}
        </NavLink>
    );
};

const NavGroup: FC<{ label?: string; items: NavItem[]; onNavigate?: () => void }> = ({ label, items, onNavigate }) => (
    <div className="flex flex-col gap-1">
        {label && (
            <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                {label}
            </p>
        )}
        {items.map((item) => (
            <NavRow key={item.to} item={item} onNavigate={onNavigate} />
        ))}
    </div>
);

const Sidebar: FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    return (
        <aside className="flex h-full w-64 shrink-0 flex-col border-r border-black/5 bg-light-surface dark:border-white/10 dark:bg-dark-surface">
            <div className="flex h-16 items-center gap-2.5 px-5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-dark dark:bg-brand-accent">
                    <FiActivity className="text-brand-accent dark:text-brand-dark" size={16} />
                </span>
                <span className="text-lg font-bold font-heading text-brand-dark dark:text-white">ApexOps</span>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 pb-4">
                <NavGroup items={PRIMARY} onNavigate={onNavigate} />
                {isAdmin && <NavGroup label="Administration" items={ADMIN} onNavigate={onNavigate} />}
                <NavGroup label="Account" items={ACCOUNT} onNavigate={onNavigate} />
            </nav>

            <div className="border-t border-black/5 px-5 py-4 dark:border-white/10">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                    {isAdmin ? 'Administrator' : 'Workspace'}
                </p>
            </div>
        </aside>
    );
};

export default Sidebar;

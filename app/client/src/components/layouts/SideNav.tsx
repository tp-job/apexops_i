import type { FC } from 'react';
import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    FiGrid,
    FiAlertOctagon,
    FiFileText,
    FiMessageSquare,
    FiCalendar,
    FiCreditCard,
    FiLayers,
    FiSun,
    FiMoon,
    FiSettings,
    FiLogOut,
    FiChevronLeft,
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import type { IconType } from 'react-icons';
import { useTheme } from '@/context/ThemeContext';
import { EASE_LUX } from '@/lib/motion';

interface NavItem {
    label: string;
    to: string;
    icon: IconType;
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', to: '/dashboard', icon: FiGrid },
    { label: 'Bug Tracker', to: '/bug-tracker', icon: FiAlertOctagon },
    { label: 'Notes', to: '/note', icon: FiFileText },
    { label: 'Chat', to: '/chat', icon: FiMessageSquare },
    { label: 'AI Chat', to: '/ai-chat', icon: HiSparkles },
    { label: 'Calendar', to: '/calendar', icon: FiCalendar },
    { label: 'Invoices', to: '/invoices', icon: FiCreditCard },
    { label: 'System', to: '/design-system', icon: FiLayers },
];

const SideNav: FC<{ onLogout?: () => void }> = ({ onLogout }) => {
    const { toggleTheme, isDark } = useTheme();
    const [collapsed, setCollapsed] = useState(false);
    const avatarUrl = 'https://avatars.githubusercontent.com/u/12345678?v=4';

    return (
        <motion.aside
            initial={false}
            animate={{ width: collapsed ? 84 : 264 }}
            transition={{ duration: 0.32, ease: EASE_LUX }}
            className="sticky top-0 h-screen shrink-0 p-4"
        >
            <div className="glass-dark h-full rounded-3xl flex flex-col p-4 text-white relative">
                {/* Brand */}
                <div className="flex items-center gap-2 px-2 h-12 shrink-0 overflow-hidden">
                    <span className="w-9 h-9 rounded-xl bg-brand-accent flex items-center justify-center shrink-0">
                        <HiSparkles className="w-4 h-4 text-brand-dark" />
                    </span>
                    {!collapsed && (
                        <h1 className="text-lg font-bold font-heading whitespace-nowrap">
                            Apex<span className="text-brand-accent">Ops</span>
                        </h1>
                    )}
                </div>

                {/* Collapse toggle */}
                <button
                    type="button"
                    onClick={() => setCollapsed((c) => !c)}
                    className="absolute -right-2 top-8 w-6 h-6 rounded-full bg-brand-accent text-brand-dark flex items-center justify-center shadow-md ds-glow"
                    title={collapsed ? 'Expand' : 'Collapse'}
                >
                    <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.3, ease: EASE_LUX }}>
                        <FiChevronLeft className="w-3.5 h-3.5" />
                    </motion.span>
                </button>

                {/* Nav */}
                <nav className="flex-1 flex flex-col gap-1.5 mt-6 overflow-y-auto overflow-x-hidden">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.label}
                                to={item.to}
                                title={collapsed ? item.label : undefined}
                                className={({ isActive }) =>
                                    `group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-brand-accent text-brand-dark font-semibold'
                                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    } ${collapsed ? 'justify-center' : ''}`
                                }
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Footer actions */}
                <div className="shrink-0 pt-3 mt-3 border-t border-white/10 flex flex-col gap-1.5">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        title="Toggle theme"
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors ${
                            collapsed ? 'justify-center' : ''
                        }`}
                    >
                        {isDark ? <FiSun className="w-5 h-5 shrink-0" /> : <FiMoon className="w-5 h-5 shrink-0" />}
                        {!collapsed && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
                    </button>

                    <Link
                        to="/account-settings"
                        title="Settings"
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors ${
                            collapsed ? 'justify-center' : ''
                        }`}
                    >
                        <FiSettings className="w-5 h-5 shrink-0" />
                        {!collapsed && <span>Settings</span>}
                    </Link>

                    {onLogout && (
                        <button
                            type="button"
                            onClick={onLogout}
                            title="Logout"
                            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors ${
                                collapsed ? 'justify-center' : ''
                            }`}
                        >
                            <FiLogOut className="w-5 h-5 shrink-0" />
                            {!collapsed && <span>Logout</span>}
                        </button>
                    )}

                    <div className={`flex items-center gap-3 px-2 pt-2 ${collapsed ? 'justify-center' : ''}`}>
                        <img
                            src={avatarUrl}
                            alt="profile"
                            className="w-9 h-9 rounded-full border-2 border-white/20 object-cover shrink-0"
                        />
                        {!collapsed && (
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">Developer</p>
                                <p className="text-xs text-white/50 truncate">Workspace</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.aside>
    );
};

export default SideNav;

import type { FC } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';

const TopBar: FC<{ onLogout?: () => void }> = ({ onLogout }) => {
    const { toggleTheme } = useTheme();
    const avatarUrl = 'https://avatars.githubusercontent.com/u/12345678?v=4';

    const navItems = [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Bug Tracker', to: '/bug-tracker' },
        { label: 'Notes', to: '/note' },
        { label: 'Chat', to: '/chat' },
        { label: 'AI Chat', to: '/ai-chat' },
        { label: 'Calendar', to: '/calendar' },
        { label: 'Invoices', to: '/invoices' },
        { label: 'System', to: '/design-system' },
    ];

    return (
        <header className="glass-panel sticky top-4 mx-6 mt-4 z-50 flex items-center justify-between px-6 py-4 rounded-full backdrop-blur-md">
            <div className="flex items-center gap-2">
                <i className="ri-code-s-slash-line text-xl text-brand-dark" />
                <h1 className="text-lg font-bold font-heading text-brand-dark">
                    Apex<span className="text-brand-accent">Ops</span>
                </h1>
            </div>

            <nav className="bg-brand-dark text-white rounded-full p-1.5 flex items-center gap-2 text-sm font-medium">
                {navItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.to}
                        className={({ isActive }) =>
                            `px-4 py-2 rounded-full transition ${
                                isActive
                                    ? 'bg-brand-accent text-brand-dark flex items-center gap-2'
                                    : 'hover:bg-white/10 text-white'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-dark" />}
                                {item.label}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="flex items-center gap-4">
                <button
                    onClick={toggleTheme}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white/50 transition"
                    title="Toggle Dark Mode"
                >
                    <i className="ri-moon-line text-gray-600 dark:hidden" />
                    <i className="ri-sun-line text-gray-600 hidden dark:block" />
                </button>
                <Link
                    to="/account-settings"
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white/50 transition"
                    title="Settings"
                >
                    <i className="ri-settings-3-line text-gray-600" />
                </Link>
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white/50 transition"
                        title="Logout"
                    >
                        <i className="ri-logout-box-line text-red-500" />
                    </button>
                )}
                <img
                    src={avatarUrl}
                    alt="profile"
                    className="w-10 h-10 object-cover rounded-full border-2 border-white"
                />
            </div>
        </header>
    );
};

export default TopBar;

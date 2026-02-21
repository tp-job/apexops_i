import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { NavItem, ItemContentProps, SidebarProps } from '@/types/sidebar';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { getIcon } from '@/utils/iconMapping';

// ── Shared styles ──────────────────────────────────────────────
const menuItem = 'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 focus:outline-none';
const menuItemHover = 'hover:bg-blue-primary/8 dark:hover:bg-white/5';
const menuItemActive = 'bg-blue-primary/10 dark:bg-blue-primary/15 text-blue-primary dark:text-blue-primary font-semibold';

// ── Item Content ───────────────────────────────────────────────
const ItemContent: FC<ItemContentProps & { isActive?: boolean }> = ({ item, isCollapsed, isActive = false }) => {
    const IconComponent = getIcon(item.icon);
    return (
        <div className={`flex items-center ${isCollapsed ? 'gap-0' : 'gap-3'}`}>
            {IconComponent ? (
                <IconComponent className={`text-lg transition-colors duration-200 ${
                    isActive
                        ? 'text-blue-primary dark:text-blue-primary'
                        : 'text-light-text-secondary dark:text-dark-text-secondary'
                }`} />
            ) : (
                <i className={`${item.icon} text-lg transition-colors duration-200`} />
            )}
            <span className={`${isCollapsed ? 'hidden' : 'flex-1'} text-sm duration-200 transition-colors`}>
                {item.label}
            </span>
            {item.badge && !isCollapsed && (
                <span className="text-xs bg-orange-primary text-white px-2 py-0.5 rounded-full">{item.badge}</span>
            )}
        </div>
    );
};

// ── Nav Items ──────────────────────────────────────────────────
const navItems: NavItem[] = [
    { icon: 'ri-dashboard-horizontal-fill', label: 'Dashboard', to: '/dashboard' },
    { icon: 'ri-bug-fill', label: 'Bug Tracker', to: '/bug-tracker' },
    { icon: 'ri-message-2-fill', label: 'Chat', to: '/chat' },
    { icon: 'ri-message-2-line', label: 'Chat (Optimized)', to: '/chat-optimized' },
    { icon: 'ri-bard-fill', label: 'AI Chat', to: '/ai-chat' },
    { icon: 'ri-booklet-fill', label: 'Note', to: '/note' },
    { icon: 'ri-calendar-fill', label: 'Calendar', to: '/calendar' },
    { icon: 'ri-calendar-event-fill', label: 'Optimization Calendar', to: '/optimization-calendar' },
];

// ── Menu List (shared between desktop & mobile) ────────────────
const MenuList: FC<{
    items: NavItem[];
    isCollapsed: boolean;
    onNavigate?: () => void;
}> = ({ items, isCollapsed, onNavigate }) => (
    <ul className="space-y-1">
        {items.map((item) => (
            <li key={item.label}>
                {item.to && item.to !== '#' ? (
                    <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                            `${menuItem} ${isCollapsed ? 'justify-center' : ''} ${isActive ? menuItemActive : `${menuItemHover} text-light-text-secondary dark:text-dark-text-secondary`
                            }`
                        }
                        title={isCollapsed ? item.label : undefined}
                    >
                        {({ isActive }) => <ItemContent item={item} isCollapsed={isCollapsed} isActive={isActive} />}
                    </NavLink>
                ) : item.href ? (
                    <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onNavigate}
                        className={`${menuItem} ${isCollapsed ? 'justify-center' : ''} ${menuItemHover} text-light-text-secondary dark:text-dark-text-secondary`}
                        title={isCollapsed ? item.label : undefined}
                    >
                        <ItemContent item={item} isCollapsed={isCollapsed} isActive={false} />
                    </a>
                ) : (
                    <button
                        type="button"
                        onClick={onNavigate}
                        className={`w-full ${menuItem} ${isCollapsed ? 'justify-center' : 'text-left'} ${menuItemHover} text-light-text-secondary dark:text-dark-text-secondary`}
                        title={isCollapsed ? item.label : undefined}
                    >
                        <ItemContent item={item} isCollapsed={isCollapsed} isActive={false} />
                    </button>
                )}
            </li>
        ))}
    </ul>
);

// ── Main Sidebar ───────────────────────────────────────────────
const Sidebar: FC<SidebarProps> = ({ onNavChange, onLogout }) => {
    const location = useLocation();
    const avatarUrl = 'https://avatars.githubusercontent.com/u/12345678?v=4';
    const { toggleTheme } = useTheme();

    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        return saved ? saved === 'true' : false;
    });
    const [isOpenMobile, setIsOpenMobile] = useState(false);

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', String(isCollapsed));
    }, [isCollapsed]);

    useEffect(() => {
        if (onNavChange) onNavChange(location.pathname);
    }, [location.pathname, onNavChange]);

    // Close mobile sidebar on route change
    useEffect(() => {
        setIsOpenMobile(false);
    }, [location.pathname]);

    // Lock body scroll when mobile sidebar open
    useEffect(() => {
        document.body.style.overflow = isOpenMobile ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpenMobile]);

    const handleLogout = () => onLogout?.();

    // ── Logo ───────────────────────────────────────────────────
    const Logo: FC<{ showClose?: boolean }> = ({ showClose }) => {
        const CodeIcon = getIcon('ri-code-s-slash-line');
        const CloseIcon = getIcon('ri-close-line');
        const ArrowIcon = getIcon('ri-arrow-right-wide-fill');
        return (
            <div className="flex items-center justify-between px-1 py-1 mb-2">
                <div className="flex items-center gap-2 px-2 py-2">
                    {CodeIcon ? (
                        <CodeIcon className="text-xl text-blue-secondary transition-colors duration-200" />
                    ) : (
                        <i className="ri-code-s-slash-line text-xl text-blue-secondary" />
                    )}
                    {(!isCollapsed || showClose) && (
                        <h1 className="text-lg font-extrabold tracking-tight text-light-text dark:text-dark-text">
                            Apex<span className="text-blue-secondary">Ops</span>
                        </h1>
                    )}
                </div>
                {showClose ? (
                    <button
                        aria-label="Close sidebar"
                        onClick={() => setIsOpenMobile(false)}
                        className="p-2 rounded-lg hover:bg-light-surface-2 dark:hover:bg-dark-border transition-colors"
                    >
                        {CloseIcon ? (
                            <CloseIcon className="text-lg text-light-text-secondary dark:text-dark-text-secondary transition-colors duration-200" />
                        ) : (
                            <i className="ri-close-line text-lg text-light-text-secondary dark:text-dark-text-secondary" />
                        )}
                    </button>
                ) : (
                    <button
                        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        onClick={() => setIsCollapsed(v => !v)}
                        className="p-2 rounded-lg opacity-60 hover:opacity-100 hover:bg-light-surface-2 dark:hover:bg-dark-border transition-all"
                    >
                        {ArrowIcon ? (
                            <ArrowIcon className={`text-lg transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''} transition-colors duration-200`} />
                        ) : (
                            <i className={`ri-arrow-right-wide-fill transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                        )}
                    </button>
                )}
            </div>
        );
    };

    // ── Settings + Profile ─────────────────────────────────────
    const SettingsSection: FC<{ collapsed?: boolean; onNavigate?: () => void }> = ({ collapsed = false, onNavigate }) => {
        const SettingsIcon = getIcon('ri-settings-3-line');
        const MoonIcon = getIcon('ri-moon-line');
        const SunIcon = getIcon('ri-sun-line');
        const TranslateIcon = getIcon('ri-translate-2');
        return (
            <div>
                {!collapsed && (
                    <p className="px-3 text-[11px] uppercase tracking-widest text-light-text-secondary/60 dark:text-dark-text-secondary/60 font-semibold mb-2">
                        Settings
                    </p>
                )}
                {collapsed && <div className="mx-3 mb-3 border-t border-light-border/50 dark:border-dark-border/50" />}

                <ul className="space-y-1 mb-4">
                    <li>
                        <Link
                            to="/account-settings"
                            onClick={onNavigate}
                            className={`${menuItem} ${collapsed ? 'justify-center' : ''} ${menuItemHover} text-light-text-secondary dark:text-dark-text-secondary`}
                        >
                            {SettingsIcon ? (
                                <SettingsIcon className="text-lg transition-colors duration-200 text-light-text-secondary dark:text-dark-text-secondary" />
                            ) : (
                                <i className="ri-settings-3-line text-lg" />
                            )}
                            {!collapsed && <span className="flex-1 text-sm text-left">Settings</span>}
                        </Link>
                    </li>
                    <li>
                        <button
                            onClick={toggleTheme}
                            className={`w-full ${menuItem} ${collapsed ? 'justify-center' : ''} ${menuItemHover} text-light-text-secondary dark:text-dark-text-secondary`}
                            title={collapsed ? 'Dark mode' : undefined}
                        >
                            {MoonIcon && SunIcon ? (
                                <>
                                    <MoonIcon className="text-lg dark:hidden transition-colors duration-200 text-light-text-secondary dark:text-dark-text-secondary" />
                                    <SunIcon className="hidden text-lg dark:block transition-colors duration-200 text-light-text-secondary dark:text-dark-text-secondary" />
                                </>
                            ) : (
                                <>
                                    <i className="ri-moon-line text-lg dark:hidden" />
                                    <i className="hidden ri-sun-line text-lg dark:block" />
                                </>
                            )}
                            {!collapsed && <span className="flex-1 text-sm text-left">Dark Mode</span>}
                        </button>
                    </li>
                    <li>
                        <button
                            className={`w-full ${menuItem} ${collapsed ? 'justify-center' : ''} ${menuItemHover} text-light-text-secondary dark:text-dark-text-secondary`}
                            title={collapsed ? 'Language' : undefined}
                        >
                            {TranslateIcon ? (
                                <TranslateIcon className="text-lg transition-colors duration-200 text-light-text-secondary dark:text-dark-text-secondary" />
                            ) : (
                                <i className="ri-translate-2 text-lg" />
                            )}
                            {!collapsed && <span className="flex-1 text-sm text-left">English</span>}
                        </button>
                    </li>
                </ul>

            {/* Profile */}
            <div className={`mx-2 p-2.5 rounded-xl ${collapsed ? '' : 'bg-light-surface-2/60 dark:bg-dark-surface-2/60 border border-light-border/40 dark:border-dark-border/40'}`}>
                <div className={`${collapsed ? 'flex justify-center' : 'flex items-center gap-3'}`}>
                    <img
                        src={avatarUrl}
                        alt="profile"
                        loading="lazy"
                        className={`${collapsed ? 'w-10 h-10' : 'w-9 h-9'} object-cover rounded-full ring-2 ring-blue-primary/20`}
                    />
                    {!collapsed && (
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-light-text dark:text-dark-text truncate">user name</div>
                            <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">user email</div>
                        </div>
                    )}
                </div>
            </div>

            {onLogout && !collapsed && (
                <div className="mx-2 mt-2">
                    <button
                        onClick={handleLogout}
                        className={`w-full ${menuItem} text-orange-primary/80 hover:bg-orange-primary/10 hover:text-orange-primary`}
                    >
                        {(() => {
                            const LogoutIcon = getIcon('ri-logout-box-line');
                            return LogoutIcon ? (
                                <LogoutIcon className="text-lg transition-colors duration-200 text-orange-primary/80" />
                            ) : (
                                <i className="ri-logout-box-line text-lg" />
                            );
                        })()}
                        <span className="flex-1 text-sm text-left">Logout</span>
                    </button>
                </div>
            )}
        </div>
        );
    };

    return (
        <>
            {/* ════════════════════════════════════════════════════
                MOBILE: Top Bar
               ════════════════════════════════════════════════════ */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-xl border-b border-light-border/60 dark:border-dark-border/60">
                <div className="flex items-center gap-2">
                    {(() => {
                        const CodeIcon = getIcon('ri-code-s-slash-line');
                        return CodeIcon ? (
                            <CodeIcon className="text-xl text-blue-secondary transition-colors duration-200" />
                        ) : (
                            <i className="ri-code-s-slash-line text-xl text-blue-secondary" />
                        );
                    })()}
                    <h1 className="text-lg font-bold text-light-text dark:text-dark-text">
                        Apex<span className="text-blue-secondary">Ops</span>
                    </h1>
                </div>
                <button
                    type="button"
                    onClick={() => setIsOpenMobile(true)}
                    aria-label="Open menu"
                    className="p-2 rounded-lg hover:bg-light-surface-2 dark:hover:bg-dark-border transition-colors"
                >
                    {(() => {
                        const MenuIcon = getIcon('ri-menu-3-line');
                        return MenuIcon ? (
                            <MenuIcon className="text-xl text-light-text dark:text-dark-text transition-colors duration-200" />
                        ) : (
                            <i className="ri-menu-3-line text-xl text-light-text dark:text-dark-text" />
                        );
                    })()}
                </button>
            </div>

            {/* ════════════════════════════════════════════════════
                MOBILE: Slide-out Sidebar
               ════════════════════════════════════════════════════ */}
            {isOpenMobile && (
                <div className="lg:hidden fixed inset-0 z-50">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsOpenMobile(false)}
                    />
                    {/* Panel */}
                    <div className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-dark-bg border-r border-light-border/60 dark:border-dark-border/60 shadow-2xl flex flex-col animate-slide-in-left">
                        <div className="px-4 py-4 flex flex-col flex-1 min-h-0">
                            {/* Header */}
                            <Logo showClose />

                            {/* Menu */}
                            <p className="px-3 mt-4 text-[11px] uppercase tracking-widest text-light-text-secondary/60 dark:text-dark-text-secondary/60 font-semibold mb-2">
                                Menu
                            </p>
                            <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                                <MenuList
                                    items={navItems}
                                    isCollapsed={false}
                                    onNavigate={() => setIsOpenMobile(false)}
                                />
                            </div>

                            {/* Settings */}
                            <div className="pt-4">
                                <SettingsSection onNavigate={() => setIsOpenMobile(false)} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════
                DESKTOP: Persistent Sidebar
               ════════════════════════════════════════════════════ */}
            <div
                className={`hidden lg:flex lg:flex-col h-screen sticky top-0 bg-white dark:bg-dark-bg px-4 py-4 border-r border-light-border/60 dark:border-dark-border/60 shadow-sm transition-[width] duration-300 ease-out overflow-hidden ${isCollapsed ? 'w-[72px]' : 'w-64'
                    }`}
            >
                {/* Header */}
                <Logo />

                {/* Menu label */}
                {!isCollapsed && (
                    <p className="px-3 text-[11px] uppercase tracking-widest text-light-text-secondary/60 dark:text-dark-text-secondary/60 font-semibold mb-2 mt-2">
                        Menu
                    </p>
                )}

                {/* Nav */}
                <div className="mt-1 flex-1 overflow-y-auto pr-1">
                    <MenuList items={navItems} isCollapsed={isCollapsed} />
                </div>

                {/* Settings + Profile */}
                <div className="pt-2">
                    <SettingsSection collapsed={isCollapsed} />
                </div>
            </div>
        </>
    );
};

export default Sidebar;

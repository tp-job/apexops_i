import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { DOC_NAV } from '@/components/ui/resources/docs/docsRegistry';

const SidebarAbout: FC = () => {
    const location = useLocation();
    const [logsOpen, setLogsOpen] = useState<boolean>(true);

    const baseItemClasses =
        'block px-3 py-2 rounded-md text-sm font-medium transition-colors';
    const inactiveTextClasses =
        'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary';
    const activeTextClasses = 'bg-blue-50 dark:bg-blue-900/20 text-primary';

    const docsGroups = useMemo(() => DOC_NAV, []);
    const isDocsRoute = location.pathname.startsWith('/about/docs');

    return (
        <aside className="hidden lg:block shrink-0 w-72 min-w-[18rem] sticky top-0 h-screen overflow-y-auto border-r border-gray-200 dark:border-gray-800 bg-sidebar-light dark:bg-sidebar-dark py-8 pl-6 pr-4">
            <nav className="space-y-8">
                <div>
                    <h3 className="font-semibold text-sm tracking-wider text-gray-900 dark:text-gray-100 uppercase mb-3">Overview</h3>
                    <ul className="space-y-1">
                        <li>
                            <NavLink
                                to="/about"
                                className={({ isActive }) =>
                                    `${baseItemClasses} ${isActive && location.pathname === '/about' ? activeTextClasses : inactiveTextClasses}`
                                }
                                end
                            >
                                Platform Overview
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/about/docs"
                                className={({ isActive }) =>
                                    `${baseItemClasses} ${(isActive || isDocsRoute) ? activeTextClasses : inactiveTextClasses}`
                                }
                            >
                                Documents
                            </NavLink>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 className="font-semibold text-sm tracking-wider text-gray-900 dark:text-gray-100 uppercase mb-3">Documentation</h3>
                    <div className="space-y-7">
                        {docsGroups.map((group) => (
                            <div key={group.title}>
                                <h4 className="font-semibold text-xs tracking-wider text-gray-500 dark:text-gray-400 uppercase mb-2">
                                    {group.title}
                                </h4>
                                <ul className="space-y-1">
                                    {group.items.map((item) => {
                                        if ('to' in item) {
                                            return (
                                                <li key={item.id}>
                                                    <NavLink
                                                        to={item.to}
                                                        className={({ isActive }) =>
                                                            `${baseItemClasses} ${isActive ? activeTextClasses : inactiveTextClasses}`
                                                        }
                                                    >
                                                        {item.title}
                                                    </NavLink>
                                                </li>
                                            );
                                        }

                                        const anyChildActive = item.items.some((c) => location.pathname === c.to);

                                        return (
                                            <li key={item.title}>
                                                <button
                                                    type="button"
                                                    onClick={() => setLogsOpen((v) => !v)}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                                        anyChildActive ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
                                                    } hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary`}
                                                >
                                                    <span>{item.title}</span>
                                                    <span className={`material-icons-round text-sm transition-transform ${logsOpen ? 'rotate-180' : ''}`}>
                                                        expand_more
                                                    </span>
                                                </button>

                                                {logsOpen && (
                                                    <ul className="pl-4 mt-1 space-y-1 border-l border-gray-100 dark:border-gray-700 ml-3">
                                                        {item.items.map((child) => (
                                                            <li key={child.id}>
                                                                <NavLink
                                                                    to={child.to}
                                                                    className={({ isActive }) =>
                                                                        `block px-3 py-1.5 text-sm transition-colors ${
                                                                            isActive
                                                                                ? 'text-primary'
                                                                                : 'text-gray-500 dark:text-gray-500 hover:text-primary'
                                                                        }`
                                                                    }
                                                                >
                                                                    {child.title}
                                                                </NavLink>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </nav>
        </aside>
    );
};

export default SidebarAbout;

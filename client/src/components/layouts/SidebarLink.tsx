import { type FC } from 'react';

// Types
export interface SidebarItem {
    icon: string;
    label: string;
    isActive?: boolean;
    isLabel?: boolean;
}

const SidebarLink: FC<{ item: SidebarItem }> = ({ item }) => (
    <a
        className={`flex items-center gap-4 px-4 py-3 rounded-r-full transition-colors ${item.isActive
            ? 'bg-ember/10 text-ember dark:bg-ember/20 dark:text-ember font-medium'
            : 'bg-transparent hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
            }`}
        href="#"
    >
        <i className={`${item.icon} ${item.isActive ? 'filled' : ''} text-lg transition-colors duration-200`}></i>
        <span className="text-sm font-medium tracking-wide">{item.label}</span>
    </a>
);

export default SidebarLink;

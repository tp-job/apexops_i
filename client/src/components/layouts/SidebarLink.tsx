import { type FC } from 'react';
import { getIcon } from '@/utils/iconMapping';

// Types
export interface SidebarItem {
    icon: string;
    label: string;
    isActive?: boolean;
    isLabel?: boolean;
}

const SidebarLink: FC<{ item: SidebarItem }> = ({ item }) => {
    const IconComponent = getIcon(item.icon);
    return (
        <a
            className={`flex items-center gap-4 px-4 py-3 rounded-r-full transition-colors ${item.isActive
                ? 'bg-orange-primary/10 text-orange-primary dark:bg-orange-primary/20 dark:text-orange-primary font-medium'
                : 'bg-transparent hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                }`}
            href="#"
        >
            {IconComponent ? (
                <IconComponent className={`text-lg transition-colors duration-200 ${
                    item.isActive
                        ? 'text-orange-primary dark:text-orange-primary'
                        : 'text-light-text-secondary dark:text-dark-text-secondary'
                }`} />
            ) : (
                <i className={`${item.icon} ${item.isActive ? 'filled' : ''} text-lg transition-colors duration-200`}></i>
            )}
            <span className="text-sm font-medium tracking-wide">{item.label}</span>
        </a>
    );
};

export default SidebarLink;

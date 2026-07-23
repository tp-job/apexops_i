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
            className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group border border-transparent ${item.isActive
                ? 'bg-brand-accent text-brand-dark shadow-lg -accent/20 border-brand-accent/20'
                : 'bg-transparent hover:bg-white/10 text-gray-400 hover:text-brand-dark hover:border-white/10'
                }`}
            href="#"
        >
            {IconComponent ? (
                <IconComponent className={`transition-all duration-300 ${
                    item.isActive
                        ? 'text-brand-dark'
                        : 'text-gray-400 group-hover:text-brand-dark'
                }`} style={{ fontSize: 18 }} />
            ) : (
                <i className={`${item.icon} transition-all duration-300 ${
                    item.isActive ? 'text-brand-dark' : 'text-gray-400 group-hover:text-brand-dark'
                }`} style={{ fontSize: 18 }}></i>
            )}
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]">{item.label}</span>
        </a>
    );
};

export default SidebarLink;

// Define interface for navigation items
export interface NavItem {
    icon: string;
    label: string;
    to?: string; // For NavLink
    href?: string; // For external links
    badge?: string; // Optional badge
}

// Define props for ItemContent component
export interface ItemContentProps {
    item: NavItem;
    isCollapsed: boolean; // Pass isCollapsed to ItemContent
}

export interface SidebarProps {
    activeNav?: string;
    onNavChange?: (nav: string) => void;
    onLogout?: () => void;
}
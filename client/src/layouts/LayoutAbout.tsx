import type { FC } from 'react';
import { Outlet } from 'react-router-dom';
import SidebarAbout from '@/components/layouts/SidebarAbout';

const LayoutAbout: FC = () => {
    return (
        <div className="min-h-screen flex bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors duration-300">
            <SidebarAbout />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <main className="flex-1 overflow-y-auto bg-light-bg dark:bg-dark-bg transition-colors duration-300">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default LayoutAbout;

import type { FC } from 'react';
import { Outlet } from 'react-router-dom';
import SidebarAbout from '@/components/layouts/SidebarAbout';

const LayoutAbout: FC = () => {
    return (
        <div className="min-h-screen flex text-brand-dark dark:text-white transition-colors duration-300">
            <SidebarAbout />
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-brand-dark">
                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default LayoutAbout;

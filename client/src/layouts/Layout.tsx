import type { FC } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layouts/Sidebar';
// import TopBar from '../components/layouts/Topbar';

const Layout: FC = () => {
    return (
        <div className="min-h-screen flex bg-transparent text-light-text dark:text-dark-text transition-colors duration-300">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden pt-14 lg:pt-0">
                <main className="flex-1 overflow-y-auto bg-transparent transition-colors duration-300">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;


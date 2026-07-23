import type { FC } from 'react';
import { Outlet } from 'react-router-dom';
import SideNav from '../components/layouts/SideNav';

const Layout: FC = () => {
    // onLogout can be wired from auth context in the future.
    return (
        <div className="flex min-h-screen">
            <SideNav />
            <main className="flex-1 min-w-0 p-6 flex flex-col gap-5">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;

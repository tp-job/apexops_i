import type { FC } from 'react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Sidebar from '@/components/layouts/Sidebar';
import Topbar from '@/components/layouts/Topbar';
import { DUR, EASE_LUX } from '@/lib/motion';

/**
 * The authenticated workspace shell: persistent nav rail + top bar + routed content.
 *
 * Built once here rather than per page — the alternative is every rebuilt page
 * re-inventing its own chrome and the shell getting retrofitted across N screens
 * later. Pages render into the `<Outlet />` and own only their content.
 *
 * Below `lg` the rail becomes an overlay drawer; the desktop rail is never
 * collapsible-by-drag, since the design system targets ≥1280px as primary.
 */
const AppLayout: FC = () => {
    const [navOpen, setNavOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-light-bg font-body dark:bg-dark-bg">
            {/* Desktop rail */}
            <div className="sticky top-0 hidden h-screen lg:block">
                <Sidebar />
            </div>

            {/* Mobile drawer */}
            <AnimatePresence>
                {navOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: DUR.fast }}
                            onClick={() => setNavOpen(false)}
                            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
                            aria-hidden
                        />
                        <motion.div
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ duration: DUR.base, ease: EASE_LUX }}
                            className="fixed inset-y-0 left-0 z-50 lg:hidden"
                        >
                            <Sidebar onNavigate={() => setNavOpen(false)} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="flex min-w-0 flex-1 flex-col">
                <Topbar onOpenNav={() => setNavOpen(true)} />
                <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AppLayout;

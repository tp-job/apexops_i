import type { FC } from 'react';
import { useCallback, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AssistantPanel from '@/components/layout/AssistantPanel';
import { useMediaQuery, XL_QUERY } from '@/hooks/useMediaQuery';
import { DUR, EASE_LUX } from '@/lib/motion';

/**
 * Panel open/closed is a **device** preference, so it lives in `localStorage`
 * rather than on the account — unlike `theme`, which followed the user to a new
 * browser deliberately (spec D7). How wide your screen is does not travel with
 * you, and neither should whether you keep a 380px rail open.
 */
const ASSISTANT_OPEN_KEY = 'apexops.assistant.open';

const readAssistantOpen = (): boolean => {
    try {
        return localStorage.getItem(ASSISTANT_OPEN_KEY) === 'true';
    } catch {
        // Private-mode / disabled storage: default closed rather than throwing
        // the whole shell on the way up.
        return false;
    }
};

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
    const [assistantOpen, setAssistantOpen] = useState(readAssistantOpen);
    /** Decides which assistant variant *exists*, not merely which one is painted. */
    const isDesktop = useMediaQuery(XL_QUERY);
    /** Focus returns here on close — the trigger is owned at this level. */
    const assistantTriggerRef = useRef<HTMLButtonElement>(null);

    const toggleAssistant = useCallback(() => {
        setAssistantOpen((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(ASSISTANT_OPEN_KEY, String(next));
            } catch {
                /* preference simply does not persist; not worth failing the toggle */
            }
            return next;
        });
    }, []);

    const closeAssistant = useCallback(() => {
        setAssistantOpen(false);
        try {
            localStorage.setItem(ASSISTANT_OPEN_KEY, 'false');
        } catch {
            /* as above */
        }
        assistantTriggerRef.current?.focus();
    }, []);

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
                <Topbar
                    onOpenNav={() => setNavOpen(true)}
                    assistantOpen={assistantOpen}
                    onToggleAssistant={toggleAssistant}
                    assistantTriggerRef={assistantTriggerRef}
                />

                {/*
                  * Flex row so the assistant rail is a sibling of the routed page
                  * rather than an overlay on it. `min-w-0` on the content column is
                  * load-bearing: without it a wide child (DataTable, GanttTrack)
                  * refuses to shrink and pushes horizontal scroll onto the page.
                  */}
                <div className="flex min-h-0 flex-1">
                    <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
                        <Outlet />
                    </main>

                    {/*
                      * Inline rail at xl+ ONLY, and the choice is made in JavaScript
                      * rather than with `xl:block` / `xl:hidden`. Tailwind's prefixes
                      * paint one variant and mount both — which put two elements
                      * carrying `id="assistant-panel"` in the document and made the
                      * trigger's `aria-controls` ambiguous. Verified: two matches for
                      * `#assistant-panel` before this change, one after.
                      */}
                    {isDesktop && assistantOpen && (
                        <div className="sticky top-16 h-[calc(100vh-4rem)]">
                            <AssistantPanel onClose={closeAssistant} />
                        </div>
                    )}
                </div>
            </div>

            {/* Assistant drawer — below xl only. Mirrors the nav drawer above. */}
            <AnimatePresence>
                {!isDesktop && assistantOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: DUR.fast }}
                            onClick={closeAssistant}
                            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                            aria-hidden
                        />
                        <motion.div
                            initial={{ x: 380 }}
                            animate={{ x: 0 }}
                            exit={{ x: 380 }}
                            transition={{ duration: DUR.base, ease: EASE_LUX }}
                            className="fixed inset-y-0 right-0 z-50"
                        >
                            <AssistantPanel onClose={closeAssistant} variant="drawer" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AppLayout;

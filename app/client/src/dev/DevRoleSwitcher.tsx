import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FiAlertCircle, FiChevronUp, FiRefreshCw, FiTool, FiX } from 'react-icons/fi';
import { DUR, EASE_LUX } from '@/lib/motion';
import {
    activateRole,
    clearDevSessions,
    devSwitcherEnabled,
    establishBothSessions,
    readActiveRole,
    readSessions,
    type DevRole,
    type DevSessionMap,
} from './devSessions';

const ROLES: DevRole[] = ['user', 'admin'];

/**
 * Floating dev-only control for flipping between a seeded user and a seeded admin.
 *
 * Renders `null` outside dev, and the whole module is dropped from production
 * builds anyway — `import.meta.env.DEV` becomes the literal `false`, so the import
 * in `App.tsx` tree-shakes away. See `devSessions.ts` for why this isn't a
 * privilege-escalation path.
 *
 * ## Why switching reloads the page
 *
 * Every hook in the app fetches on mount with whatever token was current. Swapping
 * the token in place would leave a dashboard full of the *other* role's data until
 * something happened to refetch — the worst kind of bug, because it looks like the
 * switch worked. A reload is the honest way to change identity: everything
 * re-requests as the new role. It's a dev tool; a 200ms reload costs nothing next
 * to trusting what's on screen.
 *
 * Styled loudly and deliberately not with the Luxe primitives — this is scaffolding,
 * and it should never be mistakable for product UI in a screenshot.
 */
const DevRoleSwitcher: FC = () => {
    const [open, setOpen] = useState(false);
    const [sessions, setSessions] = useState<DevSessionMap>({});
    const [active, setActive] = useState<DevRole | null>(null);
    const [busy, setBusy] = useState<DevRole | 'both' | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setSessions(readSessions());
        setActive(readActiveRole());
    }, []);

    const signInToBoth = useCallback(async () => {
        setBusy('both');
        setError(null);
        try {
            const next = await establishBothSessions();
            setSessions(next);
            // Land on the normal user, not the admin. Defaulting to elevated is how
            // people end up developing against permissions they don't actually have.
            await activateRole('user');
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not sign in to both accounts.');
            setBusy(null);
        }
    }, []);

    const switchTo = useCallback(async (role: DevRole) => {
        setBusy(role);
        setError(null);
        try {
            await activateRole(role);
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : `Could not switch to ${role}.`);
            setBusy(null);
        }
    }, []);

    const forget = useCallback(() => {
        clearDevSessions();
        setSessions({});
        setActive(null);
        setError(null);
    }, []);

    if (!devSwitcherEnabled()) return null;

    const hasBoth = !!sessions.user && !!sessions.admin;

    return (
        <div className="fixed bottom-4 left-4 z-[100] flex flex-col items-start gap-2 font-mono text-xs">
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: DUR.fast, ease: EASE_LUX }}
                        className="w-72 rounded-xl border-2 border-dashed border-amber-500/70 bg-white p-3 shadow-xl dark:bg-neutral-900"
                    >
                        <div className="mb-2 flex items-center justify-between">
                            <span className="font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                Dev only · role switch
                            </span>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Close dev role switcher"
                                className="rounded p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <FiX size={14} />
                            </button>
                        </div>

                        {!hasBoth ? (
                            <div className="flex flex-col gap-2">
                                <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                                    Signs into both seeded accounts and keeps both sessions alive. Run{' '}
                                    <code className="text-amber-600 dark:text-amber-400">
                                        npm run seed:dev --workspace app/server
                                    </code>{' '}
                                    once first.
                                </p>
                                <button
                                    type="button"
                                    onClick={signInToBoth}
                                    disabled={busy !== null}
                                    className="rounded-lg bg-amber-500 px-3 py-2 font-bold text-black transition-colors hover:bg-amber-400 disabled:opacity-60"
                                >
                                    {busy === 'both' ? 'Signing in…' : 'Sign in to both'}
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {ROLES.map((role) => {
                                    const session = sessions[role];
                                    const isActive = active === role;
                                    return (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => switchTo(role)}
                                            disabled={busy !== null || isActive}
                                            aria-current={isActive || undefined}
                                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-70 ${
                                                isActive
                                                    ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                                    : 'border-gray-200 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <span className="flex flex-col">
                                                <span className="font-bold uppercase tracking-wide">{role}</span>
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                    {session?.user.email}
                                                </span>
                                            </span>
                                            {busy === role ? (
                                                <FiRefreshCw size={13} className="animate-spin" />
                                            ) : isActive ? (
                                                <span className="text-[10px] font-bold">ACTIVE</span>
                                            ) : null}
                                        </button>
                                    );
                                })}

                                <div className="flex items-center justify-between pt-1">
                                    <button
                                        type="button"
                                        onClick={signInToBoth}
                                        disabled={busy !== null}
                                        className="text-[10px] text-gray-500 underline underline-offset-2 hover:text-gray-900 disabled:opacity-60 dark:hover:text-white"
                                    >
                                        Re-sign in to both
                                    </button>
                                    <button
                                        type="button"
                                        onClick={forget}
                                        className="text-[10px] text-gray-500 underline underline-offset-2 hover:text-gray-900 dark:hover:text-white"
                                    >
                                        Forget sessions
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <p
                                role="alert"
                                className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-500/10 p-2 leading-relaxed text-red-600 dark:text-red-400"
                            >
                                <FiAlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden />
                                {error}
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex items-center gap-2 rounded-full border-2 border-dashed border-amber-500/70 bg-white px-3 py-1.5 font-bold text-amber-600 shadow-lg transition-colors hover:bg-amber-50 dark:bg-neutral-900 dark:text-amber-400 dark:hover:bg-neutral-800"
            >
                <FiTool size={13} aria-hidden />
                {active ? `dev: ${active}` : 'dev: signed out'}
                <FiChevronUp
                    size={13}
                    aria-hidden
                    className={`transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
        </div>
    );
};

export default DevRoleSwitcher;

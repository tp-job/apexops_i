import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiCheck, FiChevronDown, FiFolder, FiPlus } from 'react-icons/fi';
import { useProjects } from '@/hooks/useProjects';

/**
 * Project switcher for the Topbar.
 *
 * Navigates to `/p/:slug/issues` rather than setting a "current project" in a
 * store. The project lives in the URL (spec: route shape `/p/:slug/...`), so
 * deep links, the back button and two tabs on two projects all work for free —
 * all three of which break under a store-only current-project, and each breakage
 * gets reported as a bug.
 *
 * A plain popover rather than a Radix dropdown: this is a list of links with no
 * typeahead or submenus, so it needs click-outside and Escape and nothing more.
 * `Modal` is where the focus-management dependency earns its keep.
 */
const ProjectSwitcher: FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { projects, loading } = useProjects();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    // Rendering an empty switcher would imply the feature is broken rather than
    // unused; `/projects` in the nav is the entry point until one exists.
    if (loading || !projects.length) return null;

    const active = projects.find((p) => p.slug === slug);

    const go = (to: string) => {
        setOpen(false);
        navigate(to);
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white/60 px-3 py-1.5 text-sm font-medium text-brand-dark outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-brand-accent/40"
            >
                <FiFolder size={15} className="shrink-0 text-gray-400" />
                <span className="max-w-[10rem] truncate">{active?.name ?? 'Projects'}</span>
                <FiChevronDown size={14} className="shrink-0 text-gray-400" />
            </button>

            {open && (
                <div
                    role="menu"
                    className="ds-frost absolute right-0 z-50 mt-2 w-64 rounded-2xl p-1.5 shadow-xl"
                >
                    <div className="max-h-72 overflow-y-auto">
                        {projects.map((p) => (
                            <button
                                key={p.id}
                                role="menuitem"
                                type="button"
                                onClick={() => go(`/p/${p.slug}/issues`)}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-brand-dark outline-none transition-colors hover:bg-black/5 focus-visible:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
                            >
                                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                                {p.stats && p.stats.unresolvedIssues > 0 && (
                                    <span className="shrink-0 font-numbers text-[11px] tabular-nums text-gray-400">
                                        {p.stats.unresolvedIssues}
                                    </span>
                                )}
                                {p.slug === slug && (
                                    <FiCheck size={14} className="shrink-0 text-brand-dark dark:text-brand-accent" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="my-1 h-px bg-black/5 dark:bg-white/10" />

                    <button
                        role="menuitem"
                        type="button"
                        onClick={() => go('/projects')}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-brand-dark outline-none transition-colors hover:bg-black/5 focus-visible:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
                    >
                        <FiPlus size={14} />
                        All projects
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProjectSwitcher;

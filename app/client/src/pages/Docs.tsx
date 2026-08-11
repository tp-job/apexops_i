import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
    FiArrowLeft,
    FiArrowRight,
    FiCheck,
    FiChevronRight,
    FiCopy,
    FiMenu,
    FiMoon,
    FiSun,
    FiX,
} from 'react-icons/fi';
import { useTheme } from '@/context/theme-context';
import { useAuth } from '@/context/auth-context';
import DocsSidebar from '@/components/docs/DocsSidebar';
import DocsToc from '@/components/docs/DocsToc';
import DocsArticle from '@/components/docs/DocsArticle';
import { useDocs } from '@/hooks/useDocs';

/**
 * `/docs` — the developer documentation surface.
 *
 * **Public on purpose.** Whoever is pasting the SDK snippet into another app
 * needs the install instructions, and gating them behind a login is how a
 * one-line integration turns into a support conversation. Nothing here exposes
 * project data; it is all reference material.
 *
 * The three-column shell (nav · content · on-this-page) is the standard shape
 * for API documentation because it answers the two questions a reader always
 * has: *where am I in the whole thing*, and *what is on this page*. Both rails
 * collapse below `xl`, and the left one becomes a drawer on mobile.
 *
 * Chrome is deliberately its own, not `AppLayout` — the docs are read by people
 * who may not have an account, so a workspace sidebar with Dashboard and Chat
 * links would be pointing at doors they cannot open.
 *
 * **Content comes from the database as of Sprint 9** (S9-D1). The six pages used
 * to be JSX in `content/docs.tsx`, which meant editing a typo took a developer,
 * a commit and a deploy. What did *not* change is this route's audience: it is
 * still anonymous, and it renders `published` pages only (S9-D3).
 */
const Docs: FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { isDark, toggleTheme } = useTheme();
    const { isAuthenticated } = useAuth();
    const [navOpen, setNavOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const { pages, page, parsed, loading, notFound, error } = useDocs(slug);

    const index = page ? pages.findIndex((d) => d.slug === page.slug) : -1;
    const prev = index > 0 ? pages[index - 1] : null;
    const next = index >= 0 && index < pages.length - 1 ? pages[index + 1] : null;
    const defaultSlug = pages[0]?.slug;

    // A new page must start at the top. Without this, navigating from halfway
    // down a long page lands halfway down the next one.
    useEffect(() => {
        window.scrollTo({ top: 0 });
        setNavOpen(false);
    }, [slug]);

    // An unknown or unpublished slug goes to the first page rather than to an
    // error: a draft is a normal thing for a stale link to point at, and the
    // reader's problem is "show me the docs", not "explain your workflow".
    if (!loading && (notFound || !slug) && defaultSlug) {
        return <Navigate to={`/docs/${defaultSlug}`} replace />;
    }

    if (!page) {
        return (
            <div className="grid min-h-screen place-items-center bg-light-bg px-6 text-center dark:bg-dark-bg">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {error ?? (loading ? 'Loading documentation…' : 'No documentation has been published yet.')}
                </p>
            </div>
        );
    }

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // Clipboard is permission-gated; the URL bar still works.
        }
    };

    return (
        <div className="min-h-screen bg-light-bg text-brand-dark dark:bg-dark-bg dark:text-white">
            {/* ── Top bar ─────────────────────────────────────── */}
            <header className="sticky top-0 z-40 border-b border-black/5 bg-light-bg/85 backdrop-blur-xl dark:border-white/10 dark:bg-dark-bg/85">
                <div className="flex h-16 items-center gap-3 px-4 md:px-6">
                    <button
                        type="button"
                        onClick={() => setNavOpen(true)}
                        aria-label="Open documentation navigation"
                        className="grid h-9 w-9 place-items-center rounded-xl text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10 lg:hidden"
                    >
                        <FiMenu size={18} />
                    </button>

                    <Link to="/" className="flex items-center gap-2 outline-none">
                        <span className="font-heading text-lg font-bold tracking-tight">Apex</span>
                        <span className="rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:bg-white/10 dark:text-gray-400">
                            Docs
                        </span>
                    </Link>

                    <div className="ml-auto flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                            className="grid h-9 w-9 place-items-center rounded-xl text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
                        >
                            {isDark ? <FiSun size={17} /> : <FiMoon size={17} />}
                        </button>

                        <Link
                            to={isAuthenticated ? '/projects' : '/login'}
                            className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-black/5 hover:text-brand-dark dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            {isAuthenticated ? 'Projects' : 'Sign in'}
                        </Link>

                        <Link
                            to={isAuthenticated ? '/projects' : '/register'}
                            className="hidden rounded-xl bg-brand-accent px-3.5 py-2 text-sm font-semibold text-brand-dark shadow-md transition-colors hover:bg-brand-accentHover sm:block"
                        >
                            Get an ingest key
                        </Link>
                    </div>
                </div>
            </header>

            <div className="mx-auto flex w-full max-w-[100rem] items-start">
                {/* ── Left rail ───────────────────────────────── */}
                <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-black/5 px-4 py-6 dark:border-white/10 lg:block">
                    <DocsSidebar pages={pages} />
                </aside>

                {/* Mobile drawer */}
                {navOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <button
                            type="button"
                            aria-label="Close navigation"
                            onClick={() => setNavOpen(false)}
                            className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
                        />
                        <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-light-bg p-4 dark:bg-dark-bg">
                            <div className="mb-3 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setNavOpen(false)}
                                    aria-label="Close navigation"
                                    className="grid h-9 w-9 place-items-center rounded-xl text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
                                >
                                    <FiX size={18} />
                                </button>
                            </div>
                            <DocsSidebar pages={pages} onNavigate={() => setNavOpen(false)} />
                        </div>
                    </div>
                )}

                {/* ── Content ─────────────────────────────────── */}
                <main className="min-w-0 flex-1 px-5 py-8 md:px-10">
                    <nav aria-label="Breadcrumb" className="mb-6">
                        <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400">
                            <li>
                                <Link to="/" className="transition-colors hover:text-brand-dark dark:hover:text-white">
                                    Home
                                </Link>
                            </li>
                            <FiChevronRight size={13} aria-hidden className="text-gray-300 dark:text-gray-600" />
                            <li>
                                <Link
                                    to={`/docs/${defaultSlug ?? page.slug}`}
                                    className="transition-colors hover:text-brand-dark dark:hover:text-white"
                                >
                                    Docs
                                </Link>
                            </li>
                            <FiChevronRight size={13} aria-hidden className="text-gray-300 dark:text-gray-600" />
                            <li aria-current="page" className="font-medium text-brand-dark dark:text-gray-200">
                                {page.group}
                            </li>
                        </ol>
                    </nav>

                    <div className="flex items-start gap-3">
                        <h1 className="font-heading text-[2.5rem] font-bold leading-tight tracking-tight">
                            {page.title}
                        </h1>
                        <button
                            type="button"
                            onClick={copyLink}
                            aria-label={copied ? 'Link copied' : 'Copy link to this page'}
                            className="mt-3 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gray-200 text-gray-500 outline-none transition-colors hover:bg-black/5 hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            {copied ? <FiCheck size={15} /> : <FiCopy size={15} />}
                        </button>
                    </div>

                    {parsed && <DocsArticle doc={parsed} />}

                    {/* ── Prev / next ─────────────────────────── */}
                    <nav
                        aria-label="Pagination"
                        className="mt-16 flex max-w-3xl flex-col gap-3 border-t border-gray-200 pt-6 dark:border-white/10 sm:flex-row"
                    >
                        {prev ? (
                            <Link
                                to={`/docs/${prev.slug}`}
                                className="group flex flex-1 flex-col gap-1 rounded-2xl border border-gray-200 p-4 transition-colors hover:border-brand-dark/30 hover:bg-black/[0.02] dark:border-white/10 dark:hover:border-brand-accent/30 dark:hover:bg-white/5"
                            >
                                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                    <FiArrowLeft size={12} /> Previous
                                </span>
                                <span className="text-sm font-semibold">{prev.title}</span>
                            </Link>
                        ) : (
                            <span className="flex-1" />
                        )}

                        {next && (
                            <Link
                                to={`/docs/${next.slug}`}
                                className="group flex flex-1 flex-col items-end gap-1 rounded-2xl border border-gray-200 p-4 text-right transition-colors hover:border-brand-dark/30 hover:bg-black/[0.02] dark:border-white/10 dark:hover:border-brand-accent/30 dark:hover:bg-white/5"
                            >
                                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                                    Next <FiArrowRight size={12} />
                                </span>
                                <span className="text-sm font-semibold">{next.title}</span>
                            </Link>
                        )}
                    </nav>
                </main>

                {/* ── Right rail ──────────────────────────────── */}
                <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto px-4 py-8 xl:block">
                    <DocsToc sections={parsed?.sections ?? []} />
                </aside>
            </div>
        </div>
    );
};

export default Docs;

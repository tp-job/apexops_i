import type { FC } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCode, FiCopy, FiLayers } from 'react-icons/fi';
import type { IssueEvent, Symbolication, SymbolicationReason } from '@/types/projects';

interface StackPanelProps {
    event: IssueEvent;
    /** Null when the server had no stored event to resolve. */
    symbolication: Symbolication | null;
    /** For the "upload a map" link. Omitted when the reader cannot administer. */
    slug?: string;
    onCopy: (text: string) => void;
}

/**
 * Copy always hands back the **raw** stack, never the resolved rendering.
 *
 * That is what gets pasted into a bug report, a Slack thread or a search box,
 * and it is the artifact the browser actually produced. A prettified stack
 * pasted somewhere else is unverifiable by whoever receives it.
 */
const HINTS: Record<SymbolicationReason, { title: string; body: string } | null> = {
    ok: null,
    'no-stack': null,
    'no-release': {
        title: 'No release on this event',
        body: 'Source maps are matched by release. Add data-release to the SDK script tag and redeploy — until then these frames cannot be resolved.',
    },
    'no-maps-for-release': {
        title: 'No source maps uploaded for this release',
        body: 'Upload the .map files your build produced and this stack resolves to original file, line and function — including for events already stored.',
    },
    'no-matching-file': {
        title: 'Maps exist for this release, but not for these files',
        body: 'The uploaded file names do not match the bundles in this stack. Upload with the exact generated file name, e.g. index-BwlN_KfP.js.',
    },
    'no-mappings-hit': {
        title: 'The map had no entry for these positions',
        body: 'This usually means the map belongs to a different build of the same release string. Re-upload the map from the exact build that is deployed.',
    },
};

/**
 * The stack trace panel.
 *
 * Renders resolved frames when a source map produced them and the raw stack
 * otherwise, with a toggle between the two. Three rules shape it:
 *
 * - **The raw stack is never thrown away.** It is what Copy returns and what the
 *   toggle shows, so a wrong or corrupt map degrades the display and never the
 *   evidence.
 * - **Mixed stacks are the normal case, not an edge case.** Vendor frames have
 *   no map, app frames do. Resolved and unresolved frames therefore have to be
 *   visually distinguishable at a glance, in original order.
 * - **When nothing resolved, say which fix applies.** "No source maps" is four
 *   different problems with four different answers; the server distinguishes
 *   them and this panel spends the words.
 */
const StackPanel: FC<StackPanelProps> = ({ event, symbolication, slug, onCopy }) => {
    const canResolve = !!symbolication?.applied;
    const [showRaw, setShowRaw] = useState(false);

    if (!event.stack) {
        return (
            <p className="text-xs text-gray-400">No stack trace was reported with this event.</p>
        );
    }

    const hint = symbolication ? HINTS[symbolication.reason] : null;
    const showingResolved = canResolve && !showRaw;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                    {canResolve && symbolication && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-accent/20 px-2 py-0.5 font-semibold text-brand-dark dark:text-brand-accent">
                            <FiCode size={11} />
                            {symbolication.resolvedCount} of {symbolication.frameCount} frames resolved
                        </span>
                    )}
                    {symbolication?.release && (
                        <span className="font-mono">release {symbolication.release}</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {canResolve && (
                        <button
                            type="button"
                            onClick={() => setShowRaw((v) => !v)}
                            aria-pressed={showRaw}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-500 outline-none transition-colors hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:text-gray-400 dark:hover:text-white"
                        >
                            <FiLayers size={11} />
                            {showRaw ? 'View original' : 'View minified'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onCopy(event.stack ?? '')}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-500 outline-none transition-colors hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:text-gray-400 dark:hover:text-white"
                    >
                        <FiCopy size={11} /> Copy
                    </button>
                </div>
            </div>

            {showingResolved && symbolication ? (
                <ol className="max-h-96 overflow-auto rounded-2xl border border-gray-200 bg-white/60 p-2 dark:border-white/10 dark:bg-white/[0.04]">
                    {symbolication.frames.map((f, i) => {
                        if (f.isHeader) {
                            return (
                                <li
                                    key={i}
                                    className="px-2.5 py-1.5 font-mono text-[12px] font-semibold leading-6 text-brand-dark dark:text-gray-100"
                                >
                                    {f.raw}
                                </li>
                            );
                        }
                        if (!f.raw.trim()) return null;

                        return (
                            <li
                                key={i}
                                className={`rounded-xl px-2.5 py-1.5 font-mono text-[12px] leading-6 ${
                                    f.resolved
                                        ? 'text-brand-dark dark:text-gray-200'
                                        : // Dimmed, not hidden: an unresolved vendor frame is
                                          // still part of the story of how you got here.
                                          'text-gray-400 dark:text-gray-500'
                                }`}
                            >
                                {f.resolved ? (
                                    <>
                                        <span className="text-gray-400">at </span>
                                        <span className="font-semibold">
                                            {f.originalFunction ?? '<anonymous>'}
                                        </span>
                                        <span className="text-gray-400"> — </span>
                                        <span className="text-brand-dark dark:text-brand-accent">
                                            {f.originalFile}
                                        </span>
                                        <span className="text-gray-400">
                                            :{f.originalLine}
                                            {f.originalColumn !== null ? `:${f.originalColumn}` : ''}
                                        </span>
                                    </>
                                ) : (
                                    f.raw.trim()
                                )}
                            </li>
                        );
                    })}
                </ol>
            ) : (
                <pre className="max-h-96 overflow-auto rounded-2xl border border-gray-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <code className="font-mono text-[12px] leading-6 text-brand-dark dark:text-gray-200">
                        {event.stack}
                    </code>
                </pre>
            )}

            {hint && (
                <div className="rounded-xl border border-gray-200 bg-white/40 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[12px] font-semibold text-brand-dark dark:text-gray-200">
                        {hint.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                        {hint.body}{' '}
                        <Link
                            to="/docs/sdk#source-maps"
                            className="font-medium underline underline-offset-2 hover:text-brand-dark dark:hover:text-brand-accent"
                        >
                            Upload recipe
                        </Link>
                        {slug && (
                            <>
                                {' · '}
                                <Link
                                    to={`/p/${slug}/settings`}
                                    className="font-medium underline underline-offset-2 hover:text-brand-dark dark:hover:text-brand-accent"
                                >
                                    What&apos;s uploaded
                                </Link>
                            </>
                        )}
                    </p>
                </div>
            )}
        </div>
    );
};

export default StackPanel;

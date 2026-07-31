import type { FC, ReactNode } from 'react';
import { useState } from 'react';
import { FiAlertTriangle, FiCheck, FiCopy, FiInfo } from 'react-icons/fi';

/**
 * The typographic vocabulary for `/docs`.
 *
 * Documentation gets its own primitives rather than reusing the app's, because
 * the constraints are different: long-form prose needs a measured line length,
 * a heading rhythm and code blocks that survive being copied. What it shares
 * with the app is the Luxe palette — the tokens here are the same ones the
 * product uses, so a snippet in the docs looks like the same product.
 */

export const P: FC<{ children: ReactNode }> = ({ children }) => (
    <p className="text-[15px] leading-7 text-gray-600 dark:text-gray-300">{children}</p>
);

export const Lead: FC<{ children: ReactNode }> = ({ children }) => (
    <p className="text-base leading-7 text-gray-500 dark:text-gray-400">{children}</p>
);

/** Inline literal — an attribute, a field, a status value. */
export const C: FC<{ children: ReactNode }> = ({ children }) => (
    <code className="rounded-md bg-black/[0.06] px-1.5 py-0.5 font-mono text-[13px] text-brand-dark dark:bg-white/10 dark:text-gray-200">
        {children}
    </code>
);

export const A: FC<{ href: string; children: ReactNode }> = ({ href, children }) => {
    const external = /^https?:/.test(href);
    return (
        <a
            href={href}
            {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
            className="font-medium text-brand-dark underline decoration-brand-dark/30 underline-offset-2 transition-colors hover:decoration-brand-dark dark:text-brand-accent dark:decoration-brand-accent/40 dark:hover:decoration-brand-accent"
        >
            {children}
        </a>
    );
};

export const UL: FC<{ children: ReactNode }> = ({ children }) => (
    <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-7 text-gray-600 marker:text-gray-400 dark:text-gray-300">
        {children}
    </ul>
);

export const OL: FC<{ children: ReactNode }> = ({ children }) => (
    <ol className="flex list-decimal flex-col gap-2 pl-5 text-[15px] leading-7 text-gray-600 marker:font-semibold marker:text-gray-400 dark:text-gray-300">
        {children}
    </ol>
);

export const LI: FC<{ children: ReactNode }> = ({ children }) => <li className="pl-1">{children}</li>;

/**
 * Code block with a copy button.
 *
 * Copy is the single most-used control in developer documentation, so it is
 * always present rather than revealed on hover — a hover-only affordance is
 * invisible on touch and to anyone who does not think to hover.
 */
export const Code: FC<{ children: string; lang?: string }> = ({ children, lang }) => {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // Clipboard is permission-gated; the text is selectable either way.
        }
    };

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white/70 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-white/10">
                <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
                    {lang ?? 'text'}
                </span>
                <button
                    type="button"
                    onClick={copy}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-gray-500 outline-none transition-colors hover:bg-black/5 hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-brand-accent/40"
                    aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
                >
                    {copied ? <FiCheck size={12} /> : <FiCopy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            {/* Wide snippets scroll inside the block so the page body never does. */}
            <pre className="overflow-x-auto px-4 py-3.5">
                <code className="font-mono text-[13px] leading-6 text-brand-dark dark:text-gray-200">
                    {children}
                </code>
            </pre>
        </div>
    );
};

type CalloutTone = 'info' | 'warn';

/**
 * Two tones only, deliberately. A palette of five severity colours trains people
 * to skip all of them; `warn` is reserved for "this will cost you something".
 */
export const Callout: FC<{ tone?: CalloutTone; title?: string; children: ReactNode }> = ({
    tone = 'info',
    title,
    children,
}) => {
    const styles =
        tone === 'warn'
            ? 'border-global-red/25 bg-global-red/[0.07] text-global-red'
            : 'border-brand-dark/10 bg-brand-dark/[0.04] text-brand-dark dark:border-brand-accent/20 dark:bg-brand-accent/[0.07] dark:text-brand-accent';

    return (
        <div className={`flex gap-3 rounded-2xl border p-4 ${styles}`}>
            <span className="mt-0.5 shrink-0" aria-hidden>
                {tone === 'warn' ? <FiAlertTriangle size={16} /> : <FiInfo size={16} />}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
                {title && <p className="text-sm font-semibold">{title}</p>}
                <div className="text-[14px] leading-6 text-gray-600 dark:text-gray-300">{children}</div>
            </div>
        </div>
    );
};

export interface DocTableColumn {
    header: string;
    /** Tailwind width class. */
    width?: string;
}

/**
 * Reference table — parameters, fields, endpoints.
 *
 * Not the app's `DataTable`: that one exists for sortable, paginated, live
 * server data and carries all the machinery for it. A parameter list is static
 * prose in a grid and needs none of it.
 */
export const Table: FC<{ columns: DocTableColumn[]; rows: ReactNode[][] }> = ({ columns, rows }) => (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
        <table className="w-full border-collapse text-left">
            <thead>
                <tr className="border-b border-gray-200 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]">
                    {columns.map((c) => (
                        <th
                            key={c.header}
                            scope="col"
                            className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${c.width ?? ''}`}
                        >
                            {c.header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0 dark:border-white/5">
                        {row.map((cell, j) => (
                            <td
                                key={j}
                                className="px-4 py-3 align-top text-[14px] leading-6 text-gray-600 dark:text-gray-300"
                            >
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/** HTTP method + path, for endpoint reference rows. */
export const Endpoint: FC<{ method: string; path: string }> = ({ method, path }) => {
    const tone: Record<string, string> = {
        GET: 'text-brand-dark dark:text-brand-accent',
        POST: 'text-brand-dark dark:text-brand-accent',
        PATCH: 'text-gray-500 dark:text-gray-400',
        DELETE: 'text-global-red',
    };
    return (
        <span className="inline-flex items-center gap-2 font-mono text-[13px]">
            <span className={`font-bold ${tone[method] ?? 'text-gray-500'}`}>{method}</span>
            <span className="text-gray-600 dark:text-gray-300">{path}</span>
        </span>
    );
};

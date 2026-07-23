import type { FC } from 'react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DOC_PAGES } from '@/components/ui/resources/docs/docsRegistry';
import type { DocBlock, DocPage } from '@/components/ui/resources/docs/docsRegistry';

type CalloutTone = 'info' | 'warning' | 'success';

const toneToStyles: Record<CalloutTone, string> = {
    info: 'bg-blue-50 dark:bg-blue-900/20 border-primary text-blue-800 dark:text-blue-200',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-900 dark:text-amber-200',
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-900 dark:text-emerald-200',
};

function collectToc(page: DocPage) {
    return page.blocks
        .filter((b) => b.type === 'h2' || b.type === 'h3')
        .map((b) => {
            const level = b.type === 'h2' ? 2 : 3;
            const text = b.text;
            const id =
                b.id ??
                text
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .trim()
                    .replace(/\s+/g, '-');
            return { level, text, id };
        });
}

const Block: FC<{ block: DocBlock }> = ({ block }) => {
    if (block.type === 'p') {
        return <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{block.text}</p>;
    }

    if (block.type === 'h2') {
        const id =
            block.id ??
            block.text
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-');
        return (
            <h2 id={id} className="scroll-mt-24 text-2xl font-semibold text-gray-900 dark:text-white mt-10">
                {block.text}
            </h2>
        );
    }

    if (block.type === 'h3') {
        const id =
            block.id ??
            block.text
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-');
        return (
            <h3 id={id} className="scroll-mt-24 text-xl font-semibold text-gray-900 dark:text-white mt-8">
                {block.text}
            </h3>
        );
    }

    if (block.type === 'list') {
        return (
            <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
                {block.items.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        );
    }

    if (block.type === 'callout') {
        const tone = block.tone ?? 'info';
        return (
            <div className={`border-l-4 p-4 rounded-r ${toneToStyles[tone]}`}>
                <div className="flex items-start gap-3">
                    <span className="material-icons-round mt-0.5">
                        {tone === 'warning' ? 'warning' : tone === 'success' ? 'check_circle' : 'info'}
                    </span>
                    <div>
                        <p className="text-sm font-semibold">{block.title}</p>
                        <p className="mt-1 text-sm opacity-90 leading-relaxed">{block.text}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (block.type === 'code') {
        return (
            <div className="bg-code-bg rounded-xl border border-gray-800/60 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-800/60 bg-black/20 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-gray-400">{block.language ?? 'code'}</span>
                    <span className="text-xs text-gray-500">copy from snippet</span>
                </div>
                <pre className="p-4 overflow-auto text-sm leading-relaxed text-gray-200 font-mono">
                    <code>{block.code}</code>
                </pre>
            </div>
        );
    }

    return null;
};

const DocReader: FC<{ docId: string }> = ({ docId }) => {
    const page = DOC_PAGES[docId];

    const toc = useMemo(() => (page ? collectToc(page) : []), [page]);

    if (!page) {
        return (
            <div className="px-8 lg:px-12 py-12">
                <div className="max-w-3xl">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Document not found</h1>
                    <p className="mt-3 text-gray-600 dark:text-gray-300">
                        Try going back to <Link className="text-primary hover:underline" to="/about/docs">Documents</Link>.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-full bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 flex flex-col overflow-x-hidden">
            <section className="border-b border-gray-200 dark:border-gray-800 bg-card-light dark:bg-background-dark py-10 px-8 lg:px-12">
                <div className="max-w-6xl">
                    <div className="flex items-center space-x-2 text-sm text-primary font-medium mb-4">
                        {(page.breadcrumbs ?? ['Documents']).map((crumb, idx, arr) => (
                            <span key={`${crumb}-${idx}`} className="flex items-center space-x-2">
                                <span>{crumb}</span>
                                {idx < arr.length - 1 && <span className="text-gray-400">/</span>}
                            </span>
                        ))}
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{page.title}</h1>
                    {page.subtitle && <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-3xl">{page.subtitle}</p>}
                </div>
            </section>

            <section className="flex flex-col xl:flex-row">
                <div className="flex-1 px-8 lg:px-12 py-12 bg-card-light dark:bg-background-dark xl:border-r border-gray-200 dark:border-gray-800">
                    <div className="max-w-3xl space-y-6">
                        {page.blocks.map((block, idx) => (
                            <Block key={`${page.id}-${idx}`} block={block} />
                        ))}
                    </div>
                </div>

                <aside className="xl:w-88 bg-background-light dark:bg-[#0f1117] flex flex-col sticky top-0 h-auto xl:h-[calc(100vh-0rem)] border-t xl:border-t-0 border-gray-200 dark:border-gray-800">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-[#0f1117]/50 backdrop-blur">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            On this page
                        </span>
                    </div>
                    <div className="p-4 overflow-auto">
                        {toc.length === 0 ? (
                            <p className="text-sm text-gray-500">No sections</p>
                        ) : (
                            <ul className="space-y-2">
                                {toc.map((item) => (
                                    <li key={item.id} className={item.level === 3 ? 'pl-3' : ''}>
                                        <a
                                            className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                                            href={`#${item.id}`}
                                        >
                                            {item.text}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                            <Link
                                to="/about/docs"
                                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4"
                            >
                                <span className="material-icons-round text-base">menu_book</span>
                                Browse all documents
                            </Link>
                        </div>
                    </div>
                </aside>
            </section>
        </div>
    );
};

export default DocReader;


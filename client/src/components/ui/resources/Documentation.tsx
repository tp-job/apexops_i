import type { FC } from 'react';
import { Link } from 'react-router-dom';
import DocReader from '@/components/ui/resources/DocReader';
import { DEFAULT_DOC_ID, DOC_NAV, DOC_PAGES } from '@/components/ui/resources/docs/docsRegistry';

const Documentation: FC<{ docId?: string; mode?: 'index' | 'doc' }> = ({ docId, mode = 'doc' }) => {
    if (mode === 'index') {
        const flat = DOC_NAV.flatMap((g) =>
            g.items.flatMap((it) => ('to' in it ? [it] : it.items))
        );

        return (
            <div className="w-full min-h-full bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 flex flex-col overflow-x-hidden">
                <section className="border-b border-gray-200 dark:border-gray-800 bg-card-light dark:bg-background-dark py-12 px-8 lg:px-12">
                    <div className="max-w-5xl">
                        <div className="flex items-center space-x-2 text-sm text-primary font-medium mb-4">
                            <span>Architecture Hub</span>
                            <span className="text-gray-400">/</span>
                            <span>Documents</span>
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Documents</h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl">
                            Clear, practical docs designed for scanning. Start with the quickstart, then dive into API and diagnostics.
                        </p>
                    </div>
                </section>

                <section className="px-8 lg:px-12 py-12">
                    <div className="max-w-5xl grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {flat.map((item) => {
                            const page = DOC_PAGES[item.id];
                            return (
                                <Link
                                    key={item.id}
                                    to={item.to}
                                    className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-6 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                {page?.category ?? 'Document'}
                                            </p>
                                            <h2 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                                                {item.title}
                                            </h2>
                                            {page?.subtitle && (
                                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                                                    {page.subtitle}
                                                </p>
                                            )}
                                        </div>
                                        <span className="material-icons-round text-gray-400 group-hover:text-primary transition-colors">
                                            arrow_forward
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            </div>
        );
    }

    return <DocReader docId={docId ?? DEFAULT_DOC_ID} />;
};

export default Documentation;


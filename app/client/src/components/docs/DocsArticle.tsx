import type { FC } from 'react';
import type { ParsedDoc } from '@/lib/docsMarkdown';
import DocsMarkdown from './DocsMarkdown';

/**
 * A parsed doc page's lead and sections — the whole article body, once.
 *
 * S9-D3's promise is that the admin preview and the public page cannot disagree.
 * That promise was resting on two copies of this loop (one in `pages/Docs.tsx`,
 * one in the `AdminDocs` preview pane), which is the shape of every drift story
 * ever told: the guarantee held only as long as someone kept editing both.
 * With one component it is structural.
 *
 * The heading markup lives here rather than in `DocsMarkdown` because a heading
 * is a *section boundary*, not a block: it owns the anchor id the "On this page"
 * rail links to, and the `scroll-mt` that clears the sticky header. Folding it
 * into the block renderer would put those two concerns in a component that has
 * no idea a sticky header exists.
 */
const DocsArticle: FC<{ doc: ParsedDoc }> = ({ doc }) => (
    <>
        {doc.intro.length > 0 && (
            <div className="mt-4 max-w-3xl">
                <DocsMarkdown blocks={doc.intro} lead />
            </div>
        )}

        <div className="mt-10 flex max-w-3xl flex-col gap-12">
            {doc.sections.map((section) => (
                <section key={section.id} className="flex flex-col gap-4">
                    {/* `scroll-mt` clears the sticky header — without it an
                        anchor jump puts the heading underneath the top bar. */}
                    {section.level === 3 ? (
                        <h3 id={section.id} className="scroll-mt-24 font-heading text-lg font-bold tracking-tight">
                            {section.title}
                        </h3>
                    ) : (
                        <h2
                            id={section.id}
                            className="scroll-mt-24 border-b border-gray-200 pb-2 font-heading text-2xl font-bold tracking-tight dark:border-white/10"
                        >
                            {section.title}
                        </h2>
                    )}
                    <DocsMarkdown blocks={section.blocks} />
                </section>
            ))}
        </div>
    </>
);

export default DocsArticle;

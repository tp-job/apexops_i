import type { FC } from 'react';
import { useMemo } from 'react';
import { parseDoc } from '@/lib/docsMarkdown';
import DocsMarkdown from '@/components/docs/DocsMarkdown';

/**
 * Renders an assistant reply as Markdown (spec F011, REQ-U4).
 *
 * ## Why this reuses the docs parser instead of adding one
 *
 * `lib/docsMarkdown.ts` already parses to a node tree and already carries the
 * href allowlist that refuses `javascript:` and friends. A second Markdown path
 * would be a second place for an escaping bug to live, and this one is the
 * output of a *model* — text this app did not write and cannot vouch for.
 *
 * **There is no `dangerouslySetInnerHTML` here and none may be added.** Text
 * reaches the DOM as a React child, so `<img src=x onerror=alert(1)>` in a reply
 * renders as visible characters rather than as an element. That property is the
 * entire escaping story, and it is inherited rather than re-derived.
 *
 * `parseDoc` splits on headings into `intro` + `sections`, which suits a docs
 * page. A chat reply is one continuous run, so the sections are flattened back
 * out here with their headings rendered inline — small enough for a 380px rail,
 * where the docs page's heading scale would be shouting.
 */
const AssistantMarkdown: FC<{ text: string }> = ({ text }) => {
    // Parsing is pure and the text never changes once a message is in the
    // thread, so this runs once per message rather than on every panel render.
    const doc = useMemo(() => parseDoc(text), [text]);

    return (
        <div className="flex flex-col gap-3 text-[15px] leading-7">
            {doc.intro.length > 0 && <DocsMarkdown blocks={doc.intro} />}

            {doc.sections.map((section) => (
                <div key={section.id} className="flex flex-col gap-2">
                    {/*
                      * One heading size for both levels. A reply rarely nests
                      * deeply enough for the distinction to carry meaning, and
                      * two near-identical sizes in a narrow column read as an
                      * accident rather than a hierarchy.
                      */}
                    <p className="font-heading text-sm font-bold text-brand-dark dark:text-white">{section.title}</p>
                    <DocsMarkdown blocks={section.blocks} />
                </div>
            ))}
        </div>
    );
};

export default AssistantMarkdown;

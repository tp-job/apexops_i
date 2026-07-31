import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { DocSection } from '@/content/docs';

/**
 * The "On this page" rail.
 *
 * Active-section tracking uses `IntersectionObserver` with a top-weighted
 * `rootMargin` rather than a scroll listener: a scroll handler fires on every
 * frame and has to measure element positions itself, which is both more code and
 * more jank on a long page.
 *
 * The margin (`-88px 0px -70% 0px`) narrows the observed band to a strip near the
 * top of the viewport, so the highlighted entry is the heading you are reading
 * rather than whichever section happens to be tallest on screen.
 */
const DocsToc: FC<{ sections: DocSection[] }> = ({ sections }) => {
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        // Reset on page change: a stale id from the previous page highlights nothing
        // and leaves the rail looking broken until the first scroll.
        setActiveId(sections[0]?.id ?? null);

        const elements = sections
            .map((s) => document.getElementById(s.id))
            .filter((el): el is HTMLElement => el !== null);
        if (!elements.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible.length) setActiveId(visible[0].target.id);
            },
            { rootMargin: '-88px 0px -70% 0px', threshold: 0 }
        );

        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [sections]);

    if (sections.length < 2) return null;

    return (
        <nav aria-label="On this page" className="flex flex-col gap-2">
            <p className="text-[13px] font-bold text-brand-dark dark:text-white">On this page</p>
            <ul className="flex flex-col gap-0.5 border-l border-gray-200 dark:border-white/10">
                {sections.map((s) => {
                    const active = s.id === activeId;
                    return (
                        <li key={s.id}>
                            <a
                                href={`#${s.id}`}
                                aria-current={active ? 'location' : undefined}
                                className={[
                                    'block py-1 text-[13px] leading-5 transition-colors',
                                    s.level === 3 ? 'pl-7' : 'pl-3',
                                    active
                                        ? '-ml-px border-l-2 border-brand-dark font-semibold text-brand-dark dark:border-brand-accent dark:text-brand-accent'
                                        : 'text-gray-500 hover:text-brand-dark dark:text-gray-400 dark:hover:text-white',
                                ].join(' ')}
                            >
                                {s.title}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default DocsToc;

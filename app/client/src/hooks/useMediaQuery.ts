import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query from React.
 *
 * ## Why this exists rather than another `xl:` class
 *
 * Tailwind's responsive prefixes are presentation only: `xl:hidden` and
 * `xl:block` both leave their element **mounted**, and merely paint one of them.
 * That is exactly right for styling and exactly wrong when the two variants are
 * not interchangeable — the assistant rail and its drawer carry the same
 * `id` and the same `aria-controls` target, so mounting both put two elements
 * with one id in the document and made the trigger's `aria-controls` ambiguous.
 *
 * A media query read in JavaScript decides which one *exists*, not which one is
 * visible. Reach for this only when duplication is a correctness problem;
 * for ordinary responsive styling the Tailwind prefix is still the right tool
 * and is cheaper.
 *
 * SSR-safe by defaulting to `false` when `window` is absent, and it listens for
 * changes so a resize across the breakpoint swaps the mounted variant.
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState<boolean>(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        const list = window.matchMedia(query);
        // Re-read on mount: the query may have changed between the lazy
        // initialiser and this effect (a resize during hydration, or a query
        // string that changed between renders).
        setMatches(list.matches);

        const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
        list.addEventListener('change', onChange);
        return () => list.removeEventListener('change', onChange);
    }, [query]);

    return matches;
}

/** The design system's primary breakpoint — Tailwind `xl`. */
export const XL_QUERY = '(min-width: 1280px)';

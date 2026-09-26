/**
 * The tiny DOM builder the extension's own pages use (popup, panel).
 *
 * Text goes in as text nodes, never through `innerHTML`: project names, issue
 * titles, servers' error messages and site origins are all outside input, and a
 * builder that cannot parse markup cannot be tricked into running it.
 */

export type Child = Node | string | null | false | undefined | Child[];

export function h<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Partial<Record<string, unknown>> = {},
    ...children: Child[]
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (value === undefined || value === false || value === null) continue;
        if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value as EventListener);
        else if (key === 'class') el.className = String(value);
        else if (key in el && key !== 'list') (el as unknown as Record<string, unknown>)[key] = value;
        else el.setAttribute(key, String(value));
    }
    add(el, children);
    return el;
}

/** Append children, skipping the falsy ones and flattening nested lists. */
export function add(parent: ParentNode, children: readonly Child[]): void {
    for (const c of children) {
        if (!c) continue;
        if (Array.isArray(c)) add(parent, c);
        else parent.append(c as Node | string);
    }
}

/** `host:port` of a URL, or the input itself when it is not one. */
export const host = (url: string): string => {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
};

/**
 * A binding ties one origin of a site under test to one ApexOps project
 * (spec X12). Written by the connect flow (`connect.ts`); read by the worker,
 * which is the only thing that ever uses the key.
 *
 * Kept in `chrome.storage.local`, which web pages cannot read. The ingest key
 * is public by design (project-workspaces D4), but it still never goes to the
 * page: the page-side capture sends events with an empty key and the service
 * worker fills it in from here.
 */
export interface Binding {
    /** API origin (+ any path prefix), no trailing slash, e.g. `http://localhost:3013`. */
    apiUrl: string;
    slug: string;
    projectId: number;
    name: string;
    ingestKey: string;
    /** The web app the project URL was pasted from, for "open in ApexOps" links. */
    appOrigin?: string;
}

/** Keyed by exact origin of the site under test, e.g. `http://localhost:5174`. */
export type Bindings = Record<string, Binding>;

export const BINDINGS_KEY = 'bindings';

/** The match pattern for everything on one origin. Chrome patterns carry the port. */
export const patternFor = (origin: string): string => `${origin}/*`;

export async function readBindings(): Promise<Bindings> {
    const stored = await browser.storage.local.get(BINDINGS_KEY);
    const value = stored[BINDINGS_KEY];
    return value && typeof value === 'object' ? (value as Bindings) : {};
}

// Read-modify-write on one key. Two writers (a connect and a key refresh) that
// each read the old map would silently drop each other's change, so every
// update goes through this chain.
let chain: Promise<unknown> = Promise.resolve();

export function updateBindings(change: (current: Bindings) => Bindings): Promise<Bindings> {
    const run = chain.then(async () => {
        const next = change(await readBindings());
        await browser.storage.local.set({ [BINDINGS_KEY]: next });
        return next;
    });
    chain = run.catch(() => undefined);
    return run;
}

export const setBinding = (origin: string, binding: Binding) =>
    updateBindings((all) => ({ ...all, [origin]: binding }));

export const removeBinding = (origin: string) =>
    updateBindings((all) => {
        const { [origin]: _gone, ...rest } = all;
        return rest;
    });

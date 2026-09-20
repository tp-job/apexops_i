/**
 * A binding ties one origin of a site under test to one ApexOps project
 * (spec X12). P4 writes them through the connect-by-URL flow; P3 only reads.
 *
 * Kept in `chrome.storage.local`, which web pages cannot read. The ingest key
 * is public by design (project-workspaces D4), but it still never goes to the
 * page: the page-side capture sends events with an empty key and the service
 * worker fills it in from here.
 */
export interface Binding {
    /** API origin, no trailing slash, e.g. `http://localhost:3013`. */
    apiUrl: string;
    slug: string;
    projectId: number;
    name: string;
    ingestKey: string;
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

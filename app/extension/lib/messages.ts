import type { IngestProblem } from './ingestProblems';
import type { Whoami } from './session';

/**
 * What the popup (and later the toolbar panel) may ask the service worker for.
 *
 * Pages never call the API themselves: the worker is the single owner of the
 * session and of refresh (spec X2), and these messages are the whole surface.
 * Requests are accepted only from the extension's own pages (`background.ts`);
 * a content script, and therefore any web page, cannot send them.
 */
export type Request =
    | { type: 'status' }
    | { type: 'discover'; projectUrl: string }
    | {
          type: 'connect';
          projectUrl: string;
          siteOrigin: string;
          /** The tab to start capturing in straight away, so no reload is needed. */
          tabId?: number;
          /** Present when the person is signing in as part of connecting. */
          credentials?: { email: string; password: string };
      }
    | { type: 'disconnect'; siteOrigin: string }
    | { type: 'logout' };

/** A binding as the popup sees it: everything but the key. */
export interface BindingView {
    name: string;
    slug: string;
    apiUrl: string;
    appOrigin?: string;
}

export interface Status {
    version: string;
    /** This extension's own origin, for a project's origin allowlist (spec R6). */
    extensionOrigin: string;
    session: Whoami;
    bindings: Record<string, BindingView>;
    problems: Record<string, IngestProblem>;
}

export interface DiscoverResult {
    appOrigin: string;
    slug: string;
    apiUrl: string;
    apiOrigin: string;
    /** Whether the person is already signed in to this API (so no password is needed). */
    signedInHere: boolean;
    /** The API they are signed in to instead, if a different one. */
    signedInElsewhere: string | null;
}

export type Reply<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export async function send<T>(request: Request): Promise<Reply<T>> {
    return (await browser.runtime.sendMessage(request)) as Reply<T>;
}

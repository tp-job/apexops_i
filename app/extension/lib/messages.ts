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
    /** Sites whose toolbar the person hid; the popup offers to show it again. */
    hiddenToolbars: string[];
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

/**
 * What the toolbar's panel (the extension-origin iframe on the site under test)
 * may ask for. A narrower set than the popup's, on purpose:
 *
 * - **No site in any request.** The worker reads which site the panel is on from
 *   the browser's record of the sender's tab, so the page it is embedded in
 *   cannot point it at another site's binding.
 * - **Nothing that cannot be undone** — no disconnect, no sign-out (spec R18: a
 *   page can lay a transparent element over the panel and borrow a click). Those
 *   stay in the popup, which no page can cover.
 */
export type PanelRequest =
    | { type: 'panel-state' }
    | { type: 'panel-issues' }
    | { type: 'panel-projects' }
    | { type: 'panel-switch'; slug: string }
    | { type: 'panel-report'; title: string; description: string; priority: string }
    | { type: 'panel-signin'; email: string; password: string };

export type PanelState =
    | { bound: false }
    | {
          bound: true;
          site: string;
          project: { name: string; slug: string; appOrigin: string | null };
          /** `host:port` of the API — shown before a password is typed (R19). */
          apiHost: string;
          session: Whoami;
          /** Signed in, but to a different API than this site's project lives on. */
          otherServer: boolean;
          eventsFromTab: number;
          problem: string | null;
      };

export interface PanelIssue {
    id: number;
    title: string;
    level: string;
    count: number;
    lastSeen: string;
    url: string | null;
}

export interface PanelProject {
    slug: string;
    name: string;
}

export interface ReportResult {
    /** The ticket's display id, e.g. `TICK-042`. */
    id: string;
    /** Where to see it in the web app, when the web app is known. */
    url: string | null;
}

export type Reply<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export async function send<T>(request: Request | PanelRequest): Promise<Reply<T>> {
    return (await browser.runtime.sendMessage(request)) as Reply<T>;
}

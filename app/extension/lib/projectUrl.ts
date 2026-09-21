/**
 * The URL a person pastes to say "this project": a page of the ApexOps web app,
 * e.g. `http://localhost:5173/p/checkout-web/issues` (spec X11/X12).
 *
 * Only two things are taken from it — the app's origin and the project slug
 * (`/p/:slug/...`, see `AppRoutes.tsx`). Everything else is discarded, including
 * query and fragment: a pasted link can carry anything.
 */

export interface ProjectUrl {
    /** Origin of the web app, no trailing slash. */
    appOrigin: string;
    slug: string;
}

export type ProjectUrlError = 'empty' | 'malformed' | 'scheme' | 'credentials' | 'no-project';

export class ProjectUrlProblem extends Error {
    code: ProjectUrlError;
    constructor(code: ProjectUrlError, message: string) {
        super(message);
        this.name = 'ProjectUrlProblem';
        this.code = code;
    }
}

/** What `slugify` produces server-side: lowercase alphanumerics joined by single hyphens. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseProjectUrl(input: string): ProjectUrl {
    const text = input.trim();
    if (!text) throw new ProjectUrlProblem('empty', 'Paste the project URL from ApexOps.');

    let url: URL;
    try {
        url = new URL(text);
    } catch {
        throw new ProjectUrlProblem('malformed', 'That is not a full URL. Copy it from the address bar, including http(s)://.');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new ProjectUrlProblem('scheme', 'Only http and https URLs can be an ApexOps project.');
    }
    // `https://apexops.example@evil.test/p/x` reads as apexops.example to a person
    // and connects to evil.test. There is no honest reason for credentials here.
    if (url.username || url.password) {
        throw new ProjectUrlProblem('credentials', 'A project URL cannot contain a username or password.');
    }

    const segments = url.pathname.split('/').filter(Boolean);
    const slug = segments[0] === 'p' ? segments[1] : undefined;
    if (!slug || !SLUG.test(slug)) {
        throw new ProjectUrlProblem('no-project', 'That URL is not a project page. Open a project in ApexOps and copy its address (it contains /p/<name>).');
    }
    return { appOrigin: url.origin, slug };
}

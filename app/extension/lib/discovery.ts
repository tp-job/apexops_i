import { parseProjectUrl, type ProjectUrl } from './projectUrl';

/**
 * Finding the API from a web app URL (spec X11).
 *
 * The web app publishes `/apexops.json` = `{ app, v, apiUrl }`. Everything the
 * extension does next — the password it will send, the token it will keep —
 * goes to whatever `apiUrl` says, and the file is served by a site the person
 * merely *pasted a link to*. So it is validated as hostile input (spec R19):
 * the shape is checked, and `apiUrl` must be https, or plain http only for a
 * loopback host where nothing crosses a network.
 */

export type DiscoveryError = 'unreachable' | 'not-apexops' | 'bad-api-url' | 'insecure-api-url';

export class DiscoveryProblem extends Error {
    code: DiscoveryError;
    constructor(code: DiscoveryError, message: string) {
        super(message);
        this.name = 'DiscoveryProblem';
        this.code = code;
    }
}

export interface Discovered extends ProjectUrl {
    /** API base URL, no trailing slash. Passwords and tokens go here. */
    apiUrl: string;
    apiOrigin: string;
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Validate an `apiUrl` string from the discovery file. Throws `DiscoveryProblem`. */
export function checkApiUrl(raw: unknown): { apiUrl: string; apiOrigin: string } {
    if (typeof raw !== 'string') throw new DiscoveryProblem('bad-api-url', 'The site did not say where its API is.');
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new DiscoveryProblem('bad-api-url', 'The site gave an API address that is not a valid URL.');
    }
    if (url.username || url.password || url.search || url.hash) {
        throw new DiscoveryProblem('bad-api-url', 'The site gave an API address with extra parts that are not allowed.');
    }
    const secure = url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK.has(url.hostname));
    if (!secure) {
        throw new DiscoveryProblem(
            'insecure-api-url',
            `The API is at ${url.origin}, which is not https. Your password would cross the network in the clear, so the extension will not connect to it.`
        );
    }
    return { apiUrl: url.href.replace(/\/+$/, ''), apiOrigin: url.origin };
}

/**
 * Fetch and validate `/apexops.json` for a pasted project URL.
 * `fetchImpl` is injectable for tests; in the worker it is the global `fetch`.
 */
export async function discover(input: string, fetchImpl: typeof fetch = fetch): Promise<Discovered> {
    const project = parseProjectUrl(input);

    let doc: unknown;
    try {
        // No credentials, no cookies, no redirects to somewhere else: this file
        // is read from exactly the origin that was pasted.
        const res = await fetchImpl(`${project.appOrigin}/apexops.json`, {
            credentials: 'omit',
            redirect: 'error',
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        doc = await res.json();
    } catch {
        throw new DiscoveryProblem(
            'unreachable',
            `Could not read ${project.appOrigin}/apexops.json. Is the address right, and is it an ApexOps web app that is up to date?`
        );
    }

    const d = doc as { app?: unknown; v?: unknown; apiUrl?: unknown } | null;
    if (!d || typeof d !== 'object' || d.app !== 'apexops' || d.v !== 1) {
        throw new DiscoveryProblem('not-apexops', `${project.appOrigin} does not look like an ApexOps web app.`);
    }
    return { ...project, ...checkApiUrl(d.apiUrl) };
}

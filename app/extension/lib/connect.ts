import { configureApi, fetchWithAuth } from '@apexops/shared/api';
import { getAccessToken } from '@apexops/shared/auth';
import { readBindings, setBinding, type Binding } from './bindings';
import { ensureSession, storedApiUrl } from './session';
import type { Discovered } from './discovery';

/**
 * Turning "this site + this project URL" into a binding (spec X12/X13).
 *
 * The ingest key is never typed or pasted: it comes from `GET /api/projects/:slug`,
 * which answers 404 to anyone who is not a member — so a successful connect is
 * also the proof that the person may use this project.
 */

export type ConnectProblemCode = 'signed-out' | 'other-server' | 'no-access' | 'server' | 'network' | 'bad-site';

export class ConnectProblem extends Error {
    code: ConnectProblemCode;
    constructor(code: ConnectProblemCode, message: string) {
        super(message);
        this.name = 'ConnectProblem';
        this.code = code;
    }
}

/** An origin the extension may capture on: http(s) only, and exactly an origin. */
export function normalizeSiteOrigin(input: unknown): string {
    if (typeof input !== 'string') throw new ConnectProblem('bad-site', 'No site to connect.');
    let url: URL;
    try {
        url = new URL(input);
    } catch {
        throw new ConnectProblem('bad-site', 'That is not a website address.');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new ConnectProblem('bad-site', 'Only http and https sites can be connected.');
    }
    return url.origin;
}

interface ProjectPayload {
    id: number;
    name: string;
    slug: string;
    ingestKey: string;
}

const isProject = (v: unknown): v is ProjectPayload => {
    const p = v as Partial<ProjectPayload> | null;
    return !!p && typeof p.id === 'number' && typeof p.name === 'string' && typeof p.slug === 'string' && typeof p.ingestKey === 'string';
};

/** Fetch a project as the signed-in user. Distinguishes "not yours" from "not signed in". */
async function fetchProject(apiUrl: string, slug: string): Promise<ProjectPayload> {
    await ensureSession();
    if (!getAccessToken()) throw new ConnectProblem('signed-out', 'Sign in first.');
    if ((await storedApiUrl()) !== apiUrl) {
        throw new ConnectProblem('other-server', 'You are signed in to a different server. Sign out first.');
    }
    configureApi({ baseUrl: apiUrl });

    let res: Response;
    try {
        res = await fetchWithAuth(`/api/projects/${encodeURIComponent(slug)}`);
    } catch {
        throw new ConnectProblem('network', `Could not reach ${new URL(apiUrl).host}.`);
    }
    if (res.status === 401) throw new ConnectProblem('signed-out', 'Your session ended. Sign in again.');
    if (res.status === 404) {
        throw new ConnectProblem('no-access', `There is no project “${slug}” that you are a member of.`);
    }
    if (!res.ok) throw new ConnectProblem('server', `The server answered ${res.status}.`);

    const body = await res.json().catch(() => null);
    if (!isProject(body)) throw new ConnectProblem('server', 'The server sent an unexpected project response.');
    return body;
}

/** Bind `siteOrigin` to the discovered project. Must be signed in to `d.apiUrl`. */
export async function connectSite(d: Discovered, siteOrigin: string): Promise<Binding> {
    const origin = normalizeSiteOrigin(siteOrigin);
    const project = await fetchProject(d.apiUrl, d.slug);
    const binding: Binding = {
        apiUrl: d.apiUrl,
        slug: project.slug,
        projectId: project.id,
        name: project.name,
        ingestKey: project.ingestKey,
        appOrigin: d.appOrigin,
    };
    await setBinding(origin, binding);
    return binding;
}

// A rotated key makes every event 401 until the binding learns it. Refetching
// on each rejected batch would hammer the API for a key that is simply wrong
// (revoked membership, archived project), so it happens once a minute at most.
const REFETCH_INTERVAL_MS = 60_000;
const lastRefetch = new Map<string, number>();

export type KeyRefresh = 'changed' | 'same' | 'unavailable';

/**
 * Re-read a bound project's ingest key after the server rejected the old one
 * (spec X13). `unavailable` covers every reason it could not be answered —
 * signed out, another server, throttled, offline — and none of them is an error
 * worth surfacing beyond "events are being refused".
 */
export async function refreshBindingKey(origin: string, now: number = Date.now()): Promise<KeyRefresh> {
    const binding = (await readBindings())[origin];
    if (!binding) return 'unavailable';
    if (now - (lastRefetch.get(origin) ?? -Infinity) < REFETCH_INTERVAL_MS) return 'unavailable';
    lastRefetch.set(origin, now);

    try {
        const project = await fetchProject(binding.apiUrl, binding.slug);
        if (project.ingestKey === binding.ingestKey) return 'same';
        await setBinding(origin, { ...binding, ingestKey: project.ingestKey, name: project.name });
        return 'changed';
    } catch {
        return 'unavailable';
    }
}

/** Test seam. */
export function __resetRefetchForTests(): void {
    lastRefetch.clear();
}

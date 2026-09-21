import { getAccessToken } from '@apexops/shared/auth';
import { readBindings, removeBinding, type Bindings } from './bindings';
import { ConnectProblem, connectSite, normalizeSiteOrigin } from './connect';
import { discover, DiscoveryProblem, type Discovered } from './discovery';
import { injectIntoTab } from './inject';
import { readIngestProblems } from './ingestProblems';
import type { BindingView, DiscoverResult, Reply, Request, Status } from './messages';
import { ProjectUrlProblem } from './projectUrl';
import { ensureSession, login, logout, SessionProblem, storedApiUrl, whoami } from './session';

/**
 * Every request the popup can make, answered.
 *
 * Kept out of `background.ts` so it can be driven with a fake `browser` and a
 * fake `fetch`. The error contract is deliberate: anything that is *expected*
 * (wrong password, not a member, an insecure API) comes back as a `Reply` with a
 * code and a sentence a person can act on; only genuine surprises reject.
 */

export interface RequestContext {
    version: string;
    extensionOrigin: string;
}

const fail = (code: string, message: string): Reply<never> => ({ ok: false, error: { code, message } });

/** Map the typed problems onto replies; rethrow anything else. */
function toReply(err: unknown): Reply<never> {
    if (
        err instanceof ProjectUrlProblem ||
        err instanceof DiscoveryProblem ||
        err instanceof SessionProblem ||
        err instanceof ConnectProblem
    ) {
        return fail(err.code, err.message);
    }
    throw err;
}

const viewOf = (bindings: Bindings): Record<string, BindingView> =>
    Object.fromEntries(
        Object.entries(bindings).map(([origin, b]) => [
            origin,
            // The ingest key stays in the worker; the popup has no use for it.
            { name: b.name, slug: b.slug, apiUrl: b.apiUrl, appOrigin: b.appOrigin },
        ])
    );

async function discoverResult(d: Discovered): Promise<DiscoverResult> {
    await ensureSession();
    const current = await storedApiUrl();
    // Local knowledge only. This runs before the API's host permission has been
    // asked for, so a network check here would fail for the wrong reason.
    const signedIn = current !== null && !!getAccessToken();
    return {
        appOrigin: d.appOrigin,
        slug: d.slug,
        apiUrl: d.apiUrl,
        apiOrigin: d.apiOrigin,
        signedInHere: signedIn && current === d.apiUrl,
        signedInElsewhere: signedIn && current !== d.apiUrl ? current : null,
    };
}

export async function handleRequest(req: Request, ctx: RequestContext): Promise<Reply<unknown>> {
    try {
        switch (req.type) {
            case 'status': {
                const [session, bindings, problems] = await Promise.all([whoami(), readBindings(), readIngestProblems()]);
                const status: Status = {
                    version: ctx.version,
                    extensionOrigin: ctx.extensionOrigin,
                    session,
                    bindings: viewOf(bindings),
                    problems,
                };
                return { ok: true, data: status };
            }

            case 'discover':
                return { ok: true, data: await discoverResult(await discover(req.projectUrl)) };

            case 'connect': {
                const siteOrigin = normalizeSiteOrigin(req.siteOrigin);
                // Re-derived here rather than trusting what the popup showed: the
                // API a password goes to is decided in exactly one place.
                const d = await discover(req.projectUrl);
                if (req.credentials) {
                    await login(d.apiUrl, req.credentials.email, req.credentials.password, ctx.version);
                }
                const binding = await connectSite(d, siteOrigin);
                // Capture the tab that is open right now; registered scripts
                // only run on the next navigation.
                const injected = typeof req.tabId === 'number' ? await injectIntoTab(req.tabId, siteOrigin) : 'skipped';
                return { ok: true, data: { siteOrigin, name: binding.name, slug: binding.slug, capturing: injected === 'injected' } };
            }

            case 'disconnect':
                await removeBinding(normalizeSiteOrigin(req.siteOrigin));
                return { ok: true, data: null };

            case 'logout':
                await logout();
                return { ok: true, data: null };

            default:
                return fail('unknown-request', 'The extension does not understand that request.');
        }
    } catch (err) {
        return toReply(err);
    }
}

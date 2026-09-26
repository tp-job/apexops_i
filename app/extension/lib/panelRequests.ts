import { configureApi, fetchWithAuth } from '@apexops/shared/api';
import { getAccessToken } from '@apexops/shared/auth';
import { readBindings, type Binding } from './bindings';
import { ConnectProblem, connectSite } from './connect';
import { readIngestProblems } from './ingestProblems';
import type { PanelIssue, PanelProject, PanelRequest, PanelState, Reply, ReportResult } from './messages';
import { fail, toReply } from './requests';
import { stripUrl } from './sanitize';
import { ensureSession, login, storedApiUrl, whoami } from './session';
import { eventsFromTab } from './tabCounts';

/**
 * Every request the toolbar panel can make, answered (spec 8.5 P5, 9.4 P5a).
 *
 * The panel is an extension page inside an iframe on the site under test. What
 * it is *for* — which site, which page, which tab — comes from `PanelContext`,
 * which `background.ts` builds from the browser's record of the sender, never
 * from the message. So the page the panel sits in can neither choose the
 * project it writes to nor put words in the "Page:" line of a ticket.
 */

export interface PanelContext {
    version: string;
    tabId: number;
    /** The tab's full URL as the browser reports it; `null` if not readable (no access to the site). */
    tabUrl: string | null;
    tabTitle: string;
}

const siteOf = (ctx: PanelContext): string | null => {
    if (!ctx.tabUrl) return null;
    try {
        const url = new URL(ctx.tabUrl);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null;
    } catch {
        return null;
    }
};

const appLink = (b: Binding, path: string): string | null => (b.appOrigin ? `${b.appOrigin}/p/${encodeURIComponent(b.slug)}${path}` : null);

const LEVELS = new Set(['low', 'medium', 'high', 'critical']);
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 20_000;

/** Signed in to this binding's API, with the client pointed at it. Throws `ConnectProblem`. */
async function useApiOf(b: Binding): Promise<void> {
    await ensureSession();
    if (!getAccessToken()) throw new ConnectProblem('signed-out', 'Sign in to see this project.');
    if ((await storedApiUrl()) !== b.apiUrl) {
        throw new ConnectProblem('other-server', `You are signed in to a different server. Sign out from the extension menu, then sign in to ${new URL(b.apiUrl).host}.`);
    }
    configureApi({ baseUrl: b.apiUrl });
}

async function call(b: Binding, path: string, init: Parameters<typeof fetchWithAuth>[1] = {}): Promise<Response> {
    await useApiOf(b);
    let res: Response;
    try {
        res = await fetchWithAuth(path, init);
    } catch {
        throw new ConnectProblem('network', `Could not reach ${new URL(b.apiUrl).host}.`);
    }
    if (res.status === 401) throw new ConnectProblem('signed-out', 'Your session ended. Sign in again.');
    if (res.status === 404) throw new ConnectProblem('no-access', `You are no longer a member of “${b.name}”.`);
    return res;
}

async function state(ctx: PanelContext, site: string, b: Binding): Promise<PanelState> {
    const [session, problems, events, current] = await Promise.all([whoami(), readIngestProblems(), eventsFromTab(ctx.tabId), storedApiUrl()]);
    return {
        bound: true,
        site,
        project: { name: b.name, slug: b.slug, appOrigin: b.appOrigin ?? null },
        apiHost: new URL(b.apiUrl).host,
        session,
        otherServer: session.signedIn && current !== b.apiUrl,
        eventsFromTab: events,
        problem: problems[site]?.message ?? null,
    };
}

async function issues(b: Binding): Promise<PanelIssue[]> {
    const res = await call(b, `/api/projects/${encodeURIComponent(b.slug)}/issues?status=unresolved&since=24&limit=10`);
    if (!res.ok) throw new ConnectProblem('server', `The server answered ${res.status}.`);
    const body = (await res.json().catch(() => null)) as { issues?: unknown } | null;
    const list = Array.isArray(body?.issues) ? body.issues : [];
    return list.flatMap((raw): PanelIssue[] => {
        const i = raw as Partial<PanelIssue> | null;
        if (!i || typeof i.id !== 'number' || typeof i.title !== 'string') return [];
        return [
            {
                id: i.id,
                title: i.title,
                level: typeof i.level === 'string' ? i.level : 'error',
                count: typeof i.count === 'number' ? i.count : 1,
                lastSeen: typeof i.lastSeen === 'string' ? i.lastSeen : '',
                url: appLink(b, `/issues/${i.id}`),
            },
        ];
    });
}

async function projects(b: Binding): Promise<PanelProject[]> {
    const res = await call(b, '/api/projects');
    if (!res.ok) throw new ConnectProblem('server', `The server answered ${res.status}.`);
    const body = (await res.json().catch(() => null)) as unknown;
    // Answered as a bare array on some deploys and `{ projects }` on others.
    const list = Array.isArray(body) ? body : Array.isArray((body as { projects?: unknown })?.projects) ? (body as { projects: unknown[] }).projects : [];
    return list.flatMap((raw): PanelProject[] => {
        const p = raw as { slug?: unknown; name?: unknown; archivedAt?: unknown } | null;
        if (!p || typeof p.slug !== 'string' || typeof p.name !== 'string' || p.archivedAt) return [];
        return [{ slug: p.slug, name: p.name }];
    });
}

async function report(ctx: PanelContext, b: Binding, req: Extract<PanelRequest, { type: 'panel-report' }>): Promise<ReportResult> {
    const title = req.title.trim().slice(0, MAX_TITLE);
    const text = typeof req.description === 'string' ? req.description.trim().slice(0, MAX_DESCRIPTION) : '';
    const priority = LEVELS.has(req.priority) ? req.priority : 'medium';

    // The page line comes from the browser, not the panel, and loses its query
    // and fragment like every URL the extension sends (spec X5).
    const where = [ctx.tabUrl ? `Page: ${stripUrl(ctx.tabUrl)}` : null, ctx.tabTitle ? `Tab title: ${ctx.tabTitle}` : null, `Reported from the ApexOps extension ${ctx.version}`]
        .filter(Boolean)
        .join('\n');
    const description = text ? `${text}\n\n---\n${where}` : where;

    const res = await call(b, '/api/tickets', {
        method: 'POST',
        json: true,
        body: { projectId: b.projectId, title, description, priority, tags: ['extension'] } as unknown as BodyInit,
    });
    if (res.status === 403) throw new ConnectProblem('no-access', 'Your role in this project cannot create tickets.');
    if (!res.ok) throw new ConnectProblem('server', `The server answered ${res.status}.`);
    const ticket = (await res.json().catch(() => null)) as { id?: unknown } | null;
    if (!ticket || (typeof ticket.id !== 'string' && typeof ticket.id !== 'number')) throw new ConnectProblem('server', 'The server sent an unexpected ticket response.');
    return { id: String(ticket.id), url: appLink(b, '/board') };
}

export async function handlePanelRequest(req: PanelRequest, ctx: PanelContext): Promise<Reply<unknown>> {
    try {
        const site = siteOf(ctx);
        const b = site ? (await readBindings())[site] : undefined;
        if (!site || !b) {
            return req.type === 'panel-state' ? { ok: true, data: { bound: false } satisfies PanelState } : fail('not-bound', 'This site is not connected to a project.');
        }

        switch (req.type) {
            case 'panel-state':
                return { ok: true, data: await state(ctx, site, b) };

            case 'panel-issues':
                return { ok: true, data: await issues(b) };

            case 'panel-projects':
                return { ok: true, data: await projects(b) };

            case 'panel-switch': {
                if (typeof req.slug !== 'string' || !/^[a-z0-9-]{1,100}$/.test(req.slug)) return fail('bad-project', 'That is not a project.');
                // Same server, same web app: only the project changes. `connectSite`
                // re-reads it as the signed-in user, so a project they are not a
                // member of is refused exactly as it is when connecting.
                // An empty appOrigin (a binding written before P4) stays falsy, so
                // links are simply not offered rather than pointing nowhere.
                await useApiOf(b);
                const next = await connectSite({ appOrigin: b.appOrigin ?? '', slug: req.slug, apiUrl: b.apiUrl, apiOrigin: new URL(b.apiUrl).origin }, site);
                return { ok: true, data: { name: next.name, slug: next.slug } };
            }

            case 'panel-report':
                if (typeof req.title !== 'string' || !req.title.trim()) return fail('bad-report', 'Give the bug a title.');
                return { ok: true, data: await report(ctx, b, req) };

            case 'panel-signin': {
                if (typeof req.email !== 'string' || typeof req.password !== 'string' || !req.email.trim() || !req.password) {
                    return fail('bad-credentials', 'Enter your email and password.');
                }
                // The API is this site's binding's, which the connect flow checked
                // (R19) — never an address that came with the message.
                await login(b.apiUrl, req.email.trim(), req.password, ctx.version);
                return { ok: true, data: null };
            }

            default:
                return fail('unknown-request', 'The extension does not understand that request.');
        }
    } catch (err) {
        return toReply(err);
    }
}

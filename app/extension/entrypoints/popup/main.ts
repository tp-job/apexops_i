import './style.css';
import type { DiscoverResult, Status } from '@/lib/messages';
import { send } from '@/lib/messages';
import { parseProjectUrl, ProjectUrlProblem } from '@/lib/projectUrl';

/**
 * The popup (spec X15/X16): who you are, which project this site is bound to,
 * and the flow that binds it. The day-to-day toolbar arrives in P5; this is the
 * page that gets a site connected in the first place.
 *
 * Everything here is text set with `textContent`, never `innerHTML`: project
 * names, servers' error messages and site origins are all outside input.
 *
 * The popup never calls the API. Every fact comes from the service worker over
 * messages (`lib/messages.ts`), because the worker is the one owner of the
 * session (spec X2). What the popup owns is the part that needs a person:
 * asking the browser for site access, which only works from a click.
 */

const app = document.getElementById('app')!;

type Child = Node | string | null | false | undefined | Child[];

function h<K extends keyof HTMLElementTagNameMap>(
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
function add(parent: ParentNode, children: readonly Child[]): void {
    for (const c of children) {
        if (!c) continue;
        if (Array.isArray(c)) add(parent, c);
        else parent.append(c as Node | string);
    }
}

const host = (url: string): string => {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
};

// ── state ────────────────────────────────────────────────────

interface Draft {
    site: string;
    projectUrl: string;
}

let status: Status | null = null;
let site: string | null = null;
/** The tab `site` came from, so connecting can start capturing it without a reload. */
let siteTabId: number | null = null;
let discovered: DiscoverResult | null = null;
let projectUrlText = '';
let message: { kind: 'error' | 'ok'; text: string } | null = null;
let busy = false;

const DRAFT_KEY = 'popupDraft';

async function currentSite(): Promise<void> {
    // The most recently used web tab of this window. From the real popup that is
    // the tab the icon was clicked on (`activeTab` makes its URL readable).
    const tabs = await browser.tabs.query({ currentWindow: true });
    const web = tabs
        .filter((t) => t.url && /^https?:\/\//.test(t.url))
        .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
    site = web?.url ? new URL(web.url).origin : null;
    siteTabId = web?.id ?? null;
}

async function refresh(): Promise<void> {
    const reply = await send<Status>({ type: 'status' });
    if (reply.ok) status = reply.data;
    else message = { kind: 'error', text: reply.error.message };
    await currentSite();
}

// The browser can close the popup when it shows a permission prompt. A draft in
// session storage lets the reopened popup carry on from the same URL instead of
// asking for it again.
async function saveDraft(draft: Draft | null): Promise<void> {
    if (draft) await browser.storage.session.set({ [DRAFT_KEY]: draft });
    else await browser.storage.session.remove(DRAFT_KEY);
}

async function loadDraft(): Promise<Draft | null> {
    const d = (await browser.storage.session.get(DRAFT_KEY))[DRAFT_KEY] as Draft | undefined;
    return d && typeof d.site === 'string' && typeof d.projectUrl === 'string' ? d : null;
}

// ── actions ──────────────────────────────────────────────────

async function withBusy(fn: () => Promise<void>): Promise<void> {
    busy = true;
    message = null;
    render();
    try {
        await fn();
    } catch (err) {
        message = { kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' };
    } finally {
        busy = false;
        render();
    }
}

/** Step 1: read the pasted URL, get access to that web app, find its API. */
function continueWithUrl(text: string): Promise<void> {
    projectUrlText = text;
    let appOrigin: string;
    try {
        appOrigin = parseProjectUrl(text).appOrigin;
    } catch (err) {
        message = { kind: 'error', text: err instanceof ProjectUrlProblem ? err.message : 'That URL cannot be used.' };
        render();
        return Promise.resolve();
    }
    return withBusy(async () => {
        // Try without asking for anything first: an ApexOps web app serves
        // /apexops.json cross-origin, so the common case needs no prompt at all.
        let reply = await send<DiscoverResult>({ type: 'discover', projectUrl: text });

        if (!reply.ok && reply.error.code === 'unreachable') {
            // It may be there but unreadable from here. Asking for access to that
            // site is the one thing that can change the answer.
            if (site) await saveDraft({ site, projectUrl: text });
            const granted = await browser.permissions.request({ origins: [`${appOrigin}/*`] });
            if (!granted) throw new Error(`Access to ${host(appOrigin)} was declined, so its API cannot be found.`);
            reply = await send<DiscoverResult>({ type: 'discover', projectUrl: text });
        }

        if (!reply.ok) throw new Error(reply.error.message);
        if (site) await saveDraft({ site, projectUrl: text });
        discovered = reply.data;
    });
}

/** Step 2: sign in if needed, get access to the API and this site, bind. */
function connect(email: string, password: string): Promise<void> {
    const d = discovered;
    const siteOrigin = site;
    if (!d || !siteOrigin) return Promise.resolve();
    if (!d.signedInHere && (!email.trim() || !password)) {
        message = { kind: 'error', text: 'Enter your email and password.' };
        render();
        return Promise.resolve();
    }
    return withBusy(async () => {
        const granted = await browser.permissions.request({ origins: [`${d.apiOrigin}/*`, `${siteOrigin}/*`] });
        if (!granted) throw new Error('Access was declined. The extension needs it to send errors from this site to your server.');

        const reply = await send<{ name: string; capturing: boolean }>({
            type: 'connect',
            projectUrl: projectUrlText,
            siteOrigin,
            ...(siteTabId !== null && { tabId: siteTabId }),
            credentials: d.signedInHere ? undefined : { email, password },
        });
        if (!reply.ok) throw new Error(reply.error.message);

        discovered = null;
        projectUrlText = '';
        await saveDraft(null);
        await refresh();
        message = {
            kind: 'ok',
            text: reply.data.capturing
                ? `Connected to ${reply.data.name}. This site is being captured now.`
                : `Connected to ${reply.data.name}. Reload the site to start capturing.`,
        };
    });
}

function disconnect(origin: string): Promise<void> {
    return withBusy(async () => {
        const reply = await send<null>({ type: 'disconnect', siteOrigin: origin });
        if (!reply.ok) throw new Error(reply.error.message);
        // Give the browser its access back. Not every grant can be removed (a
        // build with fixed host permissions keeps them) and that is fine.
        await browser.permissions.remove({ origins: [`${origin}/*`] }).catch(() => false);
        await refresh();
    });
}

function signOut(): Promise<void> {
    return withBusy(async () => {
        await send<null>({ type: 'logout' });
        await refresh();
    });
}

// ── views ────────────────────────────────────────────────────

function accountView(s: Status): HTMLElement {
    const who = s.session;
    if (!who.signedIn) {
        return h('section', {}, h('h2', {}, 'Account'), h('p', { class: 'muted' }, 'Not signed in. You will sign in when you connect a site.'));
    }
    return h(
        'section',
        {},
        h('h2', {}, 'Account'),
        h('p', {}, h('strong', {}, who.user.email)),
        h('p', { class: 'muted small' }, `on ${host(who.apiUrl)}`, who.offline ? ' · could not reach the server just now' : ''),
        h('p', { class: 'muted small' }, 'Sites you have connected keep capturing after you sign out; disconnect a site to stop it.'),
        h('div', { class: 'row' }, h('button', { type: 'button', disabled: busy, onclick: () => void signOut() }, 'Sign out'))
    );
}

function boundView(s: Status, origin: string): HTMLElement {
    const b = s.bindings[origin]!;
    const problem = s.problems[origin];
    const open = b.appOrigin ? `${b.appOrigin}/p/${encodeURIComponent(b.slug)}/issues` : null;
    return h(
        'section',
        {},
        h('h2', {}, 'This site'),
        h('p', { class: 'mono' }, host(origin)),
        h('p', {}, 'Sending errors to ', h('strong', {}, b.name), open ? [' · ', h('a', { href: open, target: '_blank', rel: 'noopener' }, 'open project')] : null),
        problem ? h('p', { class: 'error', role: 'alert' }, problem.message) : null,
        h('div', { class: 'row' }, h('button', { type: 'button', disabled: busy, onclick: () => void disconnect(origin) }, 'Disconnect this site'))
    );
}

function connectView(origin: string): HTMLElement {
    const d = discovered;

    if (!d) {
        const input = h('input', { id: 'project-url', type: 'url', name: 'projectUrl', value: projectUrlText, placeholder: 'http://localhost:5173/p/my-project', autocomplete: 'off', spellcheck: false, 'aria-required': 'true' });
        return h(
            'section',
            {},
            h('h2', {}, 'This site'),
            h('p', { class: 'mono' }, host(origin)),
            h('p', { class: 'muted' }, 'Not connected. Paste the address of a project page from ApexOps to send this site’s errors to it.'),
            h(
                'form',
                {
                    // Our own messages, not the browser's silent "please enter a URL"
                    // bubble, which never reaches a screen reader or a test.
                    noValidate: true,
                    onsubmit: (e: Event) => {
                        e.preventDefault();
                        void continueWithUrl(input.value);
                    },
                },
                h('label', { for: 'project-url' }, 'Project URL'),
                input,
                h('div', { class: 'row' }, h('button', { class: 'primary', type: 'submit', disabled: busy }, busy ? 'Working…' : 'Continue'))
            )
        );
    }

    const email = h('input', { id: 'email', type: 'email', name: 'email', autocomplete: 'username', 'aria-required': 'true' });
    const password = h('input', { id: 'password', type: 'password', name: 'password', autocomplete: 'current-password', 'aria-required': 'true' });
    const elsewhere = d.signedInElsewhere !== null;

    return h(
        'section',
        {},
        h('h2', {}, 'Connect this site'),
        h('p', {}, `“${host(origin)}” will send its errors to project `, h('strong', {}, d.slug), '.'),
        h('p', { class: 'muted small' }, d.signedInHere ? 'You are signed in to:' : 'Your email and password will be sent to:'),
        h('span', { class: 'host' }, host(d.apiUrl)),
        elsewhere
            ? h('p', { class: 'error', role: 'alert' }, `You are signed in to ${host(d.signedInElsewhere!)}. Sign out first to use ${host(d.apiUrl)}.`)
            : null,
        h(
            'form',
            {
                noValidate: true,
                onsubmit: (e: Event) => {
                    e.preventDefault();
                    void connect(email.value, password.value);
                },
            },
            d.signedInHere || elsewhere
                ? null
                : [h('label', { for: 'email' }, 'Email'), email, h('label', { for: 'password' }, 'Password'), password],
            h(
                'div',
                { class: 'row' },
                h('button', { class: 'primary', type: 'submit', disabled: busy || elsewhere }, busy ? 'Working…' : d.signedInHere ? 'Connect' : 'Sign in and connect'),
                h(
                    'button',
                    {
                        type: 'button',
                        disabled: busy,
                        onclick: () => {
                            discovered = null;
                            void saveDraft(null);
                            render();
                        },
                    },
                    'Back'
                )
            )
        )
    );
}

function noSiteView(): HTMLElement {
    return h('section', {}, h('h2', {}, 'This site'), h('p', { class: 'muted' }, 'Open the website you want to test, then click the ApexOps icon again.'));
}

function othersView(s: Status, current: string | null): HTMLElement | null {
    const others = Object.entries(s.bindings).filter(([origin]) => origin !== current);
    if (!others.length) return null;
    return h(
        'section',
        {},
        h('h2', {}, 'Other connected sites'),
        h(
            'ul',
            {},
            ...others.map(([origin, b]) =>
                h(
                    'li',
                    { class: 'row between', style: 'margin-top:0' },
                    h('span', {}, h('span', { class: 'mono' }, host(origin)), h('br'), h('span', { class: 'muted small' }, `→ ${b.name}`)),
                    h('button', { type: 'button', disabled: busy, 'aria-label': `Disconnect ${host(origin)}`, onclick: () => void disconnect(origin) }, 'Disconnect')
                )
            )
        )
    );
}

function footerView(s: Status): HTMLElement {
    return h(
        'section',
        {},
        h('h2', {}, 'This extension'),
        h('p', { class: 'muted small' }, 'If a project only accepts listed origins, add this to its allowed origins:'),
        h('p', {}, h('code', { id: 'extension-origin' }, s.extensionOrigin))
    );
}

function render(): void {
    const s = status;
    app.setAttribute('aria-busy', String(busy || !s));
    app.replaceChildren();
    if (!s) return;

    const isBound = !!site && !!s.bindings[site];
    add(app, [
        h('header', {}, h('h1', {}, 'ApexOps'), h('span', { class: 'muted small' }, `v${s.version}`)),
        message ? h('p', { class: message.kind, role: message.kind === 'error' ? 'alert' : 'status' }, message.text) : null,
        site ? (isBound ? boundView(s, site) : connectView(site)) : noSiteView(),
        accountView(s),
        othersView(s, site),
        footerView(s),
    ]);
}

// ── start ────────────────────────────────────────────────────

void (async () => {
    await refresh();
    const draft = await loadDraft();
    // `status` and `site` are set by `refresh` above; TypeScript cannot see
    // that through the async call, so it is re-read through a widening.
    const loaded = status as Status | null;
    if (draft && site === draft.site && !(loaded && site && loaded.bindings[site])) {
        projectUrlText = draft.projectUrl;
        // Already granted (the prompt that closed the popup was answered): pick up where it stopped.
        try {
            const { appOrigin } = parseProjectUrl(draft.projectUrl);
            if (await browser.permissions.contains({ origins: [`${appOrigin}/*`] })) {
                const reply = await send<DiscoverResult>({ type: 'discover', projectUrl: draft.projectUrl });
                if (reply.ok) discovered = reply.data;
            }
        } catch {
            /* a stale or bad draft is just a blank form */
        }
    }
    render();
})();

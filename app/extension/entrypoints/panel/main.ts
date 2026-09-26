import '@/assets/ui.css';
import { add, h } from '@/lib/dom';
import type { PanelIssue, PanelProject, PanelRequest, PanelState, Reply, ReportResult } from '@/lib/messages';
import { send } from '@/lib/messages';
import { isHostUiMessage, PANEL_MESSAGE_TAG, type PanelUiAction } from '@/lib/toolbarChannel';

/**
 * The toolbar's panel: an extension page inside an iframe on the site under
 * test (spec X10, 9.4 P5a). Everything ApexOps shows on that site is here, and
 * only here, because the page cannot read an extension-origin frame.
 *
 * Like the popup, it never calls the API: it asks the worker (`panel-*`
 * requests), and the worker decides which site it is on from the browser, not
 * from anything this page says. It never posts data to the page either — only
 * "close" and "hide", which the page may see and is welcome to.
 */

const app = document.getElementById('app')!;

let state: PanelState | null = null;
let message: { kind: 'error' | 'ok'; text: string; link?: { href: string; label: string } } | null = null;
let busy = false;
let issues: PanelIssue[] | 'loading' | { error: string } = 'loading';
let projects: PanelProject[] | null = null;
let switching = false;

// Form values survive re-renders; the DOM is rebuilt, what was typed is not lost.
const draft = { title: '', description: '', priority: 'medium', email: '' };

const request = <T>(req: PanelRequest): Promise<Reply<T>> => send<T>(req);

function tellPage(action: PanelUiAction): void {
    // targetOrigin '*' because the page's origin is not ours to know here — and
    // there is nothing in the message to protect: a tag and a verb.
    window.parent.postMessage({ tag: PANEL_MESSAGE_TAG, action }, '*');
}

async function loadState(): Promise<void> {
    const reply = await request<PanelState>({ type: 'panel-state' });
    if (reply.ok) state = reply.data;
    else message = { kind: 'error', text: reply.error.message };
}

async function loadIssues(): Promise<void> {
    issues = 'loading';
    renderIssues();
    const reply = await request<PanelIssue[]>({ type: 'panel-issues' });
    issues = reply.ok ? reply.data : { error: reply.error.message };
    renderIssues();
}

const signedIn = (s: PanelState): boolean => s.bound && s.session.signedIn && !s.otherServer;

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

// ── actions ──────────────────────────────────────────────────

function report(): Promise<void> {
    if (!draft.title.trim()) {
        message = { kind: 'error', text: 'Give the bug a title.' };
        render();
        return Promise.resolve();
    }
    return withBusy(async () => {
        const reply = await request<ReportResult>({ type: 'panel-report', title: draft.title, description: draft.description, priority: draft.priority });
        if (!reply.ok) throw new Error(reply.error.message);
        draft.title = '';
        draft.description = '';
        draft.priority = 'medium';
        message = { kind: 'ok', text: `Ticket ${reply.data.id} created.`, link: reply.data.url ? { href: reply.data.url, label: 'Open the board' } : undefined };
    });
}

function signIn(password: string): Promise<void> {
    return withBusy(async () => {
        const reply = await request<null>({ type: 'panel-signin', email: draft.email, password });
        if (!reply.ok) throw new Error(reply.error.message);
        await loadState();
        void loadIssues();
    });
}

function startSwitch(): Promise<void> {
    switching = true;
    return withBusy(async () => {
        const reply = await request<PanelProject[]>({ type: 'panel-projects' });
        if (!reply.ok) {
            switching = false;
            throw new Error(reply.error.message);
        }
        projects = reply.data;
    });
}

function switchTo(slug: string): Promise<void> {
    return withBusy(async () => {
        const reply = await request<{ name: string }>({ type: 'panel-switch', slug });
        if (!reply.ok) throw new Error(reply.error.message);
        switching = false;
        projects = null;
        await loadState();
        message = { kind: 'ok', text: `This site now sends to ${reply.data.name}.` };
        void loadIssues();
    });
}

// ── views ────────────────────────────────────────────────────

const issuesBox = h('div');

function renderIssues(): void {
    const list = issues;
    issuesBox.replaceChildren();
    if (list === 'loading') {
        add(issuesBox, [h('p', { class: 'muted small' }, 'Loading…')]);
        return;
    }
    if (!Array.isArray(list)) {
        add(issuesBox, [h('p', { class: 'error' }, list.error)]);
        return;
    }
    if (!list.length) {
        add(issuesBox, [h('p', { class: 'muted small' }, 'No unresolved issues in the last 24 hours.')]);
        return;
    }
    add(issuesBox, [
        h(
            'ul',
            { class: 'issues' },
            ...list.map((i) =>
                h(
                    'li',
                    {},
                    i.url ? h('a', { href: i.url, target: '_blank', rel: 'noopener', title: i.title }, i.title) : h('span', { title: i.title }, i.title),
                    h('span', { class: 'count', 'aria-label': `${i.count} events` }, `×${i.count}`)
                )
            )
        ),
    ]);
}

function headerView(title: string): HTMLElement {
    return h(
        'header',
        { class: 'panel-head' },
        h('h1', { id: 'panel-title' }, title),
        h('button', { type: 'button', class: 'icon-button', 'aria-label': 'Close panel', title: 'Close (Esc)', onclick: () => tellPage('close') }, '×')
    );
}

function signInView(s: Extract<PanelState, { bound: true }>): HTMLElement {
    if (s.otherServer && s.session.signedIn) {
        return h(
            'section',
            {},
            h('h2', {}, 'Sign in'),
            h('p', { class: 'error', role: 'alert' }, `The extension is signed in to ${new URL(s.session.apiUrl).host}, but this site's project is on ${s.apiHost}.`),
            h('p', { class: 'muted small' }, 'Sign out from the ApexOps extension menu (the toolbar icon), then sign in here.')
        );
    }
    const email = h('input', { id: 'email', type: 'email', name: 'email', autocomplete: 'username', value: draft.email, 'aria-required': 'true', oninput: (e: Event) => (draft.email = (e.target as HTMLInputElement).value) });
    const password = h('input', { id: 'password', type: 'password', name: 'password', autocomplete: 'current-password', 'aria-required': 'true' });
    return h(
        'section',
        {},
        h('h2', {}, 'Sign in'),
        h('p', { class: 'muted small' }, 'Your email and password will be sent to:'),
        h('span', { class: 'host' }, s.apiHost),
        h(
            'form',
            {
                noValidate: true,
                onsubmit: (e: Event) => {
                    e.preventDefault();
                    if (!draft.email.trim() || !password.value) {
                        message = { kind: 'error', text: 'Enter your email and password.' };
                        render();
                        return;
                    }
                    void signIn(password.value);
                },
            },
            h('label', { for: 'email' }, 'Email'),
            email,
            h('label', { for: 'password' }, 'Password'),
            password,
            h('div', { class: 'row' }, h('button', { class: 'primary', type: 'submit', disabled: busy }, busy ? 'Working…' : 'Sign in'))
        )
    );
}

function statusView(s: Extract<PanelState, { bound: true }>): HTMLElement {
    const open = s.project.appOrigin ? `${s.project.appOrigin}/p/${encodeURIComponent(s.project.slug)}/issues` : null;
    return h(
        'section',
        {},
        // The project's name is the panel's heading; this line says what it is doing.
        h('p', {}, 'Capturing this site’s errors', open ? [' · ', h('a', { href: open, target: '_blank', rel: 'noopener' }, 'open in ApexOps')] : null),
        h('p', { class: 'muted small', id: 'events-from-tab' }, `${s.eventsFromTab} ${s.eventsFromTab === 1 ? 'event' : 'events'} sent from this tab`),
        s.problem ? h('p', { class: 'error', role: 'alert' }, s.problem) : null
    );
}

function reportView(): HTMLElement {
    const title = h('input', { id: 'bug-title', type: 'text', name: 'title', value: draft.title, maxLength: 200, 'aria-required': 'true', autocomplete: 'off', oninput: (e: Event) => (draft.title = (e.target as HTMLInputElement).value) });
    const description = h('textarea', { id: 'bug-description', name: 'description', oninput: (e: Event) => (draft.description = (e.target as HTMLTextAreaElement).value) });
    description.value = draft.description;
    const priority = h(
        'select',
        { id: 'bug-priority', name: 'priority', onchange: (e: Event) => (draft.priority = (e.target as HTMLSelectElement).value) },
        ...['low', 'medium', 'high', 'critical'].map((p) => h('option', { value: p, selected: p === draft.priority }, p[0]!.toUpperCase() + p.slice(1)))
    );
    return h(
        'section',
        {},
        h('h2', {}, 'Report a bug'),
        h(
            'form',
            {
                noValidate: true,
                onsubmit: (e: Event) => {
                    e.preventDefault();
                    void report();
                },
            },
            h('label', { for: 'bug-title' }, 'Title'),
            title,
            h('label', { for: 'bug-description' }, 'What happened'),
            description,
            h('label', { for: 'bug-priority' }, 'Priority'),
            priority,
            h('p', { class: 'muted small', style: 'margin-top:8px' }, 'The page address (without its query) and the tab title are added for you.'),
            h('div', { class: 'row' }, h('button', { class: 'primary', type: 'submit', disabled: busy }, busy ? 'Working…' : 'Create ticket'))
        )
    );
}

function issuesView(): HTMLElement {
    return h(
        'section',
        {},
        h('div', { class: 'row between', style: 'margin-top:0' }, h('h2', { style: 'margin:0' }, 'Recent issues'), h('button', { type: 'button', class: 'link', onclick: () => void loadIssues() }, 'Refresh')),
        issuesBox
    );
}

function projectView(s: Extract<PanelState, { bound: true }>): HTMLElement {
    if (!switching || !projects) {
        return h(
            'section',
            {},
            h('h2', {}, 'Project'),
            h('p', {}, h('strong', {}, s.project.name)),
            h('div', { class: 'row' }, h('button', { type: 'button', disabled: busy, onclick: () => void startSwitch() }, 'Switch project'))
        );
    }
    const others = projects.filter((p) => p.slug !== s.project.slug);
    const select = h('select', { id: 'switch-project', name: 'project' }, ...others.map((p) => h('option', { value: p.slug }, p.name)));
    return h(
        'section',
        {},
        h('h2', {}, 'Switch project'),
        others.length
            ? [
                  h('label', { for: 'switch-project' }, 'Send this site’s errors to'),
                  select,
                  h(
                      'div',
                      { class: 'row' },
                      h('button', { type: 'button', class: 'primary', disabled: busy, onclick: () => void switchTo(select.value) }, 'Switch'),
                      h('button', { type: 'button', disabled: busy, onclick: () => ((switching = false), render()) }, 'Cancel')
                  ),
              ]
            : [h('p', { class: 'muted' }, 'You are not a member of any other project.'), h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => ((switching = false), render()) }, 'Back'))]
    );
}

function footerView(): HTMLElement {
    return h(
        'section',
        {},
        h('p', { class: 'muted small' }, 'Hidden toolbars come back from the extension menu, or with Alt+Shift+A.'),
        h('div', { class: 'row' }, h('button', { type: 'button', onclick: () => tellPage('hide') }, 'Hide toolbar on this site'))
    );
}

function messageView(): HTMLElement | null {
    if (!message) return null;
    return h(
        'p',
        { class: message.kind, role: message.kind === 'error' ? 'alert' : 'status' },
        message.text,
        message.link ? [' ', h('a', { href: message.link.href, target: '_blank', rel: 'noopener' }, message.link.label)] : null
    );
}

function render(): void {
    const s = state;
    app.setAttribute('aria-busy', String(busy || !s));
    app.replaceChildren();
    if (!s) {
        add(app, [headerView('ApexOps'), messageView()]);
        return;
    }
    if (!s.bound) {
        add(app, [headerView('ApexOps'), h('section', {}, h('p', { class: 'muted' }, 'This site is not connected to a project. Connect it from the ApexOps extension menu.'))]);
        return;
    }
    add(app, [
        headerView(s.project.name),
        messageView(),
        signedIn(s) ? [statusView(s), reportView(), issuesView(), projectView(s)] : [statusView(s), signInView(s)],
        footerView(),
    ]);
}

/** Only the event count moves on its own; refresh it without touching the forms. */
// Whether the panel is on screen, as the toolbar reports it (see HostUiMessage).
let visible = true;

window.addEventListener('message', (e) => {
    // Only the toolbar that framed us. What a forged message could do is pause
    // the event counter or move focus inside this page — nothing more.
    if (e.source !== window.parent || !isHostUiMessage(e.data)) return;
    const wasVisible = visible;
    visible = e.data.visible;
    if (visible && !wasVisible) void tick();
    if (visible && e.data.focus) {
        // Opened from the keyboard: start on the first control, not on nothing.
        (document.querySelector<HTMLElement>('input, textarea, select, button') ?? document.body).focus();
    }
});

async function tick(): Promise<void> {
    // Asking while closed would only keep the worker awake for a number nobody sees.
    if (busy || !state?.bound || !visible) return;
    const reply = await request<PanelState>({ type: 'panel-state' });
    if (!reply.ok || !reply.data.bound) return;
    const wasSignedIn = signedIn(state);
    state = reply.data;
    if (signedIn(state) !== wasSignedIn) {
        render();
        if (signedIn(state)) void loadIssues();
        return;
    }
    const line = document.getElementById('events-from-tab');
    if (line) line.textContent = `${state.eventsFromTab} ${state.eventsFromTab === 1 ? 'event' : 'events'} sent from this tab`;
}

// ── start ────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') tellPage('close');
});

void (async () => {
    await loadState();
    render();
    if (state && signedIn(state)) void loadIssues();
    setInterval(() => void tick(), 4000);
})();

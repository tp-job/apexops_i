import { BINDINGS_KEY, readBindings } from '@/lib/bindings';
import { HOST_MESSAGE_TAG, isPanelUiMessage, TOOLBAR_TOGGLE } from '@/lib/toolbarChannel';
import { clampPref, readToolbarPref, TOOLBAR_PREFS_KEY, updateToolbarPref, type ToolbarPref } from '@/lib/toolbarPrefs';
import { railCss } from '@/lib/toolbarStyles';

/**
 * The floating toolbar on a bound site (spec 8.5 P5, 9.4 P5a).
 *
 * ISOLATED world, in a CLOSED shadow root. The P0 spike showed a page cannot
 * reach a closed root made from this world, even with `attachShadow` patched
 * first — but the rule does not rest on that: **nothing of ApexOps lives here.**
 * The rail is buttons and a position. The project, the session and the issues
 * are only ever in the panel, an extension-origin `<iframe>` the page cannot
 * read (spec X10, section 10).
 *
 * It keeps out of the site's way (R20): no listeners on the page while the
 * panel is closed, no keyboard focus until the panel is opened, draggable,
 * hideable per site, and absent from tabs driven by automation.
 */

const PANEL_WIDTH = 360;
const PANEL_MAX_HEIGHT = 560;
const GAP = 8;
const DRAG_THRESHOLD = 4;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The web app's mark: the "activity" pulse on the lime accent. */
function logo(): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const line = document.createElementNS(SVG_NS, 'polyline');
    line.setAttribute('points', '22 12 18 12 15 21 9 3 6 12 2 12');
    svg.append(line);
    return svg;
}

export default defineContentScript({
    registration: 'runtime',
    runAt: 'document_idle',
    main() {
        // Top frame only, once per page however often it is injected.
        if (window.top !== window) return;
        const w = window as unknown as Record<string, unknown>;
        if (w.__apexopsToolbar) return;
        w.__apexopsToolbar = true;

        // A test runner clicking around the page must not meet an extra element
        // in the corner (R20). The e2e build is itself driven by automation, so
        // it is the one build that shows the toolbar there.
        if (navigator.webdriver && import.meta.env.MODE !== 'e2e') return;

        void mount().catch((err) => {
            w.__apexopsToolbar = false;
            console.debug('[apexops] toolbar did not start', err);
        });
    },
});

async function mount(): Promise<void> {
    const origin = location.origin;
    let pref: ToolbarPref = await readToolbarPref(origin);

    // ── elements ─────────────────────────────────────────────
    const host = document.createElement('apexops-toolbar');
    // Inline, so the site's stylesheets cannot lay out the host: a zero-size
    // fixed box on the top layer of z-index, from which the rail and the panel
    // position themselves against the viewport.
    host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;';
    const root = host.attachShadow({ mode: 'closed' });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(railCss);
    root.adoptedStyleSheets = [sheet];

    const rail = document.createElement('div');
    rail.className = 'rail';
    rail.setAttribute('role', 'toolbar');
    rail.setAttribute('aria-label', 'ApexOps');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'logo';
    button.title = 'ApexOps (Alt+Shift+A)';
    button.setAttribute('aria-label', 'ApexOps panel');
    button.setAttribute('aria-expanded', 'false');
    // Out of the page's tab order: Tab on the site under test must go where the
    // site says. Alt+Shift+A is the keyboard way in.
    button.tabIndex = -1;
    button.append(logo());
    rail.append(button);
    root.append(rail);

    // `getURL` gives the use_dynamic_url address, so the page cannot find the
    // extension by probing a fixed chrome-extension:// path.
    const panelUrl = browser.runtime.getURL('/panel.html');
    let frame: HTMLIFrameElement | null = null;
    let open = false;
    let returnFocus: Element | null = null;

    // ── position ─────────────────────────────────────────────
    const railSize = () => ({ width: rail.offsetWidth || 44, height: rail.offsetHeight || 44 });
    const viewport = () => ({ width: document.documentElement.clientWidth || innerWidth, height: innerHeight });

    function place(p: ToolbarPref): void {
        const c = clampPref(p, railSize(), viewport());
        rail.style.right = `${c.right}px`;
        rail.style.bottom = `${c.bottom}px`;
        if (frame) placeFrame(c);
    }

    function placeFrame(p: ToolbarPref): void {
        if (!frame) return;
        const vp = viewport();
        const size = railSize();
        const height = Math.min(PANEL_MAX_HEIGHT, vp.height - GAP * 2);
        const width = Math.min(PANEL_WIDTH, vp.width - GAP * 2);
        const railLeft = vp.width - p.right - size.width;
        // Beside the rail, on whichever side has room; over it only if neither does.
        let left = railLeft - GAP - width;
        if (left < GAP) left = railLeft + size.width + GAP;
        if (left + width > vp.width - GAP) left = Math.max(GAP, vp.width - GAP - width);
        let top = vp.height - p.bottom - height;
        top = Math.min(Math.max(GAP, top), vp.height - GAP - height);
        frame.style.left = `${left}px`;
        frame.style.top = `${top}px`;
        frame.style.width = `${width}px`;
        frame.style.height = `${height}px`;
    }

    // ── panel ────────────────────────────────────────────────
    function ensureFrame(): HTMLIFrameElement {
        if (frame) return frame;
        frame = document.createElement('iframe');
        frame.className = 'panel';
        frame.title = 'ApexOps';
        frame.src = panelUrl;
        // A frame that is still loading misses anything posted to it; tell it
        // again once it is there.
        frame.addEventListener('load', () => {
            loaded = true;
            tellFrame(pendingFocus);
        });
        root.append(frame);
        return frame;
    }

    let loaded = false;
    /** Opened from the keyboard before the frame had loaded: focus it on arrival. */
    let pendingFocus = false;

    /** The panel's view of itself: on screen or not, and whether to take focus. */
    function tellFrame(focus: boolean): void {
        if (!loaded) return;
        // Posted to the frame's own window, so only the panel receives it.
        frame?.contentWindow?.postMessage({ tag: HOST_MESSAGE_TAG, visible: open, focus: open && focus }, '*');
        pendingFocus = false;
    }

    const onPageKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
    };

    function setOpen(next: boolean, focusPanel = false): void {
        if (next === open) {
            if (next && focusPanel) {
                frame?.focus();
                tellFrame(true);
            }
            return;
        }
        open = next;
        button.setAttribute('aria-expanded', String(open));
        rail.classList.toggle('active', open);
        if (open) {
            returnFocus = document.activeElement;
            const f = ensureFrame();
            placeFrame(clampPref(pref, railSize(), viewport()));
            f.hidden = false;
            // Listening to the page only while the panel is open (R20).
            window.addEventListener('keydown', onPageKey, true);
            pendingFocus = focusPanel;
            if (focusPanel) f.focus();
            tellFrame(focusPanel);
        } else {
            if (frame) frame.hidden = true;
            tellFrame(false);
            window.removeEventListener('keydown', onPageKey, true);
            // Back to wherever the person was, if the panel had taken focus.
            if (root.activeElement === frame && returnFocus instanceof HTMLElement) returnFocus.focus();
            else if (root.activeElement === frame) frame?.blur();
        }
    }

    function applyHidden(hidden: boolean): void {
        if (hidden) setOpen(false);
        host.style.display = hidden ? 'none' : 'block';
    }

    // ── drag, or click ───────────────────────────────────────
    let drag: { id: number; x: number; y: number; start: ToolbarPref; moved: boolean } | null = null;

    button.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: clampPref(pref, railSize(), viewport()), moved: false };
        button.setPointerCapture(e.pointerId);
    });
    button.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        drag.moved = true;
        rail.classList.add('dragging');
        pref = clampPref({ ...pref, right: drag.start.right - dx, bottom: drag.start.bottom - dy }, railSize(), viewport());
        place(pref);
    });
    const endDrag = (e: PointerEvent) => {
        if (!drag || e.pointerId !== drag.id) return;
        const moved = drag.moved;
        drag = null;
        rail.classList.remove('dragging');
        if (moved) void updateToolbarPref(origin, { right: pref.right, bottom: pref.bottom });
        else if (e.type === 'pointerup') setOpen(!open);
    };
    button.addEventListener('pointerup', endDrag);
    button.addEventListener('pointercancel', endDrag);
    // Keyboard activation, once the panel has made the button reachable.
    button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open, true);
        }
    });

    // The page's own "click outside" handlers should not see clicks on the rail
    // as clicks on the page. Bubbling listeners only: a page listening in the
    // capture phase has already seen it, and that cannot be helped.
    for (const type of ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart'] as const) {
        rail.addEventListener(type, (e) => e.stopPropagation());
    }

    // ── messages ─────────────────────────────────────────────
    const onMessage = (e: MessageEvent) => {
        // Only from our own iframe's window. A page can post any data it likes to
        // itself, but it cannot make `source` be a window inside our closed root.
        // (Not `origin`: `getURL` gives the use_dynamic_url address, while the
        // panel's messages carry the extension's fixed origin — observed on
        // Chrome 131, so the two never compare equal.)
        if (!frame || e.source !== frame.contentWindow || !isPanelUiMessage(e.data)) return;
        if (e.data.action === 'close') setOpen(false);
        if (e.data.action === 'hide') void updateToolbarPref(origin, { hidden: true });
    };
    window.addEventListener('message', onMessage);

    const onRuntime = (message: unknown, sender: Browser.runtime.MessageSender) => {
        // From the worker only: no tab means not a content script, and the id
        // means not another extension.
        if (sender.id !== browser.runtime.id || sender.tab) return;
        if ((message as { type?: unknown } | null)?.type !== TOOLBAR_TOGGLE) return;
        if (pref.hidden) {
            void updateToolbarPref(origin, { hidden: false });
            pref = { ...pref, hidden: false };
            applyHidden(false);
            setOpen(true, true);
        } else {
            setOpen(!open, true);
        }
    };
    browser.runtime.onMessage.addListener(onRuntime);

    const onStorage = (changes: Record<string, Browser.storage.StorageChange>, area: string) => {
        if (area !== 'local') return;
        if (changes[TOOLBAR_PREFS_KEY]) {
            const next = (changes[TOOLBAR_PREFS_KEY].newValue as Record<string, ToolbarPref> | undefined)?.[origin];
            if (next) {
                pref = { ...pref, ...next };
                if (!drag) place(pref);
                applyHidden(!!pref.hidden);
            }
        }
        if (changes[BINDINGS_KEY]) {
            const bound = (changes[BINDINGS_KEY].newValue as Record<string, unknown> | undefined)?.[origin];
            // Disconnected from the popup: leave now, not at the next reload.
            if (!bound) teardown();
        }
    };
    browser.storage.onChanged.addListener(onStorage);

    const onResize = () => place(pref);
    window.addEventListener('resize', onResize);

    function teardown(): void {
        setOpen(false);
        window.removeEventListener('message', onMessage);
        window.removeEventListener('resize', onResize);
        browser.runtime.onMessage.removeListener(onRuntime);
        browser.storage.onChanged.removeListener(onStorage);
        host.remove();
        (window as unknown as Record<string, unknown>).__apexopsToolbar = false;
    }

    // Unbound between the registration and now (a stale tab): do not show up.
    if (!(await readBindings())[origin]) {
        teardown();
        return;
    }

    document.documentElement.append(host);
    place(pref);
    applyHidden(!!pref.hidden);
}

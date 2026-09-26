/**
 * Where the toolbar sits on each site, and whether it is hidden there (spec 8.1 #8).
 *
 * Per origin, in `chrome.storage.local`. Written by the toolbar content script
 * (drag, hide) and by the popup (show again); both follow changes through
 * `storage.onChanged`, so hiding in one place hides it in every open tab of that
 * site. No ApexOps data lives here: it is a position and a flag.
 */

export interface ToolbarPref {
    /** Distance from the viewport's right edge to the rail's right edge, px. */
    right: number;
    /** Distance from the viewport's bottom edge to the rail's bottom edge, px. */
    bottom: number;
    hidden?: boolean;
}

export type ToolbarPrefs = Record<string, ToolbarPref>;

export const TOOLBAR_PREFS_KEY = 'toolbarPrefs';

/** Bottom-right, clear of the corner: the least likely place to cover a site's own UI. */
export const DEFAULT_PREF: ToolbarPref = { right: 16, bottom: 16 };

export async function readToolbarPrefs(): Promise<ToolbarPrefs> {
    const value = (await browser.storage.local.get(TOOLBAR_PREFS_KEY))[TOOLBAR_PREFS_KEY];
    return value && typeof value === 'object' ? (value as ToolbarPrefs) : {};
}

export async function readToolbarPref(origin: string): Promise<ToolbarPref> {
    return { ...DEFAULT_PREF, ...(await readToolbarPrefs())[origin] };
}

// One writer at a time for the same reason as bindings: two read-modify-writes
// that overlap drop one of the changes.
let chain: Promise<unknown> = Promise.resolve();

export function updateToolbarPref(origin: string, change: Partial<ToolbarPref>): Promise<void> {
    const run = chain.then(async () => {
        const all = await readToolbarPrefs();
        all[origin] = { ...DEFAULT_PREF, ...all[origin], ...change };
        await browser.storage.local.set({ [TOOLBAR_PREFS_KEY]: all });
    });
    chain = run.catch(() => undefined);
    return run;
}

export const setToolbarHidden = (origin: string, hidden: boolean) => updateToolbarPref(origin, { hidden });

/**
 * Keep a position on screen. A rail dragged near the edge of a wide window must
 * still be reachable when the same site is opened in a narrow one.
 */
export function clampPref(pref: ToolbarPref, rail: { width: number; height: number }, viewport: { width: number; height: number }): ToolbarPref {
    const margin = 4;
    const maxRight = Math.max(margin, viewport.width - rail.width - margin);
    const maxBottom = Math.max(margin, viewport.height - rail.height - margin);
    return {
        ...pref,
        right: Math.min(Math.max(margin, pref.right), maxRight),
        bottom: Math.min(Math.max(margin, pref.bottom), maxBottom),
    };
}

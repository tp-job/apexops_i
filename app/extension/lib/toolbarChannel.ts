/**
 * The fixed vocabulary between the toolbar's parts (spec 8.4, section 10).
 *
 * - worker → toolbar content script: `TOOLBAR_TOGGLE`, from the `Alt+Shift+A`
 *   command. Sent with `tabs.sendMessage`, which a page cannot forge.
 * - panel iframe → toolbar content script: `PanelUiMessage` over `postMessage`.
 *   UI only — close, hide — and never data: the page receives these messages
 *   too, because they arrive on its window. The content script accepts one only
 *   when `event.source` is its own iframe's window, which a page cannot fake.
 */

/** The `commands` key in the manifest. */
export const TOOLBAR_COMMAND = 'toggle-toolbar';

export const TOOLBAR_TOGGLE = 'apexops-toolbar-toggle';

export const PANEL_MESSAGE_TAG = 'apexops-panel';

export type PanelUiAction = 'close' | 'hide';

export interface PanelUiMessage {
    tag: typeof PANEL_MESSAGE_TAG;
    action: PanelUiAction;
}

export const isPanelUiMessage = (data: unknown): data is PanelUiMessage => {
    const m = data as Partial<PanelUiMessage> | null;
    return !!m && m.tag === PANEL_MESSAGE_TAG && (m.action === 'close' || m.action === 'hide');
};

/**
 * toolbar content script → panel: whether the panel is on screen, and whether it
 * was opened from the keyboard (so it should take focus). Sent to the frame's
 * own window; the panel accepts it only from `window.parent`.
 *
 * The panel cannot work visibility out for itself: a display:none cross-origin
 * frame keeps its old size and gets no IntersectionObserver update.
 */
export const HOST_MESSAGE_TAG = 'apexops-toolbar';

export interface HostUiMessage {
    tag: typeof HOST_MESSAGE_TAG;
    visible: boolean;
    focus: boolean;
}

export const isHostUiMessage = (data: unknown): data is HostUiMessage => {
    const m = data as Partial<HostUiMessage> | null;
    return !!m && m.tag === HOST_MESSAGE_TAG && typeof m.visible === 'boolean' && typeof m.focus === 'boolean';
};

/**
 * The rail's stylesheet, adopted into its closed shadow root.
 *
 * A string rather than a .css import: it has to be a constructable sheet in the
 * shadow root, never a <link> or <style> the page's CSP could have a say in, and
 * never a stylesheet added to the page's own document.
 *
 * Tokens follow the popup's (light and dark), with the design's white capsule
 * and purple active state (spec section 9). The logo keeps the web app's lime.
 */
export const railCss = /* css */ `
:host {
    --rail-bg: #ffffff;
    --rail-border: #d8d5e2;
    --rail-icon: #16151a;
    --rail-hover: #f1eefb;
    --rail-active: #6d28d9;
    --rail-active-icon: #ffffff;
    --rail-focus: #6d28d9;
    --rail-shadow: 0 6px 24px rgba(22, 21, 26, 0.18), 0 1px 3px rgba(22, 21, 26, 0.12);
    --brand: #c5f43a;
    --brand-ink: #222222;
}
@media (prefers-color-scheme: dark) {
    :host {
        --rail-bg: #1c1a22;
        --rail-border: #3a3647;
        --rail-icon: #f3f2f7;
        --rail-hover: #2b2735;
        --rail-active: #7c3aed;
        --rail-focus: #c4b5fd;
        --rail-shadow: 0 6px 24px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.4);
    }
}

* { box-sizing: border-box; }

.rail {
    position: fixed;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 44px;
    padding: 4px;
    background: var(--rail-bg);
    border: 1px solid var(--rail-border);
    border-radius: 22px;
    box-shadow: var(--rail-shadow);
    font: 13px/1.2 system-ui, -apple-system, 'Segoe UI', sans-serif;
    user-select: none;
    touch-action: none;
}
.rail.dragging { cursor: grabbing; }

button {
    all: unset;
    box-sizing: border-box;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    color: var(--rail-icon);
    cursor: pointer;
}
button:hover { background: var(--rail-hover); }
button:focus-visible { outline: 2px solid var(--rail-focus); outline-offset: 2px; }
button[aria-pressed='true'] { background: var(--rail-active); color: var(--rail-active-icon); }

button svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.logo {
    background: var(--brand);
    color: var(--brand-ink);
    cursor: grab;
}
.logo:hover { background: var(--brand); filter: brightness(0.95); }
.logo svg { stroke-width: 2.6; }
.rail.active .logo { box-shadow: 0 0 0 2px var(--rail-bg), 0 0 0 4px var(--rail-active); }

.panel {
    position: fixed;
    border: 1px solid var(--rail-border);
    border-radius: 14px;
    box-shadow: var(--rail-shadow);
    background: var(--rail-bg);
    color-scheme: normal;
}
.panel[hidden] { display: none; }

@media (prefers-reduced-motion: no-preference) {
    button { transition: background-color 120ms, box-shadow 120ms; }
    .panel:not([hidden]) { animation: apexops-in 140ms ease-out; }
    @keyframes apexops-in { from { opacity: 0; transform: translateY(4px); } }
}
`;

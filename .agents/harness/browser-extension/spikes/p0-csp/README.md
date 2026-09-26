# P0 spike — can the toolbar survive a hostile page?

Run: `node run.mjs chrome` (Puppeteer's Chrome for Testing 131) or `node run.mjs edge` (the installed Edge).
Needs `app/server`'s `puppeteer` installed. The test page is served on `127.0.0.1:8799` under four CSPs
(`server.mjs`). `page.js` plays the hostile page: it patches `attachShadow` before the extension runs,
records CSP violations, and tries to read every shadow root and the iframe.

Branded Chrome 137+ ignores `--load-extension`, so "chrome" here means Chrome for Testing.
Edge 153 still honours it.

## Result, 2026-09-19. Observed on Chrome 131.0.6778.204 and Edge 153.0.4234.32

| Check | `/none` | `/strict` | `/frame-none` | `/sandboxless-strictest` |
|---|---|---|---|---|
| Extension iframe panel loads | ✅ | ✅ | ✅ | ✅ |
| Page can read the iframe | no (`contentDocument` null) | no | no | no |
| Styles in the closed shadow root apply (`<style>` + adopted sheet) | ✅ | ✅ | ✅ | ✅ |
| Page reads the **closed** root (ISOLATED world) | no | no | no | no |
| Page reads the **open** root (the control) | **yes** | yes | yes | yes |
| `world: "MAIN"` content script runs | ✅ | ✅ | ✅ | ✅ |
| `customElements` exists in the ISOLATED world | no | no | no | no |
| `<script src=chrome-extension://…>` added by a content script | Chrome ❌ / Edge ✅ | Chrome ❌ / Edge ✅ | Chrome ❌ / Edge ✅ | Chrome ❌ / Edge ✅ |

The open-root row is the control. It shows the attack does work where it should, so the closed-root
"no" is a real result.

## What this changed in the plan

1. **R17 cleared on Chromium.** The page's CSP, even `frame-src 'none'` and `default-src 'none'`, does not
   block an extension-origin iframe. The `chrome.sidePanel` fallback is not needed. Firefox is untested
   and belongs to P7.
2. **R16 was stated wrong.** A patched `attachShadow` **does not** capture a root that an ISOLATED-world
   content script creates, because each world has its own prototypes. The shadow-DOM claim holds only for
   **MAIN-world** code, which is exactly where VisBug has to run (next point). The rule does not change:
   ApexOps data lives only in the iframe.
3. **VisBug goes in as a `world: "MAIN"` content script, not a script tag.** The ISOLATED world has no
   `customElements`, so VisBug's `<vis-bug>` element has to live in MAIN. Upstream VisBug gets there by
   appending a `<script src=chrome-extension://…>` tag. Chrome refused that tag on every page, including
   the one with no CSP. The console named an extension-side policy (`script-src 'self' 'wasm-unsafe-eval' …`),
   not the page's, and the request used the random URL that `use_dynamic_url` produces. Not investigated
   further: MAIN-world injection runs everywhere, and it also removes any need to make the bundle
   web-accessible.

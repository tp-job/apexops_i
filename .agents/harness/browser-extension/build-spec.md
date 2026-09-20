# Build spec — browser extension (floating toolbar)

**Target:** `.agents/docs/features/browser-extension.md`. That spec owns scope and decisions. This file
covers only how the build runs. Sections 8–10 of the spec replace the popup-first parts of 1–7.

**Branches.** `ext/dev` is the integration branch, cut from `main` at `08e3a85`. Each phase gets one
branch cut from `ext/dev`, and merges back with `--no-ff` so a revert has a boundary:
`ext/p0-decisions`, `ext/p1-auth-storage`, `ext/p2-shared-package`, `ext/p3-capture`,
`ext/p4-connect`, `ext/p5a-rail`, `ext/p5b-tools`, `ext/p6-screenshot`, `ext/p7-release`.
`ext/dev` → `main` happens by PR, and the user merges it.

**State.** `feature-list.json` is the ledger. `passes: true` only after the steps were observed, and
`notes` says what was observed and when. A step that could not be run is `blocked`, never `true`.

**Gitignore trap.** `.agents/build/` is ignored (`.gitignore:33`). Harness files and spikes live here,
under `.agents/harness/`. Run `git check-ignore -v <path>` before relying on any new location.

**Verification rigs**
- Extension behaviour: Puppeteer (`app/server` devDependency, v23 + Chrome for Testing 131) with
  `--load-extension`, plus the installed Edge 153. Branded Chrome 137+ ignores `--load-extension`.
  Pattern: `spikes/p0-csp/run.mjs`.
- Web app: `npm run build` for the client, not just `tsc --noEmit` (erasableSyntaxOnly), plus the vitest suites.
  In-browser checks go through real Chrome or Puppeteer. The built-in browser pane on this machine takes no input.
- Port :3000 belongs to another project on this machine, so the API rig must use another port.

**P1 scope correction (re-counted at `08e3a85`).** The spec's F4 said 5 direct token reads. Counting
the `user` key too, which is part of the session, the real number is **12 reads/writes in 4 files**:
`api/config.ts:14` · `context/AuthContext.tsx:28,72,132,146,217` · `services/auth.ts:93,96` ·
`dev/devSessions.ts:85,228-230`.
Theme, assistant-panel and dev-session-list keys are device preferences and stay in `localStorage`.

**Where things live after P2 (2026-09-20).**
- `packages/shared/src/auth/authSession.ts` is the session coordinator (was `app/client/src/lib/authSession.ts`).
- `packages/shared/src/api/` holds `configureApi`, `fetchWithAuth` and the auth headers (was `app/client/src/api/{config,client}.ts`).
- `packages/shared/src/sdk-core/` holds the capture core and the v1 entry. `app/server/public/sdk/v1.js` is GENERATED from it.
- `app/client/src/lib/localStorageAdapter.ts` is the web's StorageAdapter. The extension will bring a `chrome.storage` one.

**Checks.** `checks/p1-browser.mjs` covers the web session (rig). `checks/p2-sdk-parity.mjs <baseRef>` compares the old and new v1.js.
Neither check needs the DB, except p1 (it logs in). Run p1 sparingly: each run logs in twice, and the per-account
login throttle answered 429 after a day of runs. Restarting the rig API clears it.

**P3 (2026-09-20).** `app/extension` is a WXT workspace. `npm run build:e2e --workspace app/extension` builds the harness
variant (localhost pre-granted); `npm run build` is the shipped manifest and is a CI step.
`checks/p3-extension.mjs` needs the rig API on :3013 and runs in Chrome for Testing, or in Edge with `P3_BROWSER=edge`.
It stops the worker through chrome:// / edge://serviceworker-internals after DETACHING the DevTools session (attached, a
stopped extension worker never wakes). `checks/sdk-e2e.mjs` drives the server's own /sdk/test page.
Restarting the rig API after server.ts changes: ts-node-dev restarts, but twice in this build it was still serving the
previous code, so restart via preview_stop/preview_start and re-probe before trusting a curl.

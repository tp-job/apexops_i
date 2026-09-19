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

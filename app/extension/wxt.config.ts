import { defineConfig } from 'wxt';

/**
 * ApexOps browser extension (spec: .agents/docs/features/browser-extension.md).
 *
 * Permissions are the P3 minimum. Site access is never granted up front: a site
 * is reached only after the user binds it, through `optional_host_permissions`
 * plus `chrome.permissions.request` (P4). Content scripts are registered at
 * runtime for bound origins only — which is also why neither content-script
 * entrypoint declares `matches`: WXT copies a runtime script's `matches` into
 * `host_permissions`, which would ask for every site at install time.
 *
 * `--mode e2e` is the one exception, for automated tests: it pre-grants
 * localhost so a test can bind a site without a permission prompt a script
 * cannot click. It is never the build a person installs.
 */
export default defineConfig({
    // A build wipes its output folder first, and Windows refuses that while a
    // browser has the unpacked extension loaded from it (EBUSY). Setting
    // WXT_OUT_DIR builds somewhere else instead of making the person close
    // their browser. Unset, this is WXT's own default.
    ...(process.env.WXT_OUT_DIR && { outDir: process.env.WXT_OUT_DIR }),
    manifest: ({ mode }) => ({
        name: 'ApexOps',
        description: 'Capture errors and inspect UI on the site you are testing, straight into an ApexOps project.',
        permissions: ['storage', 'scripting', 'alarms', 'activeTab'],
        optional_host_permissions: ['http://*/*', 'https://*/*'],
        ...(mode === 'e2e' && { host_permissions: ['http://localhost/*', 'http://127.0.0.1/*'] }),
    }),
});

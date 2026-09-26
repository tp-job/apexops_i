import { defineConfig } from 'vitest/config';

/**
 * Unit suites for the extension's pure parts — the event sanitiser and the
 * ingest queue. Anything that needs a real browser (registration, the worker,
 * content scripts in a page) is proven end to end instead:
 * .agents/harness/browser-extension/checks/p3-extension.mjs.
 */
export default defineConfig({
    test: {
        environment: 'node',
        include: ['lib/**/*.test.ts'],
        testTimeout: 5_000,
    },
});

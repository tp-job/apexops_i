import { defineConfig } from 'vitest/config';

/**
 * Pure-function suites, no DOM: the SDK core takes its host (window, document,
 * console) as an argument precisely so it can be tested with fakes here.
 */
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
        testTimeout: 10_000,
    },
});

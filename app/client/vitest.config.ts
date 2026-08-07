import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Client test config (spec E-D2).
 *
 * Separate from `vite.config.ts` on purpose: the app config carries the React SWC
 * and Tailwind plugins, and a unit suite over pure functions needs neither. The
 * `@` alias is duplicated because it is the one thing a test genuinely shares
 * with the app.
 *
 * **No browser and no dev server.** Everything covered here is a pure function,
 * so `environment: 'node'` is honest and fast. The day a component test earns its
 * place it needs jsdom and Testing Library, which is a decision with a real
 * dependency cost — it should be made deliberately, not inherited from a config
 * that pre-emptively installed them.
 */
export default defineConfig({
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        testTimeout: 5_000,
    },
});

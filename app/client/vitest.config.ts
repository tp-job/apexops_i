import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
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
 *
 * `.tsx` joined the include list for the docs renderer (S9-D4). It is still not
 * a component-testing setup: `renderToStaticMarkup` is a pure function from a
 * tree to a string, needs no DOM, and is the only way to assert the XSS
 * criterion on the output a visitor actually receives rather than on the parse
 * tree one layer above it. React's SWC plugin is added for the same reason the
 * alias is — it is the one thing those tests share with the app.
 */
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.{ts,tsx}'],
        testTimeout: 5_000,
    },
});

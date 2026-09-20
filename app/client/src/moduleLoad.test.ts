import { describe, expect, it } from 'vitest';

/**
 * No module may read the API base URL (or the session) while it is being loaded.
 *
 * `main.tsx` calls `configureApi` and `initSession` in its body, which runs only
 * after every imported module has been evaluated. A module-scope
 * `getApiBaseUrl()` therefore runs first and throws — `services/api.ts` did,
 * as `axios.create({ baseURL: getApiBaseUrl() })`, and the app booted to a
 * blank page. typecheck, the unit suites and `vite build` all passed it; only a
 * browser caught it. This catches it here instead, by importing every non-UI
 * module with nothing configured.
 */
const modules = import.meta.glob(
    ['./{api,services,lib,hooks,utils,context,dev}/**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'],
    { eager: false }
);

describe('module load', () => {
    it('found the modules it is meant to check', () => {
        expect(Object.keys(modules)).toContain('./services/api.ts');
    });

    // 30s, not the suite's 5s. A load takes ~0.4s here, but on 2026-09-20 one run
    // failed DevRoleSwitcher and useBugTrackerData right after lint/typecheck and
    // the error text was not captured; nine reruns (cold cache, concurrent builds)
    // could not reproduce it. The wider cap is a hedge against a slow first
    // transform, NOT a diagnosis — if this fails again, read the message first.
    it.each(Object.keys(modules))(
        '%s loads without touching the API config or session',
        { timeout: 30_000 },
        async (path) => {
            await expect(modules[path]()).resolves.toBeDefined();
        }
    );
});

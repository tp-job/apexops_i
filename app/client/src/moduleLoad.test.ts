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

    it.each(Object.keys(modules))('%s loads without touching the API config or session', async (path) => {
        await expect(modules[path]()).resolves.toBeDefined();
    });
});

import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { buildSdkSource, OUTPUT } from '../../scripts/build-sdk.mjs';

/**
 * `app/server/public/sdk/v1.js` is generated from this folder and committed, so
 * the server serves a static file with no build step. This is what keeps the two
 * from drifting: edit capture.ts without rebuilding and CI goes red here, not in
 * production on somebody else's page.
 */
describe('committed /sdk/v1.js', () => {
    it('matches a fresh build of packages/shared/src/sdk-core', async () => {
        const committed = (await readFile(OUTPUT, 'utf8')).replace(/\r\n/g, '\n');
        expect(committed === (await buildSdkSource()), 'run: npm run build:sdk --workspace packages/shared').toBe(true);
    });
});

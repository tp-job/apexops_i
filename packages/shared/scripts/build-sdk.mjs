// Builds /sdk/v1.js from packages/shared/src/sdk-core (extension spec P2).
//
//   npm run build:sdk --workspace packages/shared
//
// The output is committed at app/server/public/sdk/v1.js, so the server keeps
// serving a static file with no build step of its own. src/sdk-core/v1-build.test.ts
// fails when the committed file and this build disagree — edit the source, run
// this, commit both.
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
export const ENTRY = here('../src/sdk-core/v1-entry.ts');
export const OUTPUT = here('../../../app/server/public/sdk/v1.js');

const BANNER = `/**
 * ApexOps browser SDK v1 — GENERATED FILE, do not edit.
 * Source: packages/shared/src/sdk-core (capture.ts + v1-entry.ts)
 * Rebuild: npm run build:sdk --workspace packages/shared
 *
 *   <script src="https://your-apexops/sdk/v1.js" data-project="pk_..." defer></script>
 */`;

/** The bundled script as a string, LF line endings. */
export async function buildSdkSource() {
    const result = await build({
        entryPoints: [ENTRY],
        // Pinned: esbuild writes each module's path, relative to this, into the
        // output as a comment. Left at the default (cwd), a build run from the
        // repo root differs from one run inside the package, and the drift test
        // fails depending on where it was started.
        absWorkingDir: here('..'),
        bundle: true,
        format: 'iife',
        platform: 'browser',
        // Every browser still receiving security updates (object spread is ES2018); v1
        // was hand-written ES5, but nothing that runs it today needs that.
        target: 'es2018',
        minify: false,
        legalComments: 'none',
        charset: 'utf8',
        banner: { js: BANNER },
        write: false,
    });
    return result.outputFiles[0].text.replace(/\r\n/g, '\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    await writeFile(OUTPUT, await buildSdkSource());
    console.log(`wrote ${OUTPUT}`);
}

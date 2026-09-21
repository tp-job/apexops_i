/**
 * Why events from a bound site are not arriving, per site, for the popup to say.
 *
 * Without this a refused batch is invisible: the page's console shows nothing,
 * the project shows nothing, and "the extension does nothing" is the only
 * symptom. The two causes a person can actually fix are named in the message
 * (a rotated key the extension could not refresh, and a project that only
 * accepts listed origins — spec R6). Cleared by the next batch that gets through.
 */
export interface IngestProblem {
    at: number;
    status: number;
    message: string;
}

export type IngestProblems = Record<string, IngestProblem>;

const KEY = 'ingestProblems';

let chain: Promise<unknown> = Promise.resolve();

const update = (change: (all: IngestProblems) => IngestProblems): Promise<void> => {
    const run = chain.then(async () => {
        const stored = (await browser.storage.local.get(KEY))[KEY];
        const all = stored && typeof stored === 'object' ? (stored as IngestProblems) : {};
        await browser.storage.local.set({ [KEY]: change(all) });
    });
    chain = run.catch(() => undefined);
    return run;
};

export async function readIngestProblems(): Promise<IngestProblems> {
    const stored = (await browser.storage.local.get(KEY))[KEY];
    return stored && typeof stored === 'object' ? (stored as IngestProblems) : {};
}

export const recordIngestProblem = (origin: string, status: number, message: string): Promise<void> =>
    update((all) => ({ ...all, [origin]: { at: Date.now(), status, message } }));

export const clearIngestProblem = (origin: string): Promise<void> =>
    update((all) => {
        if (!(origin in all)) return all;
        const { [origin]: _gone, ...rest } = all;
        return rest;
    });

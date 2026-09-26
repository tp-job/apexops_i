/**
 * How many events each tab has handed to the extension (spec 8.5 P5 #2): the
 * panel's "N events sent from this tab", which answers "is it capturing?"
 * without opening the web app.
 *
 * Counted when the worker accepts a batch, which is also when it is queued for
 * delivery. `storage.session` because a tab id means nothing after a restart;
 * the worker forgets a tab when it closes.
 */

const KEY = 'tabCounts';

type Counts = Record<string, number>;

async function read(): Promise<Counts> {
    const value = (await browser.storage.session.get(KEY))[KEY];
    return value && typeof value === 'object' ? (value as Counts) : {};
}

let chain: Promise<unknown> = Promise.resolve();

function update(change: (c: Counts) => Counts): Promise<void> {
    const run = chain.then(async () => {
        await browser.storage.session.set({ [KEY]: change(await read()) });
    });
    chain = run.catch(() => undefined);
    return run;
}

export const countEvents = (tabId: number, n: number): Promise<void> =>
    n > 0 ? update((c) => ({ ...c, [tabId]: (c[tabId] ?? 0) + n })) : Promise.resolve();

export const forgetTab = (tabId: number): Promise<void> =>
    update((c) => {
        const { [tabId]: _gone, ...rest } = c;
        return rest;
    });

export async function eventsFromTab(tabId: number): Promise<number> {
    return (await read())[tabId] ?? 0;
}

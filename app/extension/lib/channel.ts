/**
 * The one message the page-side capture (MAIN world) sends to the bridge
 * (ISOLATED world): a batch body, as a string, on a DOM event.
 *
 * A DOM event rather than `window.postMessage` because dispatch is
 * synchronous across worlds. The last batch is sent from `pagehide`, while
 * the document is being torn down, and a posted message is a queued task that
 * may never run. Any script on the page can dispatch this event too, so the
 * bridge forwards nothing but the string and the service worker trusts none
 * of it (`sanitize.ts`).
 */
export const CAPTURE_EVENT = 'apexops:capture';

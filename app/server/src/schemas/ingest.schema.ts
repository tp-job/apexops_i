import { z } from 'zod';
import { MAX_MESSAGE_LEN, MAX_STACK_LEN } from '../lib/fingerprint';
import { CAPTURE_LEVELS } from './project.schema';

/**
 * Ingest payload validation.
 *
 * Everything here arrives from a browser we do not control, on a page we do not
 * control, authenticated only by a key that is public by design (spec D4). So the
 * schema's job is not "help the developer" — it is to bound what a hostile client
 * can push into the database. Every field is capped; nothing is unbounded.
 */

/** One batch cannot exceed this many events, independent of the byte cap. */
export const MAX_BATCH_EVENTS = 100;

const levelField = z.enum(CAPTURE_LEVELS).catch('error');

const eventSchema = z.object({
    level: levelField,
    message: z.string().max(MAX_MESSAGE_LEN).default(''),
    stack: z.string().max(MAX_STACK_LEN).nullish(),
    url: z.string().max(2_048).nullish(),
    userAgent: z.string().max(512).nullish(),
    release: z.string().max(128).nullish(),
    /**
     * Client-side dedupe counter: the SDK collapses identical repeats inside a
     * 5s window and reports how many it swallowed, so a tight error loop costs
     * one request instead of five hundred. Capped so a client cannot inflate an
     * issue's count arbitrarily with a single cheap request.
     */
    count: z.number().int().min(1).max(10_000).optional().default(1),
    /** Free-form SDK tags/breadcrumbs. Depth is not walked; size is capped on the wire. */
    context: z.record(z.string(), z.unknown()).optional().default({}),
    /** Client clock — advisory only. The server always stamps its own `createdAt`. */
    timestamp: z.string().max(64).nullish(),
});

export const ingestSchema = z.object({
    /**
     * The ingest key may also arrive as `X-Apexops-Key`. Accepting it in the body
     * matters for `navigator.sendBeacon`, which cannot set custom headers — and
     * the unload beacon is precisely the batch containing the crash.
     */
    key: z.string().max(128).optional(),
    events: z.array(eventSchema).min(1, 'events must not be empty').max(MAX_BATCH_EVENTS),
});

export type IngestEvent = z.infer<typeof eventSchema>;

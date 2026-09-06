/**
 * Per-account failed-login throttle (phase 3, A6).
 *
 * Mirrors `api/ingest.ts`'s per-key/per-IP bucket pattern exactly — same
 * shape, same sweeper — rather than inventing a second in-memory-limiter idiom
 * for the same problem.
 *
 * ## Why this exists alongside the per-IP limiter, not instead of it
 *
 * `authLoginLimiter` counts requests per IP. Distributed credential stuffing —
 * the attack OWASP A07 #1 opens with — spreads the same email across many IPs
 * precisely to stay under a per-IP budget. This counts by **account** instead,
 * so spreading the attempts across IPs no longer helps.
 *
 * ## Why it is a backstop, not a primary control — the threshold is deliberate
 *
 * A per-account counter that HARD-LOCKS on the correct password is itself a
 * denial-of-service tool: anyone who merely knows a victim's email can lock
 * them out by spamming wrong passwords from a botnet, and unlike a per-IP
 * limit that only inconveniences the attacker's own IP, this would inconvenience
 * the VICTIM. OWASP's own guidance names this trade-off directly ("be careful
 * not to create a denial of service scenario"). The threshold here is sized
 * high and the window long specifically so an ordinary user mistyping a
 * password, or even a determined-but-small brute-force attempt, never trips
 * it — its job is catching a genuinely large, distributed campaign, and that
 * residual DoS risk against a real target of such a campaign is accepted and
 * written down here rather than discovered later.
 */

const WINDOW_MS = parseInt(process.env.LOGIN_THROTTLE_WINDOW_MS || String(60 * 60_000), 10); // 60 min
const MAX_FAILURES = parseInt(process.env.LOGIN_THROTTLE_MAX_FAILURES || '30', 10);

interface Bucket {
    count: number;
    windowStart: number;
}

const buckets = new Map<string, Bucket>();

/** Case-insensitive: email addresses are not case-sensitive identities here. */
const keyOf = (email: string): string => email.trim().toLowerCase();

/** True when this account has already failed too many times this window. */
export function isThrottled(email: string): boolean {
    const b = buckets.get(keyOf(email));
    if (!b) return false;
    if (Date.now() - b.windowStart >= WINDOW_MS) return false;
    return b.count >= MAX_FAILURES;
}

/** Record a failed login attempt for this account. */
export function recordFailure(email: string): void {
    const key = keyOf(email);
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || now - b.windowStart >= WINDOW_MS) {
        buckets.set(key, { count: 1, windowStart: now });
        return;
    }
    b.count += 1;
}

/**
 * A successful login clears the account's counter. Without this, a legitimate
 * user's own mistyped attempts would keep compounding against them even after
 * they get it right — the counter exists to catch an attacker who never
 * succeeds, not to penalize a slow typist who eventually does.
 */
export function clearFailures(email: string): void {
    buckets.delete(keyOf(email));
}

/**
 * Unbounded Maps keyed by attacker-supplied values are a memory leak with
 * extra steps, same reasoning as `api/ingest.ts`'s sweeper. `unref()` so this
 * never holds the process open.
 */
const sweeper = setInterval(() => {
    const cutoff = Date.now() - WINDOW_MS * 2;
    for (const [key, b] of buckets) if (b.windowStart < cutoff) buckets.delete(key);
}, WINDOW_MS);
sweeper.unref();

/** Test seam — clears all state. Not used by application code. */
export function __resetLoginThrottle(): void {
    buckets.clear();
}

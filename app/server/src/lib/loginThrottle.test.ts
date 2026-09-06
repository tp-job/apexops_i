import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import type * as LoginThrottle from './loginThrottle';

// `WINDOW_MS`/`MAX_FAILURES` are read from env at module load, so they must be
// set BEFORE the import — a fresh, small window makes the sweeper and the
// window-rollover paths exercisable without a real hour passing. A dynamic
// import inside `beforeAll` (rather than a top-level `await import`, which
// this project's `tsconfig` target does not allow) is what lets the env be
// set first.
let mod: typeof LoginThrottle;

beforeAll(async () => {
    process.env.LOGIN_THROTTLE_WINDOW_MS = '1000';
    process.env.LOGIN_THROTTLE_MAX_FAILURES = '3';
    mod = await import('./loginThrottle');
});

describe('login throttle', () => {
    beforeEach(() => {
        mod.__resetLoginThrottle();
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('is not throttled with no history', () => {
        expect(mod.isThrottled('a@example.com')).toBe(false);
    });

    it('throttles once the failure count reaches the max', () => {
        mod.recordFailure('a@example.com');
        mod.recordFailure('a@example.com');
        expect(mod.isThrottled('a@example.com')).toBe(false); // 2 of 3
        mod.recordFailure('a@example.com');
        expect(mod.isThrottled('a@example.com')).toBe(true); // 3 of 3
    });

    it('keys are case-insensitive — the same account either way', () => {
        mod.recordFailure('A@Example.com');
        mod.recordFailure('a@example.com');
        mod.recordFailure('A@EXAMPLE.COM');
        expect(mod.isThrottled('a@example.com')).toBe(true);
    });

    it('does not throttle a DIFFERENT account sharing no history', () => {
        mod.recordFailure('a@example.com');
        mod.recordFailure('a@example.com');
        mod.recordFailure('a@example.com');
        expect(mod.isThrottled('a@example.com')).toBe(true);
        expect(mod.isThrottled('b@example.com')).toBe(false);
    });

    it('a successful login clears the counter — mistyping does not compound', () => {
        mod.recordFailure('a@example.com');
        mod.recordFailure('a@example.com');
        mod.clearFailures('a@example.com');
        mod.recordFailure('a@example.com');
        expect(mod.isThrottled('a@example.com')).toBe(false); // back to 1, not 3
    });

    it('the window rolls over — an old failure does not count forever', () => {
        mod.recordFailure('a@example.com');
        mod.recordFailure('a@example.com');
        mod.recordFailure('a@example.com');
        expect(mod.isThrottled('a@example.com')).toBe(true);

        vi.advanceTimersByTime(1500); // past the 1000ms test window
        expect(mod.isThrottled('a@example.com')).toBe(false);
    });

    it('clearing an account with no history is a no-op, not a throw', () => {
        expect(() => mod.clearFailures('never-failed@example.com')).not.toThrow();
    });
});

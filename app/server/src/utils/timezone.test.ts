import { describe, expect, it } from 'vitest';
import { resolveTimeZone, zonedDayOfMonth, zonedMonthRange, zonedTimeToUtc } from './timezone';

/**
 * Timezone resolution (spec E-D2).
 *
 * Named as "the first thing worth covering" in three consecutive sprints' gap
 * lists, and it earned that: this repo has already shipped a timezone bug once —
 * a JS `Date` bound into a raw query shifted every result by seven hours. A
 * regression here does not crash anything. It quietly moves every note on every
 * calendar to the wrong day, which is the kind of thing a user reports as "the
 * app feels wrong" six weeks later.
 */

describe('resolveTimeZone', () => {
    it('parses the display format actually stored in User.timezone', () => {
        // Rows hold "Asia/Bangkok (GMT+7)", not a bare IANA id. Forgetting that is
        // how the whole app silently falls back to UTC.
        expect(resolveTimeZone('Asia/Bangkok (GMT+7)')).toBe('Asia/Bangkok');
        expect(resolveTimeZone('America/Los_Angeles (GMT-8)')).toBe('America/Los_Angeles');
    });

    it('accepts a bare IANA identifier', () => {
        expect(resolveTimeZone('Europe/London')).toBe('Europe/London');
        expect(resolveTimeZone('UTC')).toBe('UTC');
    });

    it('falls back to UTC rather than throwing on anything unusable', () => {
        // Every one of these is a real possibility: a legacy row, a cleared field,
        // a hand-edited value, a typo.
        expect(resolveTimeZone(null)).toBe('UTC');
        expect(resolveTimeZone(undefined)).toBe('UTC');
        expect(resolveTimeZone('')).toBe('UTC');
        expect(resolveTimeZone('   ')).toBe('UTC');
        expect(resolveTimeZone('Not/AZone')).toBe('UTC');
        expect(resolveTimeZone('(GMT+7)')).toBe('UTC');
    });
});

describe('zonedDayOfMonth', () => {
    /**
     * The assertion Sprint 5 used to prove the timezone setting was real, kept
     * here so it survives without a browser: one instant, two zones, two calendar
     * days. If this ever returns the same day for both, the setting has silently
     * stopped meaning anything.
     */
    it('puts one instant on different days in different zones', () => {
        const instant = new Date('2026-08-10T02:00:00.000Z');
        expect(zonedDayOfMonth(instant, 'Asia/Bangkok')).toBe(10);       // 09:00 local
        expect(zonedDayOfMonth(instant, 'Pacific/Honolulu')).toBe(9);    // 16:00 previous day
        expect(zonedDayOfMonth(instant, 'UTC')).toBe(10);
    });

    it('handles an instant that is midnight exactly, in zone', () => {
        // Bangkok is UTC+7, so 17:00Z is 00:00 the next day — the boundary where
        // an off-by-one in the offset maths shows up.
        expect(zonedDayOfMonth(new Date('2026-08-09T17:00:00.000Z'), 'Asia/Bangkok')).toBe(10);
        expect(zonedDayOfMonth(new Date('2026-08-09T16:59:59.000Z'), 'Asia/Bangkok')).toBe(9);
    });
});

describe('zonedMonthRange', () => {
    it('bounds a month in the user zone, not the server zone', () => {
        const { start, end } = zonedMonthRange(2026, 8, 'Asia/Bangkok');
        // August starts at 00:00 Bangkok = 17:00 UTC on 31 July.
        expect(start.toISOString()).toBe('2026-07-31T17:00:00.000Z');
        expect(end.toISOString()).toBe('2026-08-31T17:00:00.000Z');
    });

    it('rolls over the year boundary in December', () => {
        // December's `end` needs year+1 and month 1. Getting this wrong produces a
        // range of zero length and an empty calendar exactly once a year, which is
        // the worst possible frequency for noticing.
        const { start, end } = zonedMonthRange(2026, 12, 'UTC');
        expect(start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
        expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
        expect(end.getTime()).toBeGreaterThan(start.getTime());
    });

    it('produces a non-empty range for every month of a year', () => {
        for (let month = 1; month <= 12; month++) {
            const { start, end } = zonedMonthRange(2026, month, 'Asia/Bangkok');
            expect(end.getTime()).toBeGreaterThan(start.getTime());
        }
    });
});

describe('zonedTimeToUtc', () => {
    it('is the inverse of reading the day back in the same zone', () => {
        const utc = zonedTimeToUtc(2026, 8, 10, 'Asia/Bangkok');
        expect(zonedDayOfMonth(utc, 'Asia/Bangkok')).toBe(10);
    });

    it('resolves across a DST transition without landing on the wrong day', () => {
        // New York moves to DST on 8 March 2026. A fixed-offset implementation
        // gets this wrong; deriving the offset from Intl does not.
        const before = zonedTimeToUtc(2026, 3, 7, 'America/New_York');
        const after = zonedTimeToUtc(2026, 3, 9, 'America/New_York');
        expect(zonedDayOfMonth(before, 'America/New_York')).toBe(7);
        expect(zonedDayOfMonth(after, 'America/New_York')).toBe(9);
    });
});

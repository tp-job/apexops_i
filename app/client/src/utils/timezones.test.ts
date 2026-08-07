import { describe, expect, it } from 'vitest';
import { TIMEZONES, timezoneOptions } from './timezones';

/**
 * The Preferences timezone list (spec E-D2).
 *
 * `timezoneOptions` exists for one reason: timezone was a **free-text input**
 * until Sprint 5, so rows in the wild hold values that are not on the curated
 * list. If the select silently dropped those, the control would render as "no
 * selection" and the first unrelated save would rewrite the user's timezone to
 * something they never chose — moving every date on their calendar.
 *
 * That is a data-loss bug that presents as a cosmetic one, which is why it is
 * worth a test rather than a comment.
 */

describe('timezoneOptions', () => {
    it('returns the plain list for a value already on it', () => {
        const options = timezoneOptions('Asia/Bangkok (GMT+7)');
        expect(options).toHaveLength(TIMEZONES.length);
        expect(options.some((o) => o.value === 'Asia/Bangkok (GMT+7)')).toBe(true);
    });

    it('keeps an unknown stored value selectable instead of dropping it', () => {
        const legacy = 'Mars/Olympus (GMT+25)';
        const options = timezoneOptions(legacy);
        expect(options[0].value).toBe(legacy);
        expect(options[0].label).toContain('current');
        expect(options).toHaveLength(TIMEZONES.length + 1);
    });

    it('returns the plain list for nothing stored, rather than throwing', () => {
        expect(timezoneOptions(undefined)).toHaveLength(TIMEZONES.length);
        expect(timezoneOptions(null)).toHaveLength(TIMEZONES.length);
        expect(timezoneOptions('')).toHaveLength(TIMEZONES.length);
    });

    it('never duplicates an entry', () => {
        const values = timezoneOptions('Europe/London (GMT+0)').map((o) => o.value);
        expect(new Set(values).size).toBe(values.length);
    });
});

describe('TIMEZONES', () => {
    it('has unique values and non-empty labels', () => {
        const values = TIMEZONES.map((t) => t.value);
        expect(new Set(values).size).toBe(values.length);
        expect(TIMEZONES.every((t) => t.label.trim().length > 0)).toBe(true);
    });

    it('carries values the server can parse back to an IANA zone', () => {
        // The server strips the " (GMT…)" suffix and hands the rest to Intl. A
        // label the server cannot parse falls back to UTC silently, so the two
        // ends have to agree about the format.
        for (const { value } of TIMEZONES) {
            const iana = value.split('(')[0].trim();
            expect(() => new Intl.DateTimeFormat('en-US', { timeZone: iana })).not.toThrow();
        }
    });
});

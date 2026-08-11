import { describe, expect, it } from 'vitest';
import { parseRouteId } from './routeParams';

describe('parseRouteId', () => {
    it('accepts a positive integer', () => {
        expect(parseRouteId('1')).toBe(1);
        expect(parseRouteId('42')).toBe(42);
        expect(parseRouteId(' 7 ')).toBe(7);
    });

    it('refuses a prefix that merely starts with digits', () => {
        // The whole reason this helper exists: `Number.parseInt` would return 3
        // here, and the route would read row 3 for a request that named no row.
        expect(parseRouteId('3abc')).toBeNull();
        expect(parseRouteId('3 OR 1=1')).toBeNull();
        expect(parseRouteId('3.9')).toBeNull();
        expect(parseRouteId('0x10')).toBeNull();
        expect(parseRouteId('1e3')).toBeNull();
    });

    it('refuses non-positive and non-numeric input', () => {
        expect(parseRouteId('0')).toBeNull();
        expect(parseRouteId('-1')).toBeNull();
        expect(parseRouteId('')).toBeNull();
        expect(parseRouteId('   ')).toBeNull();
        expect(parseRouteId(undefined)).toBeNull();
        expect(parseRouteId(null)).toBeNull();
        expect(parseRouteId({})).toBeNull();
        expect(parseRouteId(['1'])).toBeNull();
    });

    it('refuses ids past the safe integer range', () => {
        // Beyond 2^53 the value that arrives is not the value that was sent.
        expect(parseRouteId('9007199254740993')).toBeNull();
        expect(parseRouteId(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    });
});

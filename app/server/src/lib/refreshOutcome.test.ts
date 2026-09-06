import { describe, it, expect } from 'vitest';
import { decideRefreshOutcome, type RefreshRow } from './refreshOutcome';

const NOW = new Date('2026-09-06T12:00:00.000Z');
const LATER = new Date('2026-09-06T20:00:00.000Z');
const EARLIER = new Date('2026-09-06T04:00:00.000Z');

const row = (over: Partial<RefreshRow> = {}): RefreshRow => ({
    rotatedAt: null,
    expiresAt: LATER,
    absoluteExpiresAt: new Date('2026-09-13T12:00:00.000Z'),
    ...over,
});

const outcome = (r: RefreshRow | null) => decideRefreshOutcome({ row: r, now: NOW });

describe('decideRefreshOutcome — the happy path', () => {
    it('rotates a live row', () => {
        expect(outcome(row())).toEqual({ kind: 'rotate' });
    });

    it('rotates a row with no absolute cap — predates the column, treated as uncapped', () => {
        expect(outcome(row({ absoluteExpiresAt: null }))).toEqual({ kind: 'rotate' });
    });
});

describe('decideRefreshOutcome — reuse takes priority over everything else', () => {
    // THE case this file exists for.
    it('reports reuse for a tombstoned row, even though its own expiresAt is still in the future', () => {
        expect(outcome(row({ rotatedAt: EARLIER, expiresAt: LATER }))).toEqual({ kind: 'reuse' });
    });

    it('reports reuse even for a tombstoned row that also happens to be idle-expired', () => {
        expect(outcome(row({ rotatedAt: EARLIER, expiresAt: EARLIER }))).toEqual({ kind: 'reuse' });
    });

    it('reports reuse even for a tombstoned row past its absolute cap', () => {
        expect(outcome(row({ rotatedAt: EARLIER, absoluteExpiresAt: EARLIER }))).toEqual({ kind: 'reuse' });
    });
});

describe('decideRefreshOutcome — ordinary expiry, unaffected by phase 3', () => {
    it('reports not-found for no row at all', () => {
        expect(outcome(null)).toEqual({ kind: 'not-found' });
    });

    it('reports idle-expired for a live (non-tombstoned) row past its idle window', () => {
        expect(outcome(row({ expiresAt: EARLIER }))).toEqual({ kind: 'idle-expired' });
    });

    it('reports absolute-expired for a live row within its idle window but past its cap', () => {
        expect(outcome(row({ expiresAt: LATER, absoluteExpiresAt: EARLIER }))).toEqual({
            kind: 'absolute-expired',
        });
    });

    it('idle expiry is checked before the absolute cap, matching the pre-phase-3 order', () => {
        // Both would fire; idle-expired should win, exactly as it did before this
        // phase touched the file.
        expect(outcome(row({ expiresAt: EARLIER, absoluteExpiresAt: EARLIER }))).toEqual({
            kind: 'idle-expired',
        });
    });

    it('a boundary expiry (exactly now) counts as expired, not live', () => {
        expect(outcome(row({ expiresAt: NOW }))).toEqual({ kind: 'idle-expired' });
    });
});

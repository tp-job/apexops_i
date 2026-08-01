import crypto from 'crypto';

/**
 * Invite tokens: minted here, hashed here, compared here.
 *
 * Kept in one module because the three operations only stay correct together —
 * a second place that hashes with a different algorithm, or stores the plaintext
 * "just for debugging", turns a read of `project_invites` into workspace access.
 */

/** T-D1. A pending invite is standing access waiting to be claimed. */
export const INVITE_TTL_DAYS = 7;

/**
 * 32 bytes, base64url. Long enough that guessing is not a strategy, and URL-safe
 * so the link survives being pasted into a chat client that would escape `+/=`.
 */
export const generateInviteToken = (): string => crypto.randomBytes(32).toString('base64url');

/**
 * Same reasoning as a password hash, minus the work factor: the token is
 * high-entropy and random, so it needs no stretching against offline guessing —
 * only a one-way transform so the stored row cannot be replayed.
 */
export const hashInviteToken = (token: string): string =>
    crypto.createHash('sha256').update(token).digest('hex');

export const inviteExpiry = (from: Date = new Date()): Date =>
    new Date(from.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

/**
 * The invite is BOUND to this address (T-D1), and binding is only as reliable as
 * the comparison. Both sides — the stored invite and the accepting account's
 * email — go through this, so a trailing space or a capitalized domain cannot
 * make a legitimate invitee look like a stranger.
 */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/**
 * The link points at the **client**, not the API: `/invite/:token` is a screen
 * (G4), not an endpoint. Falls back to the same default the CORS origin uses, so
 * a dev box with no extra env still produces a link that works.
 */
export const buildInviteUrl = (token: string): string => {
    const base = process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
    return `${base.replace(/\/+$/, '')}/invite/${token}`;
};

/**
 * Client-side auth validation.
 *
 * **Mirrors `app/server/src/schemas/auth.schema.ts`.** If you change a rule there,
 * change it here — these are two hand-kept copies of one contract, and the failure
 * mode of drift is a user who passes client validation and gets a 400 they cannot
 * action.
 *
 * The durable fix is sharing the server's zod schemas with the client; that lands
 * with the full form kit (see `.agents/docs/sprint-1-thin-slice.md`). Until then,
 * these functions exist so the two auth forms don't each invent their own rules.
 */

/** Matches the server's `z.string().email().max(255)`. */
export function validateEmail(value: string): string | undefined {
    const email = value.trim();
    if (!email) return 'Email is required';
    if (email.length > 255) return 'Email must be at most 255 characters';
    // Deliberately permissive: the server's zod check is the authority. This only
    // catches the obvious typo before spending a round trip.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
    return undefined;
}

/** Matches the server's `passwordSchema` — 8-128, one upper, one lower, one digit. */
export function validatePassword(value: string): string | undefined {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (value.length > 128) return 'Password must be at most 128 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
    if (!/\d/.test(value)) return 'Password must contain at least one number';
    return undefined;
}

/**
 * Login only requires a non-empty password — the server's `loginSchema` does not
 * apply the strength rules there, and applying them client-side would lock out any
 * account created before the rules existed.
 */
export function validateLoginPassword(value: string): string | undefined {
    if (!value) return 'Password is required';
    if (value.length > 128) return 'Password must be at most 128 characters';
    return undefined;
}

/** Server: `firstName` max 100, and register refuses if neither firstName nor name is present. */
export function validateFirstName(value: string): string | undefined {
    const name = value.trim();
    if (!name) return 'First name is required';
    if (name.length > 100) return 'First name must be at most 100 characters';
    return undefined;
}

/** Last name is optional server-side; only the length cap is enforced. */
export function validateLastName(value: string): string | undefined {
    if (value.trim().length > 100) return 'Last name must be at most 100 characters';
    return undefined;
}

/**
 * True when every entry is undefined — i.e. the form has no blocking errors.
 *
 * Takes `object` rather than `Record<string, string | undefined>` on purpose: an
 * `interface` with fixed keys has no index signature and so is not assignable to
 * that record type, which would force every caller to redeclare its error shape as
 * a type alias just to call this.
 */
export function isClean(errors: object): boolean {
    return Object.values(errors).every((e) => e === undefined);
}

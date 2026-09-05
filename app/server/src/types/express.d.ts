declare namespace Express {
    interface Request {
        user?: {
            id: number;
            email: string;
            /**
             * The role **as the database holds it**, read by `authenticate` when it
             * validated this request's session (2026-09-06).
             *
             * It used to be the token's signed claim, and therefore display-only:
             * a demotion did not take effect until the token expired. Now the
             * session lookup returns the current role on every authenticated
             * request, so this is safe for `authorize()` to act on — and it does,
             * via `roleIsFresh`, rather than issuing a second identical query.
             */
            role: string;
            /**
             * Set when `role` came from the database on this request rather than
             * from the token. Absent means "not resolved" and any gate must read
             * it itself — the safe direction, since a missing flag causes an extra
             * query rather than a trusted stale claim.
             */
            roleIsFresh?: boolean;
            /**
             * Id of the `RefreshToken` row this session was issued from (spec D4).
             *
             * Two jobs. It lets the active-sessions list label "this device" and
             * refuse to revoke the session doing the asking — and, since
             * 2026-09-06, it is what `authenticate` looks the session up by, which
             * is what makes revoking a session end it immediately instead of eight
             * hours later.
             *
             * Still optional on the type because `JwtPayload` may not carry it;
             * `authenticate` rejects such a token rather than admitting one that
             * cannot be revoked.
             */
            sid?: number;
        };
    }
}

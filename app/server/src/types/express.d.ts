declare namespace Express {
    interface Request {
        user?: {
            id: number;
            email: string;
            /**
             * The role as it was when this token was SIGNED. Display only.
             *
             * `authorize()` deliberately does not read it — it resolves the role
             * from the database per request (spec D5), so a demotion takes effect
             * on the next call instead of whenever the token happens to expire.
             * Trusting this claim for an access decision is the bug that gate
             * exists to prevent.
             */
            role: string;
            /**
             * Id of the `RefreshToken` row this session was issued from (spec D4).
             * Lets the server tell which session is asking, so the active-sessions
             * list can label "this device" and refuse to revoke it.
             *
             * Optional: tokens minted before this landed carry no `sid`, and they
             * stay valid until they expire.
             */
            sid?: number;
        };
    }
}

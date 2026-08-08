import { describe, expect, it } from 'vitest';
import {
    decideMonitorAdmit,
    MONITOR_ERR_FORBIDDEN,
    MONITOR_ERR_UNAUTHENTICATED,
    type MonitorPrincipal,
} from './monitorAccess';

/**
 * Admission policy for the `monitors` room (F007, decision S9-D5).
 *
 * The failure this file exists to prevent is a **privilege gap**, not a crash:
 * the room admitted any signed-in user while carrying every target app's console
 * output. That kind of defect ships silently and is found by someone else, so the
 * signed-in-non-admin case below is the load-bearing test in this suite — F010's
 * reintroduced-bug proof reverts the role check and expects *that* case to go red.
 */

const admin = (over: Partial<MonitorPrincipal> = {}): MonitorPrincipal => ({
    exists: true,
    role: 'admin',
    isActive: true,
    ...over,
});

describe('decideMonitorAdmit', () => {
    it('admits an active admin', () => {
        expect(decideMonitorAdmit(admin())).toEqual({ ok: true });
    });

    it('refuses an anonymous socket, and says so distinctly', () => {
        // The SDK's target-app clients connect without a token by design, so this
        // path stays reachable — it must refuse rather than throw.
        expect(decideMonitorAdmit(null)).toEqual({
            ok: false,
            error: MONITOR_ERR_UNAUTHENTICATED,
        });
    });

    it('REFUSES A SIGNED-IN NON-ADMIN — the privilege gap this feature closes', () => {
        expect(decideMonitorAdmit(admin({ role: 'user' }))).toEqual({
            ok: false,
            error: MONITOR_ERR_FORBIDDEN,
        });
    });

    it('treats a null role as a normal user, never as an admin', () => {
        // A missing value must never widen access. This is the case a `!==` check
        // written against `undefined` gets wrong.
        expect(decideMonitorAdmit(admin({ role: null }))).toEqual({
            ok: false,
            error: MONITOR_ERR_FORBIDDEN,
        });
    });

    it('refuses a deactivated admin', () => {
        expect(decideMonitorAdmit(admin({ isActive: false }))).toEqual({
            ok: false,
            error: MONITOR_ERR_FORBIDDEN,
        });
    });

    it('refuses an admin whose user row no longer exists', () => {
        expect(decideMonitorAdmit(admin({ exists: false }))).toEqual({
            ok: false,
            error: MONITOR_ERR_FORBIDDEN,
        });
    });

    it('gives the same message to every non-auth refusal, so roles cannot be probed', () => {
        // A signed-in user must not be able to tell "not an admin" from
        // "deactivated" from "deleted" by opening sockets and reading the reason.
        const refusals = [
            decideMonitorAdmit(admin({ role: 'user' })),
            decideMonitorAdmit(admin({ isActive: false })),
            decideMonitorAdmit(admin({ exists: false })),
        ];
        expect(new Set(refusals.map((r) => (r.ok ? 'ok' : r.error))).size).toBe(1);
    });

    it('does not admit on a role that merely contains "admin"', () => {
        // Guards against a later refactor reaching for `.includes()`.
        for (const role of ['administrator', 'superadmin', 'admin ', 'Admin', 'ADMIN']) {
            expect(decideMonitorAdmit(admin({ role }))).toEqual({
                ok: false,
                error: MONITOR_ERR_FORBIDDEN,
            });
        }
    });
});

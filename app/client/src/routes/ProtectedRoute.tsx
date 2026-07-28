import type { FC } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';

/**
 * Gate for the workspace tree.
 *
 * Three states, and the middle one is the reason this isn't a one-liner: on a
 * reload the provider has to ask `GET /api/auth/profile` whether the stored token
 * is still good. Without an explicit loading state the guard would see
 * `user === null` for that beat, bounce to `/login`, then bounce back — a flash
 * that reads as a bug. So: wait, then decide.
 *
 * `state.from` carries where the user was actually headed, so signing in returns
 * them there instead of dumping them at the dashboard. `replace` keeps the
 * redirect out of history — otherwise Back lands on the guard and bounces again.
 *
 * This decides *what to show*. It is not access control; the API is, and every
 * endpoint already requires a bearer token.
 */
const ProtectedRoute: FC = () => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div
                className="grid min-h-screen place-items-center bg-light-bg dark:bg-dark-bg"
                role="status"
                aria-live="polite"
            >
                <span className="sr-only">Checking your session…</span>
                <span
                    className="h-8 w-8 animate-spin rounded-full border-2 border-brand-dark/15 border-t-brand-dark dark:border-white/15 dark:border-t-brand-accent"
                    aria-hidden
                />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;

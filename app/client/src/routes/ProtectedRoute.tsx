import type { FC, ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/common/alert/LoadingSpinner';

interface ProtectedRouteProps {
    children?: ReactNode;
    /** Allowed roles (e.g. ['admin','user']). If not set, any authenticated user can access. */
    allowedRoles?: string[];
}

/**
 * Protects routes so only authenticated users (and optionally specific roles) can access.
 * Use as <Route element={<ProtectedRoute />}> and nest routes inside; or wrap content with <ProtectedRoute><Layout /></ProtectedRoute>.
 * Redirects to /auth when not logged in, or to / when role is not allowed.
 */
export const ProtectedRoute: FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        const role = user.role ?? 'user';
        if (!allowedRoles.includes(role)) {
            return <Navigate to="/" replace />;
        }
    }

    return <>{children ?? <Outlet />}</>;
};

export default ProtectedRoute;

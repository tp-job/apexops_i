import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { FC } from 'react';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import DesignSystem from '@/pages/DesignSystem';
import AppLayout from '@/layouts/AppLayout';
import ProtectedRoute from '@/routes/ProtectedRoute';

/**
 * Routing surface, rebuilt after the 2026-07-24 UI teardown.
 *
 * Three trees:
 *  - **public** — `/` (landing) and `/design-system`: no chrome, no auth.
 *  - **auth** — `/login` and `/register`: no chrome, and they bounce a
 *    already-signed-in visitor onward themselves.
 *  - **workspace** — everything under `ProtectedRoute` → `AppLayout`, which owns
 *    the nav rail and top bar so pages never re-invent their own chrome.
 *
 * `/dashboard` is gated as of Sprint 1 (2026-07-25). The guard decides what to
 * *show*; the real boundary is still the API, where every endpoint requires a
 * bearer token.
 */
const AppRoutes: FC = () => (
    <Router>
        <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/design-system" element={<DesignSystem />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Workspace */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </Router>
);

export default AppRoutes;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { FC } from 'react';
import Home from '@/pages/Home';
import Dashboard from '@/pages/Dashboard';
import DesignSystem from '@/pages/DesignSystem';
import AppLayout from '@/layouts/AppLayout';

/**
 * Routing surface, rebuilt after the 2026-07-24 UI teardown.
 *
 * Two trees:
 *  - **public** — `/` (landing) and `/design-system`: no chrome, no auth.
 *  - **workspace** — everything nested under `AppLayout`, which owns the nav
 *    rail and top bar so pages never re-invent their own chrome.
 *
 * NOT YET GATED: `/dashboard` renders for anyone who visits it. `ProtectedRoute`
 * and the login screen are Phase 0/1 work (see `.agents/docs/development-plan.md`).
 * Until they land, the page's own `hasAuth` check is what a signed-out visitor
 * meets — that is a UX guard, not access control. The real boundary is the API,
 * where every endpoint already requires a bearer token.
 */
const AppRoutes: FC = () => (
    <Router>
        <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/design-system" element={<DesignSystem />} />

            {/* Workspace */}
            <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </Router>
);

export default AppRoutes;

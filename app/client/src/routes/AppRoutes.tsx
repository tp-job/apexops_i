import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { FC } from 'react';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import BugTracker from '@/pages/BugTracker';
import NotesCalendar from '@/pages/NotesCalendar';
import DailyNote from '@/pages/DailyNote';
import Chat from '@/pages/Chat';
import Projects from '@/pages/Projects';
import ProjectIssues from '@/pages/ProjectIssues';
import ProjectIssueDetail from '@/pages/ProjectIssueDetail';
import ProjectOverview from '@/pages/ProjectOverview';
import ProjectBoard from '@/pages/ProjectBoard';
import Settings from '@/pages/Settings';
import AdminUsers from '@/pages/AdminUsers';
import AdminConsole from '@/pages/AdminConsole';
import AdminDocs from '@/pages/AdminDocs';
import ProjectSettings from '@/pages/ProjectSettings';
import ProjectMembers from '@/pages/ProjectMembers';
import InviteAccept from '@/pages/InviteAccept';
import DesignSystem from '@/pages/DesignSystem';
import Docs from '@/pages/Docs';
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

            {/* Docs are public: whoever is pasting the SDK snippet into another
                app needs the install instructions, and gating them turns a
                one-line integration into a support conversation. */}
            {/* `/docs` renders the page rather than redirecting at config time:
                the default page is now the first row the server returns, so
                nothing here knows the slug until the list has loaded. */}
            <Route path="/docs" element={<Docs />} />
            <Route path="/docs/:slug" element={<Docs />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Workspace */}
            <Route element={<ProtectedRoute />}>
                {/* Inside the guard, outside the layout. The guard gives the
                    signed-out → login → back-to-this-URL path for free via
                    `state.from`; the layout is skipped because an invitee may
                    have no projects yet, so the nav rail and switcher would
                    render empty chrome around a single decision. */}
                <Route path="/invite/:token" element={<InviteAccept />} />

                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/bug-tracker" element={<BugTracker />} />
                    <Route path="/notes" element={<NotesCalendar />} />
                    {/* Same dataset as `/notes`, zoomed to one day. It is a
                        sibling route rather than a third mode of NotesCalendar
                        because the two answer different questions — "what have I
                        written" versus "what am I doing today" — and the day is
                        worth being a bookmarkable URL of its own. */}
                    <Route path="/daily" element={<DailyNote />} />
                    <Route path="/chat" element={<Chat />} />

                    {/* Project workspaces. The project lives in the URL, not a
                        store, so deep links, the back button and two tabs on two
                        projects all work without extra machinery. */}
                    <Route path="/projects" element={<Projects />} />
                    {/* Issues stays the landing route: during an incident "what is
                        broken" should cost zero clicks. Overview is one tab away. */}
                    <Route path="/p/:slug" element={<Navigate to="issues" replace />} />
                    <Route path="/p/:slug/overview" element={<ProjectOverview />} />
                    <Route path="/p/:slug/issues" element={<ProjectIssues />} />
                    <Route path="/p/:slug/issues/:id" element={<ProjectIssueDetail />} />
                    <Route path="/p/:slug/board" element={<ProjectBoard />} />

                    {/* Account settings. Alert preferences are NOT here — they are
                        per-project (spec S-D4) and live on /p/:slug/settings. */}
                    <Route path="/settings" element={<Settings />} />

                    {/* Instance administration, deliberately NOT under /settings:
                        S-D4's rule is that /settings is about *you*, and who may
                        sign in to this instance is not. The page refuses a
                        non-admin, and so does every route it calls. */}
                    <Route path="/admin/users" element={<AdminUsers />} />
                    {/* The docs CMS. Every route it calls is admin-gated
                        server-side; the page's own check is the fast path. */}
                    <Route path="/admin/docs" element={<AdminDocs />} />
                    {/* Live console feed. The room itself admits admins only
                        (S9-D5), so a non-admin who types this URL gets a refusal
                        on the wire rather than an empty panel that looks broken. */}
                    <Route path="/admin/console" element={<AdminConsole />} />
                    <Route path="/p/:slug/settings" element={<ProjectSettings />} />
                    <Route path="/p/:slug/members" element={<ProjectMembers />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </Router>
);

export default AppRoutes;

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense } from 'react';
import type { FC } from 'react';

// pages
import Dashboard from "@/pages/Dashboard";
import BugTrackerApp from "@/pages/BugTrackerApp";
import Chat from "@/pages/Chat";
import AIChat from "@/pages/AIChat";
import AccountSettings from "@/pages/AccountSettings";
import NotePage from "@/pages/NotePage";

// layout
import Layout from '@/layouts/Layout';

// common
import LoadingSpinner from '../components/common/alert/LoadingSpinner';
import NotFound from '@/components/common/client-error/NotFound';
import ServerError from "@/components/common/server-error/ServerError";
import ServiceUnavailable from "@/components/common/server-error/ServiceUnavailable";
import GatewayTimeout from "@/components/common/server-error/GatewayTimeout";
import Auth from "@/pages/Auth";
import Homepage from "@/pages/Homepage";
import NoteEditor from "@/components/ui/note/NoteEditor";
import Section from "@/components/card/Section";

const AppRoutes: FC = () => {
    return (
        <Router>
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route path="/" element={<Homepage />} />

                    {/* Pages with Layout */}
                    <Route element={<Layout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/bug-tracker" element={<BugTrackerApp />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/ai-chat" element={<AIChat />} />
                        <Route path="/account-settings" element={<AccountSettings />} />
                        <Route path="/note" element={<NotePage />} />
                        <Route path="/note-editor" element={<NoteEditor />} />
                    </Route>
                    
                    {/* Error pages without Layout */}
                    <Route path="/server-error" element={<ServerError />} />
                    <Route path="/service-unavailable" element={<ServiceUnavailable />} />
                    <Route path="/gateway-timeout" element={<GatewayTimeout />} />
                    
                    {/* 404 - must be last */}
                    <Route path="*" element={<NotFound />} />

                    {/* Auth pages without Layout */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/section" element={<Section />} />
                </Routes>
            </Suspense>
        </Router>
    );
};

export default AppRoutes;

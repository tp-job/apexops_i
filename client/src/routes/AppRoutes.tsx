import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense } from 'react';
import type { FC } from 'react';

// pages
import Dashboard from "@/pages/Dashboard";
import BugTrackerApp from "@/pages/BugTrackerApp";
import Chat from "@/pages/Chat";
import ChatOptimized from "@/pages/ChatOptimized";
import ChatNew from "@/pages/ChatNew";
import AIChat from "@/pages/AIChat";
import AccountSettings from "@/pages/AccountSettings";
import NotePage from "@/pages/NotePage";

// layout
import Layout from '@/layouts/Layout';
import LayoutAbout from '@/layouts/LayoutAbout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

// common
import LoadingSpinner from '../components/common/alert/LoadingSpinner';
import Not from '@/components/common/client-error/Not';
import ServerError from "@/components/common/server-error/ServerError";
import ServiceUnavailable from "@/components/common/server-error/ServiceUnavailable";
import GatewayTimeout from "@/components/common/server-error/GatewayTimeout";
import Auth from "@/pages/Auth";
import Homepage from "@/pages/Homepage";
import NoteEditor from "@/components/ui/note/NoteEditor";
import Section from "@/components/card/Section";
import Calendar from "@/pages/Calendar";
import OptimizationCalendar from "@/pages/OptimizationCalendar";
import AboutApp from "@/pages/feature/about/AboutApp";
import Documents from "@/pages/feature/about/Documents";
import Document from "@/pages/feature/about/Document";

const AppRoutes: FC = () => {
    return (
        <Router>
            <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                    <Route path="/" element={<Homepage />} />

                    {/* Protected: require login */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<Layout />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/bug-tracker" element={<BugTrackerApp />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/chat-optimized" element={<ChatOptimized />} />
                            <Route path="/chat/new" element={<ChatNew />} />
                            <Route path="/ai-chat" element={<AIChat />} />
                            <Route path="/account-settings" element={<AccountSettings />} />
                            <Route path="/note" element={<NotePage />} />
                            <Route path="/note-editor" element={<NoteEditor />} />
                            <Route path="/calendar" element={<Calendar />} />
                            <Route path="/optimization-calendar" element={<OptimizationCalendar />} />
                        </Route>
                        <Route element={<LayoutAbout />}>
                            <Route path="/about" element={<AboutApp />} />
                            <Route path="/about/docs" element={<Documents />} />
                            <Route path="/about/docs/:docId" element={<Document />} />
                        </Route>
                    </Route>
                    
                    {/* Error pages without Layout */}
                    <Route path="/server-error" element={<ServerError />} />
                    <Route path="/service-unavailable" element={<ServiceUnavailable />} />
                    <Route path="/gateway-timeout" element={<GatewayTimeout />} />
                    
                    {/* 404 - must be last */}
                    <Route path="*" element={<Not />} />

                    {/* Auth pages without Layout */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/section" element={<Section />} />
                </Routes>
            </Suspense>
        </Router>
    );
};

export default AppRoutes;

/**
 * App — Root Router
 *
 * Experience-driven flow:
 * Login → /dashboard (Control Center) → /create (Wizard) → /host/:id (Present)
 *       → /analytics/:id (Report) → /dashboard
 *
 * Public routes: /, /join, /join/:code, /play/:code, /auth/*
 * Protected routes: /dashboard, /create, /host/:id, /analytics/:id, /admin
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Public pages
import JoinPage from './components/participant/JoinPage';
import PlayPage from './components/participant/PlayPage';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';

// Protected pages
import Dashboard from './components/presenter/Dashboard';
import CreateSession from './pages/presenter/CreateSession';
import HostSession from './components/presenter/HostSession';
import AnalyticsPage from './pages/presenter/AnalyticsPage';
import AdminPage from './pages/admin/AdminPage';

// SEO & Public
import LandingPage from './pages/public/LandingPage';
import SEOHead from './components/seo/SEOHead';

function App() {
    return (
        <Router>
            <Routes>
                {/* ===== PUBLIC ROUTES ===== */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/join" element={<JoinPage />} />
                <Route path="/join/:code" element={<JoinPage />} />
                <Route path="/play/:code" element={<PlayPage />} />

                {/* Authentication */}
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/register" element={<RegisterPage />} />
                <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

                {/* ===== PROTECTED ROUTES ===== */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <SEOHead noindex />
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/create"
                    element={
                        <ProtectedRoute>
                            <SEOHead noindex />
                            <CreateSession />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/host/:sessionId"
                    element={
                        <ProtectedRoute>
                            <SEOHead noindex />
                            <HostSession />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/analytics/:sessionId"
                    element={
                        <ProtectedRoute>
                            <SEOHead noindex />
                            <AnalyticsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <SEOHead noindex />
                            <AdminPage />
                        </ProtectedRoute>
                    }
                />

                {/* ===== BACKWARD COMPAT REDIRECTS ===== */}
                <Route path="/library" element={<Navigate to="/dashboard" replace />} />
                <Route path="/host" element={<Navigate to="/dashboard" replace />} />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;

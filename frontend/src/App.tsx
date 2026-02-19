/**
 * Main App Component
 * Routes between join page, participant view, and presenter dashboard
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import JoinPage from './components/participant/JoinPage';
import PlayPage from './components/participant/PlayPage';
import PresenterDashboard from './components/presenter/Dashboard';
import HostSession from './components/presenter/HostSession';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

import LibraryPage from './pages/presenter/LibraryPage';

import AnalyticsPage from './pages/presenter/AnalyticsPage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Landing / Join page */}
                <Route path="/" element={<JoinPage />} />
                <Route path="/join" element={<JoinPage />} />
                <Route path="/join/:code" element={<JoinPage />} />

                {/* Participant play page */}
                <Route path="/play/:code" element={<PlayPage />} />

                {/* Authentication */}
                <Route path="/login/auth" element={<LoginPage />} />
                <Route path="/register/auth" element={<RegisterPage />} />
                <Route path="/forgot-password/auth" element={<ForgotPasswordPage />} />
                <Route path="/reset-password/auth" element={<ResetPasswordPage />} />

                {/* Presenter dashboard & Library */}
                <Route
                    path="/host"
                    element={
                        <ProtectedRoute>
                            <PresenterDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/library"
                    element={
                        <ProtectedRoute>
                            <LibraryPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/analytics/:sessionId"
                    element={
                        <ProtectedRoute>
                            <AnalyticsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/host/:sessionId"
                    element={
                        <ProtectedRoute>
                            <HostSession />
                        </ProtectedRoute>
                    }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;

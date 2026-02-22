/**
 * Dashboard — Enterprise Control Center
 * 
 * Flow: Login → HERE → Create/Edit → Present → Analytics → HERE
 * 
 * Sections:
 * 1. Hero (Welcome + CTA)
 * 2. Stats Cards (Sessions, Participants, Engagement, Drafts)
 * 3. Recent Sessions Grid (cards with status badges + quick actions)
 * 4. Empty State (when no sessions)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import DashboardLayout from '../../layouts/DashboardLayout';

type DashboardStats = {
    total_sessions: number;
    total_participants: number;
    avg_engagement_score: number;
    active_drafts: number;
};

type SessionItem = {
    id: string;
    title: string;
    status: 'active' | 'ended' | 'draft';
    created_at: string;
    mode: string;
};

function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        setError('');
        try {
            const [statsData, sessionsData] = await Promise.all([
                api.get('/analytics/dashboard'),
                api.get('/library'),
            ]);
            setStats(statsData);
            setSessions(Array.isArray(sessionsData) ? sessionsData.slice(0, 6) : []);
        } catch (err: any) {
            setError(err.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'active': return 'status-badge status-badge-active';
            case 'ended': return 'status-badge status-badge-ended';
            default: return 'status-badge status-badge-draft';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Live';
            case 'ended': return 'Completed';
            default: return 'Draft';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <DashboardLayout>
            {/* Hero Section */}
            <header className="page-header mb-xl">
                <div>
                    <h1 className="text-3xl font-bold mb-xs">Welcome back, {user?.displayName?.split(' ')[0] || 'there'} 👋</h1>
                    <p className="text-muted">Here's what's happening with your sessions.</p>
                </div>
            </header>

            {/* Stats Cards */}
            <section className="stat-cards mb-xl">
                <div className="stat-card">
                    <div className="stat-card-label">Sessions Created</div>
                    <div className="stat-card-value">{loading ? '...' : (stats?.total_sessions || 0)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-label">Participants Engaged</div>
                    <div className="stat-card-value">{loading ? '...' : (stats?.total_participants || 0)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-label">Avg Engagement</div>
                    <div className="stat-card-value">{loading ? '...' : (stats?.avg_engagement_score || 0)}%</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-label">Active Drafts</div>
                    <div className="stat-card-value">{loading ? '...' : (stats?.active_drafts || 0)}</div>
                </div>
            </section>

            {/* Error */}
            {error && (
                <div className="card mb-md border-error p-md flex flex-col items-start gap-sm">
                    <p className="text-error">{error}</p>
                    <button className="btn btn-secondary btn-small" onClick={loadDashboard}>
                        Retry
                    </button>
                </div>
            )}

            {/* Recent Sessions */}
            {!loading && sessions.length > 0 && (
                <section>
                    <div className="section-header mb-md">
                        <h2 className="text-xl font-bold">Recent Sessions</h2>
                        <button className="btn btn-secondary btn-small" onClick={() => navigate('/library')}>
                            View All
                        </button>
                    </div>
                    <div className="session-grid">
                        {sessions.map((session) => (
                            <motion.div
                                key={session.id}
                                className="session-card"
                                whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
                                onClick={() => navigate(`/host/${session.id}`)}
                            >
                                <div className="session-card-header">
                                    <h3 className="session-card-title">{session.title}</h3>
                                    <span className={getStatusBadgeClass(session.status)}>
                                        {getStatusLabel(session.status)}
                                    </span>
                                </div>
                                <div className="session-card-meta">
                                    <span>{formatDate(session.created_at)}</span>
                                    <span className="dot">•</span>
                                    <span className="capitalize">{session.mode.replace('_', ' ')}</span>
                                </div>
                                <div className="session-card-actions" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        className="btn btn-primary btn-small"
                                        onClick={() => navigate(`/host/${session.id}`)}
                                    >
                                        Present
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-small"
                                        onClick={() => navigate(`/analytics/${session.id}`)}
                                    >
                                        Analytics
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>
            )}

            {/* Empty State */}
            {!loading && sessions.length === 0 && !error && (
                <div className="empty-state card py-2xl text-center">
                    <div className="empty-state-icon text-5xl mb-md">📋</div>
                    <h3 className="text-2xl font-bold mb-xs">No sessions yet</h3>
                    <p className="text-muted mb-lg mx-auto" style={{ maxWidth: '400px' }}>
                        Create your first session to start engaging your audience with live polls, quizzes, and word clouds.
                    </p>
                    <button className="btn btn-primary" onClick={() => navigate('/create')}>
                        Create Your First Session
                    </button>
                </div>
            )}
        </DashboardLayout>
    );
}

export default Dashboard;

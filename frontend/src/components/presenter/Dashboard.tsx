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
import { api } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import AppLayout from '../../layouts/AppLayout';

interface DashboardStats {
    total_sessions: number;
    total_participants: number;
    avg_engagement_score: number;
    active_drafts: number;
}

interface SessionItem {
    id: string;
    title: string;
    mode: string;
    status: string;
    join_code: string;
    created_at: string;
    participant_count?: number;
}

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
        <AppLayout>
            {/* Hero Section */}
            <section className="dashboard-hero">
                <h1>Welcome back, {user?.displayName?.split(' ')[0] || 'there'} 👋</h1>
                <p>Create engaging sessions and track participation in real time.</p>
                <div className="dashboard-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/create')}
                    >
                        + Create New Session
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/templates')}
                    >
                        Browse Templates
                    </button>
                </div>
            </section>

            {/* Stats Cards */}
            <section className="stat-cards">
                {loading ? (
                    <>
                        <div className="stat-card"><div className="skeleton skeleton-text-lg"></div><div className="skeleton skeleton-stat"></div></div>
                        <div className="stat-card"><div className="skeleton skeleton-text-lg"></div><div className="skeleton skeleton-stat"></div></div>
                        <div className="stat-card"><div className="skeleton skeleton-text-lg"></div><div className="skeleton skeleton-stat"></div></div>
                        <div className="stat-card"><div className="skeleton skeleton-text-lg"></div><div className="skeleton skeleton-stat"></div></div>
                    </>
                ) : (
                    <>
                        <div className="stat-card">
                            <div className="stat-card-label">Sessions Created</div>
                            <div className="stat-card-value">{stats?.total_sessions || 0}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-label">Participants Engaged</div>
                            <div className="stat-card-value">{stats?.total_participants || 0}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-label">Avg Engagement</div>
                            <div className="stat-card-value">{stats?.avg_engagement_score || 0}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-label">Active Drafts</div>
                            <div className="stat-card-value">{stats?.active_drafts || 0}</div>
                        </div>
                    </>
                )}
            </section>

            {/* Error */}
            {error && (
                <div className="card mb-md border-error">
                    <p className="text-error">{error}</p>
                    <button className="btn btn-secondary btn-small mt-sm" onClick={loadDashboard}>
                        Retry
                    </button>
                </div>
            )}

            {/* Recent Sessions */}
            {!loading && sessions.length > 0 && (
                <section>
                    <div className="section-header">
                        <h2>Recent Sessions</h2>
                        <button className="btn btn-secondary btn-small" onClick={() => navigate('/library')}>
                            View All
                        </button>
                    </div>
                    <div className="session-grid">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className="session-card"
                                onClick={() => navigate(`/host/${session.id}`)}
                            >
                                <div className="session-card-header">
                                    <div className="session-card-title">{session.title}</div>
                                    <span className={getStatusBadgeClass(session.status)}>
                                        {getStatusLabel(session.status)}
                                    </span>
                                </div>
                                <div className="session-card-meta">
                                    <span>{formatDate(session.created_at)}</span>
                                    <span>•</span>
                                    <span>{session.mode}</span>
                                    {session.join_code && (
                                        <>
                                            <span>•</span>
                                            <span className="text-bold font-mono">{session.join_code}</span>
                                        </>
                                    )}
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
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Empty State */}
            {!loading && sessions.length === 0 && !error && (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3>No sessions yet</h3>
                    <p>Create your first session to start engaging your audience with live polls, quizzes, and word clouds.</p>
                    <div className="dashboard-actions justify-center">
                        <button className="btn btn-primary" onClick={() => navigate('/create')}>
                            Create Your First Session
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/templates')}>
                            Start from Template
                        </button>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

export default Dashboard;

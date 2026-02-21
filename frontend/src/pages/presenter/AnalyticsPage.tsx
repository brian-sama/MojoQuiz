/**
 * AnalyticsPage — Session Performance Report
 * 
 * Flow: Dashboard → HERE
 * 
 * Features:
 * 1. Summary Cards (Participants, Score, Engagement, etc.)
 * 2. Leaderboard (Participant rankings)
 * 3. Engagement Chart (Bar chart by question)
 * 4. Question Breakdown (Detailed responses)
 * 5. Data Export (CSV/JSON)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../hooks/useApi';
import AppLayout from '../../layouts/AppLayout';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const AnalyticsPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (sessionId) fetchReport();
    }, [sessionId]);

    const fetchReport = async () => {
        setLoading(true);
        setError('');
        try {
            const report = await api.get(`/analytics/${sessionId}`);
            setData(report);
        } catch (err) {
            setError('Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format: 'csv' | 'json') => {
        setExporting(true);
        try {
            const result = await api.get(`/analytics/${sessionId}/export?format=${format}`);
            if (format === 'json') {
                const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `session-report-${sessionId}.json`;
                a.click();
            } else {
                // For CSV, the backend might return a string or we handle the blob
                const blob = new Blob([result], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `session-report-${sessionId}.csv`;
                a.click();
            }
        } catch (err) {
            alert('Failed to export data');
        } finally {
            setExporting(false);
        }
    };

    if (loading) return (
        <AppLayout>
            <div className="dashboard-hero">
                <h1>Analysing Results...</h1>
                <div className="skeleton skeleton-text-lg"></div>
            </div>
            <div className="stat-cards">
                <div className="stat-card"><div className="skeleton skeleton-stat"></div></div>
                <div className="stat-card"><div className="skeleton skeleton-stat"></div></div>
                <div className="stat-card"><div className="skeleton skeleton-stat"></div></div>
                <div className="stat-card"><div className="skeleton skeleton-stat"></div></div>
            </div>
        </AppLayout>
    );

    if (error || !data) return (
        <AppLayout>
            <div className="empty-state">
                <div className="empty-state-icon">⚠️</div>
                <h3>{error || 'Report not found'}</h3>
                <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                    Back to Dashboard
                </button>
            </div>
        </AppLayout>
    );

    const { session, participants, questions, responses, engagementScore } = data;

    // Prepare chart data
    const participationData = questions.map((q: any) => ({
        name: q.question_text.length > 20 ? q.question_text.substring(0, 20) + '...' : q.question_text,
        responses: q.responseCount || 0
    }));

    return (
        <AppLayout>
            <section className="dashboard-hero">
                <div className="flex justify-between items-start">
                    <div>
                        <h1>Session Report</h1>
                        <p>{session.title} • {new Date(session.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="dashboard-actions">
                        <button
                            className="btn btn-secondary btn-small"
                            onClick={() => handleExport('json')}
                            disabled={exporting}
                        >
                            JSON Export
                        </button>
                        <button
                            className="btn btn-secondary btn-small"
                            onClick={() => handleExport('csv')}
                            disabled={exporting}
                        >
                            CSV Export
                        </button>
                    </div>
                </div>
            </section>

            <section className="stat-cards">
                <div className="stat-card">
                    <div className="stat-card-label">Total Participants</div>
                    <div className="stat-card-value">{participants.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-label">Engagement Score</div>
                    <div className="stat-card-value text-primary">{Math.round(engagementScore || 0)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-label">Questions</div>
                    <div className="stat-card-value">{questions.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-label">Completion Rate</div>
                    <div className="stat-card-value">
                        {participants.length > 0 ? Math.round((responses.length / (participants.length * (questions.length || 1))) * 100) + '%' : '0%'}
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-2 gap-xl mb-xl">
                {/* Leaderboard Section */}
                <div className="card p-lg">
                    <h2 className="mb-md text-bold" style={{ fontSize: 'var(--font-size-xl)' }}>Leaderboard</h2>
                    <div className="flex flex-col gap-sm">
                        {participants
                            .sort((a: any, b: any) => b.total_score - a.total_score)
                            .slice(0, 10)
                            .map((p: any, idx: number) => (
                                <div key={p.id} className="leaderboard-row">
                                    <div className="flex items-center gap-md">
                                        <span className={`leaderboard-rank text-bold text-sm ${idx < 3 ? 'leaderboard-rank-top' : 'leaderboard-rank-other'}`}>
                                            {idx + 1}
                                        </span>
                                        <span className="text-bold">{p.nickname}</span>
                                    </div>
                                    <span className="text-bold text-primary">{p.total_score} pts</span>
                                </div>
                            ))}
                        {participants.length === 0 && <p className="text-muted">No participants joined this session.</p>}
                    </div>
                </div>

                {/* Participation Chart */}
                <div className="card p-lg">
                    <h2 className="mb-md text-bold" style={{ fontSize: 'var(--font-size-xl)' }}>Engagement per Question</h2>
                    <div className="w-full" style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={participationData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="var(--color-text-secondary)" fontSize={12} />
                                <YAxis stroke="var(--color-text-secondary)" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--color-surface)',
                                        borderColor: 'var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--color-text-primary)'
                                    }}
                                />
                                <Bar dataKey="responses" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Question Breakdown */}
            <section>
                <h2 className="mb-md text-bold" style={{ fontSize: 'var(--font-size-xl)' }}>Question Breakdown</h2>
                <div className="flex flex-col gap-md">
                    {questions.map((q: any, idx: number) => (
                        <div key={q.id} className="card p-lg">
                            <div className="flex justify-between items-start mb-md">
                                <h3 className="text-bold text-lg">Q{idx + 1}: {q.question_text}</h3>
                                <span className="status-badge status-badge-draft">{q.question_type}</span>
                            </div>
                            <div>
                                <p className="text-muted text-sm mb-md">
                                    {q.responseCount || 0} total responses
                                </p>
                                {q.question_type === 'poll' && q.options && (
                                    <div className="flex flex-col gap-md">
                                        {q.options.map((opt: string, optIdx: number) => {
                                            const count = (q as any).extraData?.[optIdx] || 0;
                                            const pct = q.responseCount > 0 ? Math.round((count / q.responseCount) * 100) : 0;
                                            return (
                                                <div key={optIdx}>
                                                    <div className="flex justify-between items-center mb-xs text-sm">
                                                        <span>{opt}</span>
                                                        <span className="text-bold">{pct}%</span>
                                                    </div>
                                                    <div className="progress-track">
                                                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </AppLayout>
    );
};

export default AnalyticsPage;

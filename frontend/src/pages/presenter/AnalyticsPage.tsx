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
import DashboardLayout from '../../layouts/DashboardLayout';
import { motion } from 'framer-motion';
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
            setError('Failed to load report. Infrastructure might be busy.');
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
        <DashboardLayout>
            <div className="mb-xl flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold mb-xs">Analysing Results...</h1>
                    <p className="text-muted">Fetching audience engagement data...</p>
                </div>
            </div>
            <div className="stat-cards mb-xl">
                <div className="stat-card"><div className="skeleton h-12 w-full"></div></div>
                <div className="stat-card"><div className="skeleton h-12 w-full"></div></div>
                <div className="stat-card"><div className="skeleton h-12 w-full"></div></div>
                <div className="stat-card"><div className="skeleton h-12 w-full"></div></div>
            </div>
        </DashboardLayout>
    );

    if (error || !data) return (
        <DashboardLayout>
            <div className="empty-state card py-2xl text-center shadow-premium">
                <div className="empty-state-icon text-5xl mb-md">⚠️</div>
                <h3 className="text-2xl font-bold mb-md">{error || 'Report not found'}</h3>
                <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                    Return to Dashboard
                </button>
            </div>
        </DashboardLayout>
    );

    const { session, participants, questions, responses, engagementScore } = data;

    // Prepare chart data
    const participationData = questions.map((q: any) => ({
        name: q.question_text.length > 20 ? q.question_text.substring(0, 20) + '...' : q.question_text,
        responses: q.responseCount || 0
    }));

    return (
        <DashboardLayout>
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <header className="mb-xl flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold mb-xs">Session Analytics</h1>
                        <p className="text-muted">{session.title} • {new Date(session.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-sm">
                        <button
                            className="btn btn-secondary btn-small"
                            onClick={() => handleExport('json')}
                            disabled={exporting}
                        >
                            Export JSON
                        </button>
                        <button
                            className="btn btn-secondary btn-small"
                            onClick={() => handleExport('csv')}
                            disabled={exporting}
                        >
                            Export CSV
                        </button>
                    </div>
                </header>

                <section className="stat-cards mb-xl">
                    <div className="stat-card border-l-4 border-primary">
                        <div className="stat-card-label">Reach</div>
                        <div className="stat-card-value">{participants.length} <span className="text-sm font-normal text-muted">People</span></div>
                    </div>
                    <div className="stat-card border-l-4 border-[#ff4757]">
                        <div className="stat-card-label">Engagement</div>
                        <div className="stat-card-value text-[#ff4757]">{Math.round(engagementScore || 0)}%</div>
                    </div>
                    <div className="stat-card border-l-4 border-secondary">
                        <div className="stat-card-label">Completion</div>
                        <div className="stat-card-value">
                            {participants.length > 0 ? Math.round((responses.length / (participants.length * (questions.length || 1))) * 100) + '%' : '0%'}
                        </div>
                    </div>
                    <div className="stat-card border-l-4 border-warning">
                        <div className="stat-card-label">Questions</div>
                        <div className="stat-card-value">{questions.length}</div>
                    </div>
                </section>

                <div className="grid grid-cols-2 gap-xl mb-xl">
                    <div className="card shadow-premium p-xl">
                        <h3 className="font-bold mb-lg">Engagement Per Question</h3>
                        <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={participationData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: 'var(--color-text-secondary)' }} />
                                    <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{ fill: 'var(--color-text-secondary)' }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            boxShadow: 'var(--shadow-premium)'
                                        }}
                                    />
                                    <Bar dataKey="responses" fill="var(--color-primary)" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="card shadow-premium p-xl">
                        <h3 className="font-bold mb-lg">Audience Leaderboard</h3>
                        <div className="flex flex-col gap-sm">
                            {participants
                                .sort((a: any, b: any) => b.total_score - a.total_score)
                                .slice(0, 6)
                                .map((p: any, idx: number) => (
                                    <div key={p.id} className="flex items-center justify-between p-md bg-bg-alt rounded-xl">
                                        <div className="flex items-center gap-md">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-warning text-white' : 'bg-primary/10 text-primary'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className="font-bold">{p.nickname}</span>
                                        </div>
                                        <span className="font-black text-primary">{p.total_score} <span className="text-[10px] font-normal uppercase">Pts</span></span>
                                    </div>
                                ))}
                            {participants.length === 0 && (
                                <div className="text-center py-xl text-muted text-sm">Waiting for participant data...</div>
                            )}
                        </div>
                    </div>
                </div>

                <section className="mb-2xl">
                    <h3 className="font-bold mb-lg">Question Breakdown</h3>
                    <div className="flex flex-col gap-lg">
                        {questions.map((q: any, idx: number) => (
                            <div key={q.id} className="card shadow-premium p-xl border-t-2 border-primary/20">
                                <div className="flex justify-between items-start mb-xl">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-xs">Question {idx + 1}</span>
                                        <h4 className="text-xl font-bold">{q.question_text}</h4>
                                    </div>
                                    <span className="status-badge status-badge-draft px-md py-xs">{q.question_type.replace('_', ' ')}</span>
                                </div>

                                {q.question_type === 'poll' && q.options && (
                                    <div className="grid grid-cols-1 gap-md">
                                        {q.options.map((opt: string, optIdx: number) => {
                                            const count = (q as any).extraData?.[optIdx] || 0;
                                            const pct = q.responseCount > 0 ? Math.round((count / q.responseCount) * 100) : 0;
                                            return (
                                                <div key={optIdx} className="relative overflow-hidden p-md rounded-xl border border-border">
                                                    <div
                                                        className="absolute top-0 left-0 h-full bg-primary/5 transition-all duration-1000"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                    <div className="relative flex justify-between items-center">
                                                        <span className="font-semibold text-sm">{opt}</span>
                                                        <div className="flex items-center gap-md">
                                                            <span className="text-muted text-xs">{count} Votes</span>
                                                            <span className="font-bold text-primary">{pct}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </motion.div>
        </DashboardLayout>
    );
};

export default AnalyticsPage;

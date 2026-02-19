import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../hooks/useApi';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const AnalyticsPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchReport();
    }, [sessionId]);

    const fetchReport = async () => {
        try {
            const report = await api.get(`/analytics/${sessionId}`);
            setData(report);
        } catch (err) {
            setError('Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="page-centered">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    if (error || !data) return <div className="page-centered text-error">{error || 'Report not found'}</div>;

    const { session, participants, questions, responses } = data;

    // Prepare chart data for a selected question or overall participation
    const participationData = questions.map((q: any) => ({
        name: q.question_text.length > 20 ? q.question_text.substring(0, 20) + '...' : q.question_text,
        responses: q.responseCount
    }));

    return (
        <div className="page">
            <header className="auth-header py-md px-lg flex justify-between items-center bg-dark-soft border-b border-white-10">
                <Link to="/library" className="btn btn-secondary py-xs px-sm text-sm">← Back to Library</Link>
                <h1 className="text-lg font-bold">Session Report: {session.title}</h1>
                <div className="text-secondary text-sm">{new Date(session.created_at).toLocaleDateString()}</div>
            </header>

            <main className="container mt-xl pb-xxl">
                {/* Summary Dash */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-md mb-xl">
                    <StatCard label="Total Participants" value={participants.length} />
                    <StatCard label="Total Responses" value={responses.length} />
                    <StatCard label="Questions" value={questions.length} />
                    <StatCard label="Completion Rate" value={participants.length > 0 ? Math.round((responses.length / (participants.length * questions.length)) * 100) + '%' : '0%'} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
                    {/* Leaderboard Section */}
                    <div className="card p-lg">
                        <h2 className="text-xl font-bold mb-lg">Leaderboard</h2>
                        <div className="leaderboard-list">
                            {participants
                                .sort((a: any, b: any) => b.total_score - a.total_score)
                                .map((p: any, idx: number) => (
                                    <div key={p.id} className="flex justify-between items-center py-md border-b border-white-10 last:border-0">
                                        <div className="flex items-center gap-md">
                                            <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${idx < 3 ? 'bg-primary text-white' : 'bg-dark-soft text-secondary'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className="font-medium">{p.nickname}</span>
                                        </div>
                                        <span className="font-bold text-primary">{p.total_score} pts</span>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Participation Chart */}
                    <div className="card p-lg">
                        <h2 className="text-xl font-bold mb-lg">Engagement per Question</h2>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={participationData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="name" stroke="#999" fontSize={12} />
                                    <YAxis stroke="#999" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333' }}
                                        itemStyle={{ color: '#3B82F6' }}
                                    />
                                    <Bar dataKey="responses" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Detailed Question Breakdown */}
                <div className="mt-xl">
                    <h2 className="text-xl font-bold mb-lg">Question Breakdown</h2>
                    <div className="space-y-md">
                        {questions.map((q: any, idx: number) => (
                            <div key={q.id} className="card p-lg">
                                <div className="flex justify-between items-start mb-md">
                                    <h3 className="text-lg font-bold">Q{idx + 1}: {q.question_text}</h3>
                                    <span className="badge badge-secondary">{q.question_type}</span>
                                </div>
                                <div className="flex gap-xl items-center">
                                    <div className="w-2/3">
                                        {/* Simplified result display */}
                                        <p className="text-secondary text-sm mb-sm">{q.responseCount} total responses</p>
                                        {q.question_type === 'poll' && q.options && (
                                            <div className="space-y-sm">
                                                {q.options.map((opt: string, optIdx: number) => {
                                                    const count = q.extraData?.[optIdx] || 0;
                                                    const pct = q.responseCount > 0 ? Math.round((count / q.responseCount) * 100) : 0;
                                                    return (
                                                        <div key={optIdx}>
                                                            <div className="flex justify-between text-sm mb-xs">
                                                                <span>{opt}</span>
                                                                <span>{pct}%</span>
                                                            </div>
                                                            <div className="progress-bar h-2">
                                                                <div
                                                                    className="progress-bar-fill h-full"
                                                                    style={{ '--progress-width': `${pct}%` } as React.CSSProperties}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

const StatCard = ({ label, value }: { label: string, value: any }) => (
    <div className="card p-lg text-center">
        <p className="text-secondary text-sm mb-xs uppercase tracking-wider font-bold">{label}</p>
        <p className="text-3xl font-bold text-primary">{value}</p>
    </div>
);

export default AnalyticsPage;

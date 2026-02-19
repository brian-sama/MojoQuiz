import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';

const LibraryPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'my-sessions' | 'templates'>('my-sessions');

    useEffect(() => {
        fetchSessions();
    }, [activeTab]);

    const fetchSessions = async () => {
        setLoading(true);
        setError('');
        try {
            const endpoint = activeTab === 'my-sessions' ? '/library' : '/library/templates';
            const data = await api.get(endpoint);
            setSessions(data);
        } catch (err: any) {
            setError('Failed to load sessions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this session?')) return;
        try {
            await api.delete(`/library/${id}`);
            setSessions(sessions.filter(s => s.id !== id));
        } catch (err) {
            alert('Failed to delete session');
        }
    };

    const handleDuplicate = async (id: string) => {
        try {
            const newSession = await api.post(`/library/${id}/duplicate`, {});
            setSessions([newSession, ...sessions]);
        } catch (err) {
            alert('Failed to duplicate session');
        }
    };

    return (
        <div className="page">
            <header className="auth-header py-md px-lg flex justify-between items-center bg-dark-soft border-b border-white-10">
                <Link to="/host" className="logo-text text-lg">MojoQuiz</Link>
                <div className="flex items-center gap-md">
                    <span className="text-secondary text-sm">Hi, {user?.displayName}</span>
                    <button onClick={logout} className="btn btn-secondary py-xs px-sm text-sm">Logout</button>
                    {user?.avatarUrl && <img src={user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full" />}
                </div>
            </header>

            <main className="container mt-xl">
                <div className="flex justify-between items-center mb-lg">
                    <h1 className="text-2xl font-bold">Your Library</h1>
                    <Link to="/host" className="btn btn-primary">Create New</Link>
                </div>

                <div className="tabs mb-lg border-b border-white-10">
                    <button
                        className={`tab-item pb-sm px-md ${activeTab === 'my-sessions' ? 'border-b-2 border-primary text-primary' : 'text-secondary'}`}
                        onClick={() => setActiveTab('my-sessions')}
                    >
                        My Sessions
                    </button>
                    <button
                        className={`tab-item pb-sm px-md ${activeTab === 'templates' ? 'border-b-2 border-primary text-primary' : 'text-secondary'}`}
                        onClick={() => setActiveTab('templates')}
                    >
                        Templates
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-xl">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : error ? (
                    <div className="alert alert-error">{error}</div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-xl bg-dark-soft rounded-lg">
                        <p className="text-secondary mb-md">No sessions found.</p>
                        <Link to="/host" className="btn btn-primary">Start your first session</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                        {sessions.map((session) => (
                            <div key={session.id} className="card p-lg flex flex-col justify-between hover:border-primary transition-colors">
                                <div>
                                    <div className="flex justify-between items-start mb-sm">
                                        <span className="badge badge-primary uppercase text-xs tracking-widest">{session.mode}</span>
                                        <span className="text-secondary text-xs">{new Date(session.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-md line-clamp-2">{session.title}</h3>
                                </div>

                                <div className="flex gap-sm mt-lg">
                                    <button
                                        onClick={() => navigate(`/host/${session.id}`)}
                                        className="btn btn-primary flex-1 py-sm text-sm"
                                    >
                                        Launch
                                    </button>
                                    <button
                                        onClick={() => navigate(`/analytics/${session.id}`)}
                                        className="btn btn-secondary py-sm px-md text-sm"
                                        title="View Analytics"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDuplicate(session.id)}
                                        className="btn btn-secondary py-sm px-md text-sm"
                                        title="Duplicate"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(session.id)}
                                        className="btn btn-error py-sm px-md text-sm"
                                        title="Delete"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default LibraryPage;

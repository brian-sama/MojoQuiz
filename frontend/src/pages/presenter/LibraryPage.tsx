import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
};

const LibraryPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'my-sessions' | 'templates'>('my-sessions');

    // Enterprise Data Table State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
    const [filterMode, setFilterMode] = useState<string>('all');

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

    // Sorting and Filtering Logic
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredAndSortedSessions = useMemo(() => {
        let result = [...sessions];

        // 1. Filter by Search Query
        if (searchQuery) {
            result = result.filter(s =>
                s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.mode.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // 2. Filter by Mode
        if (filterMode !== 'all') {
            result = result.filter(s => s.mode === filterMode);
        }

        // 3. Sort
        result.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];

            if (!valA || !valB) return 0;

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [sessions, searchQuery, sortConfig, filterMode]);

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

            <main className="container mt-xl" style={{ maxWidth: '1200px' }}>
                <div className="flex justify-between items-center mb-lg">
                    <h1 className="text-2xl font-bold">Session Library</h1>
                    <Link to="/host" className="btn btn-primary">Create New Session</Link>
                </div>

                <div className="tabs mb-lg border-b border-white-10">
                    <button
                        className={`tab-item pb-sm px-md ${activeTab === 'my-sessions' ? 'border-b-2 border-primary text-primary' : 'text-secondary font-medium'}`}
                        onClick={() => setActiveTab('my-sessions')}
                    >
                        My Sessions
                    </button>
                    <button
                        className={`tab-item pb-sm px-md ${activeTab === 'templates' ? 'border-b-2 border-primary text-primary' : 'text-secondary font-medium'}`}
                        onClick={() => setActiveTab('templates')}
                    >
                        Sample Templates
                    </button>
                </div>

                {/* Table Controls */}
                <div className="table-controls mb-md card p-md">
                    <div className="search-input-wrapper flex-1">
                        <input
                            type="text"
                            className="input"
                            placeholder="Search by title or mode..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-md">
                        <select
                            className="input w-auto"
                            value={filterMode}
                            onChange={(e) => setFilterMode(e.target.value)}
                        >
                            <option value="all">All Modes</option>
                            <option value="quiz">Quiz</option>
                            <option value="poll">Poll</option>
                            <option value="word_cloud">Word Cloud</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-xl">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                ) : error ? (
                    <div className="alert alert-error">{error}</div>
                ) : filteredAndSortedSessions.length === 0 ? (
                    <div className="text-center py-xl bg-dark-soft rounded-lg card">
                        <p className="text-secondary mb-md">No sessions matching your criteria.</p>
                        <button onClick={() => { setSearchQuery(''); setFilterMode('all'); }} className="btn btn-secondary">Clear Filters</button>
                    </div>
                ) : (
                    <div className="data-table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('title')}>
                                        Session Title
                                        {sortConfig.key === 'title' && <span className="table-sort-icon active">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                    </th>
                                    <th onClick={() => handleSort('mode')}>
                                        Mode
                                        {sortConfig.key === 'mode' && <span className="table-sort-icon active">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                    </th>
                                    <th onClick={() => handleSort('created_at')}>
                                        Created Date
                                        {sortConfig.key === 'created_at' && <span className="table-sort-icon active">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                                    </th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedSessions.map((session) => (
                                    <tr key={session.id}>
                                        <td className="font-bold">{session.title}</td>
                                        <td>
                                            <span className={`badge-mode badge-mode-${session.mode}`}>
                                                {session.mode}
                                            </span>
                                        </td>
                                        <td className="text-secondary text-sm">
                                            {new Date(session.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="action-cell">
                                            <button
                                                onClick={() => navigate(`/host/${session.id}`)}
                                                className="btn btn-primary btn-small"
                                            >
                                                Launch
                                            </button>
                                            <button
                                                onClick={() => navigate(`/analytics/${session.id}`)}
                                                className="btn btn-secondary btn-icon btn-small"
                                                title="Analytics"
                                            >
                                                📊
                                            </button>
                                            <button
                                                onClick={() => handleDuplicate(session.id)}
                                                className="btn btn-secondary btn-icon btn-small"
                                                title="Duplicate"
                                            >
                                                📋
                                            </button>
                                            <button
                                                onClick={() => handleDelete(session.id)}
                                                className="btn btn-danger btn-icon btn-small"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
};

export default LibraryPage;

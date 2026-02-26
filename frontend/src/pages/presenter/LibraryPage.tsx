import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../hooks/useApi';

import DashboardLayout from '../../layouts/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';

const LibraryPage: React.FC<{ defaultTab?: 'my-sessions' | 'templates' }> = ({ defaultTab }) => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'my-sessions' | 'templates'>(defaultTab || 'my-sessions');

    // Enterprise Data Table State
    const [searchQuery, setSearchQuery] = useState('');
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

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this session?')) return;
        try {
            await api.delete(`/library/${id}`);
            setSessions(sessions.filter(s => s.id !== id));
        } catch (err) {
            alert('Failed to delete session');
        }
    };

    const handleDuplicate = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            const newSession = await api.post(`/library/${id}/duplicate`, {});
            setSessions([newSession, ...sessions]);
        } catch (err) {
            alert('Failed to duplicate session');
        }
    };

    const filteredSessions = useMemo(() => {
        let result = [...sessions];

        if (searchQuery) {
            result = result.filter(s =>
                s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.mode.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (filterMode !== 'all') {
            result = result.filter(s => s.mode === filterMode);
        }

        return result;
    }, [sessions, searchQuery, filterMode]);

    return (
        <DashboardLayout>
            <div className="library-header flex justify-between items-center mb-xl">
                <div>
                    <h1 className="text-3xl font-bold mb-xs">Your Library</h1>
                    <p className="text-muted">Manage and launch your interactive sessions.</p>
                </div>
            </div>

            <div className="tabs mb-lg flex gap-md border-b border-border">
                <button
                    className={`tab-btn pb-sm px-sm font-semibold transition-all ${activeTab === 'my-sessions' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-text'}`}
                    onClick={() => setActiveTab('my-sessions')}
                >
                    My Sessions
                </button>
                <button
                    className={`tab-btn pb-sm px-sm font-semibold transition-all ${activeTab === 'templates' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-text'}`}
                    onClick={() => setActiveTab('templates')}
                >
                    Sample Templates
                </button>
            </div>

            <div className="library-controls mb-xl flex flex-wrap gap-md items-center">
                <div className="search-box flex-1 min-w-[300px]">
                    <input
                        type="text"
                        className="input"
                        placeholder="Search sessions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-box">
                    <select
                        className="input w-auto"
                        value={filterMode}
                        onChange={(e) => setFilterMode(e.target.value)}
                        title="Filter by mode"
                    >
                        <option value="all">All Types</option>
                        <option value="quiz">Quiz</option>
                        <option value="poll">Poll</option>
                        <option value="word_cloud">Word Cloud</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-2xl">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : error ? (
                <div className="alert alert-error card p-md border-error text-error">{error}</div>
            ) : filteredSessions.length === 0 ? (
                <div className="empty-library card py-2xl text-center">
                    <p className="text-muted mb-md">No sessions found matching your search.</p>
                    <button onClick={() => { setSearchQuery(''); setFilterMode('all'); }} className="btn btn-secondary">Clear Filters</button>
                </div>
            ) : (
                <div className="session-grid">
                    <AnimatePresence>
                        {filteredSessions.map((session) => (
                            <motion.div
                                key={session.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileHover={{ y: -5, boxShadow: 'var(--shadow-z4)' }}
                                className="session-card group"
                                onClick={() => navigate(`/host/${session.id}`)}
                            >
                                <div className="session-card-header mb-sm">
                                    <h3 className="session-card-title font-bold text-lg group-hover:text-primary transition-colors">
                                        {session.title}
                                    </h3>
                                    <span className={`status-badge status-badge-${session.status === 'active' || session.status === 'live' ? 'active' : 'draft'}`}>
                                        {session.status === 'active' || session.status === 'live' ? 'Live' : 'Draft'}
                                    </span>
                                </div>

                                <div className="session-card-meta flex gap-md text-sm text-muted mb-lg">
                                    <span className="flex items-center gap-xs">🏷️ {session.mode.replace('_', ' ')}</span>
                                    <span className="flex items-center gap-xs">📅 {new Date(session.created_at).toLocaleDateString()}</span>
                                </div>

                                <div className="session-card-footer flex justify-between items-center mt-auto">
                                    <div className="flex gap-xs">
                                        <button
                                            onClick={(e) => handleDuplicate(e, session.id)}
                                            className="btn btn-secondary btn-icon btn-small"
                                            title="Duplicate"
                                        >
                                            📋
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, session.id)}
                                            className="btn btn-secondary btn-icon btn-small hover:bg-error/10 hover:text-error"
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <button
                                        className="btn btn-primary btn-small shadow-sm"
                                        onClick={() => navigate(`/host/${session.id}`)}
                                    >
                                        Launch
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </DashboardLayout>
    );
};

export default LibraryPage;

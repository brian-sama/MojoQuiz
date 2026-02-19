/**
 * Presenter Dashboard Component
 * Create and manage sessions
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';

function PresenterDashboard() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [title, setTitle] = useState('');
    const [mode, setMode] = useState<'mentimeter' | 'kahoot'>('mentimeter');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('Please enter a session title');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const presenterId = user?.displayName || 'Guest Presenter';
            const data = await api.createSession(title.trim(), mode, presenterId, user?.id);

            // Store session info
            localStorage.setItem('currentSession', JSON.stringify(data));

            // Navigate to host session view
            navigate(`/host/${data.sessionId}`);

        } catch (err: any) {
            setError(err.message || 'Failed to create session');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page page-centered">
            <div className="container container-sm">
                <div className="flex justify-between items-center mb-xl">
                    <div className="text-left">
                        <h1 className="app-title">
                            Create Session
                        </h1>
                        <p className="text-muted">
                            Start a live engagement session for your audience
                        </p>
                    </div>
                    {user && (
                        <div className="flex items-center gap-md">
                            <div className="text-right">
                                <p className="font-bold">{user.displayName}</p>
                                <button onClick={logout} className="link text-sm">Logout</button>
                            </div>
                            {user.avatarUrl && (
                                <img src={user.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full" />
                            )}
                        </div>
                    )}
                </div>

                <form onSubmit={handleCreateSession} className="card">
                    <div className="mb-lg">
                        <label htmlFor="session-title" className="form-label">
                            Session Title
                        </label>
                        <input
                            id="session-title"
                            type="text"
                            className="input"
                            placeholder="e.g., Team Meeting Feedback"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={100}
                            autoFocus
                        />
                    </div>

                    <div className="mb-lg">
                        <label className="form-label">
                            Session Mode
                        </label>
                        <div className="flex gap-sm flex-wrap">
                            <ModeButton
                                selected={mode === 'mentimeter'}
                                onClick={() => setMode('mentimeter')}
                                icon=""
                                label="Engagement"
                                description="Polls, Word Clouds, Scale"
                            />
                            <ModeButton
                                selected={mode === 'kahoot'}
                                onClick={() => setMode('kahoot')}
                                icon=""
                                label="Quiz"
                                description="Timed Questions, Leaderboard"
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="error-text text-center mb-md">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-large btn-block"
                        disabled={loading || !title.trim()}
                    >
                        {loading ? 'Creating...' : 'Create Session'}
                    </button>
                </form>

                <div className="text-center mt-xl">
                    <button
                        onClick={() => navigate('/')}
                        className="btn btn-secondary"
                    >
                        Join as participant
                    </button>
                </div>
            </div>
        </div>
    );
}

interface ModeButtonProps {
    selected: boolean;
    onClick: () => void;
    icon: string;
    label: string;
    description: string;
}

function ModeButton({ selected, onClick, icon, label, description }: ModeButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`mode-button ${selected ? 'mode-button-selected' : ''}`}
        >
            <span className="mode-button-icon">{icon}</span>
            <p className="mode-button-label">{label}</p>
            <p className="mode-button-desc">{description}</p>
        </button>
    );
}

export default PresenterDashboard;

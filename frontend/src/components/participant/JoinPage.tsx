/**
 * Join Page Component
 * Entry point for participants to join a session
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../hooks/useApi';

function JoinPage() {
    const { code: urlCode } = useParams<{ code: string }>();
    const navigate = useNavigate();

    const [joinCode, setJoinCode] = useState(urlCode || '');
    const [nickname, setNickname] = useState('');
    const [step, setStep] = useState<'code' | 'nickname'>('code');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionTitle, setSessionTitle] = useState('');

    // Check for code in URL on mount
    useEffect(() => {
        if (urlCode && urlCode.length === 6) {
            validateCode(urlCode);
        }
    }, [urlCode]);

    // Validate join code
    const validateCode = async (code: string) => {
        setLoading(true);
        setError('');

        try {
            const data = await api.validateSession(code);
            setSessionTitle(data.title);
            setJoinCode(code.toUpperCase());
            setStep('nickname');
        } catch (err: any) {
            setError(err.message || 'Session not found');
        } finally {
            setLoading(false);
        }
    };

    // Handle code submission
    const handleCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanCode = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (cleanCode.length !== 6) {
            setError('Please enter a 6-character code');
            return;
        }

        validateCode(cleanCode);
    };

    // Handle nickname submission
    const handleNicknameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanNickname = nickname.trim();

        if (cleanNickname.length < 2) {
            setError('Nickname must be at least 2 characters');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = await api.joinSession(joinCode, cleanNickname);

            // Store participant info in session storage
            sessionStorage.setItem('nickname', cleanNickname);
            sessionStorage.setItem('participantId', data.participantId);
            sessionStorage.setItem('participantToken', data.token);
            sessionStorage.setItem('sessionId', data.sessionId);

            // Navigate to play page
            navigate(`/play/${joinCode}`);
        } catch (err: any) {
            setError(err.message || 'Failed to join session');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page page-centered">
            <div className="container">
                <div className="text-center mb-lg">
                    <h1 className="app-title">
                        Engage
                    </h1>
                    <p className="text-muted">
                        Join the live session
                    </p>
                </div>

                {step === 'code' ? (
                    <form onSubmit={handleCodeSubmit} className="card animate-fade-in">
                        <h2 className="text-center mb-lg">Enter Code</h2>

                        <input
                            type="text"
                            className="input input-large mb-md"
                            placeholder="A3B7K9"
                            value={joinCode}
                            onChange={(e) => {
                                setJoinCode(e.target.value.toUpperCase());
                                setError('');
                            }}
                            maxLength={6}
                            autoFocus
                            autoComplete="off"
                        />

                        {error && (
                            <p className="error-text mb-md">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-large btn-block"
                            disabled={loading || joinCode.length < 6}
                        >
                            {loading ? 'Checking...' : 'Join Session'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleNicknameSubmit} className="card animate-fade-in">
                        <div className="text-center mb-lg">
                            <p className="text-muted mb-md">Joining</p>
                            <h2>{sessionTitle}</h2>
                        </div>

                        <input
                            type="text"
                            className="input mb-md"
                            placeholder="Enter your nickname"
                            value={nickname}
                            onChange={(e) => {
                                setNickname(e.target.value);
                                setError('');
                            }}
                            maxLength={30}
                            autoFocus
                            autoComplete="off"
                        />

                        {error && (
                            <p className="error-text mb-md">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary btn-large btn-block"
                            disabled={loading || nickname.trim().length < 2}
                        >
                            {loading ? 'Joining...' : 'Join'}
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary btn-block mt-md"
                            onClick={() => {
                                setStep('code');
                                setJoinCode('');
                                setError('');
                            }}
                        >
                            ← Different Code
                        </button>
                    </form>
                )}

                <div className="text-center mt-xl">
                    <a
                        href="/host"
                        className="text-muted link-underline"
                    >
                        Create a session →
                    </a>
                </div>
            </div>
        </div>
    );
}

export default JoinPage;

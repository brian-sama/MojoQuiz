/**
 * Play Page Component
 * Main participant view for answering questions
 * Uses Pusher for real-time updates and PHP API for data
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSocket from '../../hooks/useSocket';
import { api } from '../../hooks/useApi';
import type { Question, ResponseSubmittedEvent } from '../../types';
import PollQuestion from './PollQuestion';
import WordCloudInput from './WordCloudInput';
import ScaleQuestion from './ScaleQuestion';
import QuizQuestion from './QuizQuestion';
import RankingQuestion from './RankingQuestion';
import PinImageQuestion from './PinImageQuestion';

function PlayPage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const { isConnected, on, off, emit } = useSocket();

    const [sessionId, setSessionId] = useState('');
    const [sessionTitle, setSessionTitle] = useState('');
    const [participantId, setParticipantId] = useState('');
    const [participantCount, setParticipantCount] = useState(0);
    const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
    const [hasResponded, setHasResponded] = useState(false);
    const [responseResult, setResponseResult] = useState<ResponseSubmittedEvent | null>(null);
    const [error, setError] = useState('');
    const [waiting, setWaiting] = useState(true);
    const [loading, setLoading] = useState(true);

    // Load session info from storage and subscribe to Pusher
    useEffect(() => {
        const storedSessionId = sessionStorage.getItem('sessionId');
        const storedParticipantId = sessionStorage.getItem('participantId');

        if (!storedSessionId || !storedParticipantId) {
            // Not properly joined, redirect to join page
            navigate(`/join/${code}`);
            return;
        }

        setSessionId(storedSessionId);
        setParticipantId(storedParticipantId);

        // Fetch session details
        const loadSession = async () => {
            try {
                const data = await api.getSessionDetails(storedSessionId);
                setSessionTitle(data.session.title);
                setParticipantCount(data.participantCount || 0);

                // Check for active question
                const active = data.active_question || (data.questions && data.questions.find((q: any) => q.status === 'active'));
                if (active) {
                    setActiveQuestion(transformQuestion(active));
                    setWaiting(false);
                }

                setLoading(false);
            } catch (err: any) {
                setError(err.message || 'Failed to load session');
                setLoading(false);
            }
        };

        loadSession();
    }, [code, navigate]);

    // Subscribe to Socket.IO events
    useEffect(() => {
        if (!sessionId || !isConnected) return;

        // Join the session via Socket.IO
        const storedCookieId = localStorage.getItem('participantCookie') || 'temp-cookie';
        const nickname = sessionStorage.getItem('nickname') || '';

        emit('join_session', {
            join_code: code,
            cookie_id: storedCookieId,
            nickname
        });

        // Listen for confirmation
        on('session_joined', (data: any) => {
            setParticipantCount(data.participant_count);
            if (data.active_question) {
                setActiveQuestion(transformQuestion(data.active_question));
                setWaiting(false);
            }
        });

        // Bind to events
        on('question_activated', (data: any) => {
            setActiveQuestion(transformQuestion(data.question));
            setHasResponded(false);
            setResponseResult(null);
            setWaiting(false);
        });

        on('participant_joined', (data: any) => {
            setParticipantCount(data.participant_count);
        });

        on('participant_left', (data: any) => {
            setParticipantCount(data.participant_count);
        });

        on('participant_removed', (data: any) => {
            if (data.participant_id === participantId) {
                setError('You have been removed from the session');
            }
        });

        on('question_locked', (data: any) => {
            if (activeQuestion && activeQuestion.id === data.question_id) {
                setActiveQuestion(prev => prev ? { ...prev, is_locked: data.is_locked } : null);
            }
        });

        on('results_revealed', (data: any) => {
            if (activeQuestion && activeQuestion.id === data.question_id) {
                setActiveQuestion(prev => prev ? { ...prev, is_results_visible: true } : null);
                // Results are usually for presenter but could be shown to participants too
            }
        });

        on('response_submitted', (data: any) => {
            setResponseResult({
                success: data.success,
                question_id: data.question_id,
                participant_id: participantId,
                is_correct: data.is_correct,
                score: data.score,
                points_earned: data.score,
                total_score: 0,
                correct_answer_ids: [],
            });
        });

        on('session_ended', () => {
            setWaiting(true);
            setActiveQuestion(null);
            setError('Session has ended');
        });

        return () => {
            off('session_joined');
            off('question_activated');
            off('participant_joined');
            off('participant_left');
            off('participant_removed');
            off('question_locked');
            off('results_revealed');
            off('session_ended');
        };
    }, [sessionId, isConnected, on, off, emit, participantId, activeQuestion, code]);

    // Handle body class for mobile app feel
    useEffect(() => {
        document.body.classList.add('participant-view');
        return () => {
            document.body.classList.remove('participant-view');
        };
    }, []);

    // Transform response to frontend format
    const transformQuestion = (q: any): Question => ({
        id: q.id,
        session_id: q.session_id,
        question_type: q.question_type || q.type,
        question_text: q.question_text || q.title,
        description: q.description || '',
        options: q.options || [],
        settings: q.settings || {},
        display_order: q.display_order || 0,
        order_index: q.order_index,
        time_limit: q.time_limit || q.settings?.time_limit || null,
        is_active: q.status === 'active',
        is_locked: q.status === 'locked' || q.is_locked,
        is_results_visible: q.status === 'revealed',
        started_at: q.started_at,
        response_count: q.response_count || 0,
    });

    // Submit response via Socket.IO
    const submitResponse = useCallback((responseData: any) => {
        if (!activeQuestion || !sessionId || !participantId) return;

        emit('submit_response', {
            question_id: activeQuestion.id,
            response_data: {
                option_index: responseData.option_index ?? responseData,
                response_time_ms: responseData.response_time_ms || 0
            }
        });

        setHasResponded(true);
    }, [activeQuestion, sessionId, participantId, emit]);

    // Submit words for word cloud
    const submitWords = useCallback((words: string[]) => {
        if (!activeQuestion || !sessionId || !participantId) return;

        emit('submit_words', {
            question_id: activeQuestion.id,
            words
        });

        setHasResponded(true);
    }, [activeQuestion, sessionId, participantId, emit]);

    // Submit text response
    const submitText = useCallback((content: string) => {
        if (!activeQuestion || !sessionId || !participantId) return;

        emit('submit_text', {
            question_id: activeQuestion.id,
            content
        });

        setHasResponded(true);
    }, [activeQuestion, sessionId, participantId, emit]);

    // Submit scale response
    const submitScale = useCallback((value: number) => {
        if (!activeQuestion || !sessionId || !participantId) return;

        emit('submit_response', {
            question_id: activeQuestion.id,
            response_data: { value }
        });

        setHasResponded(true);
    }, [activeQuestion, sessionId, participantId, emit]);

    // Render question based on type
    const renderQuestion = () => {
        if (!activeQuestion) return null;

        switch (activeQuestion.question_type) {
            case 'poll':
                return (
                    <PollQuestion
                        question={activeQuestion}
                        onSubmit={submitResponse}
                        disabled={hasResponded || activeQuestion.is_locked}
                        hasResponded={hasResponded}
                    />
                );

            case 'word_cloud':
                return (
                    <WordCloudInput
                        question={activeQuestion}
                        onSubmit={submitWords}
                        disabled={hasResponded || activeQuestion.is_locked}
                        hasResponded={hasResponded}
                    />
                );

            case 'scale':
                return (
                    <ScaleQuestion
                        question={activeQuestion}
                        onSubmit={(data) => submitScale(data.value)}
                        disabled={hasResponded || activeQuestion.is_locked}
                        hasResponded={hasResponded}
                    />
                );

            case 'ranking':
                return (
                    <RankingQuestion
                        question={activeQuestion}
                        onSubmit={submitResponse}
                        disabled={hasResponded || activeQuestion.is_locked}
                        hasResponded={hasResponded}
                    />
                );

            case 'pin_image':
                return (
                    <PinImageQuestion
                        question={activeQuestion}
                        onSubmit={submitResponse}
                        disabled={hasResponded || activeQuestion.is_locked}
                        hasResponded={hasResponded}
                    />
                );

            case 'quiz_mc':
            case 'quiz_tf':
                return (
                    <QuizQuestion
                        question={activeQuestion}
                        onSubmit={submitResponse}
                        disabled={hasResponded || activeQuestion.is_locked}
                        hasResponded={hasResponded}
                        result={responseResult}
                    />
                );

            case 'open_ended':
                return (
                    <div className="card animate-slide-up">
                        <h3 className="mb-lg">{activeQuestion.question_text}</h3>
                        <textarea
                            className="input textarea-noresize"
                            placeholder="Type your response..."
                            rows={4}
                            maxLength={500}
                            disabled={hasResponded || activeQuestion.is_locked}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                    submitText((e.target as HTMLTextAreaElement).value);
                                }
                            }}
                        />
                        {!hasResponded && !activeQuestion.is_locked && (
                            <button
                                className="btn btn-primary btn-block mt-md"
                                onClick={(e) => {
                                    const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                                    if (textarea.value.trim()) {
                                        submitText(textarea.value.trim());
                                    }
                                }}
                            >
                                Submit
                            </button>
                        )}
                        {hasResponded && (
                            <p className="text-center text-muted mt-md">✓ Response submitted!</p>
                        )}
                    </div>
                );

            default:
                return (
                    <div className="card text-center">
                        <p>Unknown question type</p>
                    </div>
                );
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="page page-centered">
                <div className="text-center">
                    <div className="animate-pulse mb-md emoji-large">Offline</div>
                    <p>Loading session...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="page page-centered">
                <div className="card text-center">
                    <div className="emoji-large mb-md">Not Found</div>
                    <h3>Oops!</h3>
                    <p className="text-muted mt-md">{error}</p>
                    <button
                        className="btn btn-primary mt-lg"
                        onClick={() => navigate('/')}
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // Waiting state
    if (waiting || !activeQuestion) {
        return (
            <div className="page page-centered">
                <div className="text-center">
                    <h2 className="mb-md">{sessionTitle || 'Loading...'}</h2>
                    <div className="animate-pulse mb-lg emoji-xlarge">Waiting...</div>
                    <p className="text-muted">Waiting for the host to start...</p>
                    <p className="text-muted mt-md text-sm">
                        {participantCount} participant{participantCount !== 1 ? 's' : ''} online
                    </p>
                    {!isConnected && (
                        <p className="text-warning mt-md">Reconnecting...</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="participant-container">
            <header className="participant-header">
                <div>
                    <h3 className="text-sm font-semibold">{sessionTitle || 'MojoQuiz'}</h3>
                    <div className="text-xs text-muted">Join Code: {code?.toUpperCase()}</div>
                </div>
                <div className="flex items-center gap-sm">
                    <span className="text-sm">Participants: {participantCount}</span>
                </div>
            </header>

            <main className="participant-main">
                <div className="question-card-mobile animate-slide-up">
                    {renderQuestion()}
                </div>
            </main>

            <footer className="participant-footer">
                <div className="mb-xs">MojoQuiz • Interactive Engagement</div>
                {!isConnected && <div className="text-warning">Connecting...</div>}
                {hasResponded && <div className="text-success">✓ Response Submitted</div>}
            </footer>
        </div>
    );
}

export default PlayPage;

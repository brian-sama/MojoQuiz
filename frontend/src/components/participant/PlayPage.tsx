/**
 * Play Page Component
 * Main participant view for answering questions
 * Uses Pusher for real-time updates and PHP API for data
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import usePusher, { api } from '../../hooks/usePusher';
import type { Question, ResponseSubmittedEvent } from '../../types';
import PollQuestion from './PollQuestion';
import WordCloudInput from './WordCloudInput';
import ScaleQuestion from './ScaleQuestion';
import QuizQuestion from './QuizQuestion';

function PlayPage() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const { isConnected, subscribe, unsubscribe, bind, unbind } = usePusher();

    // State
    const [sessionId, setSessionId] = useState('');
    const [sessionTitle, setSessionTitle] = useState('');
    const [participantId, setParticipantId] = useState('');
    const [participantToken, setParticipantToken] = useState('');
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
        const storedToken = sessionStorage.getItem('participantToken');

        if (!storedSessionId || !storedParticipantId || !storedToken) {
            // Not properly joined, redirect to join page
            navigate(`/join/${code}`);
            return;
        }

        setSessionId(storedSessionId);
        setParticipantId(storedParticipantId);
        setParticipantToken(storedToken);

        // Fetch session details
        const loadSession = async () => {
            try {
                const data = await api.getSessionDetails(storedSessionId);
                setSessionTitle(data.session.title);
                setParticipantCount(data.participants.length);

                // Check for active question
                const active = data.questions.find((q: any) => q.status === 'active');
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

    // Subscribe to Pusher channel
    useEffect(() => {
        if (!sessionId || !isConnected) return;

        const channelName = `session-${sessionId}`;
        subscribe(channelName);

        // Bind to events
        bind(channelName, 'question-activated', (data: any) => {
            setActiveQuestion(transformQuestion(data.question));
            setHasResponded(false);
            setResponseResult(null);
            setWaiting(false);
        });

        bind(channelName, 'participant-joined', (data: any) => {
            setParticipantCount(data.count);
        });

        bind(channelName, 'participant-removed', (data: any) => {
            if (data.participantId === participantId) {
                setError('You have been removed from the session');
            }
        });

        bind(channelName, 'voting-locked', (data: any) => {
            if (activeQuestion && activeQuestion.id === data.questionId) {
                setActiveQuestion({ ...activeQuestion, is_locked: true });
            }
        });

        bind(channelName, 'results-revealed', (data: any) => {
            if (activeQuestion && activeQuestion.id === data.questionId) {
                setActiveQuestion({ ...activeQuestion, is_results_visible: true });
            }
        });

        bind(channelName, 'session-ended', () => {
            setWaiting(true);
            setActiveQuestion(null);
            setError('Session has ended');
        });

        return () => {
            unbind(channelName, 'question-activated');
            unbind(channelName, 'participant-joined');
            unbind(channelName, 'participant-removed');
            unbind(channelName, 'voting-locked');
            unbind(channelName, 'results-revealed');
            unbind(channelName, 'session-ended');
            unsubscribe(channelName);
        };
    }, [sessionId, isConnected, subscribe, unsubscribe, bind, unbind, participantId, activeQuestion]);

    // Transform PHP response to frontend format
    const transformQuestion = (q: any): Question => ({
        id: q.id,
        session_id: q.session_id,
        question_type: q.type,
        question_text: q.title,
        description: q.description,
        options: q.options || [],
        settings: q.settings || {},
        display_order: q.display_order || 0,
        order_index: q.order_index,
        time_limit: q.settings?.time_limit || null,
        is_active: q.status === 'active',
        is_locked: q.status === 'locked',
        is_results_visible: q.status === 'revealed',
        started_at: q.started_at,
        response_count: q.response_count || 0,
    });

    // Submit response via API
    const submitResponse = useCallback(async (responseData: any) => {
        if (!activeQuestion || !sessionId || !participantId) return;

        try {
            const result = await api.submitResponse({
                session_id: sessionId,
                question_id: activeQuestion.id,
                participant_id: participantId,
                token: participantToken,
                answer_type: 'choice',
                selected_options: responseData.selected_options || [responseData],
                response_time_ms: responseData.response_time_ms || 0,
            });

            setHasResponded(true);
            setResponseResult({
                success: true,
                question_id: activeQuestion.id,
                participant_id: participantId,
                is_correct: result.isCorrect,
                points_earned: result.pointsEarned,
                total_score: 0, // Will be updated from leaderboard
                correct_answer_ids: [],
            });
        } catch (err: any) {
            if (err.message?.includes('Already submitted')) {
                setHasResponded(true);
            } else {
                setError(err.message || 'Failed to submit response');
            }
        }
    }, [activeQuestion, sessionId, participantId, participantToken]);

    // Submit words for word cloud
    const submitWords = useCallback(async (words: string[]) => {
        if (!activeQuestion || !sessionId || !participantId) return;

        try {
            await api.submitResponse({
                session_id: sessionId,
                question_id: activeQuestion.id,
                participant_id: participantId,
                token: participantToken,
                answer_type: 'word_cloud',
                word_responses: words,
            });
            setHasResponded(true);
        } catch (err: any) {
            if (err.message?.includes('Already submitted')) {
                setHasResponded(true);
            } else {
                setError(err.message || 'Failed to submit words');
            }
        }
    }, [activeQuestion, sessionId, participantId, participantToken]);

    // Submit text response
    const submitText = useCallback(async (content: string) => {
        if (!activeQuestion || !sessionId || !participantId) return;

        try {
            await api.submitResponse({
                session_id: sessionId,
                question_id: activeQuestion.id,
                participant_id: participantId,
                token: participantToken,
                answer_type: 'text',
                text_response: content,
            });
            setHasResponded(true);
        } catch (err: any) {
            if (err.message?.includes('Already submitted')) {
                setHasResponded(true);
            } else {
                setError(err.message || 'Failed to submit response');
            }
        }
    }, [activeQuestion, sessionId, participantId, participantToken]);

    // Submit scale response
    const submitScale = useCallback(async (value: number) => {
        if (!activeQuestion || !sessionId || !participantId) return;

        try {
            await api.submitResponse({
                session_id: sessionId,
                question_id: activeQuestion.id,
                participant_id: participantId,
                token: participantToken,
                answer_type: 'scale',
                scale_value: value,
            });
            setHasResponded(true);
        } catch (err: any) {
            if (err.message?.includes('Already submitted')) {
                setHasResponded(true);
            } else {
                setError(err.message || 'Failed to submit response');
            }
        }
    }, [activeQuestion, sessionId, participantId, participantToken]);

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
                    <div className="animate-pulse mb-md emoji-large">🔌</div>
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
                    <div className="emoji-large mb-md">😕</div>
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
                    <div className="animate-pulse mb-lg emoji-xlarge">⏳</div>
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
        <div className="page">
            <header className="play-header">
                <span className="text-muted">{sessionTitle}</span>
                <span className="text-muted">👥 {participantCount}</span>
            </header>

            <main className="container flex-1">
                {renderQuestion()}
            </main>
        </div>
    );
}

export default PlayPage;

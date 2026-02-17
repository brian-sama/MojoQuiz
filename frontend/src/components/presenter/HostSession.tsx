/**
 * Host Session Component
 * Presenter view for controlling an active session
 * Uses Pusher for real-time updates and PHP API for data
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import usePusher, { api } from '../../hooks/usePusher';
import type { Question, PollResults, WordCloudWord } from '../../types';

interface Session {
    id: string;
    title: string;
    join_code: string;
    mode: string;
    status: string;
}

function HostSession() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { isConnected, subscribe, unsubscribe, bind, unbind } = usePusher();

    // State
    const [session, setSession] = useState<Session | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
    const [participantCount, setParticipantCount] = useState(0);
    const [results, setResults] = useState<PollResults | WordCloudWord[] | null>(null);
    const [responseCount, setResponseCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Question builder state
    const [showBuilder, setShowBuilder] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        type: 'poll',
        text: '',
        options: ['', '', '', ''],
        timeLimit: 30,
        correctOption: 0,
    });

    // Load session data
    useEffect(() => {
        if (!sessionId) return;
        loadSession();
    }, [sessionId]);

    const loadSession = async () => {
        try {
            const data = await api.getSessionDetails(sessionId!);
            setSession({
                id: data.session.id,
                title: data.session.title,
                join_code: data.session.join_code,
                mode: data.session.mode,
                status: data.session.status,
            });
            setQuestions(data.questions.map(transformQuestion));
            setParticipantCount(data.participants.length);

            // Check for active question
            const active = data.questions.find((q: any) => q.status === 'active');
            if (active) {
                setActiveQuestion(transformQuestion(active));
            }

            setLoading(false);
        } catch (err) {
            console.error('Failed to load session:', err);
            navigate('/host');
        }
    };

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

    // Subscribe to Pusher channel
    useEffect(() => {
        if (!sessionId || !isConnected) return;

        const channelName = `session-${sessionId}`;
        subscribe(channelName);

        bind(channelName, 'participant-joined', (data: any) => {
            setParticipantCount(data.count);
        });

        bind(channelName, 'response-received', (data: any) => {
            setResponseCount(data.responseCount);

            // Update word cloud results
            if (data.wordCloud) {
                setResults(data.wordCloud.map((w: any) => ({ word: w.word, weight: w.count })));
            }
        });

        bind(channelName, 'question-added', (data: any) => {
            setQuestions(prev => [...prev, transformQuestion(data)]);
        });

        return () => {
            unbind(channelName, 'participant-joined');
            unbind(channelName, 'response-received');
            unbind(channelName, 'question-added');
            unsubscribe(channelName);
        };
    }, [sessionId, isConnected, subscribe, unsubscribe, bind, unbind]);

    // Create a new question
    const handleCreateQuestion = async () => {
        if (!newQuestion.text.trim()) return;

        try {
            const options = newQuestion.type === 'poll' || newQuestion.type === 'quiz_mc'
                ? newQuestion.options
                    .filter(o => o.trim())
                    .map((text, i) => ({
                        id: `opt_${i}`,
                        text,
                        is_correct: newQuestion.type === 'quiz_mc' && i === newQuestion.correctOption,
                    }))
                : newQuestion.type === 'quiz_tf'
                    ? [
                        { id: 'true', text: 'True', is_correct: newQuestion.correctOption === 0 },
                        { id: 'false', text: 'False', is_correct: newQuestion.correctOption === 1 },
                    ]
                    : null;

            await api.createQuestion({
                session_id: sessionId,
                type: newQuestion.type,
                title: newQuestion.text,
                options,
                settings: {
                    time_limit: newQuestion.type.startsWith('quiz_') ? newQuestion.timeLimit : null,
                },
            });

            setShowBuilder(false);
            setNewQuestion({ type: 'poll', text: '', options: ['', '', '', ''], timeLimit: 30, correctOption: 0 });
            loadSession(); // Refresh questions
        } catch (err) {
            console.error('Failed to create question:', err);
        }
    };

    // Activate a question
    const activateQuestion = useCallback(async (questionId: string) => {
        try {
            await api.activateQuestion(questionId);
            setResponseCount(0);
            setResults(null);
            const q = questions.find(q => q.id === questionId);
            if (q) setActiveQuestion({ ...q, is_active: true, is_locked: false });
        } catch (err) {
            console.error('Failed to activate question:', err);
        }
    }, [questions]);

    // Lock/unlock voting
    const toggleLock = useCallback(async (locked: boolean) => {
        if (!activeQuestion) return;
        try {
            await api.lockQuestion(activeQuestion.id);
            setActiveQuestion({ ...activeQuestion, is_locked: locked });
        } catch (err) {
            console.error('Failed to lock question:', err);
        }
    }, [activeQuestion]);

    // Show results
    const revealResults = useCallback(async () => {
        if (!activeQuestion) return;
        try {
            const data = await api.revealResults(activeQuestion.id);

            // Process poll results
            if (activeQuestion.question_type === 'poll' && data.responses) {
                const pollResults: PollResults = {};
                data.responses.forEach((r: any) => {
                    if (r.selected_options) {
                        r.selected_options.forEach((_: string, index: number) => {
                            pollResults[String(index)] = (pollResults[String(index)] || 0) + 1;
                        });
                    }
                });
                setResults(pollResults);
            }

            // Process word cloud results
            if (activeQuestion.question_type === 'word_cloud' && data.wordCloud) {
                setResults(data.wordCloud.map((w: any) => ({ word: w.word, weight: w.count })));
            }

            setActiveQuestion({ ...activeQuestion, is_results_visible: true });
        } catch (err) {
            console.error('Failed to reveal results:', err);
        }
    }, [activeQuestion]);

    // End session
    const endSession = useCallback(async () => {
        try {
            await api.endSession(sessionId!);
            navigate('/host');
        } catch (err) {
            console.error('Failed to end session:', err);
        }
    }, [sessionId, navigate]);

    if (loading) {
        return (
            <div className="page page-centered">
                <div className="text-center">
                    <div className="animate-pulse emoji-large">🎯</div>
                    <p className="mt-md">Loading session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page host-page">
            {/* Header */}
            <header className="host-header">
                <div>
                    <h1 className="host-title">{session?.title}</h1>
                    <div className="host-meta">
                        <span className="text-muted">Code: <strong className="join-code">{session?.join_code}</strong></span>
                        <span className="text-muted">👥 {participantCount} online</span>
                    </div>
                </div>
                <div className="host-actions">
                    <button className="btn btn-secondary" onClick={() => setShowBuilder(true)}>
                        + Add Question
                    </button>
                    <button className="btn btn-danger" onClick={endSession}>
                        End Session
                    </button>
                </div>
            </header>

            <div className="host-content">
                {/* Question List */}
                <aside className="card questions-sidebar">
                    <h3 className="mb-md">Questions ({questions.length})</h3>
                    {questions.length === 0 ? (
                        <p className="text-muted">No questions yet. Add one to get started!</p>
                    ) : (
                        <div className="flex flex-col gap-sm">
                            {questions.map((q, index) => (
                                <button
                                    key={q.id}
                                    onClick={() => activateQuestion(q.id)}
                                    className={`question-item ${activeQuestion?.id === q.id ? 'question-item-active' : ''}`}
                                >
                                    <div className="question-item-type">
                                        {index + 1}. {q.question_type.toUpperCase()}
                                    </div>
                                    <div className="question-item-text">
                                        {q.question_text.substring(0, 50)}...
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </aside>

                {/* Main Display Area */}
                <main className="card display-main">
                    {!activeQuestion ? (
                        <div className="display-empty">
                            <div>
                                <p className="emoji-xlarge">📊</p>
                                <h2 className="mt-md">Select a question to display</h2>
                                <p className="text-muted mt-sm">Or add a new question to get started</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="display-content">
                                <h2 className="display-question">
                                    {activeQuestion.question_text}
                                </h2>

                                {/* Response count */}
                                <div className="text-center mb-lg">
                                    <span className="response-count">{responseCount}</span>
                                    <p className="text-muted">responses</p>
                                </div>

                                {/* Results display */}
                                {results && activeQuestion.question_type === 'poll' && (
                                    <PollResultsDisplay
                                        results={results as PollResults}
                                        options={activeQuestion.options || []}
                                    />
                                )}

                                {results && activeQuestion.question_type === 'word_cloud' && (
                                    <WordCloudDisplay words={results as WordCloudWord[]} />
                                )}
                            </div>

                            {/* Controls */}
                            <div className="display-controls">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => toggleLock(!activeQuestion.is_locked)}
                                >
                                    {activeQuestion.is_locked ? '🔓 Unlock Voting' : '🔒 Lock Voting'}
                                </button>
                                <button className="btn btn-primary" onClick={revealResults}>
                                    📊 Show Results
                                </button>
                            </div>
                        </>
                    )}
                </main>
            </div>

            {/* Question Builder Modal */}
            {showBuilder && (
                <div className="modal-overlay">
                    <div className="card modal-content">
                        <h2 className="mb-lg">Add Question</h2>

                        <div className="mb-md">
                            <label htmlFor="question-type" className="form-label">Type</label>
                            <select
                                id="question-type"
                                className="input"
                                value={newQuestion.type}
                                onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                                aria-label="Question type"
                            >
                                <option value="poll">Poll</option>
                                <option value="word_cloud">Word Cloud</option>
                                <option value="scale">Scale</option>
                                <option value="quiz_mc">Quiz - Multiple Choice</option>
                                <option value="quiz_tf">Quiz - True/False</option>
                            </select>
                        </div>

                        <div className="mb-md">
                            <label htmlFor="question-text" className="form-label">Question Text</label>
                            <textarea
                                id="question-text"
                                className="input"
                                rows={3}
                                placeholder="Enter your question..."
                                value={newQuestion.text}
                                onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                            />
                        </div>

                        {(newQuestion.type === 'poll' || newQuestion.type === 'quiz_mc') && (
                            <div className="mb-md">
                                <label className="form-label">Options</label>
                                {newQuestion.options.map((opt, i) => (
                                    <div key={i} className="option-row mb-sm">
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder={`Option ${i + 1}`}
                                            value={opt}
                                            onChange={(e) => {
                                                const opts = [...newQuestion.options];
                                                opts[i] = e.target.value;
                                                setNewQuestion({ ...newQuestion, options: opts });
                                            }}
                                            aria-label={`Option ${i + 1}`}
                                        />
                                        {newQuestion.type === 'quiz_mc' && (
                                            <label className="correct-label">
                                                <input
                                                    type="radio"
                                                    name="correctOption"
                                                    checked={newQuestion.correctOption === i}
                                                    onChange={() => setNewQuestion({ ...newQuestion, correctOption: i })}
                                                />
                                                Correct
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {newQuestion.type === 'quiz_tf' && (
                            <div className="mb-md">
                                <label className="form-label">Correct Answer</label>
                                <div className="flex gap-md">
                                    <label>
                                        <input
                                            type="radio"
                                            name="correctTF"
                                            checked={newQuestion.correctOption === 0}
                                            onChange={() => setNewQuestion({ ...newQuestion, correctOption: 0 })}
                                        /> True
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            name="correctTF"
                                            checked={newQuestion.correctOption === 1}
                                            onChange={() => setNewQuestion({ ...newQuestion, correctOption: 1 })}
                                        /> False
                                    </label>
                                </div>
                            </div>
                        )}

                        {newQuestion.type.startsWith('quiz_') && (
                            <div className="mb-md">
                                <label htmlFor="time-limit" className="form-label">Time Limit (seconds)</label>
                                <input
                                    id="time-limit"
                                    type="number"
                                    className="input"
                                    value={newQuestion.timeLimit}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, timeLimit: parseInt(e.target.value) })}
                                    min={5}
                                    max={120}
                                    aria-label="Time limit in seconds"
                                />
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="btn btn-secondary flex-1" onClick={() => setShowBuilder(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary flex-1" onClick={handleCreateQuestion}>
                                Add Question
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Poll Results Display
function PollResultsDisplay({ results, options }: { results: PollResults; options: { id: string; text: string }[] }) {
    const total = Object.values(results).reduce((sum, count) => sum + count, 0);
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

    return (
        <div className="flex flex-col gap-md">
            {options.map((opt, index) => {
                const count = results[String(index)] || 0;
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

                return (
                    <div key={opt.id}>
                        <div className="poll-result-header">
                            <span>{opt.text}</span>
                            <span className="poll-result-percent">{percentage}%</span>
                        </div>
                        <div className="progress-bar progress-bar-tall">
                            <div
                                className="progress-bar-fill"
                                style={{
                                    width: `${percentage}%`,
                                    background: colors[index % colors.length],
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Word Cloud Display
function WordCloudDisplay({ words }: { words: WordCloudWord[] }) {
    const maxWeight = Math.max(...words.map(w => w.weight), 1);
    const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

    return (
        <div className="word-cloud">
            {words.slice(0, 50).map((word, index) => {
                const size = 1 + (word.weight / maxWeight) * 2;

                return (
                    <span
                        key={`${word.word}-${index}`}
                        className="word-cloud-word"
                        style={{
                            fontSize: `${size}rem`,
                            fontWeight: word.weight >= maxWeight / 2 ? 700 : 500,
                            color: colors[index % colors.length],
                        }}
                    >
                        {word.word}
                    </span>
                );
            })}
        </div>
    );
}

export default HostSession;

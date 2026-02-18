/**
 * Host Session Component
 * Presenter view for controlling an active session
 * Uses Pusher for real-time updates and PHP API for data
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useSocket from '../../hooks/useSocket';
import { api } from '../../hooks/useApi';
import { QRCodeSVG } from 'qrcode.react';
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
    const { isConnected, on, off, emit } = useSocket();

    // State
    const [session, setSession] = useState<Session | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
    const [participantCount, setParticipantCount] = useState(0);
    const [results, setResults] = useState<PollResults | WordCloudWord[] | null>(null);
    const [responseCount, setResponseCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showQRCode, setShowQRCode] = useState(false);
    const [isPresentationMode, setIsPresentationMode] = useState(false);

    // Question builder state
    const [showBuilder, setShowBuilder] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        type: 'poll', // Will be reset on session load
        text: '',
        options: ['', '', '', ''],
        timeLimit: 30,
        correctOption: 0,
    });
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    // AI Extractor state
    const [builderTab, setBuilderTab] = useState<'individual' | 'ai'>('individual');
    const [sourceText, setSourceText] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);

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
                join_code: data.session.join_code || data.session.joinCode,
                mode: data.session.mode,
                status: data.session.status,
            });

            // Set default type based on mode
            const defaultType = data.session.mode === 'quiz' ? 'quiz_mc' : 'poll';
            setNewQuestion(prev => ({ ...prev, type: defaultType }));

            setQuestions((data.questions || []).map(transformQuestion));
            setParticipantCount(data.participantCount || 0);

            // Check for active question
            const active = (data.questions || []).find((q: any) => q.status === 'active');
            if (active) {
                setActiveQuestion(transformQuestion(active));
            }

            setLoading(false);
        } catch (err) {
            console.error('Failed to load session:', err);
            navigate('/host');
        }
    };

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

    // Subscribe to Socket.IO events
    useEffect(() => {
        if (!sessionId || !isConnected) return;

        // Join as presenter
        emit('presenter_join', { session_id: sessionId, presenter_id: 'brian-presenter' });

        on('presenter_joined', (data: any) => {
            setParticipantCount(data.participant_count);
        });

        on('participant_joined', (data: any) => {
            setParticipantCount(data.participant_count);
        });

        on('participant_left', (data: any) => {
            setParticipantCount(data.participant_count);
        });

        on('results_updated', (data: any) => {
            setResponseCount(data.response_count);
            if (activeQuestion && activeQuestion.id === data.question_id) {
                setResults(data.results);
            }
        });

        on('word_cloud_updated', (data: any) => {
            setResponseCount(data.response_count);
            if (activeQuestion && activeQuestion.id === data.question_id) {
                setResults(data.words.map((w: any) => ({ word: w.word, weight: w.count })));
            }
        });

        on('text_response_received', (data: any) => {
            setResponseCount(data.response_count);
        });

        on('leaderboard_updated', (data: any) => {
            setLeaderboard(data.leaderboard);
        });

        on('question_activated', (data: any) => {
            setResponseCount(data.response_count || 0);
            setResults(null);
            setActiveQuestion(transformQuestion(data.question));
        });

        on('question_locked', (data: any) => {
            if (activeQuestion && activeQuestion.id === data.question_id) {
                setActiveQuestion(prev => prev ? { ...prev, is_locked: data.is_locked } : null);
            }
        });

        on('results_revealed', (data: any) => {
            if (activeQuestion && activeQuestion.id === data.question_id) {
                setActiveQuestion(prev => prev ? { ...prev, is_results_visible: true } : null);
                setResults(data.results);
            }
        });

        return () => {
            off('presenter_joined');
            off('participant_joined');
            off('participant_left');
            off('results_updated');
            off('word_cloud_updated');
            off('text_response_received');
            off('leaderboard_updated');
            off('question_activated');
            off('question_locked');
            off('results_revealed');
        };
    }, [sessionId, isConnected, on, off, emit, activeQuestion]);

    // Create new question
    const handleCreateQuestion = async (shouldClose = true) => {
        if (!newQuestion.text.trim()) return;

        try {
            const optionsArray = (newQuestion.type === 'poll' || newQuestion.type === 'quiz_mc')
                ? newQuestion.options.filter(o => o.trim()).map(o => ({ text: o }))
                : null;

            await api.createQuestion(sessionId!, {
                questionType: newQuestion.type,
                questionText: newQuestion.text,
                options: optionsArray,
                correctAnswer: newQuestion.type.startsWith('quiz_') ? newQuestion.correctOption : undefined,
                timeLimit: newQuestion.type.startsWith('quiz_') ? newQuestion.timeLimit : undefined,
            });

            // Reset builder
            const defaultType = session?.mode === 'quiz' ? 'quiz_mc' : 'poll';
            setNewQuestion({
                type: defaultType,
                text: '',
                options: ['', '', '', ''],
                timeLimit: 30,
                correctOption: 0,
            });

            if (shouldClose) {
                setShowBuilder(false);
            }
            loadSession();
        } catch (err) {
            console.error('Failed to create question:', err);
        }
    };

    // AI Extraction logic
    const handleExtractQuestions = async () => {
        if (!sourceText.trim() || sourceText.trim().length < 50) {
            alert('Please provide at least 50 characters of source text.');
            return;
        }

        setIsExtracting(true);
        try {
            const data = await api.extractQuestions(sessionId!, sourceText);
            setExtractedQuestions(data.questions);
        } catch (err: any) {
            console.error('Extraction failed:', err);
            alert(err.message || 'Failed to extract questions.');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleBulkAdd = async () => {
        if (extractedQuestions.length === 0) return;

        try {
            for (const q of extractedQuestions) {
                await api.createQuestion(sessionId!, {
                    questionType: q.question_type,
                    questionText: q.question_text,
                    options: q.options?.map((text: string) => ({ text })),
                    correctAnswer: q.correct_answer,
                    timeLimit: q.time_limit,
                });
            }

            setShowBuilder(false);
            setExtractedQuestions([]);
            setSourceText('');
            loadSession();
        } catch (err) {
            console.error('Bulk add failed:', err);
            alert('Failed to add some questions. Please check your list.');
        }
    };

    // Activate a question
    const activateQuestion = useCallback((questionId: string) => {
        emit('activate_question', { question_id: questionId });
    }, [emit]);

    // Lock/unlock voting
    const toggleLock = useCallback((locked: boolean) => {
        if (!activeQuestion) return;
        emit('lock_question', { question_id: activeQuestion.id, locked });
    }, [activeQuestion, emit]);

    // Show results
    const revealResults = useCallback(() => {
        if (!activeQuestion) return;
        emit('show_results', { question_id: activeQuestion.id });
    }, [activeQuestion, emit]);

    // End session
    const endSession = useCallback(() => {
        if (window.confirm('Are you sure you want to end this session?')) {
            emit('end_session');
            navigate('/host');
        }
    }, [emit, navigate]);

    if (loading) {
        return (
            <div className="page page-centered">
                <div className="text-center">
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
                        <span className="text-muted flex items-center gap-sm">
                            Code: <strong className="join-code">{session?.join_code}</strong>
                            <button
                                className="btn-qr-trigger"
                                onClick={() => setShowQRCode(true)}
                                title="Show Join QR Code"
                            >
                                <QRCodeSVG
                                    value={`${window.location.origin}/join/${session?.join_code}`}
                                    size={24}
                                    level="L"
                                    includeMargin={false}
                                />
                            </button>
                        </span>
                        <span className="text-muted">Participants: {participantCount}</span>
                    </div>
                </div>
                <div className="host-actions">
                    <button className="btn btn-secondary" onClick={() => setIsPresentationMode(!isPresentationMode)}>
                        {isPresentationMode ? 'Exit Presentation' : 'Presentation Mode'}
                    </button>
                    {session?.mode === 'quiz' && (
                        <button className="btn btn-secondary" onClick={() => setShowLeaderboard(!showLeaderboard)}>
                            {showLeaderboard ? 'Back to Question' : 'Leaderboard'}
                        </button>
                    )}
                    {!isPresentationMode && (
                        <>
                            <button className="btn btn-secondary" onClick={() => setShowBuilder(true)}>
                                Add Question
                            </button>
                            <button className="btn btn-danger" onClick={endSession}>
                                End Session
                            </button>
                        </>
                    )}
                </div>
            </header>

            <div className={`host-content ${isPresentationMode ? 'presentation-active' : ''}`}>
                {/* Question List */}
                {!isPresentationMode && (
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
                )}

                {/* Main Display Area */}
                <main className={`card display-main ${isPresentationMode ? 'presentation-main' : ''}`}>
                    {!activeQuestion ? (
                        <div className="display-empty">
                            <div>
                                <h2 className="mt-md">Select a question to display</h2>
                                <p className="text-muted mt-sm">Or add a new question to get started</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="display-content">
                                {showLeaderboard ? (
                                    <LeaderboardDisplay leaderboard={leaderboard} />
                                ) : (
                                    <>
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

                                        {results && activeQuestion.question_type === 'ranking' && (
                                            <RankingResultsDisplay
                                                results={results as { [key: string]: number }}
                                                options={activeQuestion.options || []}
                                            />
                                        )}

                                        {results && activeQuestion.question_type === 'pin_image' && (
                                            <PinImageResultsDisplay
                                                results={results as { x: number, y: number }[]}
                                                imageUrl={activeQuestion.options?.[0]?.text || ''}
                                            />
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Controls */}
                            {!isPresentationMode && (
                                <div className="display-controls">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => toggleLock(!activeQuestion.is_locked)}
                                    >
                                        {activeQuestion.is_locked ? 'Unlock Voting' : 'Lock Voting'}
                                    </button>
                                    <button className="btn btn-primary" onClick={revealResults}>
                                        Show Results
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            {/* Question Builder Modal */}
            {showBuilder && (
                <div className="modal-overlay">
                    <div className="card modal-content">
                        <div className="flex justify-between items-center mb-lg">
                            <h2>Add Question</h2>
                            <div className="tab-group">
                                <button
                                    className={`tab-btn ${builderTab === 'individual' ? 'active' : ''}`}
                                    onClick={() => setBuilderTab('individual')}
                                >
                                    Individual
                                </button>
                                <button
                                    className={`tab-btn ${builderTab === 'ai' ? 'active' : ''}`}
                                    onClick={() => setBuilderTab('ai')}
                                >
                                    AI Extractor
                                </button>
                            </div>
                        </div>

                        {builderTab === 'individual' ? (
                            <>

                                <div className="mb-md">
                                    <label htmlFor="question-type" className="form-label">Type</label>
                                    <select
                                        id="question-type"
                                        className="input"
                                        value={newQuestion.type}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                                        aria-label="Question type"
                                    >
                                        {session?.mode === 'quiz' ? (
                                            <>
                                                <option value="quiz_mc">Quiz - Multiple Choice</option>
                                                <option value="quiz_tf">Quiz - True/False</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="poll">Poll</option>
                                                <option value="word_cloud">Word Cloud</option>
                                                <option value="scale">Scale</option>
                                                <option value="ranking">Ranking</option>
                                                <option value="pin_image">Pin on Image</option>
                                            </>
                                        )}
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

                                {newQuestion.type === 'pin_image' && (
                                    <div className="mb-md">
                                        <label htmlFor="image-url" className="form-label">Image URL (for participants to pin)</label>
                                        <input
                                            id="image-url"
                                            className="input"
                                            type="text"
                                            placeholder="https://example.com/image.jpg"
                                            value={newQuestion.options[0]}
                                            onChange={(e) => {
                                                const opts = [...newQuestion.options];
                                                opts[0] = e.target.value;
                                                setNewQuestion({ ...newQuestion, options: opts });
                                            }}
                                        />
                                    </div>
                                )}

                                {(newQuestion.type === 'poll' || newQuestion.type === 'quiz_mc' || newQuestion.type === 'ranking') && (
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

                            </>
                        ) : (
                            <div className="ai-extractor-content">
                                <div className="mb-md">
                                    <label htmlFor="source-text" className="form-label">
                                        Source Text (notes, articles, reports)
                                    </label>
                                    <textarea
                                        id="source-text"
                                        className="input"
                                        rows={6}
                                        placeholder="Paste your resources here (min 50 characters)..."
                                        value={sourceText}
                                        onChange={(e) => setSourceText(e.target.value)}
                                    />
                                </div>

                                <button
                                    className="btn btn-secondary btn-block mb-lg"
                                    onClick={handleExtractQuestions}
                                    disabled={isExtracting || sourceText.length < 50}
                                >
                                    {isExtracting ? 'Extracting...' : '✨ Generate Questions'}
                                </button>

                                {extractedQuestions.length > 0 && (
                                    <div className="extracted-questions-preview mb-lg">
                                        <h4 className="mb-sm">Preview ({extractedQuestions.length} questions)</h4>
                                        <div className="preview-list">
                                            {extractedQuestions.map((q, i) => (
                                                <div key={i} className="preview-item">
                                                    <strong>{q.question_type.toUpperCase()}</strong>: {q.question_text}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowBuilder(false)}>
                                Cancel
                            </button>
                            {builderTab === 'individual' ? (
                                <>
                                    <button className="btn btn-secondary" onClick={() => handleCreateQuestion(false)}>
                                        Save & Add Another
                                    </button>
                                    <button className="btn btn-primary" onClick={() => handleCreateQuestion(true)}>
                                        Add Question
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleBulkAdd}
                                    disabled={extractedQuestions.length === 0}
                                >
                                    Add All Extracted
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* QR Code Modal */}
            {showQRCode && (
                <div className="modal-overlay" onClick={() => setShowQRCode(false)}>
                    <div className="card modal-content qr-modal text-center" onClick={e => e.stopPropagation()}>
                        <h2 className="mb-lg">Join the Session</h2>
                        <div className="qr-container mb-lg">
                            <QRCodeSVG
                                value={`${window.location.origin}/join/${session?.join_code}`}
                                size={300}
                                level="M"
                                includeMargin={true}
                                className="qr-svg"
                            />
                        </div>
                        <p className="text-xl mb-sm">Scan to join</p>
                        <p className="text-muted mb-xl">or enter code: <strong className="text-primary">{session?.join_code}</strong></p>
                        <button className="btn btn-primary btn-block" onClick={() => setShowQRCode(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Leaderboard Display
function LeaderboardDisplay({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
    if (leaderboard.length === 0) {
        return (
            <div className="text-center py-2xl">
                <h3>No players yet</h3>
                <p className="text-muted">Players will appear here once the first question is graded.</p>
            </div>
        );
    }

    return (
        <div className="leaderboard-container">
            <h2 className="mb-xl">Top Players</h2>
            <div className="leaderboard-list">
                {leaderboard.map((entry, index) => (
                    <div key={entry.participant_id} className={`leaderboard-item rank-${entry.rank}`}>
                        <div className="leaderboard-rank">{entry.rank}</div>
                        <div className="leaderboard-name">{entry.nickname || 'Anonymous'}</div>
                        <div className="leaderboard-score">{entry.total_score} pts</div>
                    </div>
                ))}
            </div>
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
                                    '--progress-width': `${percentage}%`,
                                    '--progress-color': colors[index % colors.length],
                                } as React.CSSProperties}
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
                            '--word-size': `${size}rem`,
                            '--word-weight': word.weight >= maxWeight / 2 ? 700 : 500,
                            '--word-color': colors[index % colors.length],
                        } as React.CSSProperties}
                    >
                        {word.word}
                    </span>
                );
            })}
        </div>
    );
}

// Ranking Results Display
function RankingResultsDisplay({ results, options }: { results: { [key: string]: number }, options: QuestionOption[] }) {
    // Sort options by average rank (ascending, as smaller rank is better)
    const sortedOptions = [...options].sort((a, b) => {
        const rankA = results[options.indexOf(a)] || 0;
        const rankB = results[options.indexOf(b)] || 0;
        return rankA - rankB;
    });

    return (
        <div className="ranking-results flex flex-col gap-md">
            {sortedOptions.map((opt, i) => {
                const avgRank = results[options.indexOf(opt)] || 0;
                return (
                    <div key={opt.id} className="ranking-result-item">
                        <div className="flex justify-between mb-xs">
                            <span className="font-bold">{i + 1}. {opt.text}</span>
                            <span className="text-muted">Avg Rank: {avgRank.toFixed(1)}</span>
                        </div>
                        <div className="ranking-bar-bg">
                            <div
                                className="ranking-bar-fill"
                                style={{
                                    width: `${avgRank > 0 ? (1 / avgRank) * 100 : 0}%`,
                                    background: `var(--color-option-${(options.indexOf(opt) % 4) + 1})`
                                } as React.CSSProperties}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Pin Image Results Display
function PinImageResultsDisplay({ results, imageUrl }: { results: { x: number, y: number }[], imageUrl: string }) {
    return (
        <div className="pin-image-results">
            <div className="relative inline-block overflow-hidden rounded-lg">
                <img src={imageUrl} alt="Background" className="max-w-full h-auto block" />
                <div className="absolute inset-0">
                    {results.map((pin, i) => (
                        <div
                            key={i}
                            className="pin-marker fade-in"
                            style={{
                                left: `${pin.x}%`,
                                top: `${pin.y}%`,
                                transform: 'translate(-50%, -50%)'
                            } as React.CSSProperties}
                        />
                    ))}
                </div>
            </div>
            <p className="text-center mt-md text-muted italic">{results.length} pins dropped</p>
        </div>
    );
}

export default HostSession;

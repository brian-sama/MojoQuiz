/**
 * CreateSession — Multi-step Session Wizard
 *
 * Step 1: Title + Description + Mode
 * Step 2: Add Questions
 * Step 3: Preview
 * Step 4: Launch or Save as Draft
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import AppLayout from '../../layouts/AppLayout';

type SessionMode = 'engagement' | 'quiz' | 'mixed';

interface QuestionDraft {
    id: string;
    question_text: string;
    question_type: string;
    options: string[];
    correct_answer?: number;
    time_limit?: number;
}

const MODES = [
    { value: 'engagement' as SessionMode, label: 'Engagement', desc: 'Polls, Word Clouds, Scale Ratings', icon: '📊' },
    { value: 'quiz' as SessionMode, label: 'Quiz', desc: 'Timed Questions, Leaderboard, Scoring', icon: '🏆' },
    { value: 'mixed' as SessionMode, label: 'Mixed', desc: 'Combine engagement + quiz questions', icon: '🎯' },
];

function CreateSession() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Step 1 state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [mode, setMode] = useState<SessionMode>('mixed');

    // Step 2 state
    const [questions, setQuestions] = useState<QuestionDraft[]>([]);
    const [newQuestion, setNewQuestion] = useState('');
    const [newQuestionType, setNewQuestionType] = useState('poll');

    const totalSteps = 4;

    const canProceed = () => {
        switch (step) {
            case 1: return title.trim().length >= 3;
            case 2: return true; // Questions are optional for draft
            case 3: return true;
            default: return false;
        }
    };

    const addQuestion = () => {
        if (!newQuestion.trim()) return;
        setQuestions([...questions, {
            id: `q-${Date.now()}`,
            question_text: newQuestion.trim(),
            question_type: newQuestionType,
            options: newQuestionType === 'poll' ? ['Option 1', 'Option 2'] : [],
        }]);
        setNewQuestion('');
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const handleLaunch = async (asDraft = false) => {
        setLoading(true);
        setError('');
        try {
            const presenterId = user?.displayName || 'Presenter';
            const data = await api.createSession(title.trim(), mode, presenterId, user?.id);

            // Create questions if any
            for (const q of questions) {
                await api.post(`sessions/${data.sessionId}/questions`, {
                    question_text: q.question_text,
                    question_type: q.question_type,
                    options: q.options.length > 0 ? q.options.map((text, i) => ({ id: `opt-${i}`, text })) : null,
                    time_limit: q.time_limit || 30,
                });
            }

            if (asDraft) {
                navigate('/dashboard');
            } else {
                navigate(`/host/${data.sessionId}`);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create session');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="wizard-container">
                {/* Progress indicator */}
                <div className="step-indicator-track">
                    {Array.from({ length: totalSteps }, (_, i) => (
                        <div
                            key={i}
                            className={`step-indicator ${i + 1 <= step ? 'step-indicator-active' : ''}`}
                        />
                    ))}
                </div>

                <p className="text-muted mb-lg text-sm">
                    Step {step} of {totalSteps}
                </p>

                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="card p-lg">
                        <h2 className="mb-md">Create a New Session</h2>

                        <div className="mb-md">
                            <label className="form-label">Session Title *</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., Team Retrospective Q1"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={100}
                                autoFocus
                            />
                        </div>

                        <div className="mb-md">
                            <label className="form-label">Description (optional)</label>
                            <textarea
                                className="input textarea-resizable"
                                placeholder="What's this session about?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                maxLength={500}
                            />
                        </div>

                        <div>
                            <label className="form-label">Session Mode</label>
                            <div className="grid grid-cols-3 gap-sm">
                                {MODES.map(m => (
                                    <button
                                        key={m.value}
                                        type="button"
                                        onClick={() => setMode(m.value)}
                                        className={`mode-card ${mode === m.value ? 'mode-card-active' : ''}`}
                                    >
                                        <div className="text-2xl mb-xs">{m.icon}</div>
                                        <div className="text-bold text-sm">{m.label}</div>
                                        <div className="text-xs text-muted mt-xs">{m.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Add Questions */}
                {step === 2 && (
                    <div className="card p-lg">
                        <h2 className="mb-xs">Add Questions</h2>
                        <p className="text-muted mb-md">
                            You can also add questions later in the session editor.
                        </p>

                        {/* Question list */}
                        {questions.length > 0 && (
                            <div className="mb-md">
                                {questions.map((q, i) => (
                                    <div key={q.id} className="flex items-center justify-between question-draft-item">
                                        <div className="flex items-center gap-sm">
                                            <span className="text-muted text-xs text-bold">Q{i + 1}</span>
                                            <span className="text-sm">{q.question_text}</span>
                                            <span className="status-badge status-badge-draft text-tiny">{q.question_type}</span>
                                        </div>
                                        <button className="btn btn-danger btn-small btn-tiny" onClick={() => removeQuestion(q.id)}>
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add question form */}
                        <div className="flex gap-sm">
                            <select
                                className="input w-120 flex-shrink-0"
                                value={newQuestionType}
                                onChange={(e) => setNewQuestionType(e.target.value)}
                                title="Select Question Type"
                            >
                                <option value="poll">Poll</option>
                                <option value="quiz_mc">Quiz MC</option>
                                <option value="word_cloud">Word Cloud</option>
                                <option value="open_ended">Open Ended</option>
                                <option value="scale">Scale</option>
                                <option value="nps">NPS</option>
                            </select>
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter your question..."
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
                            />
                            <button className="btn btn-primary btn-small" onClick={addQuestion} disabled={!newQuestion.trim()}>
                                Add
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Preview */}
                {step === 3 && (
                    <div className="card p-lg">
                        <h2 className="mb-md">Preview</h2>

                        <div className="mb-md">
                            <div className="stat-card-label">Title</div>
                            <div className="text-bold text-lg">{title}</div>
                        </div>

                        {description && (
                            <div className="mb-md">
                                <div className="stat-card-label">Description</div>
                                <p>{description}</p>
                            </div>
                        )}

                        <div className="mb-md">
                            <div className="stat-card-label">Mode</div>
                            <div>{MODES.find(m => m.value === mode)?.label} {MODES.find(m => m.value === mode)?.icon}</div>
                        </div>

                        <div>
                            <div className="stat-card-label">Questions</div>
                            <div>{questions.length > 0 ? `${questions.length} question(s)` : 'No questions added — you can add them later'}</div>
                        </div>
                    </div>
                )}

                {/* Step 4: Launch */}
                {step === 4 && (
                    <div className="card p-lg text-center">
                        <h2 className="mb-md">Ready to Go! 🚀</h2>
                        <p className="text-muted mb-lg">
                            Your session "{title}" is ready. Launch it now or save as a draft.
                        </p>

                        {error && (
                            <p className="mb-md text-error">{error}</p>
                        )}

                        <div className="flex gap-md justify-center">
                            <button
                                className="btn btn-primary"
                                onClick={() => handleLaunch(false)}
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : '🎤 Go Live'}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleLaunch(true)}
                                disabled={loading}
                            >
                                💾 Save as Draft
                            </button>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-lg">
                    <button
                        className="btn btn-secondary"
                        onClick={() => step === 1 ? navigate('/dashboard') : setStep(step - 1)}
                    >
                        {step === 1 ? 'Cancel' : '← Back'}
                    </button>
                    {step < totalSteps && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setStep(step + 1)}
                            disabled={!canProceed()}
                        >
                            Next →
                        </button>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

export default CreateSession;

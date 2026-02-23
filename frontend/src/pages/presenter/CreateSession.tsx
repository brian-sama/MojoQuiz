/**
 * CreateSession — Multi-step Session Wizard
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import DashboardLayout from '../../layouts/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';

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
            case 2: return true;
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
        <DashboardLayout>
            <div className="wizard-container max-w-md mx-auto">
                {/* Header */}
                <header className="mb-xl">
                    <h1 className="text-3xl font-bold mb-xs">Create New Session</h1>
                    <div className="flex justify-between items-center">
                        <p className="text-muted text-sm">Step {step} of {totalSteps}</p>
                        <div className="flex gap-xs w-48 h-1 bg-border rounded-full overflow-hidden">
                            {Array.from({ length: totalSteps }, (_, i) => (
                                <div
                                    key={i}
                                    className={`flex-1 transition-all duration-300 ${i + 1 <= step ? 'bg-primary' : 'bg-transparent'}`}
                                />
                            ))}
                        </div>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        {/* Step 1: Basic Info */}
                        {step === 1 && (
                            <div className="card shadow-premium p-xl">
                                <div className="mb-lg">
                                    <label className="form-label mb-sm block text-sm font-bold">Session Title *</label>
                                    <input
                                        type="text"
                                        className="input text-lg"
                                        placeholder="e.g., Team Retrospective Q1"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        maxLength={100}
                                        autoFocus
                                    />
                                </div>

                                <div className="mb-lg">
                                    <label className="form-label mb-sm block text-sm font-bold">Description (optional)</label>
                                    <textarea
                                        className="input text-sm"
                                        placeholder="What's this session about?"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        maxLength={500}
                                    />
                                </div>

                                <div className="mb-md">
                                    <label className="form-label mb-sm block text-sm font-bold">Session Mode</label>
                                    <div className="grid grid-cols-3 gap-md">
                                        {MODES.map(m => (
                                            <button
                                                key={m.value}
                                                type="button"
                                                onClick={() => setMode(m.value)}
                                                className={`mode-card p-md rounded-xl transition-all border-2 ${mode === m.value ? 'bg-primary/5 border-primary shadow-glow' : 'bg-transparent border-border hover:border-gray-300'}`}
                                            >
                                                <div className="text-2xl mb-sm">{m.icon}</div>
                                                <div className="font-bold text-sm block">{m.label}</div>
                                                <div className="text-[10px] leading-tight text-muted mt-sm opacity-80">{m.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Add Questions */}
                        {step === 2 && (
                            <div className="card shadow-premium p-xl">
                                <h3 className="font-bold mb-md">Build your session</h3>

                                {questions.length > 0 && (
                                    <div className="flex flex-col gap-sm mb-lg max-h-64 overflow-y-auto pr-xs">
                                        {questions.map((q, i) => (
                                            <div key={q.id} className="flex items-center justify-between p-md bg-bg-alt rounded-xl border border-border">
                                                <div className="flex items-center gap-md">
                                                    <span className="text-primary font-bold text-xs bg-primary/10 w-6 h-6 flex items-center justify-center rounded">Q{i + 1}</span>
                                                    <span className="text-sm font-medium line-clamp-1">{q.question_text}</span>
                                                    <span className="text-[9px] uppercase font-bold text-muted bg-border px-sm rounded py-0.5">{q.question_type}</span>
                                                </div>
                                                <button className="text-muted hover:text-error transition-colors text-sm" onClick={() => removeQuestion(q.id)}>
                                                    🗑️
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-col gap-md">
                                    <label className="form-label text-sm font-bold">Add a question</label>
                                    <div className="create-question-row">
                                        <select
                                            className="input create-question-type text-sm"
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
                                            className="input create-question-input"
                                            placeholder="Enter your question text..."
                                            value={newQuestion}
                                            onChange={(e) => setNewQuestion(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
                                        />
                                        <button className="btn btn-secondary btn-icon create-question-add" onClick={addQuestion} disabled={!newQuestion.trim()}>
                                            ➕
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Preview */}
                        {step === 3 && (
                            <div className="card shadow-premium p-xl">
                                <h3 className="font-bold mb-lg">Review Details</h3>

                                <div className="space-y-lg">
                                    <div className="p-md bg-bg-alt rounded-lg">
                                        <span className="text-[10px] uppercase font-bold text-muted block mb-xs">Title</span>
                                        <div className="text-xl font-bold">{title}</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-md">
                                        <div className="p-md bg-bg-alt rounded-lg">
                                            <span className="text-[10px] uppercase font-bold text-muted block mb-xs">Mode</span>
                                            <div className="font-semibold text-primary">{MODES.find(m => m.value === mode)?.label}</div>
                                        </div>
                                        <div className="p-md bg-bg-alt rounded-lg">
                                            <span className="text-[10px] uppercase font-bold text-muted block mb-xs">Content</span>
                                            <div className="font-semibold">{questions.length} Question{questions.length !== 1 ? 's' : ''}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Finalize */}
                        {step === 4 && (
                            <div className="card shadow-premium p-xl text-center">
                                <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center text-4xl mx-auto mb-lg">✨</div>
                                <h2 className="text-2xl font-bold mb-md">Launch your session</h2>
                                <p className="text-muted mb-xl mx-auto max-w-xs text-sm">
                                    Everything looks good. You can go live immediately or save this for later.
                                </p>

                                {error && (
                                    <div className="p-md bg-error/10 text-error rounded-lg mb-lg text-sm">{error}</div>
                                )}

                                <div className="flex flex-col gap-sm">
                                    <button
                                        className="btn btn-primary btn-large w-full shadow-glow"
                                        onClick={() => handleLaunch(false)}
                                        disabled={loading}
                                    >
                                        {loading ? 'Processing...' : '🎤 Launch Live Session'}
                                    </button>
                                    <button
                                        className="btn btn-secondary w-full"
                                        onClick={() => handleLaunch(true)}
                                        disabled={loading}
                                    >
                                        💾 Save as Draft
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Footer Controls */}
                <footer className="mt-xl flex justify-between">
                    <button
                        className="btn btn-secondary px-lg"
                        onClick={() => step === 1 ? navigate('/dashboard') : setStep(step - 1)}
                    >
                        {step === 1 ? 'Cancel' : '← Previous'}
                    </button>
                    {step < totalSteps && (
                        <button
                            className="btn btn-primary px-xl shadow-sm"
                            onClick={() => setStep(step + 1)}
                            disabled={!canProceed()}
                        >
                            Continue →
                        </button>
                    )}
                </footer>
            </div>
        </DashboardLayout>
    );
}

export default CreateSession;

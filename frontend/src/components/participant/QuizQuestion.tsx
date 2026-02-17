/**
 * Quiz Question Component
 * Timed multiple choice quiz with scoring
 */

import { useState, useEffect, useRef } from 'react';
import type { Question, ResponseSubmittedEvent } from '../../types';

interface QuizQuestionProps {
    question: Question;
    onSubmit: (data: { option_index: number; response_time_ms: number }) => void;
    disabled: boolean;
    hasResponded: boolean;
    result: ResponseSubmittedEvent | null;
}

function QuizQuestion({ question, onSubmit, disabled, hasResponded, result }: QuizQuestionProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(question.time_limit || 30);
    const [startTime] = useState(Date.now());
    const timerRef = useRef<any>(null);

    // Countdown timer
    useEffect(() => {
        if (hasResponded || disabled) return;

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [hasResponded, disabled]);

    // Auto-submit on timeout if selected
    useEffect(() => {
        if (timeLeft === 0 && selectedIndex !== null && !hasResponded) {
            handleSubmit();
        }
    }, [timeLeft]);

    const handleSelect = (index: number) => {
        if (disabled || hasResponded) return;
        setSelectedIndex(index);

        // Auto-submit immediately for quiz
        const responseTimeMs = Date.now() - startTime;
        onSubmit({ option_index: index, response_time_ms: responseTimeMs });
    };

    const handleSubmit = () => {
        if (selectedIndex === null || disabled || hasResponded) return;
        const responseTimeMs = Date.now() - startTime;
        onSubmit({ option_index: selectedIndex, response_time_ms: responseTimeMs });
    };

    // Timer progress for visual indicator
    const timerProgress = ((question.time_limit || 30) - timeLeft) / (question.time_limit || 30);
    const isUrgent = timeLeft <= 5;

    return (
        <div className="animate-slide-up">
            {/* Timer */}
            <div className="text-center mb-lg">
                <div
                    className="timer-circle"
                    style={{
                        '--timer-progress': `${(1 - timerProgress) * 100}%`,
                        margin: '0 auto',
                        background: isUrgent
                            ? `conic-gradient(var(--color-error) ${(1 - timerProgress) * 100}%, var(--color-bg-hover) 0)`
                            : `conic-gradient(var(--color-primary) ${(1 - timerProgress) * 100}%, var(--color-bg-hover) 0)`,
                    } as React.CSSProperties}
                >
                    <span style={{ color: isUrgent ? 'var(--color-error)' : 'inherit' }}>
                        {timeLeft}
                    </span>
                </div>
            </div>

            {/* Question */}
            <h2 className="text-center mb-lg" style={{ lineHeight: 1.4 }}>
                {question.question_text}
            </h2>

            {/* Options */}
            <div className="flex flex-col gap-md">
                {question.options?.map((option, index) => (
                    <button
                        key={option.id}
                        className={`option-btn ${selectedIndex === index ? 'selected' : ''}`}
                        onClick={() => handleSelect(index)}
                        disabled={disabled || hasResponded || timeLeft === 0}
                        style={{
                            backgroundColor: getOptionColor(index),
                            opacity: hasResponded && selectedIndex !== index ? 0.5 : 1,
                        }}
                    >
                        <span style={{
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700
                        }}>
                            {question.question_type === 'quiz_tf'
                                ? (index === 0 ? '✓' : '✗')
                                : getOptionLetter(index)
                            }
                        </span>
                        <span style={{ flex: 1 }}>{option.text}</span>
                        {selectedIndex === index && hasResponded && (
                            <span>{result?.is_correct ? '✓' : '✗'}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Result feedback */}
            {hasResponded && result && (
                <div className="text-center mt-lg animate-fade-in">
                    {result.is_correct ? (
                        <>
                            <span style={{ fontSize: '3rem' }}>🎉</span>
                            <p style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '1.5rem' }}>
                                +{result.score} points!
                            </p>
                        </>
                    ) : (
                        <>
                            <span style={{ fontSize: '3rem' }}>😕</span>
                            <p className="text-muted mt-sm">Not quite!</p>
                        </>
                    )}
                </div>
            )}

            {/* Timeout message */}
            {timeLeft === 0 && !hasResponded && (
                <div className="text-center mt-lg animate-fade-in">
                    <span style={{ fontSize: '3rem' }}>⏰</span>
                    <p className="text-muted mt-sm">Time's up!</p>
                </div>
            )}
        </div>
    );
}

function getOptionColor(index: number): string {
    const colors = [
        '#ef4444', // Red
        '#3b82f6', // Blue
        '#22c55e', // Green
        '#f59e0b', // Amber
    ];
    return colors[index % colors.length];
}

function getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
}

export default QuizQuestion;

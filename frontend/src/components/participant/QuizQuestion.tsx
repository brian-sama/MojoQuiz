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
                        background: isUrgent
                            ? `conic-gradient(var(--color-error) var(--timer-progress), var(--color-bg-hover) 0)`
                            : `conic-gradient(var(--color-primary) var(--timer-progress), var(--color-bg-hover) 0)`,
                    } as React.CSSProperties}
                >
                    <span className={isUrgent ? 'text-error' : ''}>
                        {timeLeft}
                    </span>
                </div>
            </div>

            {/* Question */}
            <h2 className="text-center mb-lg line-height-1-4">
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
                            '--option-color': getOptionColor(index),
                            backgroundColor: 'var(--option-color)',
                            opacity: hasResponded && selectedIndex !== index ? 0.5 : 1,
                        } as React.CSSProperties}
                    >
                        <span className="option-indicator">
                            {question.question_type === 'quiz_tf'
                                ? (index === 0 ? '✓' : '✗')
                                : getOptionLetter(index)
                            }
                        </span>
                        <span className="flex-1">{option.text}</span>
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
                            <span className="text-xl-3">Correct!</span>
                            <p className="text-success font-700 text-xl-1-5">
                                +{result.score} points!
                            </p>
                        </>
                    ) : (
                        <>
                            <span className="text-xl-3">Incorrect</span>
                            <p className="text-muted mt-sm">Not quite!</p>
                        </>
                    )}
                </div>
            )}

            {/* Timeout message */}
            {timeLeft === 0 && !hasResponded && (
                <div className="text-center mt-lg animate-fade-in">
                    <span className="text-xl-3">Time's Up</span>
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

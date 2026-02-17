/**
 * Scale Question Component
 * Slider/rating scale input
 */

import { useState } from 'react';
import type { Question } from '../../types';

interface ScaleQuestionProps {
    question: Question;
    onSubmit: (data: { value: number }) => void;
    disabled: boolean;
    hasResponded: boolean;
}

function ScaleQuestion({ question, onSubmit, disabled, hasResponded }: ScaleQuestionProps) {
    const min = question.settings?.min_value || 1;
    const max = question.settings?.max_value || 10;
    const minLabel = question.settings?.min_label || String(min);
    const maxLabel = question.settings?.max_label || String(max);

    const [value, setValue] = useState(Math.floor((min + max) / 2));
    const [hasInteracted, setHasInteracted] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(parseInt(e.target.value));
        setHasInteracted(true);
    };

    const handleSubmit = () => {
        if (disabled) return;
        onSubmit({ value });
    };

    // Calculate percentage for gradient
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className="card animate-slide-up">
            <h2 className="text-center mb-lg" style={{ lineHeight: 1.4 }}>
                {question.question_text}
            </h2>

            <div className="text-center mb-lg">
                <span style={{
                    fontSize: '4rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>
                    {value}
                </span>
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={handleChange}
                    disabled={disabled}
                    aria-label={`Rating from ${minLabel} to ${maxLabel}, current value ${value}`}
                    title={`Select a value between ${min} and ${max}`}
                    style={{
                        width: '100%',
                        height: '12px',
                        borderRadius: '6px',
                        background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${percentage}%, var(--color-bg-hover) ${percentage}%, var(--color-bg-hover) 100%)`,
                        appearance: 'none',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                />

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 'var(--spacing-sm)',
                    color: 'var(--color-text-muted)',
                    fontSize: '0.875rem'
                }}>
                    <span>{minLabel}</span>
                    <span>{maxLabel}</span>
                </div>
            </div>

            {!hasResponded && (
                <button
                    className="btn btn-primary btn-large btn-block"
                    onClick={handleSubmit}
                    disabled={disabled || !hasInteracted}
                >
                    Submit
                </button>
            )}

            {hasResponded && (
                <div className="text-center animate-fade-in">
                    <span style={{ fontSize: '2rem' }}>✓</span>
                    <p className="text-muted mt-sm">Your rating has been recorded!</p>
                </div>
            )}
        </div>
    );
}

export default ScaleQuestion;

/**
 * Poll Question Component
 * Multiple choice poll voting
 */

import { useState } from 'react';
import type { Question } from '../../types';

interface PollQuestionProps {
    question: Question;
    onSubmit: (data: { option_index: number }) => void;
    disabled: boolean;
    hasResponded: boolean;
}

function PollQuestion({ question, onSubmit, disabled, hasResponded }: PollQuestionProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const handleSelect = (index: number) => {
        if (disabled) return;
        setSelectedIndex(index);
    };

    const handleSubmit = () => {
        if (selectedIndex === null || disabled) return;
        onSubmit({ option_index: selectedIndex });
    };

    return (
        <div className="animate-slide-up">
            <h2 className="text-center mb-lg" style={{ lineHeight: 1.4 }}>
                {question.question_text}
            </h2>

            <div className="flex flex-col gap-md">
                {question.options?.map((option, index) => (
                    <button
                        key={option.id}
                        className={`option-btn ${selectedIndex === index ? 'selected' : ''}`}
                        onClick={() => handleSelect(index)}
                        disabled={disabled}
                        style={{
                            backgroundColor: getOptionColor(index),
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
                            {getOptionLetter(index)}
                        </span>
                        <span style={{ flex: 1 }}>{option.text}</span>
                        {selectedIndex === index && (
                            <span>✓</span>
                        )}
                    </button>
                ))}
            </div>

            {!hasResponded && selectedIndex !== null && (
                <button
                    className="btn btn-primary btn-large btn-block mt-lg"
                    onClick={handleSubmit}
                    disabled={disabled}
                >
                    Submit
                </button>
            )}

            {hasResponded && (
                <div className="text-center mt-lg animate-fade-in">
                    <span style={{ fontSize: '2rem' }}>✓</span>
                    <p className="text-muted mt-sm">Your vote has been recorded!</p>
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
        '#8b5cf6', // Purple
        '#ec4899', // Pink
    ];
    return colors[index % colors.length];
}

function getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D...
}

export default PollQuestion;

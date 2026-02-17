/**
 * Word Cloud Input Component
 * Allows participants to submit words for word cloud
 */

import { useState } from 'react';
import type { Question } from '../../types';

interface WordCloudInputProps {
    question: Question;
    onSubmit: (words: string[]) => void;
    disabled: boolean;
    hasResponded: boolean;
}

function WordCloudInput({ question, onSubmit, disabled, hasResponded }: WordCloudInputProps) {
    const maxWords = question.settings?.max_words || 3;
    const [words, setWords] = useState<string[]>(Array(maxWords).fill(''));

    const handleInputChange = (value: string, index: number) => {
        const newWords = [...words];
        newWords[index] = value;
        setWords(newWords);
    };

    const handleSubmit = () => {
        const validWords = words.filter(w => w.trim().length >= 2);
        if (validWords.length === 0 || disabled) return;
        onSubmit(validWords);
    };

    const filledCount = words.filter(w => w.trim().length >= 2).length;

    return (
        <div className="card animate-slide-up">
            <h2 className="text-center mb-lg" style={{ lineHeight: 1.4 }}>
                {question.question_text}
            </h2>

            <p className="text-center text-muted mb-lg">
                Enter up to {maxWords} word{maxWords > 1 ? 's' : ''}
            </p>

            <div className="flex flex-col gap-md">
                {words.map((word, index) => (
                    <input
                        key={index}
                        type="text"
                        className="input"
                        placeholder={`Word ${index + 1}`}
                        value={word}
                        onChange={(e) => handleInputChange(e.target.value, index)}
                        disabled={disabled}
                        style={{
                            borderColor: word.trim().length >= 2 ? 'var(--color-success)' : undefined,
                        }}
                    />
                ))}
            </div>

            {!hasResponded && (
                <button
                    className="btn btn-primary btn-large btn-block mt-lg"
                    onClick={handleSubmit}
                    disabled={disabled || filledCount === 0}
                >
                    Submit {filledCount > 0 ? `(${filledCount} word${filledCount > 1 ? 's' : ''})` : ''}
                </button>
            )}

            {hasResponded && (
                <div className="text-center mt-lg animate-fade-in">
                    <span style={{ fontSize: '2rem' }}>☁️</span>
                    <p className="text-muted mt-sm">Your words have been added!</p>
                </div>
            )}
        </div>
    );
}

export default WordCloudInput;

import { useState, useRef } from 'react';
import { Question } from '../../types';

interface Props {
    question: Question;
    onSubmit: (data: { x: number; y: number }) => void;
    disabled: boolean;
    hasResponded: boolean;
}

export default function PinImageQuestion({ question, onSubmit, disabled, hasResponded }: Props) {
    const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (disabled || hasResponded || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setPin({ x, y });
    };

    const handleSubmit = () => {
        if (pin) {
            onSubmit(pin);
        }
    };

    const imageUrl = question.options?.[0]?.text || '';

    if (hasResponded) {
        return (
            <div className="text-center py-lg">
                <div className="emoji-large mb-md">Select Location</div>
                <h3>Pin Dropped!</h3>
                <p className="text-muted mt-sm">Check the presenter's screen to see the heatmap.</p>
            </div>
        );
    }

    return (
        <div className="pin-image-question">
            <h3 className="mb-lg">{question.question_text}</h3>
            <p className="text-muted mb-md text-sm italic">Tap/Click on the image to drop your pin</p>

            <div
                ref={containerRef}
                className="relative inline-block overflow-hidden rounded-lg cursor-crosshair mb-xl w-full"
                onClick={handleImageClick}
            >
                <img src={imageUrl} alt="Target" className="w-full h-auto block select-none pointer-events-none" />
                {pin && (
                    // eslint-disable-next-line
                    <div
                        className="pin-marker"
                        style={{
                            '--pin-left': `${pin.x}%`,
                            '--pin-top': `${pin.y}%`
                        } as React.CSSProperties}
                    />
                )}
            </div>

            <button
                className="btn btn-primary btn-block"
                onClick={handleSubmit}
                disabled={disabled || !pin}
            >
                Submit Pin
            </button>
        </div>
    );
}

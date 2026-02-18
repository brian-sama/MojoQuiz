import { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Question, QuestionOption } from '../../types';

interface Props {
    question: Question;
    onSubmit: (data: { ranking: { index: number; rank: number }[] }) => void;
    disabled: boolean;
    hasResponded: boolean;
}

export default function RankingQuestion({ question, onSubmit, disabled, hasResponded }: Props) {
    const [items, setItems] = useState<QuestionOption[]>(question.options || []);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSubmit = () => {
        // Convert current order to the format needed by the backend
        // Rank is 1-indexed based on position in items array
        const ranking = items.map((item, index) => {
            const originalIndex = question.options?.findIndex(o => o.id === item.id) ?? 0;
            return {
                index: originalIndex,
                rank: index + 1
            };
        });
        onSubmit({ ranking });
    };

    if (hasResponded) {
        return (
            <div className="text-center py-lg">
                <div className="emoji-large mb-md">📊</div>
                <h3>Ranking Submitted</h3>
                <p className="text-muted mt-sm">Wait for the host to reveal the overall ranks!</p>
            </div>
        );
    }

    return (
        <div className="ranking-question">
            <h3 className="mb-lg">{question.question_text}</h3>
            <p className="text-muted mb-md text-sm italic">Drag to reorder items</p>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-sm mb-xl">
                        {items.map((item) => (
                            <SortableItem key={item.id} id={item.id} text={item.text} disabled={disabled} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <button
                className="btn btn-primary btn-block"
                onClick={handleSubmit}
                disabled={disabled}
            >
                Submit Ranking
            </button>
        </div>
    );
}

function SortableItem({ id, text, disabled }: { id: string; text: string; disabled: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled });

    return (
        <div
            ref={setNodeRef}
            // eslint-disable-next-line
            style={{
                '--item-transform': CSS.Transform.toString(transform),
                '--item-transition': transition,
                '--item-z-index': isDragging ? 10 : 1,
                '--item-opacity': isDragging ? 0.8 : 1,
            } as React.CSSProperties}
            {...attributes}
            {...listeners}
            className={`option-btn sortable-item ${isDragging ? 'dragging' : ''}`}
        >
            <div className="flex items-center gap-md w-full">
                <span className="text-muted">⠿</span>
                <span className="flex-1">{text}</span>
            </div>
        </div>
    );
}

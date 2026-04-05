// src/components/dnd/DropZone.tsx
'use client';

import React from 'react';
import {
    SortableContext,
    horizontalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';

interface DropZoneProps {
    id: string;
    items: any[];
    setItems: (items: any[]) => void;
    children: React.ReactNode;
    className?: string;
}

export function DropZone({
                             id,
                             items,
                             setItems,
                             children,
                             className = '',
                         }: DropZoneProps) {
    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over?.id);

            const newItems = arrayMove(items, oldIndex, newIndex);
            setItems(newItems);

            // Сохраняем порядок в localStorage
            localStorage.setItem('footer-order', JSON.stringify(newItems.map(item => item.id)));
        }
    };

    return (
        <SortableContext
            items={items.map(item => item.id)}
            strategy={horizontalListSortingStrategy}
        >
            <div className={className} onDragEnd={handleDragEnd}>
                {children}
            </div>
        </SortableContext>
    );
}
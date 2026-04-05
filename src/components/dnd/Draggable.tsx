// src/components/dnd/Draggable.tsx
'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableProps {
    id: string;
    children: React.ReactNode;
    className?: string;
}

export function Draggable({ id, children, className = '' }: DraggableProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${className} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            {...attributes}
            {...listeners}
        >
            {children}
        </div>
    );
}
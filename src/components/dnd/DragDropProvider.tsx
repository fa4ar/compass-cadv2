// src/components/dnd/DragDropProvider.tsx
'use client';

import React from 'react';
import {
    DndContext,
    DragEndEvent,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';

interface DragDropContextType {
    activeId: string | null;
}

const DragDropContext = React.createContext<DragDropContextType | undefined>(undefined);

export function DragDropProvider({ children }: { children: React.ReactNode }) {
    const [activeId, setActiveId] = React.useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        // Мы будем обрабатывать сортировку в самом компоненте
    };

    return (
        <DragDropContext.Provider value={{ activeId }}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                {children}
            </DndContext>
        </DragDropContext.Provider>
    );
}

export function useDragDrop() {
    const context = React.useContext(DragDropContext);
    if (!context) {
        throw new Error('useDragDrop must be used within DragDropProvider');
    }
    return context;
}
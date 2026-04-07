"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';

export type DragPosition = {
  x: number;
  y: number;
};

export type DragDelta = {
  dx: number;
  dy: number;
};

export type DragBounds = {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
};

export interface UseDragOptions {
  initialPosition?: DragPosition;
  bounds?: DragBounds;
  onDragStart?: (position: DragPosition) => void;
  onDrag?: (delta: DragDelta, position: DragPosition) => void;
  onDragEnd?: (position: DragPosition) => void;
}

export interface UseDragReturn {
  position: DragPosition;
  isDragging: boolean;
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  reset: () => void;
}

export function useDrag(options: UseDragOptions = {}): UseDragReturn {
  const {
    initialPosition = { x: 0, y: 0 },
    bounds,
    onDragStart,
    onDrag,
    onDragEnd,
  } = options;

  const [position, setPosition] = useState<DragPosition>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const startPosition = useRef<DragPosition>({ x: 0, y: 0 });

  const clampPosition = useCallback(
    (pos: DragPosition): DragPosition => {
      if (!bounds) return pos;
      return {
        x: bounds.minX !== undefined ? Math.max(bounds.minX, Math.min(bounds.maxX ?? pos.x, pos.x)) : pos.x,
        y: bounds.minY !== undefined ? Math.max(bounds.minY, Math.min(bounds.maxY ?? pos.y, pos.y)) : pos.y,
      };
    },
    [bounds]
  );

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      setIsDragging(true);
      startPosition.current = { x: clientX, y: clientY };
      onDragStart?.(position);
    },
    [position, onDragStart]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const dx = clientX - startPosition.current.x;
      const dy = clientY - startPosition.current.y;
      const newPosition = clampPosition({
        x: position.x + dx,
        y: position.y + dy,
      });
      startPosition.current = { x: clientX, y: clientY };
      setPosition(newPosition);
      onDrag?.({ dx, dy }, newPosition);
    },
    [isDragging, position, clampPosition, onDrag]
  );

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragEnd?.(position);
  }, [isDragging, position, onDragEnd]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY);
    },
    [handleStart]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    },
    [handleStart]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleMouseUp = () => handleEnd();
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };
    const handleTouchEnd = () => handleEnd();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  const reset = useCallback(() => {
    setPosition(initialPosition);
    setIsDragging(false);
  }, [initialPosition]);

  return {
    position,
    isDragging,
    handlers: {
      onMouseDown,
      onTouchStart,
    },
    reset,
  };
}

export interface DraggableProps {
  children: React.ReactNode;
  options?: UseDragOptions;
  className?: string;
  disabled?: boolean;
}

export function Draggable({ children, options, className, disabled }: DraggableProps) {
  const { position, isDragging, handlers } = useDrag(options);

  return (
    <div
      {...handlers}
      className={`${className || ''} ${isDragging ? 'cursor-grabbing' : disabled ? '' : 'cursor-grab'}`}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        userSelect: 'none',
      }}
    >
      {children}
    </div>
  );
}

export interface DropZoneOptions {
  onDrop?: (items: any[]) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  accept?: string[];
}

export function useDropZone(options: DropZoneOptions = {}) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (options.accept && options.accept.length > 0) {
        const types = Array.from(e.dataTransfer.types);
        const hasAccepted = options.accept.some((type) => types.includes(type));
        if (!hasAccepted) return;
      }
      setIsOver(true);
      options.onDragOver?.(e);
    },
    [options]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      setIsOver(false);
      options.onDragLeave?.(e);
    },
    [options]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      const items: { type: string; data: string }[] = [];
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        items.push({
          type: item.type,
          data: item.kind === 'string' ? e.dataTransfer.getData(item.type) : '',
        });
      }
      options.onDrop?.(items);
    },
    [options]
  );

  return {
    isOver,
    handlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}

export interface DroppableProps {
  children: React.ReactNode;
  options?: DropZoneOptions;
  className?: string;
}

export function Droppable({ children, options, className }: DroppableProps) {
  const { isOver, handlers } = useDropZone(options);

  return (
    <div
      {...handlers}
      className={`${className || ''} ${isOver ? 'drop-zone-active' : ''}`}
      style={{
        transition: 'all 0.2s ease',
        border: isOver ? '2px dashed #3b82f6' : '2px dashed transparent',
        borderRadius: '8px',
      }}
    >
      {children}
    </div>
  );
}

export interface DraggableItem {
  id: string;
  [key: string]: any;
}

export interface UseSortableOptions<T extends DraggableItem> {
  items: T[];
  onReorder?: (items: T[]) => void;
}

export function useSortable<T extends DraggableItem>(options: UseSortableOptions<T>) {
  const [items, setItems] = useState<T[]>(options.items);
  const [draggedItem, setDraggedItem] = useState<T | null>(null);

  useEffect(() => {
    setItems(options.items);
  }, [options.items]);

  const handleDragStart = useCallback((item: T) => {
    setDraggedItem(item);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetItem: T) => {
      e.preventDefault();
      if (!draggedItem || draggedItem.id === targetItem.id) return;

      setItems((prev) => {
        const newItems = prev.filter((item) => item.id !== draggedItem.id);
        const targetIndex = newItems.findIndex((item) => item.id === targetItem.id);
        newItems.splice(targetIndex, 0, draggedItem);
        return newItems;
      });
    },
    [draggedItem]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    options.onReorder?.(items);
  }, [draggedItem, items, options]);

  return {
    items,
    draggedItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}

export function SortableItem({
  item,
  render,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  item: DraggableItem;
  render: (item: DraggableItem) => React.ReactNode;
  onDragStart?: (item: DraggableItem) => void;
  onDragOver?: (e: React.MouseEvent, item: DraggableItem) => void;
  onDragEnd?: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart?.(item)}
      onDragOver={(e) => onDragOver?.(e, item)}
      onDragEnd={onDragEnd}
      className="cursor-move select-none"
    >
      {render(item)}
    </div>
  );
}

export function DragDropProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function createDragData(type: string, data: any): void {
  const event = new CustomEvent('dragdata', { detail: { type, data } });
  window.dispatchEvent(event);
}

export function getDragData<T>(type: string): T | null {
  return (window as any).__dragData?.[type] || null;
}
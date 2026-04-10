import React from 'react';
import { Settings2, Maximize2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutEditorProps {
    children: React.ReactNode;
    isEditMode: boolean;
    onToggleEditMode: () => void;
}

export const LayoutEditor: React.FC<LayoutEditorProps> = ({
    children,
    isEditMode,
    onToggleEditMode
}) => {
    return (
        <div className="relative">
            {children}
            {isEditMode && (
                <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
                    <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 shadow-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <Settings2 className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-bold text-zinc-300">РЕЖИМ РЕДАКТИРОВАНИЯ</span>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] text-zinc-500">
                                Перетаскивайте панели для изменения расположения
                            </div>
                            <div className="text-[10px] text-zinc-500">
                                Используйте края панелей для изменения размера
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-3 bg-zinc-800 border-zinc-700 text-xs"
                            onClick={onToggleEditMode}
                        >
                            <Maximize2 className="w-3 h-3 mr-1" />
                            Завершить редактирование
                        </Button>
                    </div>
                </div>
            )}
            {!isEditMode && (
                <Button
                    size="sm"
                    variant="ghost"
                    className="fixed top-4 right-4 z-40 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    onClick={onToggleEditMode}
                >
                    <Settings2 className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
};

import React from 'react';
import { Car, Siren, Footprints, LogOut, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Unit {
    unit: string;
    officer: string;
    status: string;
    characterId?: number;
    userId?: number;
}

interface UnitDetailsPanelProps {
    unit: Unit | null;
    onStatusChange?: (status: string) => void;
    onSendMessage?: () => void;
    onGoOffDuty?: () => void;
    currentUnit?: { status?: string };
}

export const UnitDetailsPanel: React.FC<UnitDetailsPanelProps> = ({
    unit,
    onStatusChange,
    onSendMessage,
    onGoOffDuty,
    currentUnit
}) => {
    const getStatusDisplay = (status: string) => {
        const displays: Record<string, string> = {
            'Available': '10-8 ДОСТУПЕН',
            'Busy': '10-6 ЗАНЯТ',
            'Enroute': '10-97 В ПУТИ',
            'On Scene': '10-23 НА ВЫЗОВЕ',
            'Dispatched': '10-10 НАЗНАЧЕН'
        };
        return displays[status] || 'НЕИЗВЕСТНО';
    };

    const getStatusClass = (status: string) => {
        const classes: Record<string, string> = {
            'Available': 'bg-green-900/30 text-green-400 border border-green-700/50',
            'Busy': 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/50',
            'Enroute': 'bg-blue-900/30 text-blue-400 border border-blue-700/50',
            'On Scene': 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/50',
            'Dispatched': 'bg-purple-900/30 text-purple-400 border border-purple-700/50'
        };
        return classes[status] || 'bg-zinc-800/50 text-zinc-400 border border-zinc-700';
    };

    const getButtonClass = (status: string, currentStatus?: string) => {
        const classes: Record<string, string> = {
            'Available': 'bg-green-900/30 border-green-700/50 hover:bg-green-900/50',
            'Busy': 'bg-yellow-900/30 border-yellow-700/50 hover:bg-yellow-900/50',
            'Enroute': 'bg-blue-900/30 border-blue-700/50 hover:bg-blue-900/50'
        };
        const activeClass = status === currentStatus ? 'ring-2' : '';
        const textClass = status === currentStatus ? 'text-green-300' : 'text-green-400';
        
        return `${classes[status]} ${activeClass} ${textClass}`;
    };

    return (
        <div className="rounded-lg border border-zinc-700 p-3 space-y-2">
            <span className="text-xs font-medium text-zinc-400 block mb-2">Детали выбранного юнита</span>
            {unit ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                            <Car className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">{unit.unit}</p>
                            <p className="text-[10px] text-zinc-500 uppercase">{unit.officer}</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-[10px] bg-green-900/20 border-green-700/50 text-green-400"
                            onClick={() => onStatusChange?.('Available')}
                        >
                            10-8
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-[10px] bg-amber-900/20 border-amber-700/50 text-amber-400"
                            onClick={() => onStatusChange?.('Busy')}
                        >
                            10-6
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-[10px] bg-blue-900/20 border-blue-700/50 text-blue-400"
                            onClick={() => onStatusChange?.('Enroute')}
                        >
                            10-97
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-[10px] bg-red-900/20 border-red-700/50 text-red-400"
                            onClick={() => onStatusChange?.('On Scene')}
                        >
                            10-23
                        </Button>
                    </div>
                    {onSendMessage && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-[10px] bg-blue-900/20 border-blue-700/50 text-blue-400"
                            onClick={onSendMessage}
                        >
                            <Send className="w-3 h-3 mr-1" />
                            Отправить сообщение
                        </Button>
                    )}
                </div>
            ) : (
                <p className="text-xs text-zinc-600 italic">Выберите юнит для управления</p>
            )}
        </div>
    );
};

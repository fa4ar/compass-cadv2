import React from 'react';
import { MessageCircle, MapPin, X, User, Navigation, CheckCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CallNote {
    id: number;
    author: string;
    text: string;
    createdAt: string;
}

interface Unit {
    userId: number;
    callSign?: string;
    character?: { firstName: string; lastName: string };
    user?: { username: string; avatarUrl: string };
    partnerUserId?: number;
    pairedWith?: any[];
}

interface Call {
    id: number;
    description: string;
    location: string;
    status: string;
    priority?: string;
    units?: Unit[];
    mainUnitId?: number;
    notes?: CallNote[];
}

interface CallDetailsModalProps {
    call: Call | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateStatus?: (callId: number, status: string) => void;
    onUpdatePriority?: (callId: number, priority: string) => void;
    onAddNote?: (callId: number, text: string) => void;
    onAttachUnit?: (callId: number) => void;
    onDetachUnit?: () => void;
    onSetMainUnit?: (callId: number, userId: number) => void;
    onCloseCall?: (callId: number) => void;
    currentUnit?: { callId?: number };
    onDuty?: boolean;
    canManageUnits?: boolean;
    groupUnits?: (units: Unit[]) => Unit[];
    getImageUrl?: (url?: string) => string | null;
}

export const CallDetailsModal: React.FC<CallDetailsModalProps> = ({
    call,
    isOpen,
    onClose,
    onUpdateStatus,
    onUpdatePriority,
    onAddNote,
    onAttachUnit,
    onDetachUnit,
    onSetMainUnit,
    onCloseCall,
    currentUnit,
    onDuty = false,
    canManageUnits = false,
    groupUnits = (u) => u,
    getImageUrl = (url) => url || null
}) => {
    const [newNoteText, setNewNoteText] = React.useState('');
    const [showPriorityMenu, setShowPriorityMenu] = React.useState(false);

    const priorities = [
        { value: 'low', label: 'Низкий', color: 'bg-green-600' },
        { value: 'medium', label: 'Средний', color: 'bg-yellow-600' },
        { value: 'high', label: 'Высокий', color: 'bg-orange-600' },
        { value: 'critical', label: 'Критический', color: 'bg-red-600' }
    ];

    const handleNoteSubmit = () => {
        if (!newNoteText.trim() || !call || !onAddNote) return;
        onAddNote(call.id, newNoteText);
        setNewNoteText('');
    };

    if (!isOpen || !call) return null;

    const currentPriority = priorities.find(p => p.value === (call.priority || 'medium'));
    const groupedUnits = groupUnits(call.units || []);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-2 text-blue-400">
                        <MessageCircle className="w-5 h-5" />
                        <h2 className="text-lg font-bold text-zinc-100">Детали вызова #{call.id}</h2>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="w-5 h-5 text-zinc-500" />
                    </Button>
                </div>
                <div className="p-4 space-y-4 overflow-hidden flex flex-col">
                    <div className="bg-zinc-800/40 p-3 rounded-lg border border-zinc-800 text-sm space-y-1">
                        <p className="text-zinc-500 text-[10px] uppercase">Суть вызова</p>
                        <p className="text-zinc-200">{call.description}</p>
                        <p className="text-zinc-500 text-[10px] uppercase pt-2">Местоположение</p>
                        <p className="text-zinc-200 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-red-500" /> {call.location}
                        </p>
                        {onUpdatePriority && (
                            <div className="pt-2 relative">
                                <p className="text-zinc-500 text-[10px] uppercase">Приоритет</p>
                                <div className="relative">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-8 text-xs bg-zinc-800 border-zinc-700 justify-between"
                                        onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                                    >
                                        <span className={`flex items-center gap-2`}>
                                            <span className={`w-2 h-2 rounded-full ${currentPriority?.color}`}></span>
                                            {currentPriority?.label}
                                        </span>
                                        <ChevronDown className="w-3 h-3" />
                                    </Button>
                                    {showPriorityMenu && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl z-10">
                                            {priorities.map((priority) => (
                                                <button
                                                    key={priority.value}
                                                    className={`w-full px-3 py-2 text-xs text-left hover:bg-zinc-700 flex items-center gap-2 first:rounded-t last:rounded-b ${currentPriority?.value === priority.value ? 'bg-zinc-700' : ''}`}
                                                    onClick={() => {
                                                        onUpdatePriority(call.id, priority.value);
                                                        setShowPriorityMenu(false);
                                                    }}
                                                >
                                                    <span className={`w-2 h-2 rounded-full ${priority.color}`}></span>
                                                    {priority.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {call.units && call.units.length > 0 && (
                        <div className="bg-zinc-800/40 p-3 rounded-lg border border-zinc-800">
                            <p className="text-zinc-500 text-[10px] uppercase mb-2">Прикрепленные юниты</p>
                            <div className="space-y-2">
                                {groupedUnits.map((unit) => {
                                    const isPaired = unit.partnerUserId || (unit.pairedWith && unit.pairedWith.length > 0);
                                    const partner = isPaired ? (unit.pairedWith?.[0] || call.units?.find((p: any) => p.userId === (unit.partnerUserId || unit.pairedWith?.[0]?.userId))) : null;

                                    return (
                                        <div 
                                            key={unit.userId} 
                                            className={`flex items-center justify-between p-2 rounded border ${
                                                call.mainUnitId === unit.userId 
                                                    ? 'bg-red-900/30 border-red-700' 
                                                    : 'bg-zinc-800/50 border-zinc-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="flex -space-x-2">
                                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                                                        {unit.user?.avatarUrl ? (
                                                            <img src={getImageUrl(unit.user.avatarUrl)!} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-zinc-600"><User className="w-3 h-3" /></div>
                                                        )}
                                                    </div>
                                                    {partner && (
                                                        <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700 ring-2 ring-zinc-900">
                                                            {partner.user?.avatarUrl ? (
                                                                <img src={getImageUrl(partner.user.avatarUrl)!} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-zinc-600"><User className="w-3 h-3" /></div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-zinc-200 text-[11px] font-medium leading-tight">
                                                        {unit.callSign || unit.character?.firstName + ' ' + unit.character?.lastName || unit.user?.username}
                                                        {partner && ` & ${partner.callSign || partner.character?.firstName + ' ' + partner.character?.lastName || partner.user?.username}`}
                                                    </p>
                                                    {call.mainUnitId === unit.userId && (
                                                        <span className="text-[9px] text-red-400 font-bold uppercase tracking-tighter">ГЛАВНЫЙ</span>
                                                    )}
                                                </div>
                                            </div>
                                            {canManageUnits && call.mainUnitId !== unit.userId && onSetMainUnit && (
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost"
                                                    className="h-6 px-2 text-[10px] text-red-400 hover:bg-red-900/20"
                                                    onClick={() => onSetMainUnit(call.id, unit.userId)}
                                                >
                                                    Назначить
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {onDuty && (
                        <div className="bg-zinc-800/40 p-3 rounded-lg border border-zinc-800">
                            {currentUnit?.callId !== call.id && onAttachUnit && (
                                <Button 
                                    size="sm" 
                                    className="w-full bg-blue-600 hover:bg-blue-500"
                                    onClick={() => onAttachUnit(call.id)}
                                >
                                    <Navigation className="w-3.5 h-3.5 mr-1" />
                                    Прикрепиться к вызову
                                </Button>
                            )}
                            {currentUnit?.callId === call.id && onDetachUnit && (
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="w-full bg-red-900/20 border-red-700/50 text-red-400 hover:bg-red-900/30"
                                    onClick={onDetachUnit}
                                >
                                    Открепиться от вызова
                                </Button>
                            )}
                        </div>
                    )}

                    <div className="pt-2 border-t border-zinc-800 space-y-3 flex-1 flex flex-col min-h-0">
                        <Label className="text-[10px] uppercase text-zinc-500 block">Чат / Обновления вызова</Label>
                        <div className="flex-1 bg-zinc-950/40 rounded border border-zinc-800 overflow-auto p-2 space-y-2">
                            {call.notes && call.notes.length > 0 ? (
                                call.notes.map((note) => {
                                    const isSystemNote = note.author === 'SYSTEM';
                                    return (
                                        <div key={note.id} className={`text-[11px] leading-tight ${isSystemNote ? 'bg-zinc-900/50 p-2 rounded border border-zinc-800/50' : ''}`}>
                                            {isSystemNote ? (
                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle className="w-3 h-3 text-zinc-600 shrink-0 mt-0.5" />
                                                    <div>
                                                        <span className="text-zinc-500 font-bold text-[10px]">СИСТЕМА: </span>
                                                        <span className="text-zinc-400 text-[10px]">{note.text}</span>
                                                        <div className="text-[8px] text-zinc-600 italic">{new Date(note.createdAt).toLocaleTimeString()}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-blue-400 font-bold">[{note.author}]: </span>
                                                    <span className="text-zinc-300">{note.text}</span>
                                                    <div className="text-[9px] text-zinc-600 italic">{new Date(note.createdAt).toLocaleTimeString()}</div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-4 text-zinc-600 italic text-[10px]">Нет записей. Добавьте информацию.</div>
                            )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                            <Input
                                placeholder="Добавить инфо..."
                                className="h-8 text-xs bg-zinc-800 border-zinc-700"
                                value={newNoteText}
                                onChange={(e) => setNewNoteText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleNoteSubmit()}
                            />
                            <Button size="sm" className="h-8 w-8 p-0 shrink-0" onClick={handleNoteSubmit}>
                                <Navigation className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>

                    {onCloseCall && (
                        <Button 
                            variant="outline" 
                            className="w-full bg-zinc-800/50 border-zinc-700"
                            onClick={() => onCloseCall(call.id)}
                        >
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            Закрыть вызов
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

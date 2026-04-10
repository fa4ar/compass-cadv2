import React from 'react';
import { Shield, X, Loader2, PlusSquare, RefreshCw, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Warrant {
    id: number;
    type: string;
    title: string;
    description: string;
    status: string;
    characterId: number;
    justification?: string;
    expiresAt?: string;
    issuerName?: string;
}

interface WarrantModalProps {
    isOpen: boolean;
    onClose: () => void;
    warrants: Warrant[];
    isLoading: boolean;
    onRefresh: () => void;
    onCreateWarrant: () => void;
    onExecuteWarrant: (warrantId: number) => void;
    onCancelWarrant: (warrantId: number, reason: string) => void;
    showCreateModal: boolean;
}

export const WarrantModal: React.FC<WarrantModalProps> = ({
    isOpen,
    onClose,
    warrants,
    isLoading,
    onRefresh,
    onCreateWarrant,
    onExecuteWarrant,
    onCancelWarrant,
    showCreateModal
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-amber-500" />
                        <h2 className="text-xl font-bold text-white">Ордера</h2>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={onRefresh}
                            className="bg-zinc-800/50 border-zinc-700"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Обновить
                        </Button>
                        <Button 
                            size="sm"
                            onClick={onCreateWarrant}
                            className="bg-blue-600 hover:bg-blue-500"
                        >
                            <PlusSquare className="w-3.5 h-3.5 mr-2" />
                            Создать ордер
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="p-4 overflow-auto flex-1">
                    {warrants.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-700 rounded-xl bg-zinc-900/20">
                            <div className="text-center">
                                <Shield className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                <p className="text-zinc-500 font-medium">Ордеров не найдено</p>
                                <p className="text-xs text-zinc-600 mt-1">Активные ордера будут отображаться здесь</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {warrants.map((warrant) => (
                                <div key={warrant.id} className="p-4 bg-zinc-900/60 border border-zinc-700/80 rounded-xl">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                warrant.type === 'arrest' ? 'bg-red-500/10 border border-red-500/30' :
                                                warrant.type === 'search' ? 'bg-amber-500/10 border border-amber-500/30' :
                                                'bg-blue-500/10 border border-blue-500/30'
                                            }`}>
                                                <Shield className={`w-5 h-5 ${
                                                    warrant.type === 'arrest' ? 'text-red-400' :
                                                    warrant.type === 'search' ? 'text-amber-400' :
                                                    'text-blue-400'
                                                }`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                        warrant.status === 'active' ? 'bg-red-900/30 border-red-700/50 text-red-400' :
                                                        warrant.status === 'executed' ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400' :
                                                        warrant.status === 'cancelled' ? 'bg-zinc-700/50 border-zinc-600/50 text-zinc-400' :
                                                        'bg-yellow-900/30 border-yellow-700/50 text-yellow-400'
                                                    }`}>
                                                        {warrant.status === 'active' ? 'АКТИВЕН' :
                                                         warrant.status === 'executed' ? 'ВЫПОЛНЕН' :
                                                         warrant.status === 'cancelled' ? 'ОТМЕНЕН' :
                                                         'ОЖИДАНИЕ'}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-600 uppercase">
                                                        {warrant.type === 'arrest' ? 'ОРДЕР НА АРЕСТ' :
                                                         warrant.type === 'search' ? 'ОРДЕР НА ОБЫСК' :
                                                         warrant.type === 'bench' ? 'СУДЕБНЫЙ ОРДЕР' :
                                                         'ПРОБАЦИЯ'}
                                                    </span>
                                                </div>
                                                <h4 className="text-base font-bold text-white">{warrant.title}</h4>
                                                <p className="text-xs text-zinc-400 mt-1">{warrant.description}</p>
                                                <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-500">
                                                    <span>ID персонажа: {warrant.characterId}</span>
                                                    <span>Выдан: {warrant.issuerName}</span>
                                                    {warrant.expiresAt && (
                                                        <span>Истекает: {new Date(warrant.expiresAt).toLocaleDateString('ru-RU')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {warrant.status === 'active' && (
                                                <>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => onExecuteWarrant(warrant.id)}
                                                        className="bg-emerald-900/20 border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/30"
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                        Выполнить
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => {
                                                            const reason = prompt('Причина отмены ордера:');
                                                            if (reason) onCancelWarrant(warrant.id, reason);
                                                        }}
                                                        className="bg-red-900/20 border-red-700/50 text-red-400 hover:bg-red-900/30"
                                                    >
                                                        <X className="w-3.5 h-3.5 mr-1" />
                                                        Отменить
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {warrant.justification && (
                                        <div className="mt-3 pt-3 border-t border-zinc-800">
                                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Обоснование:</p>
                                            <p className="text-xs text-zinc-400 italic">{warrant.justification}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

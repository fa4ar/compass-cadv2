import React, { useState, useEffect } from 'react';
import { FileText, X, Loader2, AlertCircle, UserPlus, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface Character {
    id: string;
    firstName: string;
    lastName: string;
}

interface Witness {
    witnessId: string;
    firstName: string;
    lastName: string;
    statement: string;
    signedAt: string;
}

interface RateLimitStatus {
    warrantsRequested: {
        count: number;
        limit: number;
        windowEndsAt: string;
    };
}

interface WarrantRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    characters: Character[];
    onWarrantRequested?: (warrant: any) => void;
    currentCharacterId?: string;
}

type WarrantType = 'arrest' | 'search' | 'surveillance';

export const WarrantRequestModal: React.FC<WarrantRequestModalProps> = ({
    isOpen,
    onClose,
    characters,
    onWarrantRequested,
    currentCharacterId
}) => {
    const [accusedId, setAccusedId] = useState('');
    const [warrantType, setWarrantType] = useState<WarrantType>('arrest');
    const [reason, setReason] = useState('');
    const [evidence, setEvidence] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
    const [error, setError] = useState('');
    const [witnesses, setWitnesses] = useState<Witness[]>([]);
    const [showWitnessForm, setShowWitnessForm] = useState(false);
    const [newWitnessId, setNewWitnessId] = useState('');
    const [newWitnessStatement, setNewWitnessStatement] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchRateLimit();
        }
    }, [isOpen]);

    const fetchRateLimit = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/rate-limit/check`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRateLimit(data);
            }
        } catch (err) {
            console.error('Failed to fetch rate limit', err);
        }
    };

    const handleAddWitness = () => {
        if (!newWitnessId || !newWitnessStatement) {
            setError('Выберите свидетеля и добавьте показания');
            return;
        }

        const witness = characters.find(c => c.id === newWitnessId);
        if (!witness) return;

        if (witness.id === currentCharacterId) {
            setError('Вы не можете быть свидетелем в своем запросе');
            return;
        }

        if (witness.id === accusedId) {
            setError('Обвиняемый не может быть свидетелем');
            return;
        }

        if (witnesses.some(w => w.witnessId === newWitnessId)) {
            setError('Этот свидетель уже добавлен');
            return;
        }

        setWitnesses([...witnesses, {
            witnessId: newWitnessId,
            firstName: witness.firstName,
            lastName: witness.lastName,
            statement: newWitnessStatement,
            signedAt: new Date().toISOString()
        }]);

        setNewWitnessId('');
        setNewWitnessStatement('');
        setShowWitnessForm(false);
    };

    const handleRemoveWitness = (witnessId: string) => {
        setWitnesses(witnesses.filter(w => w.witnessId !== witnessId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!accusedId || !reason) {
            setError('Заполните все обязательные поля');
            return;
        }

        if (reason.length < 20) {
            setError('Причина должна содержать минимум 20 символов');
            return;
        }

        if (warrantType === 'surveillance' && witnesses.length < 2) {
            setError('Для ордера на наблюдение требуется минимум 2 свидетеля');
            return;
        }

        if (rateLimit && rateLimit.warrantsRequested.count >= rateLimit.warrantsRequested.limit) {
            setError(`Лимит ордеров исчерпан. Попробуйте снова через ${new Date(rateLimit.warrantsRequested.windowEndsAt).toLocaleTimeString()}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/warrants/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    accusedId: parseInt(accusedId),
                    warrantType,
                    reason,
                    evidence
                })
            });

            if (res.ok) {
                const data = await res.json();
                
                // Add witnesses if any
                if (witnesses.length > 0) {
                    for (const witness of witnesses) {
                        await fetch(`${apiUrl}/api/warrants/${data.id}/witness`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                witnessId: parseInt(witness.witnessId),
                                statement: witness.statement
                            })
                        });
                    }
                }

                onWarrantRequested?.(data);
                onClose();
                setAccusedId('');
                setReason('');
                setEvidence('');
                setWitnesses([]);
                fetchRateLimit();
            } else {
                const data = await res.json();
                setError(data.error || 'Не удалось создать запрос ордера');
            }
        } catch (err) {
            console.error('Failed to request warrant', err);
            setError('Ошибка при создании запроса ордера');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const availableCharacters = characters.filter(c => c.id !== currentCharacterId);
    const availableWitnesses = characters.filter(c => 
        c.id !== currentCharacterId && 
        c.id !== accusedId && 
        !witnesses.some(w => w.witnessId === c.id)
    );
    const remainingWarrants = rateLimit ? rateLimit.warrantsRequested.limit - rateLimit.warrantsRequested.count : 3;

    const warrantTypeLabels: Record<WarrantType, string> = {
        arrest: 'Арест',
        search: 'Обыск',
        surveillance: 'Наблюдение'
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <Card className="w-full max-w-lg bg-zinc-950 border-zinc-800">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-red-500" />
                            Запрос ордера
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4 max-h-[90vh] overflow-auto">
                    {rateLimit && (
                        <div className={`p-3 rounded-lg border ${remainingWarrants === 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                            <div className="flex items-center gap-2 text-sm">
                                <AlertCircle className={`w-4 h-4 ${remainingWarrants === 0 ? 'text-red-400' : 'text-blue-400'}`} />
                                <span className={remainingWarrants === 0 ? 'text-red-400' : 'text-blue-400'}>
                                    {remainingWarrants === 0 
                                        ? 'Лимит ордеров исчерпан' 
                                        : `Осталось ордеров: ${remainingWarrants} из ${rateLimit.warrantsRequested.limit} (за час)`
                                    }
                                </span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-500">Обвиняемый</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between bg-zinc-900 border-zinc-800">
                                        {accusedId 
                                            ? availableCharacters.find(c => c.id === accusedId)?.firstName + ' ' + availableCharacters.find(c => c.id === accusedId)?.lastName
                                            : 'Выберите персонажа'
                                        }
                                        <ChevronDown className="w-4 h-4 ml-2" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-zinc-900 border-zinc-800 w-full">
                                    {availableCharacters.map((char) => (
                                        <DropdownMenuItem 
                                            key={char.id} 
                                            onClick={() => setAccusedId(char.id)}
                                            className="cursor-pointer"
                                        >
                                            {char.firstName} {char.lastName}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-500">Тип ордера</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between bg-zinc-900 border-zinc-800">
                                        {warrantTypeLabels[warrantType]}
                                        <ChevronDown className="w-4 h-4 ml-2" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-zinc-900 border-zinc-800 w-full">
                                    <DropdownMenuItem onClick={() => setWarrantType('arrest')} className="cursor-pointer">
                                        Арест
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setWarrantType('search')} className="cursor-pointer">
                                        Обыск
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setWarrantType('surveillance')} className="cursor-pointer">
                                        Наблюдение
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-500">Причина</Label>
                            <textarea
                                placeholder="Опишите причину запроса ордера..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 min-h-[100px] w-full p-2 rounded text-sm text-zinc-300 focus:outline-none focus:border-zinc-700"
                                minLength={20}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-500">Доказательства (опционально)</Label>
                            <textarea
                                placeholder="Опишите имеющиеся доказательства..."
                                value={evidence}
                                onChange={(e) => setEvidence(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 min-h-[80px] w-full p-2 rounded text-sm text-zinc-300 focus:outline-none focus:border-zinc-700"
                            />
                        </div>

                        {/* Witnesses Section */}
                        <div className="space-y-2 pt-2 border-t border-zinc-800">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] uppercase text-zinc-500">Свидетели</Label>
                                {!showWitnessForm && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowWitnessForm(true)}
                                        className="h-7 text-xs bg-zinc-800 border-zinc-700"
                                    >
                                        <UserPlus className="w-3 h-3 mr-1" />
                                        Добавить
                                    </Button>
                                )}
                            </div>

                            {showWitnessForm && (
                                <div className="space-y-2 p-3 bg-zinc-900/50 rounded border border-zinc-800">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase text-zinc-500">Свидетель</Label>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="w-full justify-between bg-zinc-900 border-zinc-800 h-8">
                                                    {newWitnessId 
                                                        ? availableWitnesses.find(c => c.id === newWitnessId)?.firstName + ' ' + availableWitnesses.find(c => c.id === newWitnessId)?.lastName
                                                        : 'Выберите свидетеля'
                                                    }
                                                    <ChevronDown className="w-3 h-3 ml-2" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="bg-zinc-900 border-zinc-800 w-full">
                                                {availableWitnesses.map((char) => (
                                                    <DropdownMenuItem 
                                                        key={char.id} 
                                                        onClick={() => setNewWitnessId(char.id)}
                                                        className="cursor-pointer"
                                                    >
                                                        {char.firstName} {char.lastName}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase text-zinc-500">Показания</Label>
                                        <textarea
                                            placeholder="Показания свидетеля..."
                                            value={newWitnessStatement}
                                            onChange={(e) => setNewWitnessStatement(e.target.value)}
                                            className="bg-zinc-900 border-zinc-800 min-h-[60px] w-full p-2 rounded text-sm text-zinc-300 focus:outline-none focus:border-zinc-700"
                                            minLength={10}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            onClick={handleAddWitness}
                                            className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-500"
                                        >
                                            Добавить
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setShowWitnessForm(false);
                                                setNewWitnessId('');
                                                setNewWitnessStatement('');
                                            }}
                                            className="flex-1 h-8 text-xs bg-zinc-800 border-zinc-700"
                                        >
                                            Отмена
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {witnesses.length > 0 && (
                                <div className="space-y-2">
                                    {witnesses.map((witness) => (
                                        <div key={witness.witnessId} className="flex items-start justify-between p-2 bg-zinc-900/50 rounded border border-zinc-800">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-zinc-200">
                                                    {witness.firstName} {witness.lastName}
                                                </p>
                                                <p className="text-xs text-zinc-500 mt-1">
                                                    {witness.statement}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveWitness(witness.witnessId)}
                                                className="h-6 w-6 text-red-500 hover:text-red-400"
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-red-600 hover:bg-red-500"
                            disabled={isSubmitting || !accusedId || !reason || remainingWarrants === 0}
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                            Создать запрос ордера
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

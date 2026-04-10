import React, { useState, useEffect } from 'react';
import { Scale, X, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
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

interface Character {
    id: string;
    firstName: string;
    lastName: string;
}

interface RateLimitStatus {
    finesIssued: {
        count: number;
        limit: number;
        windowEndsAt: string;
    };
}

interface FineIssuanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    characters: Character[];
    onFineIssued?: (fine: any) => void;
    currentCharacterId?: string;
}

export const FineIssuanceModal: React.FC<FineIssuanceModalProps> = ({
    isOpen,
    onClose,
    characters,
    onFineIssued,
    currentCharacterId
}) => {
    const [recipientId, setRecipientId] = useState('');
    const [amount, setAmount] = useState('');
    const [fineType, setFineType] = useState<'traffic' | 'misdemeanor' | 'felony'>('misdemeanor');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
    const [error, setError] = useState('');

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!recipientId || !amount || !reason) {
            setError('Заполните все обязательные поля');
            return;
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setError('Сумма должна быть положительным числом');
            return;
        }

        if (amountNum > 10000) {
            setError('Максимальная сумма для самостоятельного штрафа: $10,000');
            return;
        }

        if (reason.length < 10) {
            setError('Причина должна содержать минимум 10 символов');
            return;
        }

        if (rateLimit && rateLimit.finesIssued.count >= rateLimit.finesIssued.limit) {
            setError(`Лимит штрафов исчерпан. Попробуйте снова через ${new Date(rateLimit.finesIssued.windowEndsAt).toLocaleTimeString()}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/fines/self-issue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipientId: parseInt(recipientId),
                    amount: amountNum,
                    reason,
                    fineType
                })
            });

            if (res.ok) {
                const data = await res.json();
                onFineIssued?.(data);
                onClose();
                setRecipientId('');
                setAmount('');
                setReason('');
                fetchRateLimit();
            } else {
                const data = await res.json();
                setError(data.error || 'Не удалось выдать штраф');
            }
        } catch (err) {
            console.error('Failed to issue fine', err);
            setError('Ошибка при выдаче штрафа');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const availableCharacters = characters.filter(c => c.id !== currentCharacterId);
    const remainingFines = rateLimit ? rateLimit.finesIssued.limit - rateLimit.finesIssued.count : 3;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <Card className="w-full max-w-md bg-zinc-950 border-zinc-800">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <Scale className="w-5 h-5 text-amber-500" />
                            Выдача штрафа
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    {rateLimit && (
                        <div className={`p-3 rounded-lg border ${remainingFines === 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                            <div className="flex items-center gap-2 text-sm">
                                <AlertCircle className={`w-4 h-4 ${remainingFines === 0 ? 'text-red-400' : 'text-blue-400'}`} />
                                <span className={remainingFines === 0 ? 'text-red-400' : 'text-blue-400'}>
                                    {remainingFines === 0 
                                        ? 'Лимит штрафов исчерпан' 
                                        : `Осталось штрафов: ${remainingFines} из ${rateLimit.finesIssued.limit} (за час)`
                                    }
                                </span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-500">Получатель</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between bg-zinc-900 border-zinc-800">
                                        {recipientId 
                                            ? availableCharacters.find(c => c.id === recipientId)?.firstName + ' ' + availableCharacters.find(c => c.id === recipientId)?.lastName
                                            : 'Выберите персонажа'
                                        }
                                        <ChevronDown className="w-4 h-4 ml-2" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-zinc-900 border-zinc-800 w-full">
                                    {availableCharacters.map((char) => (
                                        <DropdownMenuItem 
                                            key={char.id} 
                                            onClick={() => setRecipientId(char.id)}
                                            className="cursor-pointer"
                                        >
                                            {char.firstName} {char.lastName}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-500">Сумма ($)</Label>
                            <Input
                                type="number"
                                placeholder="500.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="bg-zinc-900 border-zinc-800"
                                min="0"
                                max="10000"
                                step="0.01"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-500">Тип штрафа</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between bg-zinc-900 border-zinc-800">
                                        {fineType === 'traffic' ? 'Нарушение ПДД' : fineType === 'misdemeanor' ? 'Мелкое преступление' : 'Тяжкое преступление'}
                                        <ChevronDown className="w-4 h-4 ml-2" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-zinc-900 border-zinc-800 w-full">
                                    <DropdownMenuItem onClick={() => setFineType('traffic')} className="cursor-pointer">
                                        Нарушение ПДД (до $500)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setFineType('misdemeanor')} className="cursor-pointer">
                                        Мелкое преступление ($500-$2000)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setFineType('felony')} className="cursor-pointer">
                                        Тяжкое преступление ($2000+)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-500">Причина</Label>
                            <textarea
                                placeholder="Опишите причину штрафа..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 min-h-[80px] w-full p-2 rounded text-sm text-zinc-300 focus:outline-none focus:border-zinc-700"
                                minLength={10}
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-amber-600 hover:bg-amber-500"
                            disabled={isSubmitting || !recipientId || !amount || !reason || remainingFines === 0}
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Scale className="w-4 h-4 mr-2" />}
                            Выдать штраф
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

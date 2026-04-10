import React from 'react';
import { X, DollarSign, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FineModalProps {
    isOpen: boolean;
    onClose: () => void;
    characterId: number | null;
    onSubmit: (data: { characterId: number | null; amount: string; reason: string }) => void;
    isLoading: boolean;
    amount: string;
    setAmount: (value: string) => void;
    reason: string;
    setReason: (value: string) => void;
}

export const FineModal: React.FC<FineModalProps> = ({
    isOpen,
    onClose,
    characterId,
    onSubmit,
    isLoading,
    amount,
    setAmount,
    reason,
    setReason
}) => {
    const handleSubmit = () => {
        if (!characterId || !amount || !reason) return;
        onSubmit({ characterId, amount, reason });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-rose-500" />
                            Выписать штраф
                        </h2>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase">Сумма штрафа ($)</Label>
                            <Input
                                type="number"
                                placeholder="100"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="bg-zinc-800 border-zinc-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase">Причина</Label>
                            <textarea
                                className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-200 resize-none"
                                placeholder="Опишите нарушение..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={onClose}>
                            Отмена
                        </Button>
                        <Button
                            className="flex-1 bg-rose-600 hover:bg-rose-500"
                            onClick={handleSubmit}
                            disabled={isLoading || !characterId || !amount || !reason}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Выписать'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

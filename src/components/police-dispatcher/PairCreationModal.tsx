import React from 'react';
import { Users, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UnitUser {
    username: string;
    avatarUrl?: string;
}

interface Unit {
    unit: string;
    officer: string;
    userId?: number;
    user?: UnitUser;
}

interface PairCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    unit1: Unit | null;
    unit2: Unit | null;
    pairName: string;
    setPairName: (value: string) => void;
    onCreatePair: () => void;
    getImageUrl?: (url?: string) => string | null;
}

export const PairCreationModal: React.FC<PairCreationModalProps> = ({
    isOpen,
    onClose,
    unit1,
    unit2,
    pairName,
    setPairName,
    onCreatePair,
    getImageUrl = (url) => url || null
}) => {
    if (!isOpen || !unit1 || !unit2) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Users className="w-8 h-8 text-purple-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Создать патрульную пару</h2>
                        <p className="text-zinc-400 mt-1 text-sm">Объедините двух юнитов в пару</p>
                    </div>
                    
                    <div className="flex items-center justify-center gap-0">
                        {/* Unit 1 */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border-2 border-blue-500/50 mb-2">
                                {unit1?.user?.avatarUrl ? (
                                    <img src={getImageUrl(unit1.user.avatarUrl)!} alt={unit1.officer} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500"><User className="w-8 h-8" /></div>
                                )}
                            </div>
                            <p className="text-sm font-bold text-white text-center">{unit1?.officer}</p>
                            <p className="text-xs text-zinc-500">@{unit1?.user?.username || 'user'}</p>
                            <p className="text-xs text-blue-400 font-bold mt-1">{unit1?.unit}</p>
                        </div>
                        
                        {/* Plus */}
                        <div className="mx-4 -mt-8">
                            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-xl">+</span>
                            </div>
                        </div>
                        
                        {/* Unit 2 */}
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border-2 border-blue-500/50 mb-2">
                                {unit2?.user?.avatarUrl ? (
                                    <img src={getImageUrl(unit2.user.avatarUrl)!} alt={unit2.officer} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500"><User className="w-8 h-8" /></div>
                                )}
                            </div>
                            <p className="text-sm font-bold text-white text-center">{unit2?.officer}</p>
                            <p className="text-xs text-zinc-500">@{unit2?.user?.username || 'user'}</p>
                            <p className="text-xs text-blue-400 font-bold mt-1">{unit2?.unit}</p>
                        </div>
                    </div>
                    
                    <div>
                        <Label className="text-xs text-zinc-400 uppercase tracking-wide">Название пары</Label>
                        <Input 
                            value={pairName}
                            onChange={(e) => setPairName(e.target.value)}
                            placeholder="Например: Alpha-1"
                            className="mt-1 bg-zinc-800 border-zinc-700"
                        />
                    </div>
                    
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={onClose}>
                            Отмена
                        </Button>
                        <Button className="flex-1 bg-purple-600 hover:bg-purple-500" onClick={onCreatePair}>
                            Создать пару
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

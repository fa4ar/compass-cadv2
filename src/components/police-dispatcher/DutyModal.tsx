import React from 'react';
import { Shield, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Character {
    id: string;
    firstName: string;
    lastName: string;
    departmentMembers?: DepartmentMember[];
}

interface DepartmentMember {
    id: number;
    isActive: boolean;
    department?: { type: string };
    callSign?: string;
    division?: string;
}

interface DutyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: () => void;
    characters: Character[];
    isLoading: boolean;
    callSign: string;
    setCallSign: (value: string) => void;
    subdivision: string;
    setSubdivision: (value: string) => void;
    selectedCharacter: string;
    setSelectedCharacter: (value: string) => void;
    type?: 'police' | 'dispatcher';
}

export const DutyModal: React.FC<DutyModalProps> = ({
    isOpen,
    onClose,
    onStart,
    characters,
    isLoading,
    callSign,
    setCallSign,
    subdivision,
    setSubdivision,
    selectedCharacter,
    setSelectedCharacter,
    type = 'police'
}) => {
    if (!isOpen) return null;

    const isPolice = type === 'police';
    const policeChars = isPolice 
        ? characters.filter((c) => c.departmentMembers?.some(m => m.isActive && m.department?.type === 'police'))
        : characters;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={(e) => {
            if (e.target === e.currentTarget) {
                onClose();
            }
        }}>
            <Card className="w-full max-w-sm bg-zinc-950 border-zinc-800">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-500" />
                            Выход на смену
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    {isPolice ? (
                        <>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-zinc-500">Позывной</Label>
                                    <Input 
                                        placeholder="1A-12" 
                                        value={callSign} 
                                        onChange={(e) => setCallSign(e.target.value.toUpperCase())} 
                                        className="bg-zinc-900 border-zinc-800" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-zinc-500">Отдел / Дивизион</Label>
                                    <Input 
                                        placeholder="Traffic" 
                                        value={subdivision} 
                                        onChange={(e) => setSubdivision(e.target.value)} 
                                        className="bg-zinc-900 border-zinc-800" 
                                    />
                                </div>
                            </div>

                            {policeChars.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <Label className="text-[10px] uppercase text-zinc-500">Выберите персонажа</Label>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCharacter('')}
                                            className={`shrink-0 px-3 py-2 rounded-lg border text-xs ${
                                                !selectedCharacter ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                                            }`}
                                        >
                                            Нет
                                        </button>
                                        {policeChars.map((char) => (
                                            <button
                                                key={char.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCharacter(String(char.id));
                                                    const policeMember = char.departmentMembers?.find(m => m.isActive && m.department?.type === 'police');
                                                    if (policeMember?.callSign) setCallSign(policeMember.callSign);
                                                    if (policeMember?.division) setSubdivision(policeMember.division);
                                                }}
                                                className={`shrink-0 px-3 py-2 rounded-lg border text-xs ${
                                                    String(selectedCharacter) === String(char.id) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                                                }`}
                                            >
                                                {char.firstName} {char.lastName}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-zinc-500">Позывной диспетчера</Label>
                                <Input 
                                    placeholder="DISP-1"
                                    value={callSign}
                                    onChange={(e) => setCallSign(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && onStart()}
                                    className="bg-zinc-900 border-zinc-800 text-center"
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    <Button 
                        className="w-full bg-blue-600" 
                        onClick={onStart} 
                        disabled={isLoading || !callSign}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isPolice ? 'Начать смену' : 'Start Duty'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

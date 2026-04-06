"use client";

import React from 'react';
import { User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ViewCharacterModalProps {
    show: boolean;
    onClose: () => void;
    character: any;
    getImageUrl: (url?: string) => string | null;
}

export const ViewCharacterModal: React.FC<ViewCharacterModalProps> = ({
    show,
    onClose,
    character,
    getImageUrl
}) => {
    if (!show || !character) return null;

    const isAlive = character.isAlive !== false;
    const birthDate = character.birthDate ? new Date(character.birthDate) : null;
    const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    const calculateAge = (birthDate: string | null): number | null => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Status strip */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isAlive ? 'bg-green-500' : 'bg-red-500'}`} />

                {/* Close button */}
                <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 bg-black/40 rounded-full hover:bg-black/60">
                    <X className="w-4 h-4 text-white" />
                </button>

                {/* Photo */}
                <div className="aspect-square bg-zinc-800 overflow-hidden">
                    {getImageUrl(character.photoUrl) ? (
                        <img src={getImageUrl(character.photoUrl)!} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <User className="w-16 h-16 text-zinc-600" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                    <div>
                        <h2 className="text-xl font-bold text-white">{character.firstName} {character.lastName}</h2>
                        {character.nickname && <p className="text-sm text-blue-400">"{character.nickname}"</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase">Birth Date</p>
                            <p className="text-zinc-200">{birthDate ? birthDate.toLocaleDateString('ru-RU') : '-'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase">Age</p>
                            <p className="text-zinc-200">{age !== null ? `${age} years` : '-'}</p>
                        </div>
                    </div>

                    {character.description && (
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase">Description</p>
                            <p className="text-zinc-300 text-sm">{character.description}</p>
                        </div>
                    )}

                    {character.job && (
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase">Job</p>
                            <p className="text-zinc-200">{character.job.name}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

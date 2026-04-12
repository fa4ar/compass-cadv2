// components/radiocard.tsx
"use client";

import React from 'react';
import { Radio, Signal, Volume2, Users } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RadioCardProps {
    channelId?: string;
    frequency?: string;
    isActive?: boolean;
    participants?: number;
    volume?: number;
    onToggle?: () => void;
    onVolumeChange?: (volume: number) => void;
}

export default function RadioCard({
    channelId = '1',
    frequency = '100.0',
    isActive = false,
    participants = 0,
    volume = 100,
    onToggle,
    onVolumeChange,
}: RadioCardProps) {
    return (
        <Card className={`
            p-4 transition-all duration-300
            ${isActive 
                ? 'bg-blue-950/20 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}
        `}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`
                        p-2 rounded-lg transition-all duration-300
                        ${isActive 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-zinc-800 text-zinc-500'}
                    `}>
                        <Radio className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-bold text-sm text-zinc-200">
                            Канал {channelId}
                        </div>
                        <div className="text-xs text-zinc-500 font-mono">
                            {frequency} MHz
                        </div>
                    </div>
                </div>
                
                <Badge 
                    variant={isActive ? "default" : "outline"}
                    className={`
                        font-semibold text-xs
                        ${isActive 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-zinc-800 text-zinc-500 border-zinc-700'}
                    `}
                >
                    {isActive ? 'АКТИВЕН' : 'ОТКЛЮЧЕН'}
                </Badge>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm text-zinc-400">{participants}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Signal className={`w-4 h-4 ${isActive ? 'text-green-500' : 'text-zinc-600'}`} />
                        <div className="flex gap-0.5">
                            {[1, 2, 3, 4].map((level) => (
                                <div
                                    key={level}
                                    className={`w-0.5 rounded-full transition-all duration-300 ${
                                        isActive && level <= 3
                                            ? 'bg-green-500 h-4'
                                            : isActive && level === 4
                                            ? 'bg-green-500/50 h-3'
                                            : 'bg-zinc-700 h-2'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-zinc-800"
                        disabled={!isActive}
                    >
                        <Volume2 className="w-4 h-4 text-zinc-400" />
                    </Button>
                    
                    <Button
                        onClick={onToggle}
                        variant={isActive ? "destructive" : "default"}
                        size="sm"
                        className={`
                            font-semibold text-xs px-4 h-8 transition-all duration-300
                            ${isActive 
                                ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20' 
                                : 'bg-blue-500 text-white hover:bg-blue-600'}
                        `}
                    >
                        {isActive ? 'Выкл' : 'Вкл'}
                    </Button>
                </div>
            </div>
        </Card>
    );
}

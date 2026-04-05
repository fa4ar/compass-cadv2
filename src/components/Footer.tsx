// src/components/Footer.tsx
'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar, Compass, Shield, Wifi, Terminal } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function FooterBar() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [mounted, setMounted] = useState(false);
    const { isConnected } = useSocket();

    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const time = mounted
        ? currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '--:--:--';
    const date = mounted
        ? currentTime.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
        : '--- --- ----';

    return (
        <div className="fixed bottom-0 left-0 right-0 h-9 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800/50 z-[100] select-none">
            <div className="flex items-center justify-between h-full px-4 text-[11px] font-medium tracking-tight">
                
                {/* Левая часть: Системная информация */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-red-500'}`} />
                        <span className={isConnected ? 'text-emerald-500/90' : 'text-red-500/90'}>
                            {isConnected ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
                        </span>
                    </div>

                    <div className="h-3 w-px bg-zinc-800" />

                    <div className="flex items-center gap-2 text-zinc-500">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>V2.4.0-STABLE</span>
                    </div>

                    <div className="flex items-center gap-2 text-zinc-500">
                        <Wifi className="w-3.5 h-3.5" />
                        <span>MS: <span className="text-zinc-300">24ms</span></span>
                    </div>
                </div>

                {/* Центр: Логотип/Название (опционально) */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity cursor-default">
                    <Compass className="w-3 h-3 text-blue-500" />
                    <span className="text-zinc-400 font-bold uppercase tracking-[0.2em]">Compass Command</span>
                </div>

                {/* Правая часть: Часы и Дата */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 border-x border-zinc-800/50 px-4 h-9">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                            <span>{date}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-zinc-100 min-w-[65px] text-[12px]">
                            <Clock className="w-3.5 h-3.5 text-zinc-600" />
                            <span>{time}</span>
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors outline-none group">
                                <Shield className="w-3.5 h-3.5 group-hover:text-blue-500 transition-colors" />
                                <span>SECURE TERMINAL</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800 text-zinc-200">
                            <DropdownMenuLabel className="text-[10px] uppercase font-bold text-zinc-500">Terminal Control</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem className="cursor-pointer text-xs">System Diagnostics</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-xs">Encryption Settings</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-xs">Access Logs</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem className="cursor-pointer text-xs text-red-400 focus:text-red-400">Emergency Lockdown</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

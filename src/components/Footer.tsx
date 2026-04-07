// src/components/Footer.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, Compass, Wifi } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';

export default function FooterBar() {
    const [currentTime, setCurrentTime] = useState(() => new Date());
    const [mounted, setMounted] = useState(false);
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!socket) {
            setConnectionStatus('offline');
            return;
        }

        const handleConnect = () => setConnectionStatus('online');
        const handleDisconnect = () => setConnectionStatus('offline');
        const handleConnectError = () => setConnectionStatus('offline');

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        if (socket.connected) {
            setConnectionStatus('online');
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
        };
    }, [socket]);

    if (user?.isBanned) return null;

    const time = mounted
        ? currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '--:--:--';
    const date = mounted
        ? currentTime.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
        : '--- --- ----';

    const isOnline = connectionStatus === 'online';
    const isConnecting = connectionStatus === 'connecting';

    return (
        <div className="fixed bottom-0 left-0 right-0 h-9 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800/50 z-[100] select-none">
            <div className="flex items-center justify-between h-full px-4 text-[11px] font-medium tracking-tight">
                
                {/* Левая часть: Системная информация */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 
                            isConnecting ? 'bg-yellow-500 animate-pulse' : 
                            'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                        }`} />
                        <span className={`transition-colors ${
                            isOnline ? 'text-emerald-500' : 
                            isConnecting ? 'text-yellow-500' : 
                            'text-red-500'
                        }`}>
                            {isOnline ? 'ONLINE' : isConnecting ? 'CONNECTING' : 'OFFLINE'}
                        </span>
                    </div>

                    <div className="h-3 w-px bg-zinc-800" />

                    <div className="flex items-center gap-2 text-zinc-500">
                        <Wifi className="w-3.5 h-3.5" />
                        <span>MS: <span className="text-zinc-300">24ms</span></span>
                    </div>
                </div>

                {/* Центр: Логотип */}
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
                </div>
            </div>
        </div>
    );
}

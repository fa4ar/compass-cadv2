// context/SocketContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { socket } from "@/lib/socket";

interface SocketContextType {
    socket: any;
    isConnected: boolean;
    emit: (event: string, data?: any) => void;
    on: (event: string, callback: (...args: any[]) => void) => void;
    off: (event: string, callback?: (...args: any[]) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        // Подписываемся на события подключения общего сокета
        socket.on('connect', () => {
            console.log('✅ [SocketContext] Global socket connected');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('❌ [SocketContext] Global socket disconnected');
            setIsConnected(false);
        });

        socket.on('connect_error', (error: any) => {
            console.error('⚠️ [SocketContext] Connection error:', error);
            setIsConnected(false);
        });

        // Если сокет уже подключен - обновляем статус
        if (socket.connected) setIsConnected(true);

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
        };
    }, []);

    const emit = (event: string, data?: any) => {
        if (socket) socket.emit(event, data);
    };

    const on = (event: string, callback: (...args: any[]) => void) => {
        if (socket) socket.on(event, callback);
    };

    const off = (event: string, callback?: (...args: any[]) => void) => {
        if (socket) socket.off(event, callback);
    };

    return (
        <SocketContext.Provider value={{ socket, isConnected, emit, on, off }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
}
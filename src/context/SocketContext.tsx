// context/SocketContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
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
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const handleConnect = () => {
            console.log('✅ [SocketContext] Connected');
            setIsConnected(true);
        };

        const handleDisconnect = (reason: string) => {
            console.log('❌ [SocketContext] Disconnected:', reason);
            setIsConnected(false);
        };

        const handleConnectError = (error: any) => {
            console.error('⚠️ [SocketContext] Connection error:', error?.message || error);
            setIsConnected(false);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);

        if (!socket.connected) {
            socket.connect();
        } else {
            setIsConnected(true);
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
        };
    }, []);

    const emit = useCallback((event: string, data?: any) => {
        if (socket?.connected) {
            socket.emit(event, data);
        } else {
            console.warn('[SocketContext] Cannot emit, not connected');
        }
    }, []);

    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        socket?.on(event, callback);
    }, []);

    const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
        socket?.off(event, callback);
    }, []);

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
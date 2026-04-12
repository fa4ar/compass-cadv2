// context/SocketContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { socket } from "../lib/socket";

interface SocketContextType {
    socket: any;
    isConnected: boolean;
    emit: (event: string, data?: any) => void;
    on: (event: string, callback: (...args: any[]) => void) => void;
    off: (event: string, callback?: (...args: any[]) => void) => void;
    subscribedEvents: Set<string>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const cleanupRef = useRef<(() => void)[]>([]);
    const subscribedEventsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (isInitialized) return;

        const handleConnect = () => {
            console.log('✅ [SocketContext] Connected to:', socket.io.uri);
            console.log('🆔 [SocketContext] Socket ID:', socket.id);
            setIsConnected(true);
        };

        const handleDisconnect = (reason: string) => {
            console.log('❌ [SocketContext] Disconnected:', reason);
            setIsConnected(false);
            
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        };

        const handleConnectError = (error: any) => {
            console.error('⚠️ [SocketContext] Connection error:', error?.message);
            setIsConnected(false);
        };

        const handleReconnect = (attemptNumber: number) => {
            console.log(`🔄 [SocketContext] Reconnected after ${attemptNumber} attempts`);
            setIsConnected(true);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);
        socket.on('reconnect', handleReconnect);

        cleanupRef.current = [
            () => socket.off('connect', handleConnect),
            () => socket.off('disconnect', handleDisconnect),
            () => socket.off('connect_error', handleConnectError),
            () => socket.off('reconnect', handleReconnect)
        ];

        if (!socket.connected) {
            socket.connect();
        } else {
            setIsConnected(true);
        }

        setIsInitialized(true);

        return () => {
            cleanupRef.current.forEach(cleanup => cleanup());
        };
    }, [isInitialized]);

    const emit = useCallback((event: string, data?: any) => {
        if (socket?.connected) {
            socket.emit(event, data);
        } else {
            console.warn('[SocketContext] Cannot emit, not connected');
        }
    }, []);

    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        if (subscribedEventsRef.current.has(event)) {
            console.log(`[SocketContext] Event ${event} already subscribed, skipping duplicate`);
            return;
        }

        socket?.on(event, callback);
        subscribedEventsRef.current.add(event);
    }, []);

    const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
        if (callback) {
            socket?.off(event, callback);
        } else {
            socket?.off(event);
        }
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected, emit, on, off, subscribedEvents: subscribedEventsRef.current }}>
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

export function useSocketSubscription(event: string, handler: (...args: any[]) => void, deps: any[] = []) {
    const { on, off, isConnected } = useSocket();
    const handlerRef = useRef(handler);
    
    useEffect(() => {
        handlerRef.current = handler;
    }, [handler, ...deps]);

    useEffect(() => {
        if (!isConnected) return;
        
        const wrappedHandler = (...args: any[]) => {
            handlerRef.current(...args);
        };
        
        on(event, wrappedHandler);
        
        return () => {
            off(event, wrappedHandler);
        };
    }, [event, isConnected, on, off]);
}
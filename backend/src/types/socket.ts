import { Socket } from 'socket.io';

export interface ClientSocket extends Socket {
    userId?: string;
    roomId?: string;
}

export interface ServerToClientEvents {
    welcome: (data: { message: string; socketId: string }) => void;
    pong: (data: { message: string; timestamp: number; receivedData?: any }) => void;
    message: (data: any) => void;
    userJoined: (data: { userId: string; username: string }) => void;
    userLeft: (data: { userId: string }) => void;
    error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
    ping: (data: any) => void;
    message: (data: any) => void;
    joinRoom: (data: { roomId: string; userId: string }) => void;
    leaveRoom: (data: { roomId: string; userId: string }) => void;
    setUsername: (data: { userId: string; username: string }) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    userId: string;
    username: string;
}
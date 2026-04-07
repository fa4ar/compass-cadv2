import { io } from 'socket.io-client';

const getSocketUrl = () => {
    let url = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    
    if (typeof window !== 'undefined') {
        const isDomain = window.location.hostname !== 'localhost' && !window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);
        if (isDomain && (!url || url.includes('localhost'))) {
            // Пытаемся угадать SOCKET URL на основе текущего домена
            url = `${window.location.protocol}//api.${window.location.hostname}`;
            console.warn(`⚠️ [SOCKET] Socket URL points to localhost but we are on a domain. Dynamic fallback to: ${url}`);
        } else if (!url) {
            url = 'http://localhost:4000';
        }
    }
    return url || 'http://localhost:4000';
};

const socketUrl = getSocketUrl();

export const socket = io(socketUrl, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
});

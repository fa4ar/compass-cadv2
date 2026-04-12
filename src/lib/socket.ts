// @ts-ignore
const io = require('socket.io-client');

const getSocketUrl = () => {
    let url = process.env.NEXT_PUBLIC_SOCKET_URL || '';

    if (typeof window !== 'undefined') {
        const isDomain = window.location.hostname !== 'localhost' && !window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);
        const isHttps = window.location.protocol === 'https:';
        
        if (isDomain && (!url || url.includes('localhost'))) {
            // Пытаемся угадать SOCKET URL на основе текущего домена
            url = `${isHttps ? 'https:' : 'http:'}//api.${window.location.hostname}`;
            console.warn(`⚠️ [SOCKET] Socket URL points to localhost but we are on a domain. Dynamic fallback to: ${url}`);
        } else if (!url) {
            url = isHttps ? 'https://localhost:4000' : 'http://localhost:4000';
        } else if (isHttps && url.startsWith('http:')) {
            // Заменяем http:// на https:// для HTTPS страниц
            url = url.replace('http://', 'https://');
        }
    }
    return url || 'http://localhost:4000';
};

const socketUrl = getSocketUrl();

export const socket = io(socketUrl, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
});

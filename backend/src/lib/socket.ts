import http from 'http';
import { Server } from 'socket.io';

let io: Server;

export const initSocket = (server: http.Server) => {
    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                // Разрешаем все домены
                callback(null, true);
            },
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });
    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized. Call initSocket first.");
    }
    return io;
};

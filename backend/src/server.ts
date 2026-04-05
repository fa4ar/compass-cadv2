import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import apiRoutes from './routes';
import { jwtService } from './services/jwt.service';
import { discordService } from './services/discord.service';
import { initSocket } from './lib/socket';

const app: Express = express();
const server = http.createServer(app);

// Инициализируем сокеты
export const io = initSocket(server);

// Импортируем бота
import { discordBotService } from './services/discord-bot.service';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

app.get('/', (req: Request, res: Response) => {
    res.json({ message: "Server is online", status: "ready" });
});

app.use('/api', apiRoutes);

// Хранилища
export const activeUserSessions = new Map<number, Set<string>>(); // userId -> Set of socketIds
const liveBlips = new Map<string, any>(); // identifier -> { x, y, z, heading, icon, color, label }

io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Аутентификация
    const token = socket.handshake.auth?.token;
    if (token) {
        try {
            const payload = jwtService.verifyAccessToken(token);
            if (payload) {
                const userId = payload.userId;
                (socket as any).userId = userId;
                if (!activeUserSessions.has(userId)) activeUserSessions.set(userId, new Set());
                activeUserSessions.get(userId)?.add(socket.id);
            }
        } catch (e) {}
    }

    // --- MAP SYSTEM EVENTS ---
    
    // Событие от FiveM скрипта для обновления позиции
    socket.on('update_blip', (data) => {
        // data: { identifier: 'OFFICER-1', x, y, z, heading, icon, color, label, type: 'police' }
        if (!data.identifier) return;
        
        liveBlips.set(data.identifier, {
            ...data,
            lastSeen: Date.now()
        });
        
        // Транслируем всем подключенным диспетчерам и полиции
        io.emit('blips_updated', Array.from(liveBlips.values()));
    });

    // Ручное удаление блипа (например, юнит ушел со смены)
    socket.on('remove_blip', (identifier: string) => {
        liveBlips.delete(identifier);
        io.emit('blips_updated', Array.from(liveBlips.values()));
    });

    // Отправляем текущие блипы новому клиенту
    socket.emit('blips_updated', Array.from(liveBlips.values()));

    // -------------------------

    socket.on('disconnect', () => {
        const userId = (socket as any).userId;
        if (userId && activeUserSessions.has(userId)) {
            activeUserSessions.get(userId)?.delete(socket.id);
            if (activeUserSessions.get(userId)?.size === 0) activeUserSessions.delete(userId);
        }
        console.log(`❌ Client disconnected: ${socket.id}`);
    });
});

// Очистка старых блипов (если юнит не подавал сигнал более 2 минут)
setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [id, blip] of liveBlips.entries()) {
        if (now - blip.lastSeen > 120000) {
            liveBlips.delete(id);
            changed = true;
        }
    }
    if (changed) {
        io.emit('blips_updated', Array.from(liveBlips.values()));
    }
}, 30000);

// Запасная синхронизация ролей
setInterval(async () => {
    try {
        if (activeUserSessions.size === 0) return;
        for (const userId of activeUserSessions.keys()) {
            const prisma = (await import('./lib/prisma')).default;
            const user = await (prisma.user as any).findUnique({ where: { id: userId }, select: { discordId: true } });
            if (user?.discordId) {
                const freshRoles = await discordService.syncUser(userId, user.discordId);
                const socketIds = activeUserSessions.get(userId);
                if (socketIds) {
                    for (const sid of socketIds) io.to(sid).emit('roles_updated', { roles: freshRoles });
                }
            }
        }
    } catch (error) {}
}, 30000);

const PORT = 4000;
server.listen(PORT, async () => {
    console.log(`\n🚀 CAD SERVER RUNNING ON PORT ${PORT}`);
    try { await discordBotService.connect(); } catch (e) {}
});

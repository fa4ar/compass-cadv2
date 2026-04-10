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
import prisma from './lib/prisma'; // Добавляем призму

const app: Express = express();
const server = http.createServer(app);

// Инициализируем сокеты
export const io = initSocket(server);

// Импортируем бота
import { discordBotService } from './services/discord-bot.service';

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads'), {
    maxAge: '1d',
    immutable: false,
}));

app.get('/', (req: Request, res: Response) => {
    res.json({ message: "Server is online", status: "ready" });
});

app.use('/api', (req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.use('/api', apiRoutes);

// Хранилища
export const activeUserSessions = new Map<number, Set<string>>(); // userId -> Set of socketIds
const liveBlips = new Map<string, any>(); // identifier -> { x, y, z, heading, icon, color, label }
const liveCalls = new Map<number, any>(); // callId -> { id, type, location, description, priority, callerName, status, x, y, z, createdAt }

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

    // Пакетное обновление от FiveM (более эффективно)
    socket.on('update_blip_batch', async (blips: any[]) => {
        const enrichedBlips: any[] = [];

        for (const blip of blips) {
            if (!blip.discordId) continue;
            
            // Пытаемся обогатить данные из БД (кэшируем или ищем каждый раз?)
            // Для начала ищем каждый раз, потом можно добавить кэширование
            const unit = await prisma.unit.findFirst({
                where: { user: { discordId: blip.discordId } },
                include: {
                    character: true,
                    departmentMember: { include: { department: true } }
                }
            });

            if (unit) {
                const dept = unit.departmentMember?.department;
                let type = 'police';
                let color = '#3b82f6';
                if (dept?.type === 'ems' || dept?.type === 'fire') { type = 'ems'; color = '#ef4444'; }
                else if (dept?.type === 'dispatch') { type = 'dispatch'; color = '#8b5cf6'; }

                const enriched = {
                    identifier: blip.identifier,
                    label: `[${unit.departmentMember?.badgeNumber || 'Unit'}] ${unit.character?.firstName || 'System'} ${unit.character?.lastName || 'Unit'}`,
                    x: blip.x, y: blip.y, z: blip.z, heading: blip.heading,
                    type, color, status: unit.status, location: blip.location, department: dept?.name || 'Patrol',
                    inVehicle: blip.inVehicle,
                    lastSeen: Date.now()
                };

                liveBlips.set(blip.identifier, enriched);
                enrichedBlips.push(enriched);
            }
        }

        // Транслируем всем веб-клиентам
        io.emit('blips_updated', Array.from(liveBlips.values()));
        
        // Отправляем обратно FiveM клиенту только список всех активных юнитов
        socket.emit('units_data', Array.from(liveBlips.values()));
    });

    // Пакетное обновление вызовов 911 от FiveM
    socket.on('update_calls_batch', (calls: any[]) => {
        for (const call of calls) {
            if (!call.id) continue;
            liveCalls.set(call.id, {
                ...call,
                lastSeen: Date.now()
            });
        }

        // Транслируем всем веб-клиентам
        io.emit('calls_updated', Array.from(liveCalls.values()));
    });

    // Ручное удаление блипа (например, юнит ушел со смены)
    socket.on('remove_blip', (identifier: string) => {
        liveBlips.delete(identifier);
        io.emit('blips_updated', Array.from(liveBlips.values()));
    });

    // Отправляем текущие блипы новому клиенту
    socket.emit('blips_updated', Array.from(liveBlips.values()));
    
    // Отправляем текущие вызовы новому клиенту
    socket.emit('calls_updated', Array.from(liveCalls.values()));

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

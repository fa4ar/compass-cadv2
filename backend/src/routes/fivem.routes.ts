import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, authOrApiKeyMiddleware } from '../middleware/auth.middleware';

const router = Router();

// /api/fivem/link
// Привязывает FiveM идентификатор к юзеру по его API ID
router.post('/link', authOrApiKeyMiddleware, async (req: Request, res: Response) => {
    try {
        const { apiId, license, discordId, steamId } = req.body;

        if (!apiId) {
            return res.status(400).json({ error: 'API ID is required' });
        }

        // Ищем юзера по API ID
        const user = await prisma.user.findUnique({
            where: { apiId: apiId }
        });

        if (!user) {
            return res.status(404).json({ error: 'Invalid API ID' });
        }

        // Обновляем license (или другой идентификатор) у пользователя
        // Это связывает веб-аккаунт с игровым
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                license: license || user.license,
                discordId: discordId || user.discordId
            }
        });

        res.json({ 
            success: true, 
            message: 'Account linked successfully',
            username: user.username 
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/fivem/link/check
// Проверяет статус привязки и возвращает информацию о пользователе и смене
router.get('/link/check', async (req, res) => {
    try {
        const { license, discordId } = req.query;

        // Use license if provided, otherwise fall back to discordId
        const identifier = license || discordId;

        if (!identifier) {
            return res.status(400).json({ error: 'License ID or Discord ID is required' });
        }

        // Ищем юзера по License ID (или Discord ID для обратной совместимости)
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { license: identifier as string },
                    { discordId: identifier as string }
                ]
            },
            select: {
                id: true,
                username: true,
                discordId: true,
                license: true
            }
        });

        if (!user) {
            return res.json({ linked: false });
        }

        // Проверяем, находится ли юнит на смене
        const activeUnit = await prisma.unit.findFirst({
            where: { 
                userId: user.id,
                status: { in: ['active', 'busy', 'enroute', 'onscene'] }
            },
            include: {
                departmentMember: {
                    include: {
                        department: true
                    }
                }
            }
        });

        const onDuty = !!activeUnit;

        // Определяем роль на основе департамента
        let job: string | null = null;
        if (activeUnit?.departmentMember?.department) {
            const deptType = activeUnit.departmentMember.department.type;
            if (deptType === 'police') {
                job = 'police';
            } else if (deptType === 'ems' || deptType === 'fire') {
                job = 'ems';
            }
        }

        res.json({ 
            linked: true,
            user: {
                id: user.id,
                username: user.username,
                discordId: user.discordId,
                license: user.license,
                onDuty: onDuty,
                job: job
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Кэш для хранения последних обогащенных блипов в памяти
let lastEnrichedBlips: any[] = [];

// GET /api/fivem/active-units
// Отдает текущий список юнитов на карте (для начальной загрузки)
router.get('/active-units', (req, res) => {
    res.json({ units: lastEnrichedBlips });
});

// POST /api/fivem/update-map
router.post('/update-map', async (req, res) => {
    try {
        const { blips } = req.body;
        const enrichedBlips: any[] = [];

        for (const blip of blips) {
            if (!blip.discordId && !blip.license) continue;
            
            // Try to find user by license first, then fall back to discordId
            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { license: blip.license },
                        { discordId: blip.discordId }
                    ]
                }
            });

            if (!user) continue;

            const unit = await prisma.unit.findFirst({
                where: { 
                    userId: user.id
                },
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

                enrichedBlips.push({
                    identifier: blip.identifier,
                    label: `[${unit.departmentMember?.badgeNumber || 'Unit'}] ${unit.character?.firstName || 'System'} ${unit.character?.lastName || 'Unit'}`,
                    x: blip.x, y: blip.y, z: blip.z, heading: blip.heading,
                    type, color, status: unit.status, location: blip.location, department: dept?.name || 'Patrol',
                    inVehicle: blip.inVehicle,
                    subdivision: unit.subdivision,
                    vehicleModel: unit.vehicleModel,
                    vehiclePlate: unit.vehiclePlate
                });
            }
        }

        // Обновляем кэш
        lastEnrichedBlips = enrichedBlips;

        const { getIO } = await import('../lib/socket');
        const io = getIO();
        
        io.emit('blips_updated', enrichedBlips.map((b: any) => ({ ...b, lastSeen: Date.now() })));

        // Получаем новые вызовы 911 (за последнюю минуту)
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const activeCalls = await prisma.call911.findMany({
            where: {
                status: { in: ['pending', 'dispatched'] },
                createdAt: { gte: oneMinuteAgo }
            },
            select: { id: true, location: true, description: true }
        });

        // Также возвращаем ВСЕХ активных юнитов для миникарты в игре
        // (те же данные, что мы только что обогатили, но для игрового клиента)
        res.json({ 
            success: true, 
            newCalls: activeCalls,
            units: enrichedBlips // Список всех, кто на смене в CAD
        });
    } catch (error: any) {
        console.error('[CAD-SYNC] Error enrichment:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/fivem/unit-attached
// Уведомляет FiveM сервер о прикреплении юнита к вызову (через callback)
router.post('/unit-attached', authOrApiKeyMiddleware, async (req: Request, res: Response) => {
    try {
        const { userId, callId } = req.body;

        if (!userId || !callId) {
            return res.status(400).json({ error: 'Missing userId or callId' });
        }

        // Get the call details
        const call = await prisma.call911.findUnique({
            where: { id: callId },
            include: {
                units: {
                    include: {
                        character: true,
                        user: {
                            select: {
                                username: true,
                                avatarUrl: true,
                                license: true,
                                discordId: true
                            }
                        }
                    }
                }
            }
        });

        if (!call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        // Get the user's License ID to identify them in FiveM
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { license: true, discordId: true }
        });

        // Notify FiveM server via HTTP callback if configured
        const fivemCallbackUrl = process.env.FIVEM_CALLBACK_URL;
        if (fivemCallbackUrl && user?.license) {
            try {
                const fetch = (await import('node-fetch')).default;
                await fetch(`${fivemCallbackUrl}/notify-unit-attached`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': process.env.FIVEM_API_KEY || 'compass-cad-fivem-secret-key'
                    },
                    body: JSON.stringify({
                        licenseId: user.license,
                        call: {
                            id: call.id,
                            type: call.type,
                            location: call.location,
                            description: call.description,
                            priority: call.priority,
                            callerName: call.callerName,
                            callerPhone: call.phoneNumber,
                            status: call.status,
                            x: call.x,
                            y: call.y,
                            z: call.z,
                            createdAt: call.createdAt.getTime(),
                            units: call.units.map(u => ({
                                name: u.character ? `${u.character.firstName} ${u.character.lastName}` : u.user?.username || 'Unknown',
                                status: u.status?.toLowerCase() || 'available'
                            }))
                        }
                    })
                });
                console.log('[FIVEM] Unit attached notification sent to FiveM server for licenseId:', user.license);
            } catch (fetchError) {
                console.error('[FIVEM] Failed to notify FiveM server:', fetchError);
            }
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('[FIVEM] Unit attached notification error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;

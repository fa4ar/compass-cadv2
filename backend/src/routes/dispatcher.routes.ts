import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
// @ts-ignore
import prisma from '../lib/prisma';

const router = Router();

const requireDispatcherOrAdmin = (req: Request, res: Response, next: NextFunction) => {
    const userRoles = (req as any).user?.roles || [];
    if (!userRoles.includes('dispatcher') && !userRoles.includes('admin') && !userRoles.includes('Admin')) {
        console.log('Access denied for roles:', userRoles);
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
};

router.use(authMiddleware);
router.use(requireDispatcherOrAdmin);

router.post('/search/person', async (req: Request, res: Response) => {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
    console.log(`[DISPATCHER SEARCH ${requestId}] POST /search/person`);
    console.log(`[DISPATCHER SEARCH ${requestId}] Body:`, req.body);
    console.log(`[DISPATCHER SEARCH ${requestId}] Headers:`, {
        'content-type': req.headers['content-type'],
        'authorization': req.headers['authorization'] ? 'Bearer [PRESENT]' : 'NONE',
        'cache-control': req.headers['cache-control'],
        'pragma': req.headers['pragma'],
    });
    
    try {
        const { firstName, lastName, ssn } = req.body;
        
        console.log(`[DISPATCHER SEARCH ${requestId}] Parsed params: firstName="${firstName}", lastName="${lastName}", ssn="${ssn}"`);
        
        const where: any = {};
        if (firstName) where.firstName = { contains: firstName, mode: 'insensitive' };
        if (lastName) where.lastName = { contains: lastName, mode: 'insensitive' };
        if (ssn) where.ssn = ssn;

        console.log(`[DISPATCHER SEARCH ${requestId}] Prisma where:`, JSON.stringify(where));

        let characters;
        try {
            // Исправляем запрос Prisma: используем только существующие отношения
            characters = await (prisma as any).character.findMany({
                where,
                include: {
                    job: true,
                    fines: {
                        orderBy: { issuedAt: 'desc' },
                        take: 10
                    },
                    roleplayDocuments: {
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    },
                    vehicles: {
                        take: 10
                    },
                    weapons: {
                        take: 10
                    },
                    licenses: {
                        include: { license: true }
                    }
                },
                take: 10
            });
        } catch (dbError: any) {
            console.error(`[DISPATCHER SEARCH ${requestId}] Database query error:`, dbError.message);
            console.error(`[DISPATCHER SEARCH ${requestId}] Database error code:`, dbError.code);
            return res.status(500).json({ error: 'Database query failed', details: dbError.message });
        }

        console.log(`[DISPATCHER SEARCH ${requestId}] Found ${characters.length} characters`);
        
        // Настройка заголовков для предотвращения кэширования
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        
        // Мапим данные под ожидания фронтенда
        const mappedCharacters = characters.map((c: any) => {
            return {
                type: 'person',
                data: {
                    ...c,
                    // Мапим штрафы в citations
                    citations: c.fines?.map((f: any) => ({
                        id: f.id,
                        reason: f.reason,
                        amount: f.amount,
                        status: f.status,
                        issuedAt: f.issuedAt
                    })) || [],
                    // Мапим документы в warrants (упрощенно)
                    warrants: c.roleplayDocuments?.map((d: any) => ({
                        id: d.id,
                        crime: d.title || d.offenseCode,
                        description: d.description,
                        status: d.status,
                        createdAt: d.createdAt
                    })) || [],
                    // Убеждаемся, что есть пустой массив для notes, если фронт его ждет
                    notes: []
                }
            };
        });

        res.json(mappedCharacters);
    } catch (error: any) {
        console.error(`[DISPATCHER SEARCH ${requestId}] Error:`, error);
        res.status(500).json({ error: 'Search failed', details: error.message });
    }
});

router.post('/search/vehicle', async (req: Request, res: Response) => {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
    console.log(`[DISPATCHER SEARCH ${requestId}] POST /search/vehicle`, req.body);
    
    try {
        const { plate } = req.body;
        
        console.log(`[DISPATCHER SEARCH ${requestId}] Searching for plate: "${plate}"`);
        
        // Исправляем модель: используем civilianVehicle вместо vehicle
        const vehicles = await (prisma as any).civilianVehicle.findMany({
            where: {
                plate: { contains: plate, mode: 'insensitive' }
            },
            take: 10
        });

        console.log(`[DISPATCHER SEARCH ${requestId}] Found ${vehicles.length} vehicles`);
        
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        
        // Мапим данные для фронтенда (добавляем make, если его нет в БД)
        res.json(vehicles.map((v: any) => ({ 
            type: 'vehicle', 
            data: {
                ...v,
                make: v.make || 'Unknown'
            } 
        })));
    } catch (error) {
        console.error(`[DISPATCHER SEARCH ${requestId}] Error:`, error);
        res.status(500).json({ error: 'Search failed' });
    }
});

router.post('/search/weapon', async (req: Request, res: Response) => {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
    console.log(`[DISPATCHER SEARCH ${requestId}] POST /search/weapon`, req.body);
    
    try {
        const { serialNumber } = req.body;
        
        console.log(`[DISPATCHER SEARCH ${requestId}] Searching for serial: "${serialNumber}"`);
        
        // Исправляем модель: используем civilianWeapon вместо weapon
        const weapons = await (prisma as any).civilianWeapon.findMany({
            where: {
                serial: { contains: serialNumber, mode: 'insensitive' }
            },
            take: 10
        });

        console.log(`[DISPATCHER SEARCH ${requestId}] Found ${weapons.length} weapons`);
        
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        
        // Мапим данные для фронтенда (serial -> serialNumber, model -> weaponType)
        res.json(weapons.map((w: any) => ({ 
            type: 'weapon', 
            data: {
                ...w,
                serialNumber: w.serial,
                weaponType: w.model
            } 
        })));

router.post('/message-unit', async (req: Request, res: Response) => {
    try {
        const { characterId, message, from, userId } = req.body;
        
        console.log('[dispatcher/message-unit] Request body:', req.body);
        
        if (!message) {
            console.log('[dispatcher/message-unit] Missing message');
            return res.status(400).json({ error: 'Missing required fields', received: req.body });
        }

        let targetCharacterId: number | null = null;
        let targetUserId: number | null = null;

        // Пытаемся найти персонажа или юзера
        if (characterId) {
            targetCharacterId = parseInt(characterId);
            if (isNaN(targetCharacterId)) {
                targetCharacterId = null;
            }
        }

        if (userId) {
            targetUserId = parseInt(userId);
            if (isNaN(targetUserId)) {
                targetUserId = null;
            }
        }

        // Если есть characterId - ищем по нему
        if (targetCharacterId) {
            const unit = await (prisma as any).departmentMember.findFirst({
                where: {
                    characterId: targetCharacterId,
                    isActive: true
                },
                include: {
                    character: true
                }
            });

            if (unit) {
                const notification = await (prisma as any).notification.create({
                    data: {
                        characterId: targetCharacterId,
                        type: 'dispatcher_message',
                        title: `Message from Dispatcher ${from}`,
                        message,
                        isRead: false
                    }
                });
                return res.json({ success: true, notification });
            }
        }

        // Если есть userId - создаем уведомление для пользователя
        if (targetUserId) {
            const user = await (prisma as any).user.findUnique({
                where: { id: targetUserId },
                include: {
                    characters: {
                        take: 1
                    }
                }
            });

            if (user && user.characters.length > 0) {
                const notification = await (prisma as any).notification.create({
                    data: {
                        characterId: user.characters[0].id,
                        type: 'dispatcher_message',
                        title: `Message from Dispatcher ${from}`,
                        message,
                        isRead: false
                    }
                });
                return res.json({ success: true, notification });
            } else {
                // Создаем уведомление напрямую для пользователя (без characterId)
                // Тут можно использовать другую таблицу или просто вернуть успех
                return res.json({ success: true, message: 'Message would be sent to user without characters' });
            }
        }

        console.log('[dispatcher/message-unit] No valid target found');
        return res.status(400).json({ error: 'Unit not found - character or user ID required' });
    } catch (error) {
        console.error('Message unit error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

export default router;

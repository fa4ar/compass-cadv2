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
    try {
        const { firstName, lastName, ssn } = req.body;
        
        const where: any = {};
        if (firstName) where.firstName = { contains: firstName, mode: 'insensitive' };
        if (lastName) where.lastName = { contains: lastName, mode: 'insensitive' };
        if (ssn) where.ssn = ssn;

        const characters = await (prisma as any).character.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                ssn: true,
                status: true,
                isAlive: true,
            },
            take: 10
        });

        res.json(characters.map((c: any) => ({ type: 'person', data: c })));
    } catch (error) {
        console.error('Person search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

router.post('/search/vehicle', async (req: Request, res: Response) => {
    try {
        const { plate } = req.body;
        
        const vehicles = await (prisma as any).vehicle.findMany({
            where: {
                plate: { contains: plate, mode: 'insensitive' }
            },
            take: 10
        });

        res.json(vehicles.map((v: any) => ({ type: 'vehicle', data: v })));
    } catch (error) {
        console.error('Vehicle search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

router.post('/search/weapon', async (req: Request, res: Response) => {
    try {
        const { serialNumber } = req.body;
        
        const weapons = await (prisma as any).weapon.findMany({
            where: {
                serialNumber: { contains: serialNumber, mode: 'insensitive' }
            },
            take: 10
        });

        res.json(weapons.map((w: any) => ({ type: 'weapon', data: w })));
    } catch (error) {
        console.error('Weapon search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

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

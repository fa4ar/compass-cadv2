import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// =============================================
// ШТРАФЫ (включая самостоятельные от граждан)
// =============================================

// Создать штраф (LEO или self-issued)
router.post('/fines', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const { characterId, amount, reason, offenseCode, description, paymentDue, isSelfIssued, context } = req.body;
        const userId = req.user.userId;
        
        if (!characterId || !amount || !reason) {
            return res.status(400).json({ error: 'Требуются поля: characterId, amount, reason' });
        }
        
        const prisma = require('../lib/prisma').default;
        
        // Проверяем, что персонаж существует
        const character = await prisma.character.findUnique({
            where: { id: parseInt(characterId) }
        });
        
        if (!character) {
            return res.status(404).json({ error: 'Персонаж не найден' });
        }
        
        // Проверяем права для обычных штрафов
        const userRoles = (req.user.roles || []).map((r: string) => r.toLowerCase());
        const isLEO = ['admin', 'police', 'sheriff', 'trooper', 'dispatcher'].some(r => userRoles.includes(r));
        
        const fine = await prisma.fine.create({
            data: {
                characterId: parseInt(characterId),
                amount: parseFloat(amount),
                reason,
                offenseCode,
                description,
                paymentDue: paymentDue ? new Date(paymentDue) : null,
                isSelfIssued: isSelfIssued || false,
                issuedByUserId: userId,
                context,
                // Если LEO - может указать officerId
                ...(isLEO && req.body.officerId ? { officerId: parseInt(req.body.officerId) } : {})
            },
            include: {
                character: {
                    select: { firstName: true, lastName: true }
                }
            }
        });
        
        res.status(201).json(fine);
    } catch (error) {
        console.error('Error creating fine:', error);
        res.status(500).json({ error: 'Ошибка при создании штрафа' });
    }
});

// Получить штрафы персонажа
router.get('/fines/character/:characterId', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const { characterId } = req.params;
        const prisma = require('../lib/prisma').default;
        
        const fines = await prisma.fine.findMany({
            where: { characterId: parseInt(characterId) },
            orderBy: { issuedAt: 'desc' }
        });
        
        res.json(fines);
    } catch (error) {
        console.error('Error fetching fines:', error);
        res.status(500).json({ error: 'Ошибка при получении штрафов' });
    }
});

// Оплатить штраф
router.post('/fines/:id/pay', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, method } = req.body;
        
        const prisma = require('../lib/prisma').default;
        
        const fine = await prisma.fine.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!fine) {
            return res.status(404).json({ error: 'Штраф не найден' });
        }
        
        if (fine.status === 'paid' || fine.status === 'cancelled') {
            return res.status(400).json({ error: 'Штраф уже оплачен или отменен' });
        }
        
        const paymentAmount = amount ? parseFloat(amount) : fine.amount;
        
        // Записываем платеж
        await prisma.finePayment.create({
            data: {
                fineId: fine.id,
                amount: paymentAmount,
                method
            }
        });
        
        // Проверяем, полностью ли оплачен
        const totalPaid = await prisma.finePayment.aggregate({
            where: { fineId: fine.id },
            _sum: { amount: true }
        });
        
        const newStatus = totalPaid._sum.amount >= fine.amount ? 'paid' : 'partially_paid';
        
        const updatedFine = await prisma.fine.update({
            where: { id: fine.id },
            data: { 
                status: newStatus,
                paidAt: newStatus === 'paid' ? new Date() : null
            }
        });
        
        res.json(updatedFine);
    } catch (error) {
        console.error('Error paying fine:', error);
        res.status(500).json({ error: 'Ошибка при оплате штрафа' });
    }
});

// Отменить штраф
router.delete('/fines/:id', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user.userId;
        
        const prisma = require('../lib/prisma').default;
        
        const fine = await prisma.fine.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!fine) {
            return res.status(404).json({ error: 'Штраф не найден' });
        }
        
        // Проверяем права (только LEO или owner)
        const userRoles = (req.user.roles || []).map((r: string) => r.toLowerCase());
        const isLEO = ['admin', 'police', 'sheriff', 'trooper', 'dispatcher'].some(r => userRoles.includes(r));
        
        if (!isLEO) {
            return res.status(403).json({ error: 'Только LEO могут отменять штрафы' });
        }
        
        const updatedFine = await prisma.fine.update({
            where: { id: fine.id },
            data: {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelledBy: userId,
                cancelReason: reason
            }
        });
        
        res.json(updatedFine);
    } catch (error) {
        console.error('Error cancelling fine:', error);
        res.status(500).json({ error: 'Ошибка при отмене штрафа' });
    }
});

// =============================================
// ОРДЕРА
// =============================================

// Создать ордер
router.post('/warrants', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const { characterId, type, title, description, justification, expiresInDays, relatedIncidentId, relatedFineId } = req.body;
        const userId = req.user.userId;
        
        if (!characterId || !type || !title || !description || !justification) {
            return res.status(400).json({ error: 'Требуются поля: characterId, type, title, description, justification' });
        }
        
        const prisma = require('../lib/prisma').default;
        
        // Проверяем права (только LEO)
        const userRoles = (req.user.roles || []).map((r: string) => r.toLowerCase());
        const isLEO = ['admin', 'police', 'sheriff', 'trooper', 'dispatcher'].some(r => userRoles.includes(r));
        
        if (!isLEO) {
            return res.status(403).json({ error: 'Только LEO могут создавать ордера' });
        }
        
        // Получаем username
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true }
        });
        
        const expiresAt = expiresInDays 
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
            : null;
        
        const warrant = await prisma.warrant.create({
            data: {
                characterId: parseInt(characterId),
                type,
                title,
                description,
                justification,
                issuerUserId: userId,
                issuerName: user?.username,
                expiresAt,
                relatedIncidentId: relatedIncidentId ? parseInt(relatedIncidentId) : null,
                relatedFineId: relatedFineId ? parseInt(relatedFineId) : null
            },
            include: {
                character: {
                    select: { firstName: true, lastName: true }
                }
            }
        });
        
        res.status(201).json(warrant);
    } catch (error) {
        console.error('Error creating warrant:', error);
        res.status(500).json({ error: 'Ошибка при создании ордера' });
    }
});

// Получить ордера персонажа
router.get('/warrants/character/:characterId', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const { characterId } = req.params;
        const prisma = require('../lib/prisma').default;
        
        const warrants = await prisma.warrant.findMany({
            where: { 
                characterId: parseInt(characterId),
                status: { in: ['active', 'pending'] }
            },
            orderBy: { issuedAt: 'desc' }
        });
        
        res.json(warrants);
    } catch (error) {
        console.error('Error fetching warrants:', error);
        res.status(500).json({ error: 'Ошибка при получении ордеров' });
    }
});

// Получить все активные ордера (для полиции)
router.get('/warrants', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const prisma = require('../lib/prisma').default;
        
        const userRoles = (req.user.roles || []).map((r: string) => r.toLowerCase());
        const isLEO = ['admin', 'police', 'sheriff', 'trooper', 'dispatcher'].some(r => userRoles.includes(r));
        
        if (!isLEO) {
            return res.status(403).json({ error: 'Только LEO могут просматривать все ордера' });
        }
        
        const warrants = await prisma.warrant.findMany({
            where: {
                status: { in: ['active', 'pending'] }
            },
            include: {
                character: {
                    select: { firstName: true, lastName: true }
                }
            },
            orderBy: { issuedAt: 'desc' },
            take: 100
        });
        
        res.json(warrants);
    } catch (error) {
        console.error('Error fetching all warrants:', error);
        res.status(500).json({ error: 'Ошибка при получении ордеров' });
    }
});

// Обновить статус ордера (исполнить, отменить)
router.patch('/warrants/:id', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { status, reason, executedAt } = req.body;
        const userId = req.user.userId;
        
        const prisma = require('../lib/prisma').default;
        
        const warrant = await prisma.warrant.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!warrant) {
            return res.status(404).json({ error: 'Ордер не найден' });
        }
        
        const updateData: any = {};
        
        if (status === 'executed') {
            updateData.status = 'executed';
            updateData.executedAt = executedAt ? new Date(executedAt) : new Date();
        } else if (status === 'cancelled') {
            updateData.status = 'cancelled';
            updateData.cancelledAt = new Date();
            updateData.cancelledBy = userId;
            updateData.cancelReason = reason;
        }
        
        const updated = await prisma.warrant.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        
        res.json(updated);
    } catch (error) {
        console.error('Error updating warrant:', error);
        res.status(500).json({ error: 'Ошибка при обновлении ордера' });
    }
});

// =============================================
// ДЛЯ ГРАЖДАН: САМОСТОЯТЕЛЬНОЕ СОЗДАНИЕ
// =============================================

// Гражданин создает штраф для себя (для отыгрыша)
router.post('/self/fines', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const { amount, reason, offenseCode, description, paymentDue, context } = req.body;
        const userId = req.user.userId;
        
        if (!amount || !reason) {
            return res.status(400).json({ error: 'Требуются поля: amount, reason' });
        }
        
        const prisma = require('../lib/prisma').default;
        
        // Находим персонажей пользователя
        const characters = await prisma.character.findMany({
            where: { userId },
            select: { id: true }
        });
        
        if (characters.length === 0) {
            return res.status(400).json({ error: 'У пользователя нет персонажей' });
        }
        
        // Берем первого персонажа (или можно выбрать конкретного)
        const characterId = req.body.characterId || characters[0].id;
        
        const fine = await prisma.fine.create({
            data: {
                characterId: parseInt(characterId),
                amount: parseFloat(amount),
                reason,
                offenseCode,
                description,
                paymentDue: paymentDue ? new Date(paymentDue) : null,
                isSelfIssued: true,
                issuedByUserId: userId,
                context: context || 'roleplay'
            },
            include: {
                character: {
                    select: { firstName: true, lastName: true }
                }
            }
        });
        
        res.status(201).json(fine);
    } catch (error) {
        console.error('Error creating self-issued fine:', error);
        res.status(500).json({ error: 'Ошибка при создании штрафа' });
    }
});

// Получить свои штрафы (для граждан)
router.get('/self/fines', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const userId = req.user.userId;
        const prisma = require('../lib/prisma').default;
        
        const characters = await prisma.character.findMany({
            where: { userId },
            select: { id: true }
        });
        
        if (characters.length === 0) {
            return res.json([]);
        }
        
        const characterIds = characters.map((c: any) => c.id);
        
        const fines = await prisma.fine.findMany({
            where: { 
                characterId: { in: characterIds },
                isSelfIssued: true
            },
            include: {
                character: {
                    select: { firstName: true, lastName: true, id: true }
                }
            },
            orderBy: { issuedAt: 'desc' }
        });
        
        res.json(fines);
    } catch (error) {
        console.error('Error fetching self fines:', error);
        res.status(500).json({ error: 'Ошибка при получении штрафов' });
    }
});

export default router;
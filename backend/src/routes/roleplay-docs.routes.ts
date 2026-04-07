import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Получить все определения тегов
router.get('/tags/definitions', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const prisma = require('../lib/prisma').default;
        
        const tags = await prisma.roleplayTagDefinition.findMany({
            where: { isActive: true },
            orderBy: { priority: 'desc' }
        });
        
        res.json(tags);
    } catch (error) {
        console.error('Error fetching tag definitions:', error);
        res.status(500).json({ error: 'Failed to fetch tag definitions' });
    }
});

// Получить теги персонажа
router.get('/tags/character/:characterId', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const { characterId } = req.params;
        const prisma = require('../lib/prisma').default;
        
        const tags = await prisma.characterRoleplayTag.findMany({
            where: { 
                characterId: parseInt(characterId),
                isActive: true
            },
            include: {
                character: {
                    select: { firstName: true, lastName: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        res.json(tags);
    } catch (error) {
        console.error('Error fetching character tags:', error);
        res.status(500).json({ error: 'Failed to fetch character tags' });
    }
});

// Создать тег для персонажа (самовыдача или через roleplay)
router.post('/tags', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const { characterId, tagKey, label, description, expiresInDays, reason } = req.body;
        const userId = req.user.userId;
        
        const prisma = require('../lib/prisma').default;
        
        // Проверяем определение тега
        const tagDefinition = await prisma.roleplayTagDefinition.findUnique({
            where: { key: tagKey }
        });
        
        if (!tagDefinition) {
            return res.status(400).json({ error: 'Tag definition not found' });
        }
        
        // Проверяем ограничения
        if (tagDefinition.requiresReason && !reason) {
            return res.status(400).json({ error: 'Reason is required for this tag' });
        }
        
        // Проверяем лимит
        const existingCount = await prisma.characterRoleplayTag.count({
            where: {
                characterId: parseInt(characterId),
                tagKey: tagKey,
                isActive: true
            }
        });
        
        if (existingCount >= tagDefinition.maxInstances) {
            return res.status(400).json({ error: 'Maximum instances reached for this tag' });
        }
        
        // Вычисляем срок истечения
        const expiresAt = tagDefinition.autoExpireDays 
            ? new Date(Date.now() + tagDefinition.autoExpireDays * 24 * 60 * 60 * 1000)
            : (expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null);
        
        const tag = await prisma.characterRoleplayTag.create({
            data: {
                characterId: parseInt(characterId),
                tagKey,
                label: label || tagDefinition.label,
                description,
                color: tagDefinition.color,
                isTemporary: !!expiresAt,
                expiresAt,
                createdById: userId
            }
        });
        
        res.json(tag);
    } catch (error) {
        console.error('Error creating tag:', error);
        res.status(500).json({ error: 'Failed to create tag' });
    }
});

// Обновить тег (изменить статус, добавить описание)
router.patch('/tags/:tagId', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const { tagId } = req.params;
        const { isActive, description, expiresInDays } = req.body;
        
        const prisma = require('../lib/prisma').default;
        
        const updateData: any = {};
        if (typeof isActive === 'boolean') updateData.isActive = isActive;
        if (description !== undefined) updateData.description = description;
        if (expiresInDays !== undefined) {
            updateData.expiresAt = expiresInDays 
                ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
                : null;
            updateData.isTemporary = !!expiresInDays;
        }
        
        const tag = await prisma.characterRoleplayTag.update({
            where: { id: parseInt(tagId) },
            data: updateData
        });
        
        res.json(tag);
    } catch (error) {
        console.error('Error updating tag:', error);
        res.status(500).json({ error: 'Failed to update tag' });
    }
});

// Удалить тег
router.delete('/tags/:tagId', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const { tagId } = req.params;
        
        const prisma = require('../lib/prisma').default;
        
        await prisma.characterRoleplayTag.update({
            where: { id: parseInt(tagId) },
            data: { isActive: false }
        });
        
        res.json({ message: 'Tag removed' });
    } catch (error) {
        console.error('Error deleting tag:', error);
        res.status(500).json({ error: 'Failed to delete tag' });
    }
});

// Создать определение тега (только для админов)
router.post('/tags/definitions', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const { key, label, description, color, icon, category, priority, canBeSelfApplied, maxInstances, requiresReason, autoExpireDays } = req.body;
        
        const prisma = require('../lib/prisma').default;
        
        // Проверяем права (должен быть админ)
        const userRoles = req.user.roles || [];
        if (!userRoles.includes('admin')) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const tagDefinition = await prisma.roleplayTagDefinition.create({
            data: {
                key,
                label,
                description,
                color: color || '#FF0000',
                icon,
                category,
                priority: priority || 0,
                canBeSelfApplied: canBeSelfApplied || false,
                maxInstances: maxInstances || 1,
                requiresReason: requiresReason || false,
                autoExpireDays
            }
        });
        
        res.json(tagDefinition);
    } catch (error) {
        console.error('Error creating tag definition:', error);
        res.status(500).json({ error: 'Failed to create tag definition' });
    }
});

// Массовое создание дефолтных тегов
router.post('/tags/definitions/seed', authMiddleware as any, async (req: any, res: Response) => {
    try {
        const prisma = require('../lib/prisma').default;
        
        const userRoles = req.user.roles || [];
        if (!userRoles.includes('admin')) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const defaultTags = [
            { key: 'gang_member', label: 'Член банды', description: 'Участник криминальной организации', color: '#DC2626', icon: 'Users', category: 'criminal', priority: 10, canBeSelfApplied: false, maxInstances: 1, requiresReason: true },
            { key: 'udo', label: 'УДО', description: 'Условно-досрочное освобождение', color: '#F59E0B', icon: 'Clock', category: 'legal', priority: 8, canBeSelfApplied: false, maxInstances: 1, requiresReason: true, autoExpireDays: 365 },
            { key: 'recidivist', label: 'Рецидивист', description: 'Многократное нарушение закона', color: '#7C3AED', icon: 'AlertTriangle', category: 'criminal', priority: 9, canBeSelfApplied: false, maxInstances: 1, requiresReason: true },
            { key: 'monitored', label: 'Наблюдаемый', description: 'Находится под наблюдением', color: '#0EA5E9', icon: 'Eye', category: 'surveillance', priority: 7, canBeSelfApplied: false, maxInstances: 1, requiresReason: true, autoExpireDays: 180 },
            { key: 'parole', label: 'Парал', description: 'Находится на условном освобождении', color: '#F97316', icon: 'FileText', category: 'legal', priority: 8, canBeSelfApplied: false, maxInstances: 1, requiresReason: true, autoExpireDays: 730 },
            { key: 'probation', label: 'Пробация', description: 'Испытательный срок', color: '#8B5CF6', icon: 'CheckCircle', category: 'legal', priority: 7, canBeSelfApplied: false, maxInstances: 1, requiresReason: true, autoExpireDays: 365 },
            { key: 'witness', label: 'Свидетель', description: 'Является свидетелем по делу', color: '#10B981', icon: 'User', category: 'behavioral', priority: 5, canBeSelfApplied: false, maxInstances: 1, requiresReason: true },
            { key: 'informant', label: 'Информатор', description: 'Сотрудничает с правоохранительными органами', color: '#6366F1', icon: 'Mic', category: 'system', priority: 10, canBeSelfApplied: false, maxInstances: 1, requiresReason: false },
            { key: 'debtor', label: 'Должник', description: 'Имеет неоплаченные задолженности', color: '#EF4444', icon: 'CreditCard', category: 'behavioral', priority: 4, canBeSelfApplied: false, maxInstances: 1 },
            { key: 'suspicious', label: 'Подозрительный', description: 'Находится под подозрением', color: '#F59E0B', icon: 'AlertCircle', category: 'surveillance', priority: 6, canBeSelfApplied: true, maxInstances: 1, requiresReason: true },
        ];
        
        const created = [];
        for (const tag of defaultTags) {
            const existing = await prisma.roleplayTagDefinition.findUnique({
                where: { key: tag.key }
            });
            
            if (!existing) {
                const createdTag = await prisma.roleplayTagDefinition.create({
                    data: tag
                });
                created.push(createdTag);
            }
        }
        
        res.json({ message: `Created ${created.length} tag definitions`, tags: created });
    } catch (error) {
        console.error('Error seeding tag definitions:', error);
        res.status(500).json({ error: 'Failed to seed tag definitions' });
    }
});

export default router;
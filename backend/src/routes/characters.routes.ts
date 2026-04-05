import { Router, RequestHandler, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { CharactersController } from '../controllers/characters/characters.controller';
import { authMiddleware, requireRoles } from '../middleware/auth.middleware';
import { uploadCharacterPhoto } from '../middleware/upload.middleware';

const router = Router();
const CharactersControl = new CharactersController();

// Тестовый маршрут для тех, кто открывает ссылку в браузере (он отправляет GET-запрос)
router.get('/create', (req: Request, res: Response) => {
    res.json({ 
        message: "Маршрут существует и работает!", 
        instruction: "Чтобы создать персонажа, вам нужно отправить именно POST-запрос на этот URL (с данными персонажа и Bearer токеном)."
    });
});

// Получить всех персонажей текущего пользователя
router.get('/', authMiddleware as RequestHandler, CharactersControl.getAll);

// Получить всех персонажей (для админа)
router.get('/all', authMiddleware as RequestHandler, requireRoles('admin') as RequestHandler, async (req, res) => {
    try {
        const characters = await (prisma as any).character.findMany({
            include: {
                user: {
                    select: { id: true, username: true, discordId: true }
                },
                departmentMembers: {
                    where: { isActive: true },
                    include: {
                        department: true,
                        rank: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(characters);
    } catch (error) {
        console.error('Get all characters error:', error);
        res.status(500).json({ error: 'Failed to fetch characters' });
    }
});

// Реальный POST-маршрут для создания персонажа (требуется авторизация)
router.post('/create', authMiddleware as RequestHandler, uploadCharacterPhoto, CharactersControl.create);

// Обновить персонажа текущего пользователя
router.put('/:id', authMiddleware as RequestHandler, CharactersControl.update);

// Admin: обновить любого персонажа
router.put('/:id/admin', authMiddleware as RequestHandler, requireRoles('admin') as RequestHandler, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            firstName, lastName, middleName, nickname, birthDate, gender, 
            height, weight, description, status, isAlive, balance, bankBalance 
        } = req.body;

        const character = await (prisma as any).character.update({
            where: { id: parseInt(id) },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(middleName !== undefined && { middleName: middleName || null }),
                ...(nickname !== undefined && { nickname: nickname || null }),
                ...(birthDate && { birthDate: new Date(birthDate) }),
                ...(gender && { gender }),
                ...(height !== undefined && { height: height || null }),
                ...(weight !== undefined && { weight: weight || null }),
                ...(description !== undefined && { description: description || null }),
                ...(status && { status }),
                ...(isAlive !== undefined && { isAlive }),
                ...(balance !== undefined && { balance }),
                ...(bankBalance !== undefined && { bankBalance }),
            },
            include: {
                user: { select: { id: true, username: true } },
                departmentMembers: {
                    where: { isActive: true },
                    include: { department: true, rank: true }
                }
            }
        });

        res.json(character);
    } catch (error) {
        console.error('Admin update character error:', error);
        res.status(500).json({ error: 'Failed to update character' });
    }
});

// Удалить персонажа (владелец или админ)
router.delete('/:id', authMiddleware as RequestHandler, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;

        const character = await (prisma as any).character.findUnique({
            where: { id: parseInt(id) },
            select: { userId: true }
        });

        if (!character) {
            return res.status(404).json({ error: 'Character not found' });
        }

        const userRoles = (req as any).user?.roles || [];
        const isAdmin = userRoles.includes('admin');
        const isOwner = character.userId === userId;

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'You can only delete your own characters' });
        }

        await (prisma as any).character.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Character deleted successfully' });
    } catch (error) {
        console.error('Delete character error:', error);
        res.status(500).json({ error: 'Failed to delete character' });
    }
});

export default router;

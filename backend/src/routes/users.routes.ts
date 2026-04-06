import { Router, RequestHandler } from 'express';
import { UsersControl } from '../controllers/users/users.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { io } from '../server';

const router = Router();

// Получить профиль текущего пользователя
router.get('/profile', authMiddleware as RequestHandler, UsersControl.getProfile);

router.put('/profile', authMiddleware as RequestHandler, UsersControl.updateProfile);

// Admin routes
router.get('/', authMiddleware as RequestHandler, requireRoles('admin') as RequestHandler, async (req, res) => {
    try {
        const users = await (prisma as any).user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                discordId: true,
                isBanned: true,
                banReason: true,
                lastLogin: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.patch('/:id/ban', authMiddleware as RequestHandler, async (req, res) => {
    try {
        const { id } = req.params;
        const { ban, isBanned, reason } = req.body;
        
        // Handle both 'ban' (from admin panel) and 'isBanned' (from self-unban)
        const newBanStatus = isBanned !== undefined ? isBanned : ban;

        // Check if user is unbanning themselves
        const requesterId = (req as any).user?.userId;
        const targetId = parseInt(id);
        const userRoles = ((req as any).user?.roles || []).map((r: string) => r.toLowerCase());
        const isAdmin = userRoles.includes('admin') || userRoles.includes('supervisor');

        if (requesterId !== targetId && !isAdmin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const user = await (prisma as any).user.update({
            where: { id: targetId },
            data: {
                isBanned: newBanStatus,
                banReason: newBanStatus ? reason : null
            }
        });

        // Emit socket event for real-time ban
        if (io) {
            io.emit('user_banned', {
                userId: targetId,
                isBanned: newBanStatus,
                reason: newBanStatus ? reason : null
            });
        }

        res.json(user);
    } catch (error) {
        console.error('Ban user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

router.post('/:id/ban', authMiddleware as RequestHandler, requireRoles('admin') as RequestHandler, async (req, res) => {
    try {
        const { id } = req.params;
        const { ban, reason } = req.body;

        const user = await (prisma as any).user.update({
            where: { id: parseInt(id) },
            data: {
                isBanned: ban,
                banReason: ban ? reason : null
            }
        });

        // Emit socket event for real-time ban
        if (io) {
            io.emit('user_banned', {
                userId: parseInt(id),
                isBanned: ban,
                reason: ban ? reason : null
            });
        }

        res.json(user);
    } catch (error) {
        console.error('Ban user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

export default router;

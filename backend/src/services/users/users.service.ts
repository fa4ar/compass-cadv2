import prisma from '../../lib/prisma';

export class UsersService {
    async getUserProfile(userId: number) {
        return (prisma as any).user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                theme: true,
                isActive: true,
                createdAt: true,
            }
        });
    }

    async updateProfile(userId: number, data: { username?: string; avatarUrl?: string; theme?: string }) {
        return (prisma as any).user.update({
            where: { id: userId },
            data: {
                username: data.username,
                avatarUrl: data.avatarUrl,
                theme: data.theme,
            },
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                theme: true,
                isActive: true,
                createdAt: true,
            }
        });
    }
}

export const usersService = new UsersService();

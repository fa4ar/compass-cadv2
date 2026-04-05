import prisma from '../../lib/prisma';

export class UsersService {
    async getUserProfile(userId: number) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                isActive: true,
                createdAt: true,
            }
        });
    }

    async updateProfile(userId: number, data: { username?: string; avatarUrl?: string }) {
        return prisma.user.update({
            where: { id: userId },
            data: {
                username: data.username,
                avatarUrl: data.avatarUrl,
            },
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                isActive: true,
                createdAt: true,
            }
        });
    }
}

export const usersService = new UsersService();

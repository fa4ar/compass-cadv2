import prisma from '../../lib/prisma';
import { io } from '../../server';

export class BOLOService {
    static async createBOLO(data: {
        type: 'vehicle' | 'person' | 'item' | 'location';
        description: string;
        details?: any;
        plate?: string;
        color?: string;
        model?: string;
        characterId?: number;
        createdBy: number;
        creatorName?: string;
        priority?: string;
        expiresAt?: Date;
    }) {
        const bolo = await prisma.bOLO.create({
            data: {
                type: data.type,
                status: 'active',
                description: data.description,
                details: data.details,
                plate: data.plate,
                color: data.color,
                model: data.model,
                characterId: data.characterId,
                createdBy: data.createdBy,
                creatorName: data.creatorName,
                priority: data.priority || 'medium',
                expiresAt: data.expiresAt,
            },
            include: {
                character: true,
                creator: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        if (io) {
            io.emit('bolo_created', bolo);
        }

        return bolo;
    }

    static async getActiveBOLOs() {
        return prisma.bOLO.findMany({
            where: {
                status: 'active',
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gte: new Date() } },
                ],
            },
            include: {
                character: true,
                creator: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: {
                issuedAt: 'desc',
            },
        });
    }

    static async getAllBOLOs() {
        return prisma.bOLO.findMany({
            include: {
                character: true,
                creator: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: {
                issuedAt: 'desc',
            },
        });
    }

    static async getBOLOById(id: number) {
        return prisma.bOLO.findUnique({
            where: { id },
            include: {
                character: true,
                creator: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
        });
    }

    static async closeBOLO(id: number, closedBy: number, closeReason?: string) {
        const bolo = await prisma.bOLO.update({
            where: { id },
            data: {
                status: 'closed',
                closedAt: new Date(),
                closedBy,
                closeReason,
            },
            include: {
                character: true,
                creator: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        if (io) {
            io.emit('bolo_closed', bolo);
        }

        return bolo;
    }

    static async deleteBOLO(id: number) {
        return prisma.bOLO.delete({
            where: { id },
        });
    }

    static async updateBOLO(id: number, data: {
        type?: 'vehicle' | 'person' | 'item' | 'location';
        description?: string;
        details?: any;
        plate?: string;
        color?: string;
        model?: string;
        characterId?: number;
        priority?: string;
        expiresAt?: Date;
    }) {
        const bolo = await prisma.bOLO.update({
            where: { id },
            data,
            include: {
                character: true,
                creator: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        if (io) {
            io.emit('bolo_updated', bolo);
        }

        return bolo;
    }
}

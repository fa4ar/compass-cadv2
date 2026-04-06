import prisma from '../../lib/prisma';
import { CallStatus } from '@prisma/client';
import { io } from '../../server';

export class Calls911Service {
    static async createCall(data: { 
        callerId?: number, 
        callerName: string, 
        location: string, 
        description: string,
        phoneNumber?: string,
        userUsername?: string,
        userDiscordId?: string,
        userAvatarUrl?: string
    }) {
        return prisma.call911.create({
            data: {
                callerId: data.callerId,
                callerName: data.callerName,
                location: data.location,
                description: data.description,
                phoneNumber: data.phoneNumber,
                userUsername: data.userUsername,
                userDiscordId: data.userDiscordId,
                userAvatarUrl: data.userAvatarUrl,
                status: 'pending'
            }
        });
    }

    static async getActiveCalls() {
        return prisma.call911.findMany({
            where: {
                status: {
                    in: ['pending', 'dispatched', 'enroute', 'on_scene']
                }
            },
            include: {
                notes: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                },
                units: {
                    include: {
                        character: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        },
                        user: {
                            select: {
                                id: true,
                                username: true,
                                avatarUrl: true
                            }
                        },
                        pairedWith: {
                            include: {
                                character: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true
                                    }
                                },
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        avatarUrl: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    static async getClosedCalls() {
        return prisma.call911.findMany({
            where: {
                status: 'closed'
            },
            include: {
                notes: true,
                caller: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                discordId: true,
                                avatarUrl: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
    }

    static async getCallsByCaller(callerId: number) {
        return prisma.call911.findMany({
            where: { callerId },
            include: {
                notes: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    static async updateCallStatus(id: number, status: CallStatus) {
        return prisma.call911.update({
            where: { id },
            data: { status },
            include: {
                notes: true
            }
        });
    }

    static async deleteCall(id: number) {
        return prisma.call911.delete({
            where: { id }
        });
    }

    static async addNote(callId: number, author: string, text: string) {
        return (prisma as any).call911Note.create({
            data: {
                callId,
                author,
                text
            }
        });
    }

    static async attachUnit(callId: number, userId: number) {
        const call = await prisma.call911.findUnique({
            where: { id: callId },
            select: { mainUnitId: true }
        });

        const existingUnit = await prisma.unit.findUnique({
            where: { userId }
        });

        if (!existingUnit) {
            throw new Error('Unit not found');
        }

        const isMainUnitSet = call?.mainUnitId !== null && call?.mainUnitId !== undefined;

        const result = await prisma.$transaction([
            prisma.unit.update({
                where: { userId },
                data: { callId }
            }),
            prisma.call911.update({
                where: { id: callId },
                data: {
                    mainUnitId: isMainUnitSet ? undefined : userId,
                    status: 'dispatched'
                }
            })
        ]);

        if (io) {
            io.emit('unit_assigned', {
                userId,
                callId,
                unitCallSign: existingUnit.callSign
            });
        }

        return result;
    }

    static async detachUnit(userId: number) {
        const unit = await prisma.unit.findUnique({
            where: { userId },
            select: { callId: true }
        });

        if (!unit?.callId) {
            return null;
        }

        const callId = unit.callId;

        const remainingUnits = await prisma.unit.findMany({
            where: {
                callId,
                userId: { not: userId }
            }
        });

        const newMainUnitId = remainingUnits.length > 0 ? remainingUnits[0].userId : null;

        return prisma.$transaction([
            prisma.unit.update({
                where: { userId },
                data: { callId: null }
            }),
            prisma.call911.update({
                where: { id: callId },
                data: { mainUnitId: newMainUnitId }
            })
        ]);
    }

    static async setMainUnit(callId: number, userId: number) {
        return prisma.call911.update({
            where: { id: callId },
            data: { mainUnitId: userId }
        });
    }
}

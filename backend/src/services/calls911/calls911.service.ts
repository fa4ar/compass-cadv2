import prisma from '../../lib/prisma';
import { CallStatus } from '@prisma/client';

export class Calls911Service {
    static async createCall(data: { callerId?: number, callerName: string, location: string, description: string }) {
        return prisma.call911.create({
            data: {
                callerId: data.callerId,
                callerName: data.callerName,
                location: data.location,
                description: data.description,
                status: 'pending'
            }
        });
    }

    static async getActiveCalls() {
        return prisma.call911.findMany({
            where: {
                status: {
                    in: ['pending', 'dispatched']
                }
            },
            include: {
                notes: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
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
}

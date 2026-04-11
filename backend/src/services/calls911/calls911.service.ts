import prisma from '../../lib/prisma';
import { CallStatus } from '@prisma/client';
import { io } from '../../server';

export class Calls911Service {
    /**
     * Check if user is on active shift in any department
     * Uses the DepartmentShift system for independent department tracking
     */
    private static async isUserOnShift(userId: number): Promise<boolean> {
        try {
            const activeShift = await prisma.departmentShift.findFirst({
                where: {
                    userId,
                    endedAt: null
                }
            });
            return !!activeShift;
        } catch (error) {
            console.error('[Calls911Service] Error checking shift status:', error);
            return false;
        }
    }

    /**
     * Get active shift for a specific department
     */
    private static async getUserShiftInDepartment(userId: number, departmentType: string) {
        try {
            return await prisma.departmentShift.findUnique({
                where: {
                    userId_departmentType: {
                        userId,
                        departmentType
                    }
                }
            });
        } catch (error) {
            console.error('[Calls911Service] Error getting department shift:', error);
            return null;
        }
    }
    static async createCall(data: { 
        callerId?: number, 
        callerName: string, 
        location: string, 
        description: string,
        phoneNumber?: string,
        type?: string,
        priority?: string,
        isEmergency?: boolean,
        x?: number,
        y?: number,
        z?: number,
        userUsername?: string,
        userDiscordId?: string,
        userAvatarUrl?: string,
        callType?: string,
        source?: string
    }) {
        const emergency = data.isEmergency || data.priority === 'emergency' || data.priority === 'high';
        
        const call = await prisma.call911.create({
            data: {
                callerId: data.callerId,
                callerName: data.callerName,
                location: data.location,
                description: data.description,
                phoneNumber: data.phoneNumber,
                type: data.type || 'other',
                callType: data.callType || 'police',
                priority: data.priority || (emergency ? 'high' : 'routine'),
                isEmergency: emergency,
                x: data.x,
                y: data.y,
                z: data.z,
                userUsername: data.userUsername,
                userDiscordId: data.userDiscordId,
                userAvatarUrl: data.userAvatarUrl,
                source: data.source || 'web',
                status: 'pending'
            }
        });

        console.log(`[Calls911Service] Call created with source: ${call.source}, ID: ${call.id}`);
        return call;
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
                                avatarUrl: true,
                                license: true
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
                                        avatarUrl: true,
                                        license: true
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
            select: { mainUnitId: true, callType: true }
        });

        const existingUnit = await prisma.unit.findUnique({
            where: { userId }
        });

        if (!existingUnit) {
            throw new Error('Unit not found');
        }

        const isMainUnitSet = call?.mainUnitId !== null && call?.mainUnitId !== undefined;
        const isFirstUnit = !isMainUnitSet;

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

        // Also attach to DepartmentShift if user has an active shift in the call's department
        if (call?.callType) {
            const departmentType = call.callType === 'police' ? 'police' : 
                                  call.callType === 'fire' ? 'fire' : 'ems';
            
            const departmentShift = await this.getUserShiftInDepartment(userId, departmentType);
            if (departmentShift && departmentShift.endedAt === null) {
                await prisma.departmentShift.update({
                    where: { id: departmentShift.id },
                    data: {
                        callId,
                        status: 'OnScene'
                    }
                });
            }
        }

        if (io) {
            const updatedCall = await prisma.call911.findUnique({
                where: { id: callId },
                include: {
                    notes: true,
                    units: {
                        include: {
                            character: true,
                            user: { select: { username: true, avatarUrl: true } }
                        }
                    }
                }
            });
            
            if (updatedCall) {
                // Emit to all clients - unit attached to call
                io.emit('unit_attached_to_call', {
                    userId,
                    callId,
                    unitCallSign: existingUnit.callSign,
                    isLeadUnit: isFirstUnit,
                    call: {
                        id: updatedCall.id,
                        location: updatedCall.location,
                        description: updatedCall.description,
                        callerName: updatedCall.callerName,
                        callerPhone: updatedCall.phoneNumber,
                        createdAt: updatedCall.createdAt.getTime(),
                        status: updatedCall.status,
                        mainUnitId: updatedCall.mainUnitId,
                        units: updatedCall.units.map(u => ({
                            userId: u.userId,
                            characterId: u.characterId,
                            name: u.character ? `${u.character.firstName} ${u.character.lastName}` : u.callSign,
                            status: u.status,
                            callSign: u.callSign,
                            isLead: u.userId === updatedCall.mainUnitId
                        }))
                    }
                });
                
                // Also emit legacy event for compatibility
                io.emit('unit_assigned', {
                    userId,
                    callId,
                    unitCallSign: existingUnit.callSign,
                    isLeadUnit: isFirstUnit
                });
                
                io.emit('call_assigned_to_unit', {
                    userId,
                    call: {
                        id: updatedCall.id,
                        location: updatedCall.location,
                        description: updatedCall.description,
                        callerName: updatedCall.callerName,
                        callerPhone: updatedCall.phoneNumber,
                        createdAt: updatedCall.createdAt.getTime(),
                        status: updatedCall.status,
                        mainUnitId: updatedCall.mainUnitId,
                        responders: updatedCall.units.map(u => ({
                            name: u.character ? `${u.character.firstName} ${u.character.lastName}` : u.callSign,
                            status: u.status.toLowerCase(),
                            callSign: u.callSign
                        }))
                    }
                });
            }
        }

        // Notify FiveM server about unit attachment
        try {
            const fetch = (await import('node-fetch')).default;
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            await fetch(`${apiUrl}/api/fivem/unit-attached`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': process.env.FIVEM_API_KEY || 'compass-cad-fivem-secret-key'
                },
                body: JSON.stringify({ userId, callId })
            });
        } catch (error) {
            console.error('[FIVEM] Failed to notify FiveM server:', error);
        }

        return result;
    }

    static async detachUnit(userId: number) {
        const unit = await prisma.unit.findUnique({
            where: { userId },
            include: { call: true }
        });

        if (!unit) {
            throw new Error('Unit not found');
        }

        if (!unit.callId) {
            return { success: true, message: 'Unit is not assigned to any call' };
        }

        const callId = unit.callId;

        // Update unit - remove call assignment
        await prisma.unit.update({
            where: { userId },
            data: {
                callId: null,
                status: 'Available',
                lastStatusAt: new Date()
            }
        });

        // Also detach from DepartmentShift
        await prisma.departmentShift.updateMany({
            where: {
                userId,
                callId,
                endedAt: null
            },
            data: {
                callId: null,
                status: 'Available',
                lastStatusAt: new Date()
            }
        });

        const remainingUnits = await prisma.unit.findMany({
            where: {
                callId,
                userId: { not: userId }
            }
        });

        const newMainUnitId = remainingUnits.length > 0 ? remainingUnits[0].userId : null;

        await prisma.call911.update({
            where: { id: callId },
            data: { mainUnitId: newMainUnitId }
        });

        if (io) {
            const updatedCall = await prisma.call911.findUnique({
                where: { id: callId },
                include: {
                    units: {
                        include: {
                            character: true,
                            user: { select: { username: true, avatarUrl: true } }
                        }
                    }
                }
            });
            
            // Emit unit detached from call
            io.emit('unit_detached_from_call', {
                userId,
                callId,
                unitCallSign: unit.callSign,
                newMainUnitId,
                call: updatedCall ? {
                    id: updatedCall.id,
                    status: updatedCall.status,
                    mainUnitId: updatedCall.mainUnitId,
                    units: updatedCall.units.map(u => ({
                        userId: u.userId,
                        characterId: u.characterId,
                        name: u.character ? `${u.character.firstName} ${u.character.lastName}` : u.callSign,
                        status: u.status,
                        callSign: u.callSign,
                        isLead: u.userId === updatedCall.mainUnitId
                    }))
                } : null
            });
            
            // Legacy event
            io.emit('unit_unassigned', {
                userId,
                callId
            });
        }

        return unit;
    }

    static async setMainUnit(callId: number, userId: number) {
        const updatedCall = await prisma.call911.update({
            where: { id: callId },
            data: { mainUnitId: userId }
        });

        if (io) {
            const fullCall = await prisma.call911.findUnique({
                where: { id: callId },
                include: {
                    units: {
                        include: {
                            character: true,
                            user: { select: { username: true, avatarUrl: true } }
                        }
                    }
                }
            });

            if (fullCall) {
                io.emit('lead_unit_changed', {
                    callId,
                    newLeadUserId: userId,
                    previousLeadUserId: null,
                    call: {
                        id: fullCall.id,
                        status: fullCall.status,
                        mainUnitId: fullCall.mainUnitId,
                        units: fullCall.units.map(u => ({
                            userId: u.userId,
                            characterId: u.characterId,
                            name: u.character ? `${u.character.firstName} ${u.character.lastName}` : u.callSign,
                            status: u.status,
                            callSign: u.callSign,
                            isLead: u.userId === fullCall.mainUnitId
                        }))
                    }
                });
            }
        }

        return updatedCall;
    }
}

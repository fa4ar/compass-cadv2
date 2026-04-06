import prisma from '../../lib/prisma';
import { io } from '../../server';

export class UnitsService {
    static async getAllUnits() {
        const units = await (prisma as any).unit.findMany({
            include: {
                character: true,
                departmentMember: true,
                call: true,
                pairedWith: { include: { character: true } }
            }
        });

        // Map to frontend format
        return units.map((u: any) => ({
            unit: u.callSign || u.departmentMember?.callSign || u.departmentMember?.badgeNumber || u.id.toString(),
            officer: u.character ? `${u.character.firstName} ${u.character.lastName}` : u.callSign || 'No Character',
            status: u.status,
            beat: u.beat || "N/A",
            call: u.call ? `#${u.call.id}` : "Available",
            callId: u.callId,
            time: u.lastStatusAt.toLocaleTimeString(),
            nature: u.call?.description || "None",
            location: u.call?.location || "On Patrol",
            characterId: u.characterId,
            userId: u.userId,
            partnerUserId: u.partnerUserId,
            partnerOfficer: u.pairedWith?.[0]?.character ? `${u.pairedWith[0].character.firstName} ${u.pairedWith[0].character.lastName}` : null,
            isPaired: !!u.partnerUserId
        }));
    }

    static async goOnDuty(
        userId: number,
        characterId?: number | null, 
        departmentMemberId?: number | null, 
        callSign?: string,
        subdivision?: string,
        vehicleModel?: string,
        vehiclePlate?: string
    ) {
        console.log(`[UnitsService] Going on duty for userId: ${userId}`, { characterId, departmentMemberId, callSign });
        
        try {
            // Upsert unit session using userId as unique key
            const unit = await (prisma as any).unit.upsert({
                where: { userId },
                update: {
                    characterId: characterId || null,
                    departmentMemberId: departmentMemberId || null,
                    status: "Available",
                    callSign,
                    subdivision,
                    vehicleModel,
                    vehiclePlate,
                    lastStatusAt: new Date()
                },
                create: {
                    userId,
                    characterId: characterId || null,
                    departmentMemberId: departmentMemberId || null,
                    status: "Available",
                    callSign,
                    subdivision,
                    vehicleModel,
                    vehiclePlate
                },
                include: {
                    character: true,
                    departmentMember: true
                }
            });

            console.log(`[UnitsService] Unit upserted successfully: ${unit.id}`);

            return {
                unit: unit.callSign || unit.departmentMember?.callSign || unit.departmentMember?.badgeNumber || unit.id.toString(),
                officer: unit.character ? `${unit.character.firstName} ${unit.character.lastName}` : unit.callSign || 'No Character',
                status: unit.status,
                beat: unit.beat || "N/A",
                call: "Available",
                time: unit.lastStatusAt.toLocaleTimeString(),
                nature: "None",
                location: "On Patrol",
                characterId: unit.characterId,
                subdivision: unit.subdivision,
                vehicleModel: unit.vehicleModel,
                vehiclePlate: unit.vehiclePlate
            };
        } catch (error: any) {
            console.error(`[UnitsService] Error in goOnDuty:`, error);
            throw error;
        }
    }

    static async updateStatus(userId: number, status: string) {
        return await (prisma as any).unit.update({
            where: { userId },
            data: { 
                status,
                lastStatusAt: new Date()
            }
        });
    }

    static async updateStatusById(whereClause: any, status: string) {
        const unit = await (prisma as any).unit.findFirst({ where: whereClause });
        if (!unit) {
            throw new Error('Unit not found');
        }
        const updatedUnit = await (prisma as any).unit.update({
            where: { id: unit.id },
            data: { 
                status,
                lastStatusAt: new Date()
            }
        });
        
        if (io) {
            io.emit('unit_status_changed', {
                userId: unit.userId,
                status,
                unitCallSign: unit.callSign
            });
        }
        
        return updatedUnit;
    }

    static async getCurrentUnit(userId: number) {
        const unit = await (prisma as any).unit.findUnique({
            where: { userId },
            include: {
                character: {
                    include: {
                        departmentMembers: {
                            where: { isActive: true },
                            include: {
                                department: true,
                                rank: true
                            }
                        }
                    }
                },
                departmentMember: {
                    include: {
                        department: true,
                        rank: true
                    }
                }
            }
        });

        if (!unit) return null;

        return {
            ...unit,
            unit: unit.callSign || unit.departmentMember?.callSign || unit.departmentMember?.badgeNumber || unit.userId.toString(),
            officer: unit.character ? `${unit.character.firstName} ${unit.character.lastName}` : unit.callSign || 'No Character',
            time: unit.lastStatusAt.toLocaleTimeString(),
            // Additional info for frontend state
            departmentMember: unit.departmentMember,
            characterId: unit.characterId?.toString()
        };
    }

    static async goOffDuty(userId: number) {
        return await (prisma as any).unit.delete({
            where: { userId }
        });
    }

    static async sendMessageToUnit(senderUserId: number, targetUserId: number, message: string) {
        const sender = await (prisma as any).user.findUnique({
            where: { id: senderUserId },
            select: { username: true }
        });

        const targetUnit = await (prisma as any).unit.findUnique({
            where: { userId: targetUserId },
            include: { character: true }
        });

        if (!targetUnit) {
            throw new Error('Unit not found');
        }

        // Create notification for the target user
        if (targetUnit.characterId) {
            await (prisma as any).notification.create({
                data: {
                    characterId: targetUnit.characterId,
                    type: 'dispatcher_message',
                    title: `Message from ${sender?.username || 'Supervisor'}`,
                    message,
                    isRead: false
                }
            });
        }

        // Emit socket event
        if (io) {
            io.emit('dispatcher_message', {
                message,
                from: sender?.username || 'Supervisor',
                targetUserId
            });
        }

        return { success: true, message: 'Message sent successfully' };
    }

    static async unassignFromCall(userId: number) {
        const unit = await (prisma as any).unit.findUnique({
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
        await (prisma as any).unit.update({
            where: { userId },
            data: {
                callId: null,
                status: 'Available',
                lastStatusAt: new Date()
            }
        });

        // Emit socket event
        if (io) {
            io.emit('unit_unassigned', {
                userId,
                unitCallSign: unit.callSign,
                callId
            });
        }

        return { success: true, message: 'Unit unassigned from call', callId };
    }

    static async inviteToPair(senderUserId: number, targetUserId: number) {
        const targetUnit = await (prisma as any).unit.findUnique({
            where: { userId: targetUserId }
        });

        if (!targetUnit) {
            throw new Error('Target unit not found');
        }

        if (targetUnit.partnerUserId) {
            throw new Error('Target unit already has a partner');
        }

        // Store pending invite
        if (!(global as any).pendingPairInvites) {
            (global as any).pendingPairInvites = {};
        }
        (global as any).pendingPairInvites[targetUserId] = { fromUserId: senderUserId, timestamp: Date.now() };

        const senderUnit = await (prisma as any).unit.findUnique({
            where: { userId: senderUserId }
        });

        // Emit socket event to target user only
        if (io) {
            const { activeUserSessions } = await import('../../server');
            const targetSocketIds = activeUserSessions.get(targetUserId);
            if (targetSocketIds && targetSocketIds.size > 0) {
                for (const socketId of targetSocketIds) {
                    io.to(socketId).emit('pair_invite', {
                        fromUserId: senderUserId,
                        fromCallSign: senderUnit?.callSign || 'Unknown'
                    });
                }
            } else {
                // User not online, emit to all as fallback
                io.emit('pair_invite', {
                    fromUserId: senderUserId,
                    fromCallSign: senderUnit?.callSign || 'Unknown'
                });
            }
        }

        return { success: true, message: 'Invite sent' };
    }

    static async acceptPairInvite(userId: number) {
        const pendingInvite = (global as any).pendingPairInvites?.[userId];
        
        if (!pendingInvite) {
            throw new Error('No pending invite found');
        }

        // Clean up old invites (older than 5 minutes)
        if (Date.now() - pendingInvite.timestamp > 5 * 60 * 1000) {
            delete (global as any).pendingPairInvites?.[userId];
            throw new Error('Invite expired');
        }

        const senderUnit = await (prisma as any).unit.findUnique({
            where: { userId: pendingInvite.fromUserId }
        });

        if (!senderUnit) {
            throw new Error('Sender unit not found');
        }

        // Link both units
        await (prisma as any).unit.update({
            where: { userId: pendingInvite.fromUserId },
            data: { partnerUserId: userId }
        });

        await (prisma as any).unit.update({
            where: { userId },
            data: { partnerUserId: pendingInvite.fromUserId }
        });

        // Clear pending invite
        delete (global as any).pendingPairInvites?.[userId];

        // Emit events
        if (io) {
            io.emit('pair_formed', {
                userId1: pendingInvite.fromUserId,
                userId2: userId
            });
            io.emit('unit_pair_update', { userId });
        }

        return { success: true, message: 'Pair formed' };
    }

    static async leavePair(userId: number) {
        const unit = await (prisma as any).unit.findUnique({
            where: { userId }
        });

        if (!unit?.partnerUserId) {
            throw new Error('Not in a pair');
        }

        const partnerUserId = unit.partnerUserId;

        // Remove partner from both
        await (prisma as any).unit.update({
            where: { userId },
            data: { partnerUserId: null }
        });

        await (prisma as any).unit.update({
            where: { userId: partnerUserId },
            data: { partnerUserId: null }
        });

        if (io) {
            io.emit('pair_disbanded', { userId1: userId, userId2: partnerUserId });
        }

        return { success: true };
    }
}

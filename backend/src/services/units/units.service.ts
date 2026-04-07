import prisma from '../../lib/prisma';
import { io, activeUserSessions } from '../../server';

export class UnitsService {
    static async getAllUnits() {
        const units = await (prisma as any).unit.findMany({
            include: {
                character: true,
                departmentMember: true,
                call: true,
                user: {
                    select: {
                        username: true,
                        avatarUrl: true
                    }
                },
                pairedWith: { 
                    include: { 
                        character: true,
                        user: {
                            select: {
                                username: true,
                                avatarUrl: true
                            }
                        }
                    } 
                }
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
            user: u.user,
            partnerUserId: u.partnerUserId,
            partnerOfficer: u.pairedWith?.[0]?.character ? `${u.pairedWith[0].character.firstName} ${u.pairedWith[0].character.lastName}` : null,
            partnerUser: u.pairedWith?.[0]?.user || null,
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

            if (io) {
                io.emit('unit_on_duty', {
                    userId,
                    unitCallSign: unit.callSign
                });
            }

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
        
        console.log(`[updateStatusById] Emitting for userId: ${unit.userId}, status: ${status}, io exists: ${!!io}`);
        
        if (io) {
            console.log(`[updateStatusById] Emitting unit_status_changed event`);
            io.emit('unit_status_changed', {
                userId: unit.userId,
                status,
                unitCallSign: unit.callSign
            });
            console.log(`[updateStatusById] Event emitted`);
        } else {
            console.log(`[updateStatusById] IO IS NULL!`);
        }
        
        return { ...updatedUnit, characterId: unit.characterId, userId: unit.userId };
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
        const unit = await (prisma as any).unit.findUnique({
            where: { userId }
        });

        if (unit && io) {
            io.emit('unit_off_duty', {
                userId,
                unitCallSign: unit.callSign
            });
        }

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
                    type: 'supervisor_message',
                    title: `Message from Supervisor ${sender?.username || ''}`,
                    message,
                    isRead: false
                }
            });
        }

        // Emit socket event to target user only
        if (io) {
            const importMap = await import('../../server');
            const sessions = importMap.activeUserSessions;
            const targetSocketIds = sessions.get(targetUserId);
            
            if (targetSocketIds && targetSocketIds.size > 0) {
                for (const socketId of targetSocketIds) {
                    io.to(socketId).emit('supervisor_message', {
                        message,
                        from: sender?.username || 'Supervisor',
                        targetUserId
                    });
                }
                console.log(`[SupervisorMessage] Sent to target user ${targetUserId} sockets:`, Array.from(targetSocketIds));
            }
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
            const targetSocketIds = activeUserSessions.get(targetUserId);
            if (targetSocketIds && targetSocketIds.size > 0) {
                for (const socketId of targetSocketIds) {
                    io.to(socketId).emit('pair_invite', {
                        fromUserId: senderUserId,
                        fromCallSign: senderUnit?.callSign || 'Unknown'
                    });
                }
                console.log(`[PairInvite] Sent to target user ${targetUserId} sockets:`, Array.from(targetSocketIds));
            } else {
                // User not online - don't emit to everyone, just log
                console.log(`[PairInvite] Target user ${targetUserId} not online, invite stored but no socket notification`);
            }
        }

        return { success: true, message: 'Invite sent' };
    }

    static async acceptPairInvite(userId: number) {
        console.log(`[acceptPairInvite] userId: ${userId}`);
        const pendingInvite = (global as any).pendingPairInvites?.[userId];
        console.log(`[acceptPairInvite] pendingInvite:`, pendingInvite);
        
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

        console.log(`[acceptPairInvite] Linking user ${userId} with ${pendingInvite.fromUserId}`);

        // Generate combined badge - add +2 to the main unit's badge
        const badge1 = senderUnit?.callSign || senderUnit?.departmentMember?.badgeNumber || pendingInvite.fromUserId.toString();
        const badge2 = "";
        const combinedBadge = `${badge1}+2`;
        
        console.log(`[acceptPairInvite] Combined badge: ${combinedBadge}`);

        // Link both units with combined badge
        await (prisma as any).unit.update({
            where: { userId: pendingInvite.fromUserId },
            data: { partnerUserId: userId, callSign: combinedBadge }
        });

        await (prisma as any).unit.update({
            where: { userId },
            data: { partnerUserId: pendingInvite.fromUserId, callSign: combinedBadge }
        });

        // Clear pending invite
        delete (global as any).pendingPairInvites?.[userId];

        // Get both units' info for the frontend
        const receiverUnit = await (prisma as any).unit.findUnique({
            where: { userId },
            include: { character: true }
        });

        // Emit events to ALL clients to refresh unit list
        if (io) {
            io.emit('pair_formed', {
                userId1: pendingInvite.fromUserId,
                userId2: userId,
                partner1CallSign: senderUnit?.callSign,
                partner1Officer: senderUnit?.character ? `${senderUnit.character.firstName} ${senderUnit.character.lastName}` : senderUnit?.callSign,
                partner2CallSign: receiverUnit?.callSign,
                partner2Officer: receiverUnit?.character ? `${receiverUnit.character.firstName} ${receiverUnit.character.lastName}` : receiverUnit?.callSign
            });
            io.emit('unit_pair_update', { userId });
            io.emit('unit_pair_update', { userId: pendingInvite.fromUserId });
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
            io.emit('unit_pair_update', { userId });
            io.emit('unit_pair_update', { userId: partnerUserId });
        }

        return { success: true };
    }

    static async createPairDirectly(userId1: number, userId2: number, pairName: string) {
        const prisma = require('../../lib/prisma').default;

        console.log(`[createPairDirectly] Sending invite from userId1: ${userId1} to userId2: ${userId2}`);

        // Get both units with character and department info
        const unit1 = await prisma.unit.findUnique({ 
            where: { userId: userId1 },
            include: { 
                character: true,
                departmentMember: true
            }
        });
        const unit2 = await prisma.unit.findUnique({ 
            where: { userId: userId2 },
            include: { 
                character: true,
                departmentMember: true
            }
        });

        if (!unit1 || !unit2) {
            throw new Error('Both units must be on duty');
        }

        if (unit1.partnerUserId || unit2.partnerUserId) {
            throw new Error('One or both units are already in a pair');
        }

        // Store pending invite for userId2 (the one receiving the invite)
        if (!(global as any).pendingPairInvites) {
            (global as any).pendingPairInvites = {};
        }
        
        const badge1 = unit1.callSign || unit1.departmentMember?.badgeNumber || unit1.id.toString();
        (global as any).pendingPairInvites[userId2] = { 
            fromUserId: userId1, 
            timestamp: Date.now(),
            isDispatcherCreated: true,
            pairName: pairName || `${badge1}+2`
        };

        // Get the officer name for notification
        const officer1Name = unit1.character ? `${unit1.character.firstName} ${unit1.character.lastName}` : badge1;

        // Emit socket event to target user only
        if (io) {
            const targetSocketIds = activeUserSessions.get(userId2);
            if (targetSocketIds && targetSocketIds.size > 0) {
                for (const socketId of targetSocketIds) {
                    io.to(socketId).emit('pair_invite', {
                        fromUserId: userId1,
                        fromCallSign: badge1,
                        fromOfficerName: officer1Name,
                        isDispatcherCreated: true,
                        pairName: pairName || `${badge1}+2`
                    });
                }
                console.log(`[createPairDirectly] Invite sent to user ${userId2}`);
            } else {
                console.log(`[createPairDirectly] Target user ${userId2} not online, invite stored`);
            }
        }

        console.log(`[createPairDirectly] Invite created for pair: ${pairName || badge1 + '+2'}`);

        return { 
            success: true, 
            message: 'Invite sent',
            inviteToUserId: userId2,
            pairName: pairName || `${badge1}+2`
        };
    }
}

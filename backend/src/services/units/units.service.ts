import prisma from '../../lib/prisma';

export class UnitsService {
    static async getAllUnits() {
        const units = await (prisma as any).unit.findMany({
            include: {
                character: true,
                departmentMember: true
            }
        });

        // Map to frontend format
        return units.map((u: any) => ({
            unit: u.callSign || u.departmentMember.callSign || u.departmentMember.badgeNumber,
            officer: `${u.character.firstName} ${u.character.lastName}`,
            status: u.status,
            beat: u.beat || "N/A",
            call: "Available", // Simplified for now
            time: u.lastStatusAt.toLocaleTimeString(),
            nature: "None",
            location: "On Patrol",
            characterId: u.characterId
        }));
    }

    static async goOnDuty(
        characterId: number, 
        departmentMemberId: number, 
        callSign?: string,
        subdivision?: string,
        vehicleModel?: string,
        vehiclePlate?: string
    ) {
        // Upsert unit session
        const unit = await (prisma as any).unit.upsert({
            where: { characterId },
            update: {
                departmentMemberId,
                status: "Available",
                callSign,
                subdivision,
                vehicleModel,
                vehiclePlate,
                lastStatusAt: new Date()
            },
            create: {
                characterId,
                departmentMemberId,
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

        return {
            unit: unit.callSign || unit.departmentMember.callSign || unit.departmentMember.badgeNumber,
            officer: `${unit.character.firstName} ${unit.character.lastName}`,
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
    }

    static async updateStatus(characterId: number, status: string) {
        return await (prisma as any).unit.update({
            where: { characterId },
            data: { 
                status,
                lastStatusAt: new Date()
            }
        });
    }

    static async getCurrentUnit(userId: number) {
        const unit = await (prisma as any).unit.findFirst({
            where: {
                character: {
                    userId
                }
            },
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
            unit: unit.callSign || unit.departmentMember.callSign || unit.departmentMember.badgeNumber,
            officer: `${unit.character.firstName} ${unit.character.lastName}`,
            time: unit.lastStatusAt.toLocaleTimeString(),
            // Additional info for frontend state
            departmentMember: unit.departmentMember,
            characterId: unit.characterId.toString()
        };
    }

    static async goOffDuty(characterId: number) {
        return await (prisma as any).unit.delete({
            where: { characterId }
        });
    }
}

import prisma from '../../lib/prisma';

export class VehiclesService {
    static async getByCharacter(characterId: number) {
        return await (prisma as any).civilianVehicle.findMany({
            where: { characterId },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async register(data: { characterId: number; plate: string; model: string; color?: string; imageUrl?: string }) {
        return await (prisma as any).civilianVehicle.create({
            data: {
                characterId: data.characterId,
                plate: data.plate.toUpperCase(),
                model: data.model,
                color: data.color || 'Unknown',
                imageUrl: data.imageUrl
            }
        });
    }

    static async update(id: number, data: any) {
        return await (prisma as any).civilianVehicle.update({
            where: { id },
            data
        });
    }

    static async delete(id: number) {
        return await (prisma as any).civilianVehicle.delete({
            where: { id }
        });
    }
}

import prisma from '../../lib/prisma';

export class WeaponsService {
    static async getByCharacter(characterId: number) {
        return await (prisma as any).civilianWeapon.findMany({
            where: { characterId },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async register(data: { characterId: number; serial: string; model: string }) {
        return await (prisma as any).civilianWeapon.create({
            data: {
                characterId: data.characterId,
                serial: data.serial.toUpperCase(),
                model: data.model
            }
        });
    }

    static async update(id: number, data: any) {
        return await (prisma as any).civilianWeapon.update({
            where: { id },
            data
        });
    }

    static async delete(id: number) {
        return await (prisma as any).civilianWeapon.delete({
            where: { id }
        });
    }
}

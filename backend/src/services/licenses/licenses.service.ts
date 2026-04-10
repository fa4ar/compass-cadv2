import prisma from '../../lib/prisma';

export class LicensesService {
    static async getAvailableLicenses() {
        return (prisma as any).license.findMany({
            orderBy: { name: 'asc' }
        });
    }

    static async getCharacterLicenses(characterId: number) {
        return (prisma as any).characterLicense.findMany({
            where: { characterId },
            include: { license: true }
        });
    }

    static async addLicense(characterId: number, licenseId: number) {
        // Check if already has it
        const existing = await (prisma as any).characterLicense.findFirst({
            where: { characterId, licenseId }
        });

        if (existing) return existing;

        return (prisma as any).characterLicense.create({
            data: {
                characterId,
                licenseId,
                isActive: true
            },
            include: { license: true }
        });
    }

    static async removeLicense(characterId: number, licenseId: number) {
        return (prisma as any).characterLicense.deleteMany({
            where: { characterId, licenseId }
        });
    }
}

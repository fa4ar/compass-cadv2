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

    static async addLicense(characterId: number, licenseId: number, licenseData?: any) {
        // Check if license exists in database
        let license = await (prisma as any).license.findUnique({
            where: { id: licenseId }
        });

        // If license doesn't exist and licenseData is provided, create it
        if (!license && licenseData) {
            license = await (prisma as any).license.create({
                data: {
                    id: licenseId,
                    name: licenseData.name,
                    slug: licenseData.slug,
                    type: licenseData.category,
                    description: licenseData.description,
                    price: licenseData.price || 0
                }
            });
        }

        if (!license) {
            throw new Error('License not found and no data provided to create it');
        }

        // Check if character already has it
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

import prisma from '../../lib/prisma';

export class NCICService {
    static async search(criteria: {
        firstName?: string;
        lastName?: string;
        ssn?: string;
        plate?: string;
        weaponSerial?: string;
    }) {
        const { firstName, lastName, ssn, plate, weaponSerial } = criteria;

        // If plate is provided, find character by vehicle
        if (plate) {
            const vehicles = await (prisma as any).civilianVehicle.findMany({
                where: { plate: { equals: plate, mode: 'insensitive' } },
                include: {
                    character: {
                        include: {
                            vehicles: true,
                            weapons: true,
                            licenses: { include: { license: true } },
                            fines: {
                                include: {
                                    officer: { select: { firstName: true, lastName: true } }
                                },
                                orderBy: { issuedAt: 'desc' }
                            }
                        }
                    }
                }
            });
            return vehicles.map((v: any) => v.character);
        }

        // If weaponSerial is provided, find character by weapon
        if (weaponSerial) {
            const weapons = await (prisma as any).civilianWeapon.findMany({
                where: { serial: { equals: weaponSerial, mode: 'insensitive' } },
                include: {
                    character: {
                        include: {
                            vehicles: true,
                            weapons: true,
                            licenses: { include: { license: true } },
                            fines: {
                                include: {
                                    officer: { select: { firstName: true, lastName: true } }
                                },
                                orderBy: { issuedAt: 'desc' }
                            }
                        }
                    }
                }
            });
            return weapons.map((w: any) => w.character);
        }

        // Generic character search (Name or SSN)
        const where: any = {};
        if (firstName) where.firstName = { equals: firstName, mode: 'insensitive' };
        if (lastName) where.lastName = { equals: lastName, mode: 'insensitive' };
        if (ssn) where.ssn = { equals: ssn };

        if (Object.keys(where).length === 0) return [];

        return await (prisma as any).character.findMany({
            where,
            include: {
                vehicles: true,
                weapons: true,
                licenses: {
                    include: { license: true }
                },
                fines: {
                    include: {
                        officer: { select: { firstName: true, lastName: true } }
                    },
                    orderBy: { issuedAt: 'desc' }
                }
            }
        });
    }
}

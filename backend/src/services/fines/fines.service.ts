import prisma from '../../lib/prisma';

export class FinesService {
    static async createFine(data: {
        characterId: number;
        officerId?: number;
        amount: number;
        reason: string;
    }) {
        return await (prisma as any).fine.create({
            data: {
                characterId: data.characterId,
                officerId: data.officerId,
                amount: data.amount,
                reason: data.reason,
                status: 'unpaid',
                issuedAt: new Date()
            },
            include: {
                character: true,
                officer: { select: { firstName: true, lastName: true } }
            }
        });
    }

    static async getCharacterFines(characterId: number) {
        return await (prisma as any).fine.findMany({
            where: { characterId },
            include: {
                officer: { select: { firstName: true, lastName: true } }
            },
            orderBy: { issuedAt: 'desc' }
        });
    }

    static async payFine(fineId: number) {
        const fine = await (prisma as any).fine.findUnique({
            where: { id: fineId },
            include: { character: true }
        });

        if (!fine) throw new Error('Fine not found');
        if (fine.status === 'paid') throw new Error('Fine already paid');

        // Deduct from character balance
        if (fine.character.bankBalance < fine.amount) {
            throw new Error('Insufficient funds in bank balance');
        }

        return await prisma.$transaction([
            (prisma as any).character.update({
                where: { id: fine.characterId },
                data: { bankBalance: { decrement: fine.amount } }
            }),
            (prisma as any).fine.update({
                where: { id: fineId },
                data: { status: 'paid', paidAt: new Date() }
            })
        ]);
    }
}

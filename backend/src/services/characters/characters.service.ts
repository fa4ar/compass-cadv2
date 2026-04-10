import prisma from '../../lib/prisma';
import {AuthService} from "../auth.service";

interface CreateCharacterInput {
    userId: number;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    nickname?: string | null;
    birthDate: Date;
    gender: 'male' | 'female' | 'other';
    height?: number | null;
    weight?: number | null;
    description?: string | null;
    photoUrl?: string | null;
    status?: 'active' | 'suspended' | 'incarcerated' | 'deceased' | 'vacation';
    isAlive?: boolean;
    deathReason?: string | null;
    deathDate?: Date | null;
    ssn?: string | null;
}

interface UpdateCharacterInput {
    userId: number;
    characterId: number;
    firstName?: string;
    lastName?: string;
    middleName?: string | null;
    nickname?: string | null;
    birthDate?: Date;
    gender?: 'male' | 'female' | 'other';
    height?: number | null;
    weight?: number | null;
    description?: string | null;
    photoUrl?: string | null;
    status?: 'active' | 'suspended' | 'incarcerated' | 'deceased' | 'vacation';
    isAlive?: boolean;
    deathReason?: string | null;
    deathDate?: Date | null;
    ssn?: string | null;
}

export class CharactersService {
    private generateSSN(): string {
        const area = Math.floor(Math.random() * 899) + 100;
        const group = Math.floor(Math.random() * 99).toString().padStart(2, "0");
        const serial = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
        return `${area}-${group}-${serial}`;
    }

    async createcharacter(data: CreateCharacterInput) {
        const CreateChar = await prisma.character.create({
            data: {
                userId: data.userId,
                firstName: data.firstName,
                lastName: data.lastName,
                middleName: data.middleName || null,
                nickname: data.nickname || null,
                birthDate: data.birthDate,
                gender: data.gender,
                height: data.height || null,
                weight: data.weight || null,
                description: data.description || null,
                photoUrl: data.photoUrl || null,
                slug: `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}`,
                status: data.status || 'active',
                isAlive: typeof data.isAlive === 'boolean' ? data.isAlive : true,
                deathReason: data.deathReason || null,
                deathDate: data.deathDate || null,
                ssn: data.ssn || this.generateSSN(),
                bankBalance: 0,
                experience: 0,
                level: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        return CreateChar;
    }

    async getUserCharacters(userId: number) {
        return prisma.character.findMany({
            where: { userId },
            include: {
                departmentMembers: {
                    where: { isActive: true },
                    include: {
                        department: true,
                        rank: true
                    }
                },
                fines: {
                    include: {
                        officer: {
                            select: { firstName: true, lastName: true }
                        }
                    },
                    orderBy: { issuedAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateCharacter(data: UpdateCharacterInput) {
        const character = await prisma.character.findFirst({
            where: { id: data.characterId, userId: data.userId },
        });

        if (!character) {
            throw new Error('Character not found');
        }

        const nextFirstName = data.firstName ?? character.firstName;
        const nextLastName = data.lastName ?? character.lastName;
        const nextSlug =
            data.firstName || data.lastName
                ? `${nextFirstName.toLowerCase()}.${nextLastName.toLowerCase()}`
                : undefined;

        return prisma.character.update({
            where: { id: data.characterId },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                middleName: data.middleName,
                nickname: data.nickname,
                birthDate: data.birthDate,
                gender: data.gender,
                height: data.height,
                weight: data.weight,
                description: data.description,
                photoUrl: data.photoUrl,
                status: data.status,
                isAlive: data.isAlive,
                deathReason: data.deathReason,
                deathDate: data.deathDate,
                ssn: data.ssn,
                slug: nextSlug,
                updatedAt: new Date(),
            },
        });
    }
}

export const charactersService = new CharactersService();

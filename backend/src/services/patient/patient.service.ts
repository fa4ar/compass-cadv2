import prisma from '../../lib/prisma';

export class PatientService {
    static async search(query?: string, ssn?: string) {
        const where: any = { isActive: true };

        if (ssn) {
            where.ssn = ssn;
        } else if (query) {
            where.OR = [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { ssn: { contains: query, mode: 'insensitive' } },
                { phoneNumber: { contains: query, mode: 'insensitive' } }
            ];
        }

        return prisma.patient.findMany({
            where,
            orderBy: { lastName: 'asc' },
            take: 50
        });
    }

    static async getById(id: number) {
        return prisma.patient.findUnique({
            where: { id },
            include: {
                hospitalizations: {
                    orderBy: { admissionDate: 'desc' }
                },
                medicalRecords: {
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            }
        });
    }

    static async create(data: {
        characterId?: number | null;
        ssn?: string | null;
        firstName: string;
        lastName: string;
        middleName?: string | null;
        dateOfBirth?: Date | null;
        gender?: string | null;
        bloodType?: string | null;
        allergies?: string | null;
        chronicDiseases?: string | null;
        medications?: string | null;
        phoneNumber?: string | null;
        emergencyContact?: string | null;
        notes?: string | null;
    }) {
        return prisma.patient.create({
            data: {
                characterId: data.characterId,
                ssn: data.ssn,
                firstName: data.firstName,
                lastName: data.lastName,
                middleName: data.middleName,
                dateOfBirth: data.dateOfBirth,
                gender: data.gender,
                bloodType: data.bloodType,
                allergies: data.allergies,
                chronicDiseases: data.chronicDiseases,
                medications: data.medications,
                phoneNumber: data.phoneNumber,
                emergencyContact: data.emergencyContact,
                notes: data.notes
            }
        });
    }

    static async update(id: number, data: Partial<{
        firstName: string;
        lastName: string;
        middleName: string;
        dateOfBirth: Date;
        gender: string;
        bloodType: string;
        allergies: string;
        chronicDiseases: string;
        medications: string;
        phoneNumber: string;
        emergencyContact: string;
        notes: string;
        isActive: boolean;
    }>) {
        return prisma.patient.update({
            where: { id },
            data
        });
    }

    static async createHospitalization(patientId: number, data: {
        callId?: number | null;
        department?: string;
        ward?: string | null;
        bed?: string | null;
        diagnosis?: string | null;
        treatment?: string | null;
        notes?: string | null;
        admittedBy?: number | null;
    }) {
        return prisma.hospitalization.create({
            data: {
                patientId,
                callId: data.callId,
                department: data.department,
                ward: data.ward,
                bed: data.bed,
                diagnosis: data.diagnosis,
                treatment: data.treatment,
                notes: data.notes,
                admittedBy: data.admittedBy,
                status: 'admitted'
            }
        });
    }

    static async getHospitalizations(patientId: number) {
        return prisma.hospitalization.findMany({
            where: { patientId },
            orderBy: { admissionDate: 'desc' }
        });
    }

    static async createMedicalRecord(patientId: number, data: {
        hospitalizationId?: number | null;
        recordType: string;
        title: string;
        content: string;
        attachments?: string | null;
        authorId?: number | null;
        authorName?: string | null;
    }) {
        return prisma.medicalRecord.create({
            data: {
                patientId,
                hospitalizationId: data.hospitalizationId,
                recordType: data.recordType,
                title: data.title,
                content: data.content,
                attachments: data.attachments,
                authorId: data.authorId,
                authorName: data.authorName
            }
        });
    }

    static async getMedicalRecords(patientId: number) {
        return prisma.medicalRecord.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' }
        });
    }
}
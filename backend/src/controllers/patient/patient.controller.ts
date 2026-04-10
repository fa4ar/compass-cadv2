import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { PatientService } from '../../services/patient/patient.service';

export class PatientController {
    static search = async (req: AuthRequest, res: Response) => {
        try {
            const { q, ssn } = req.query;
            
            if (!q && !ssn) {
                return res.status(400).json({ error: 'Search query required (q or ssn)' });
            }

            const patients = await PatientService.search(
                q as string || undefined,
                ssn as string || undefined
            );

            res.json(patients);
        } catch (error: any) {
            console.error('Patient search error:', error);
            res.status(500).json({ error: error.message || 'Failed to search patients' });
        }
    };

    static getById = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const patient = await PatientService.getById(parseInt(id));

            if (!patient) {
                return res.status(404).json({ error: 'Patient not found' });
            }

            res.json(patient);
        } catch (error: any) {
            console.error('Patient get error:', error);
            res.status(500).json({ error: error.message || 'Failed to get patient' });
        }
    };

    static create = async (req: AuthRequest, res: Response) => {
        try {
            const {
                characterId,
                ssn,
                firstName,
                lastName,
                middleName,
                dateOfBirth,
                gender,
                bloodType,
                allergies,
                chronicDiseases,
                medications,
                phoneNumber,
                emergencyContact,
                notes
            } = req.body;

            if (!firstName || !lastName) {
                return res.status(400).json({ error: 'First name and last name are required' });
            }

            const patient = await PatientService.create({
                characterId: characterId || null,
                ssn: ssn || null,
                firstName,
                lastName,
                middleName: middleName || null,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                gender: gender || null,
                bloodType: bloodType || null,
                allergies: allergies || null,
                chronicDiseases: chronicDiseases || null,
                medications: medications || null,
                phoneNumber: phoneNumber || null,
                emergencyContact: emergencyContact || null,
                notes: notes || null
            });

            res.status(201).json(patient);
        } catch (error: any) {
            console.error('Patient create error:', error);
            res.status(500).json({ error: error.message || 'Failed to create patient' });
        }
    };

    static update = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const patient = await PatientService.update(parseInt(id), updateData);

            if (!patient) {
                return res.status(404).json({ error: 'Patient not found' });
            }

            res.json(patient);
        } catch (error: any) {
            console.error('Patient update error:', error);
            res.status(500).json({ error: error.message || 'Failed to update patient' });
        }
    };

    static createHospitalization = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const {
                callId,
                department,
                ward,
                bed,
                diagnosis,
                treatment,
                notes
            } = req.body;

            const hospitalization = await PatientService.createHospitalization(parseInt(id), {
                callId: callId || null,
                department: department || 'ER',
                ward: ward || null,
                bed: bed || null,
                diagnosis: diagnosis || null,
                treatment: treatment || null,
                notes: notes || null,
                admittedBy: req.user?.userId
            });

            res.status(201).json(hospitalization);
        } catch (error: any) {
            console.error('Hospitalization create error:', error);
            res.status(500).json({ error: error.message || 'Failed to create hospitalization' });
        }
    };

    static getHospitalizations = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const hospitalizations = await PatientService.getHospitalizations(parseInt(id));
            res.json(hospitalizations);
        } catch (error: any) {
            console.error('Hospitalizations get error:', error);
            res.status(500).json({ error: error.message || 'Failed to get hospitalizations' });
        }
    };

    static createMedicalRecord = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const {
                hospitalizationId,
                recordType,
                title,
                content,
                attachments
            } = req.body;

            if (!recordType || !title || !content) {
                return res.status(400).json({ error: 'Record type, title and content are required' });
            }

            const record = await PatientService.createMedicalRecord(parseInt(id), {
                hospitalizationId: hospitalizationId || null,
                recordType,
                title,
                content,
                attachments: attachments || null,
                authorId: req.user?.userId,
                authorName: req.user?.username
            });

            res.status(201).json(record);
        } catch (error: any) {
            console.error('Medical record create error:', error);
            res.status(500).json({ error: error.message || 'Failed to create medical record' });
        }
    };

    static getMedicalRecords = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const records = await PatientService.getMedicalRecords(parseInt(id));
            res.json(records);
        } catch (error: any) {
            console.error('Medical records get error:', error);
            res.status(500).json({ error: error.message || 'Failed to get medical records' });
        }
    };
}
import { Router, RequestHandler } from 'express';
import { PatientController } from '../controllers/patient/patient.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware as RequestHandler, PatientController.search);
router.get('/:id', authMiddleware as RequestHandler, PatientController.getById);
router.post('/', authMiddleware as RequestHandler, PatientController.create);
router.patch('/:id', authMiddleware as RequestHandler, PatientController.update);

router.post('/:id/hospitalizations', authMiddleware as RequestHandler, PatientController.createHospitalization);
router.get('/:id/hospitalizations', authMiddleware as RequestHandler, PatientController.getHospitalizations);

router.post('/:id/records', authMiddleware as RequestHandler, PatientController.createMedicalRecord);
router.get('/:id/records', authMiddleware as RequestHandler, PatientController.getMedicalRecords);

export default router;
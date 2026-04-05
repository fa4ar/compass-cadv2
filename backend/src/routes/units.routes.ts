import { Router, RequestHandler } from 'express';
import { UnitsController } from '../controllers/units/units.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Get active units
router.get('/', authMiddleware as RequestHandler, UnitsController.getUnits);

// Get my active unit
router.get('/me', authMiddleware as RequestHandler, UnitsController.getCurrentUnit);

// Go on duty (10-8)
router.post('/', authMiddleware as RequestHandler, UnitsController.goOnDuty);

// Update status
router.patch('/status', authMiddleware as RequestHandler, UnitsController.updateStatus);

// Go off duty
router.delete('/:characterId', authMiddleware as RequestHandler, UnitsController.goOffDuty);

export default router;

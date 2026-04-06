import { Router, RequestHandler } from 'express';
import { UnitsController } from '../controllers/units/units.controller';
import { authMiddleware, requireRoles } from '../middleware/auth.middleware';

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
router.delete('/', authMiddleware as RequestHandler, UnitsController.goOffDuty);

// Supervisor: send message to unit
router.post('/message', authMiddleware as RequestHandler, UnitsController.sendMessageToUnit);

// Supervisor: unassign unit from call
router.delete('/:userId/call', authMiddleware as RequestHandler, UnitsController.unassignFromCall);

// Pair patrol
router.post('/invite', authMiddleware as RequestHandler, UnitsController.inviteToPair);
router.post('/accept', authMiddleware as RequestHandler, UnitsController.acceptPairInvite);
router.delete('/leave', authMiddleware as RequestHandler, UnitsController.leavePair);

export default router;

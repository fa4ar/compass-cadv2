import { Router, RequestHandler } from 'express';
import { Calls911Control } from '../controllers/calls911/calls911.controller';
import { authMiddleware, requireRoles } from '../middleware/auth.middleware';

const router = Router();

router.post('/create', authMiddleware as RequestHandler, Calls911Control.create);
router.get('/active', [authMiddleware, requireRoles('dispatcher', 'police', 'ems', 'admin')] as any[], Calls911Control.getActive);
router.get('/my-calls', authMiddleware as RequestHandler, Calls911Control.getMyCalls);
router.patch('/:id', [authMiddleware, requireRoles('dispatcher', 'admin')] as any[], Calls911Control.update);
router.delete('/:id', [authMiddleware, requireRoles('dispatcher', 'admin')] as any[], Calls911Control.delete);
router.post('/:id/notes', authMiddleware as RequestHandler, Calls911Control.addNote);

export default router;

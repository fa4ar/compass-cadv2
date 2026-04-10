import { Router, RequestHandler } from 'express';
import { Calls911Control } from '../controllers/calls911/calls911.controller';
import { authMiddleware, authOrApiKeyMiddleware, requireRoles } from '../middleware/auth.middleware';

const router = Router();

router.post('/create', authOrApiKeyMiddleware as RequestHandler, Calls911Control.create);
router.get('/active', authOrApiKeyMiddleware as RequestHandler, Calls911Control.getActive);
router.get('/closed', authMiddleware as RequestHandler, Calls911Control.getClosed);
router.get('/my-calls', authMiddleware as RequestHandler, Calls911Control.getMyCalls);
router.patch('/:id', authMiddleware as RequestHandler, Calls911Control.update);
router.delete('/:id', authMiddleware as RequestHandler, Calls911Control.delete);
router.post('/:id/notes', authMiddleware as RequestHandler, Calls911Control.addNote);
router.post('/:id/attach', authMiddleware as RequestHandler, Calls911Control.attachUnit);
router.post('/detach', authMiddleware as RequestHandler, Calls911Control.detachUnit);
router.patch('/:id/main-unit', authMiddleware as RequestHandler, Calls911Control.setMainUnit);

export default router;

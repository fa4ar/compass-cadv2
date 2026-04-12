import { Router, RequestHandler } from 'express';
import { BOLOControl } from '../controllers/bolos/bolos.controller';
import { authMiddleware, requireRoles } from '../middleware/auth.middleware';

const router = Router();

router.post('/create', authMiddleware as RequestHandler, BOLOControl.create);
router.get('/active', authMiddleware as RequestHandler, BOLOControl.getActive);
router.get('/all', authMiddleware as RequestHandler, BOLOControl.getAll);
router.get('/:id', authMiddleware as RequestHandler, BOLOControl.getById);
router.patch('/:id', authMiddleware as RequestHandler, BOLOControl.update);
router.post('/:id/close', authMiddleware as RequestHandler, BOLOControl.close);
router.delete('/:id', authMiddleware as RequestHandler, BOLOControl.delete);

export default router;

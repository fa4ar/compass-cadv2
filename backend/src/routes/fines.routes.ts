import { Router, RequestHandler } from 'express';
import { FinesController } from '../controllers/fines/fines.controller';
import { authMiddleware, requireRoles } from '../middleware/auth.middleware';

const router = Router();

// Create a fine (only for LEO roles)
router.post('/', authMiddleware as RequestHandler, requireRoles('police', 'sheriff', 'trooper', 'admin') as RequestHandler, FinesController.create);

// Pay a fine
router.post('/:id/pay', authMiddleware as RequestHandler, FinesController.pay);

// Get fines for a specific character
router.get('/character/:characterId', authMiddleware as RequestHandler, FinesController.getByCharacter);

export default router;

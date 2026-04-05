import { Router, RequestHandler } from 'express';
import { NCICController } from '../controllers/ncic/ncic.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// NCIC Search
router.get('/search', authMiddleware as RequestHandler, NCICController.search);

export default router;

import { Router, RequestHandler } from 'express';
import { SettingsControl } from '../controllers/settings/settings.controller';
import { authMiddleware, requireRoles } from '../middleware/auth.middleware';

const router = Router();

router.get('/beta-test', authMiddleware as RequestHandler, SettingsControl.getBetaTest);
router.post('/beta-test', [authMiddleware, requireRoles('admin')] as any[], SettingsControl.setBetaTest);

export default router;

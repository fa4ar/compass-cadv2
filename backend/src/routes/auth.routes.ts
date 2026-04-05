import { Router } from 'express';
import { AuthController } from '../controllers/auth/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

router.get('/discord', authController.discordLogin);
router.get('/discord/callback', authController.discordCallback);

router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.me);

router.get('/api-id', authMiddleware, authController.getApiId);
router.post('/api-id/generate', authMiddleware, authController.generateApiId);

export default router;
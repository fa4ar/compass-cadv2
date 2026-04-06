import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { authService } from '../../services/auth.service';
import { discordService } from '../../services/discord.service';
import { jwtService, TokenPayload } from '../../services/jwt.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class AuthController {
    register = async (req: Request, res: Response) => {
        try {
            const { username, email, password } = req.body;
            const result = await authService.register({ username, email, password });
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;
            const result = await authService.login({ email, password });
            res.json(result);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    };

    refresh = async (req: Request, res: Response) => {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token required' });
            }
            const tokens = await authService.refreshToken(refreshToken);
            res.json(tokens);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    };

    logout = async (req: AuthRequest, res: Response) => {
        try {
            const { refreshToken } = req.body;
            if (!req.user || !refreshToken) {
                return res.status(400).json({ error: 'Invalid request' });
            }
            await authService.logout(req.user.userId, refreshToken);
            res.json({ message: 'Logged out successfully' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    me = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            // Получаем свежие данные пользователя из БД (включая discordId)
            const user = await prisma.user.findUnique({
                where: { id: req.user.userId },
                select: { 
                    id: true,
                    username: true,
                    email: true,
                    discordId: true,
                    avatarUrl: true 
                }
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Если привязан Дискорд - тянем СВЕЖИЕ роли прямо сейчас
            let freshRoles = req.user.roles;
            if (user.discordId) {
                try {
                    freshRoles = await discordService.getUserRoles(user.discordId);
                    console.log(`[AUTH-ME] Fresh roles for ${user.username} (${user.discordId}):`, freshRoles);
                } catch (discordErr) {
                    console.error(`[AUTH-ME] Failed to fetch fresh discord roles for ${user.id}:`, discordErr);
                    // Оставляем старые роли из токена, если дискорд упал
                }
            }
            
            res.json({ 
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatarUrl: user.avatarUrl,
                    roles: freshRoles,
                }
            });
        } catch (error: any) {
            console.error('[AUTH-ME] General error:', error);
            res.status(500).json({ error: error.message });
        }
    };

    discordLogin = async (req: Request, res: Response) => {
        try {
            const state = Math.random().toString(36).substring(7);
            const authUrl = discordService.getAuthUrl(state);
            res.json({ url: authUrl });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    discordCallback = async (req: Request, res: Response) => {
        try {
            const { code, error: oauthError } = req.query;

            if (oauthError) {
                return res.redirect(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/login?error=discord_auth_failed`);
            }

            if (!code || typeof code !== 'string') {
                return res.redirect(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/login?error=no_code`);
            }

            const accessToken = await discordService.exchangeCodeForToken(code);
            const discordUser = await discordService.getUser(accessToken);
            const { user, isNew } = await discordService.findOrCreateUser(discordUser);

            const roles = await discordService.getUserRoles(discordUser.id);
            console.log('Discord roles for user:', discordUser.id, roles);
            
            await discordService.syncUserRoles(discordUser.id, roles);

            const payload: TokenPayload = {
                userId: user.id,
                username: user.username,
                roles,
                avatarUrl: user.avatarUrl || undefined,
                discordId: user.discordId || undefined,
            };

            const tokens = jwtService.generateTokens(payload);

            const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/callback`);
            redirectUrl.searchParams.set('accessToken', tokens.accessToken);
            redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);
            if (isNew) redirectUrl.searchParams.set('newUser', 'true');

            res.redirect(redirectUrl.toString());
        } catch (error: any) {
            console.error('Discord callback error:', error);
            res.redirect(`${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/login?error=discord_auth_failed`);
        }
    };

    getApiId = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
            
            const user = await prisma.user.findUnique({
                where: { id: req.user.userId },
                select: { apiId: true }
            });
            
            res.json({ apiId: user?.apiId || null });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    generateApiId = async (req: AuthRequest, res: Response) => {
        try {
            if (!req.user) {
                console.log("[API-ID] Unauthorized attempt");
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            // Генерируем 12-значный случайный ID: CAD-XXXX-XXXX
            const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
            const newApiId = `CAD-${randomStr}`;
            
            console.log(`[API-ID] Generating new ID for user ${req.user.userId}: ${newApiId}`);
            
            await prisma.user.update({
                where: { id: req.user.userId },
                data: { apiId: newApiId }
            });
            
            res.json({ apiId: newApiId });
        } catch (error: any) {
            console.error('[API-ID] Error:', error);
            res.status(500).json({ error: error.message });
        }
    };
}
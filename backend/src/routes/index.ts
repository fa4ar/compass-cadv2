import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import charactersRoutes from "./characters.routes";
import usersRoutes from "./users.routes";
import calls911Routes from "./calls911.routes";
import departmentsRoutes from "./departments.routes";
import unitsRoutes from "./units.routes";
import ncicRoutes from "./ncic.routes";
import civilianRoutes from "./civilian.routes";
import fivemRoutes from "./fivem.routes";
import dispatcherRoutes from "./dispatcher.routes";
import finesRoutes from "./fines.routes";
import settingsRoutes from "./settings.routes";
import roleplayRoutes from "./roleplay.routes";
import roleplayDocsRoutes from "./roleplay-docs.routes";

import uploadRoutes from './upload.routes';
import patientRoutes from './patient.routes';
import departmentShiftsRoutes from './department-shifts.routes';

const router = Router();

const wrapWithBetaTest = (handler: Function) => {
    return async (req: any, res: Response, next: Function) => {
        try {
            const SettingsService = require('../services/settings/settings.service').SettingsService;
            const isBetaEnabled = await SettingsService.getBetaTestEnabled();
            
            if (!isBetaEnabled) {
                return handler(req, res, next);
            }

            const betaRoleId = await SettingsService.getBetaTestRoleId();
            if (!betaRoleId) {
                return handler(req, res, next);
            }

            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const prisma = require('../lib/prisma').default;
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { discordId: true }
            });

            if (!user?.discordId) {
                return res.status(403).json({ error: 'Access denied. Beta test mode is enabled.' });
            }

            try {
                const discordBotService = require('../services/discord-bot.service').discordBotService;
                const guild = await discordBotService.client.guilds.fetch(process.env.DISCORD_GUILD_ID);
                if (!guild) return handler(req, res, next);

                const member = await guild.members.fetch(user.discordId);
                if (!member) {
                    return res.status(403).json({ error: 'Access denied. This section is in BETA TEST mode.' });
                }

                if (!member.roles.cache.has(betaRoleId)) {
                    return res.status(403).json({ error: 'Access denied. This section is in BETA TEST mode and requires a special role.' });
                }
            } catch (e) {
                console.error('Beta role check error:', e);
            }

            return handler(req, res, next);
        } catch (error) {
            console.error('Beta test middleware error:', error);
            return handler(req, res, next);
        }
    };
};

router.use('/auth', authRoutes);
router.use('/characters', charactersRoutes);
router.use('/users', usersRoutes);
router.use('/calls911', calls911Routes);
router.use('/departments', departmentsRoutes);
router.use('/units', unitsRoutes);
router.use('/ncic', ncicRoutes);
router.use('/civilian', civilianRoutes);
router.use('/fivem', fivemRoutes);
router.use('/dispatcher', dispatcherRoutes);
router.use('/fines', finesRoutes);
router.use('/settings', settingsRoutes);
router.use('/roleplay', roleplayRoutes);
router.use('/roleplay', roleplayDocsRoutes);
router.use('/upload', uploadRoutes);
router.use('/patient', patientRoutes);
router.use('/department-shifts', departmentShiftsRoutes);

// Корневой эндпоинт API
router.get('/', (req: Request, res: Response) => {
    res.json({
        message: "API is running",
        version: "1.0.0",
        endpoints: {
            characters: "/api/characters",
            auth: "/api/auth",
            upload: "/api/upload",
            test: "GET /api/test"
        }
    });
});

export default router;
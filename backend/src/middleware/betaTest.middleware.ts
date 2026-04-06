import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SettingsService } from '../services/settings/settings.service';

export const betaTestMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const isBetaEnabled = await SettingsService.getBetaTestEnabled();
        
        if (!isBetaEnabled) {
            return next();
        }

        const betaRoleId = await SettingsService.getBetaTestRoleId();
        if (!betaRoleId) {
            return next();
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

        const hasBetaRole = await checkUserHasBetaRole(user.discordId, betaRoleId);
        
        if (!hasBetaRole) {
            return res.status(403).json({ 
                error: 'Access denied. This section is in BETA TEST mode and requires a special role.' 
            });
        }

        next();
    } catch (error) {
        console.error('Beta test middleware error:', error);
        next();
    }
};

async function checkUserHasBetaRole(discordId: string, roleId: string): Promise<boolean> {
    try {
        const prisma = require('../lib/prisma').default;
        const discord = require('../services/discord.service').discordService;
        
        const guild = await discord.client.guilds.fetch(process.env.DISCORD_GUILD_ID);
        if (!guild) return false;

        const member = await guild.members.fetch(discordId);
        if (!member) return false;

        return member.roles.cache.has(roleId);
    } catch (error) {
        console.error('Error checking beta role:', error);
        return false;
    }
}

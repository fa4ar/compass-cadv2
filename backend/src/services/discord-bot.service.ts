import { Client, GatewayIntentBits, Partials, Events, GuildMember, PartialGuildMember } from 'discord.js';
import { discordService } from './discord.service';
import prisma from '../lib/prisma';
import { getIO } from '../lib/socket';
import { activeUserSessions } from '../server';

class DiscordBotService {
    private client: Client;
    private isReady: boolean = false;

    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers
            ],
            partials: [Partials.GuildMember, Partials.User]
        });

        this.setupListeners();
    }

    private setupListeners() {
        this.client.on(Events.ClientReady, () => {
            console.log(`\n-----------------------------------------------------------`);
            console.log(`🤖 DISCORD BOT CONNECTED: ${this.client.user?.tag}`);
            console.log(`⚡️ Instant Role Sync is now RUNNING!`);
            console.log(`-----------------------------------------------------------\n`);
            this.isReady = true;
        });

        this.client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            try {
                // Игнорируем не наш сервер
                const targetGuildId = process.env.DISCORD_GUILD_ID;
                if (targetGuildId && newMember.guild.id !== targetGuildId) {
                    return;
                }

                console.log(`🔔 DISCORD EVENT: Member update for ${newMember.user.tag}`);

                // Ищем в БД по Discord ID
                const user = await (prisma.user as any).findUnique({
                    where: { discordId: newMember.id },
                    select: { id: true, discordId: true }
                });

                if (!user) return;

                // Синхронизируем роли в БД мгновенно
                const freshRoles = await discordService.syncUser(user.id, user.discordId);
                console.log(`⚡️ [INSTANT SYNC] New roles for ${newMember.user.tag}: [${freshRoles.join(', ')}]`);

                // СРАЗУ отправляем сигнал во все открытые вкладки браузера этого пользователя
                const socketIds = activeUserSessions.get(user.id);
                if (socketIds && socketIds.size > 0) {
                    const io = getIO();
                    for (const sid of socketIds) {
                        io.to(sid).emit('roles_updated', { roles: freshRoles });
                        console.log(`📡 [SIGNAL] Sent to browser session ${sid}`);
                    }
                }
            } catch (error) {
                console.error('❌ Discord bot error:', error);
            }
        });
    }

    public async connect() {
        const token = process.env.DISCORD_BOT_TOKEN;
        if (!token) return;

        try {
            console.log('🔌 [SYSTEM] Bot connection attempt...');
            await this.client.login(token);
        } catch (error: any) {
            console.error('❌ [BOT_ERROR] Login failed:', error?.message || error);
        }
    }
}

export const discordBotService = new DiscordBotService();

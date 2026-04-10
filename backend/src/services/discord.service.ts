import axios from 'axios';
import prisma from '../lib/prisma';

interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    global_name: string | null;
}

interface DiscordGuildMember {
    user: {
        id: string;
        username: string;
        global_name: string | null;
    };
    roles: string[];
    nick: string | null;
}

export class DiscordService {
    private clientId = process.env.DISCORD_CLIENT_ID || '';
    private clientSecret = process.env.DISCORD_CLIENT_SECRET || '';
    private redirectUri = process.env.DISCORD_REDIRECT_URI || '';
    private guildId = process.env.DISCORD_GUILD_ID || '';
    private roleMapping: Record<string, string> = this.parseRoleMapping();

    private parseRoleMapping(): Record<string, string> {
        try {
            let mapping = process.env.DISCORD_ROLE_MAPPING || '{}';
            mapping = mapping.replace(/'/g, '"').trim();
            console.log('Raw DISCORD_ROLE_MAPPING:', mapping);
            const parsed = JSON.parse(mapping);
            console.log('Parsed role mapping:', parsed);
            return parsed;
        } catch (e) {
            console.error('Failed to parse DISCORD_ROLE_MAPPING:', e);
            return {};
        }
    }

    getAuthUrl(state: string): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: 'identify email',
            state,
        });
        return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    }

    async exchangeCodeForToken(code: string): Promise<string> {
        const response = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.redirectUri,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        
        if (!response.data.access_token) {
            throw new Error('No access token received from Discord');
        }
        
        return response.data.access_token;
    }

    async getUser(accessToken: string): Promise<DiscordUser> {
        const response = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
    }

    async getGuildMember(accessToken: string): Promise<DiscordGuildMember | null> {
        try {
            const response = await axios.get(
                `https://discord.com/api/users/@me/guilds/${this.guildId}/member`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            return response.data;
        } catch {
            return null;
        }
    }

    async getUserRoles(discordId: string): Promise<string[]> {
        try {
            const botToken = process.env.DISCORD_BOT_TOKEN;
            if (!botToken) {
                console.warn('DISCORD_BOT_TOKEN not configured, cannot fetch roles');
                return ['citizen'];
            }

            const response = await axios.get(
                `https://discord.com/api/guilds/${this.guildId}/members/${discordId}`,
                { headers: { Authorization: `Bot ${botToken}` } }
            );

            const roleIds = response.data.roles || [];
            console.log('Discord role IDs for user:', discordId, roleIds);
            console.log('Role mapping:', this.roleMapping);
            
            return this.mapRolesToPermissions(roleIds);
        } catch (error) {
            console.error('Failed to fetch Discord roles:', error);
            return ['citizen'];
        }
    }

    private mapRolesToPermissions(discordRoleIds: string[]): string[] {
        const permissions: Set<string> = new Set(['citizen']);

        for (const [permission, discordRoleId] of Object.entries(this.roleMapping)) {
            if (discordRoleId && discordRoleIds.includes(discordRoleId)) {
                permissions.add(permission);
            }
        }

        return Array.from(permissions);
    }

    async findOrCreateUser(discordUser: DiscordUser): Promise<{ user: any; isNew: boolean }> {
        try {
            let user: any = await (prisma.user as any).findFirst({
                where: { discordId: discordUser.id },
                include: { characters: true },
            });

            let isNew = false;

            if (!user) {
                user = await (prisma.user as any).create({
                    data: {
                        username: discordUser.username,
                        email: `${discordUser.id}@discord.local`,
                        passwordHash: 'discord-oauth',
                        discordId: discordUser.id,
                        avatarUrl: discordUser.avatar
                            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
                            : null,
                    },
                    include: { characters: true },
                });
                isNew = true;
            }

            if (!user.characters || user.characters.length === 0) {
                const slug = `${discordUser.username}.citizen`.toLowerCase().replace(/\s+/g, '.');
                const character = await (prisma.character as any).create({
                    data: {
                        userId: user.id,
                        firstName: discordUser.global_name || discordUser.username,
                        lastName: 'Citizen',
                        birthDate: new Date('1990-01-01'),
                        slug,
                        gender: 'male',
                        status: 'active',
                        isAlive: true,
                        balance: 1000,
                        bankBalance: 0,
                        experience: 0,
                        level: 1,
                    },
                });
                user.characters = [character];
            }

            return { user, isNew };
        } catch (error: any) {
            console.error('findOrCreateUser error details:', {
                message: error.message,
                code: error.code,
                meta: error.meta,
                discordUser: {
                    id: discordUser.id,
                    username: discordUser.username,
                    global_name: discordUser.global_name
                }
            });
            throw error;
        }
    }

    async syncUserRoles(discordId: string, roles: string[]): Promise<void> {
        const user: any = await (prisma.user as any).findFirst({
            where: { discordId },
            include: { characters: true },
        });

        if (!user || !user.characters || user.characters.length === 0) return;

        const citizenCharacter = user.characters[0];

        const existingRoles = await prisma.characterRole.findMany({
            where: { characterId: citizenCharacter.id },
            include: { role: true },
        });

        const roleSlugs = existingRoles.map(r => r.role.slug);

        // Synchronize roles: Add new ones and REMOVE old ones that are managed by Discord
        for (const [permission, discordRoleId] of Object.entries(this.roleMapping)) {
            if (!discordRoleId) continue;

            const hasDiscordRole = roles.includes(permission);
            const hasCADRole = roleSlugs.includes(permission);

            if (hasDiscordRole && !hasCADRole) {
                // Add role
                const role = await prisma.role.findFirst({ where: { slug: permission } });
                if (role) {
                    await prisma.characterRole.create({
                        data: {
                            characterId: citizenCharacter.id,
                            roleId: role.id,
                            assignedBy: user.id || null,
                            isActive: true,
                        },
                    });
                }
            } else if (!hasDiscordRole && hasCADRole) {
                // Remove role
                const role = await prisma.role.findFirst({ where: { slug: permission } });
                if (role) {
                    await prisma.characterRole.deleteMany({
                        where: {
                            characterId: citizenCharacter.id,
                            roleId: role.id
                        },
                    });
                }
            }
        }
    }

    async syncUser(userId: number, discordId: string): Promise<string[]> {
        const roles = await this.getUserRoles(discordId);
        await this.syncUserRoles(discordId, roles);
        return roles;
    }
}

export const discordService = new DiscordService();
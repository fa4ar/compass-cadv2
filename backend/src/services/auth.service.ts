import prisma from '../lib/prisma';
import { bcryptService } from './bcrypt.service';
import { jwtService, TokenPayload } from './jwt.service';

interface RegisterData {
    username: string;
    email: string;
    password: string;
}

interface LoginData {
    email: string;
    password: string;
}

export class AuthService {
    async register(data: RegisterData) {
        // Проверка существующего пользователя
        const existing = await prisma.user.findFirst({
            where: {
                OR: [{ email: data.email }, { username: data.username }],
            },
        });

        if (existing) {
            throw new Error('User already exists');
        }

        // Хеширование пароля
        const passwordHash = await bcryptService.hash(data.password);

        // Создание пользователя
        const user = await prisma.user.create({
            data: {
                username: data.username,
                email: data.email,
                passwordHash,
            },
        });

        // Получение ролей пользователя (из CharacterRole через персонажей)
        const roles = await this.getUserRoles(user.id);

        // Генерация токенов
        const payload: TokenPayload = {
            userId: user.id,
            username: user.username,
            roles,
            avatarUrl: user.avatarUrl || undefined,
        };

        const tokens = jwtService.generateTokens(payload);

        // Сохранение refresh token
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: tokens.refreshToken },
        });

        // Создание сессии
        await this.createSession(user.id, tokens.refreshToken);

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatarUrl: user.avatarUrl,
                roles,
            },
            tokens,
        };
    }

    async login(data: LoginData) {
        const user = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (!user) {
            throw new Error('Invalid credentials');
        }

        if (user.isBanned) {
            throw new Error(`Account banned: ${user.banReason || 'No reason provided'}`);
        }

        const isValid = await bcryptService.compare(data.password, user.passwordHash);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        // Получение ролей
        const roles = await this.getUserRoles(user.id);

        // Генерация токенов
        const payload: TokenPayload = {
            userId: user.id,
            username: user.username,
            roles,
            avatarUrl: user.avatarUrl || undefined,
        };

        const tokens = jwtService.generateTokens(payload);

        // Обновление refresh token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                refreshToken: tokens.refreshToken,
                lastLogin: new Date(),
            },
        });

        // Создание сессии
        await this.createSession(user.id, tokens.refreshToken);

        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatarUrl: user.avatarUrl,
                isActive: user.isActive,
                roles,
            },
            tokens,
        };
    }

    async refreshToken(refreshToken: string) {
        const payload = jwtService.verifyRefreshToken(refreshToken);
        if (!payload) {
            throw new Error('Invalid refresh token');
        }

        // Проверка существования пользователя
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user || user.refreshToken !== refreshToken) {
            throw new Error('Invalid refresh token');
        }

        // Получение актуальных ролей
        const roles = await this.getUserRoles(user.id);

        const newPayload: TokenPayload = {
            userId: user.id,
            username: user.username,
            roles,
            avatarUrl: user.avatarUrl || undefined,
        };

        const tokens = jwtService.generateTokens(newPayload);

        // Обновление refresh token
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: tokens.refreshToken },
        });

        return tokens;
    }

    async logout(userId: number, refreshToken: string) {
        // Удаление сессии
        await prisma.session.deleteMany({
            where: {
                userId,
                token: refreshToken,
            },
        });

        // Очистка refresh token если нет других сессий
        const sessionsCount = await prisma.session.count({
            where: { userId },
        });

        if (sessionsCount === 0) {
            await prisma.user.update({
                where: { id: userId },
                data: { refreshToken: null },
            });
        }
    }

    private async getUserRoles(userId: number): Promise<string[]> {
        const roles = await prisma.characterRole.findMany({
            where: {
                character: { userId },
                isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            include: { role: true },
        });

        const roleSlugs = roles.map((r: any) => r.role.slug);
        
        return roleSlugs.length > 0 ? roleSlugs : ['citizen'];
    }

    private async createSession(userId: number, token: string) {
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 100);

        await prisma.session.create({
            data: {
                userId,
                token,
                expiresAt,
            },
        });
    }
}

export const authService = new AuthService();
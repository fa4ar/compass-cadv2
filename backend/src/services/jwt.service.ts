import '../env';
import jwt from 'jsonwebtoken';

export interface TokenPayload {
    userId: number;
    username: string;
    roles: string[];
    avatarUrl?: string;
    discordId?: string;
    characterId?: number;
    departmentId?: number;
}

export interface Tokens {
    accessToken: string;
    refreshToken: string;
}

export class JWTService {
    private accessSecret: string;
    private refreshSecret: string;
    private accessExpiresIn: number;
    private refreshExpiresIn: number;

    constructor() {
        if (!process.env.JWT_ACCESS_SECRET) {
            throw new Error('JWT_ACCESS_SECRET is not defined in environment variables');
        }
        if (!process.env.JWT_REFRESH_SECRET) {
            throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
        }

        this.accessSecret = process.env.JWT_ACCESS_SECRET;
        this.refreshSecret = process.env.JWT_REFRESH_SECRET;
        
        // 100 years in seconds
        const century = 100 * 365 * 24 * 60 * 60;
        this.accessExpiresIn = century;
        this.refreshExpiresIn = century;
    }

    generateTokens(payload: TokenPayload): Tokens {
        const accessToken = jwt.sign(
            { ...payload },
            this.accessSecret,
            { expiresIn: this.accessExpiresIn }
        );

        const refreshToken = jwt.sign(
            { ...payload },
            this.refreshSecret,
            { expiresIn: this.refreshExpiresIn }
        );

        return { accessToken, refreshToken };
    }

    verifyAccessToken(token: string): TokenPayload | null {
        try {
            const decoded = jwt.verify(token, this.accessSecret);
            return decoded as TokenPayload;
        } catch (error) {
            return null;
        }
    }

    verifyRefreshToken(token: string): TokenPayload | null {
        try {
            const decoded = jwt.verify(token, this.refreshSecret);
            return decoded as TokenPayload;
        } catch (error) {
            return null;
        }
    }

    refreshTokens(refreshToken: string): Tokens | null {
        const payload = this.verifyRefreshToken(refreshToken);
        if (!payload) return null;
        const cleanPayload = {
            userId: payload.userId,
            username: payload.username,
            roles: payload.roles,
            avatarUrl: payload.avatarUrl,
            discordId: payload.discordId,
            characterId: payload.characterId,
            departmentId: payload.departmentId
        };
        return this.generateTokens(cleanPayload);
    }
}

export const jwtService = new JWTService();
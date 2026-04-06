import { Request, Response, NextFunction } from 'express';
import { jwtService, TokenPayload } from '../services/jwt.service';

export interface AuthRequest extends Request {
    user?: TokenPayload;
}

export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        const payload = jwtService.verifyAccessToken(token);

        if (!payload) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

// Проверка ролей
export const requireRoles = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Case-insensitive role check - normalize both sides
        const userRoles = (req.user.roles || []).map((r: string) => r.toLowerCase());
        const allowedRolesLower = allowedRoles.map(r => r.toLowerCase());
        
        const hasRole = userRoles.some(role => allowedRolesLower.includes(role));

        if (!hasRole) {
            console.log(`[RBAC] Access denied. User roles: ${req.user.roles}, Required: ${allowedRoles}`);
            return res.status(403).json({ error: 'Forbidden' });
        }

        next();
    };
};

// Временная заглушка для department middleware (без prisma)
export const requireDepartment = (departmentType?: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // TODO: добавить реальную логику с prisma после настройки
        // Пока пропускаем
        next();
    };
};
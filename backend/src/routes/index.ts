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

import uploadRoutes from './upload.routes';

const router = Router();

// Подключаем маршруты
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
router.use('/upload', uploadRoutes);

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
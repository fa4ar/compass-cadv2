import { Request, Response, NextFunction } from 'express';
import { UnitsService } from '../../services/units/units.service';

export class UnitsController {
    static async getUnits(req: Request, res: Response, next: NextFunction) {
        try {
            const units = await UnitsService.getAllUnits();
            res.json(units);
        } catch (error) {
            next(error);
        }
    }

    static async getCurrentUnit(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.userId;
            const unit = await UnitsService.getCurrentUnit(Number(userId));
            res.json(unit);
        } catch (error) {
            next(error);
        }
    }

    static async goOnDuty(req: Request, res: Response, next: NextFunction) {
        try {
            const { characterId, departmentMemberId, callSign, subdivision, vehicleModel, vehiclePlate } = req.body;
            if (!characterId) {
                return res.status(400).json({ error: 'characterId is required' });
            }
            const unit = await UnitsService.goOnDuty(
                Number(characterId), 
                Number(departmentMemberId), 
                callSign,
                subdivision,
                vehicleModel,
                vehiclePlate
            );
            res.status(201).json(unit);
        } catch (error) {
            next(error);
        }
    }

    static async updateStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { characterId, status } = req.body;
            const unit = await UnitsService.updateStatus(Number(characterId), status);
            res.json(unit);
        } catch (error) {
            next(error);
        }
    }

    static async goOffDuty(req: Request, res: Response, next: NextFunction) {
        try {
            const { characterId } = req.params;
            await UnitsService.goOffDuty(Number(characterId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

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
            const userId = (req as any).user?.userId;
            const { characterId, departmentMemberId, callSign, subdivision, vehicleModel, vehiclePlate } = req.body;
            
            const unit = await UnitsService.goOnDuty(
                Number(userId),
                characterId ? Number(characterId) : null, 
                departmentMemberId ? Number(departmentMemberId) : null, 
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
            const userId = (req as any).user?.userId;
            const { characterId, userId: targetUserId, status } = req.body;
            
            console.log(`[updateStatus] userId from token: ${userId}`);
            console.log(`[updateStatus] characterId from body: ${characterId}`);
            console.log(`[updateStatus] targetUserId from body: ${targetUserId}`);
            console.log(`[updateStatus] status: ${status}`);
            
            // Dispatcher can update by characterId or userId, self can only update self
            const targetId = characterId || targetUserId;
            
            if (!targetId) {
                return res.status(400).json({ error: 'characterId or userId is required' });
            }

            // Find unit by characterId or userId
            const whereClause = characterId 
                ? { characterId: Number(characterId) } 
                : { userId: Number(targetUserId) };
            
            console.log(`[updateStatus] whereClause:`, whereClause);
            
            const unit = await UnitsService.updateStatusById(whereClause, status);
            console.log(`[updateStatus] Success, updated:`, unit);
            res.json(unit);
        } catch (error: any) {
            console.error('[updateStatus] Error:', error.message);
            next(error);
        }
    }

    static async goOffDuty(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.userId;
            await UnitsService.goOffDuty(Number(userId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    static async sendMessageToUnit(req: Request, res: Response, next: NextFunction) {
        try {
            const senderUserId = (req as any).user?.userId;
            const { targetUserId, message } = req.body;

            if (!targetUserId || !message) {
                return res.status(400).json({ error: 'Missing targetUserId or message' });
            }

            const result = await UnitsService.sendMessageToUnit(
                Number(senderUserId),
                Number(targetUserId),
                message
            );
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async unassignFromCall(req: Request, res: Response, next: NextFunction) {
        try {
            const targetUserId = parseInt(req.params.userId);
            if (isNaN(targetUserId)) {
                return res.status(400).json({ error: 'Invalid userId' });
            }

            const result = await UnitsService.unassignFromCall(targetUserId);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async inviteToPair(req: Request, res: Response, next: NextFunction) {
        try {
            const senderUserId = (req as any).user?.userId;
            const { targetUserId } = req.body;

            if (!targetUserId) {
                return res.status(400).json({ error: 'Missing targetUserId' });
            }

            const result = await UnitsService.inviteToPair(Number(senderUserId), Number(targetUserId));
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async acceptPairInvite(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.userId;
            console.log(`[acceptPairInvite controller] userId: ${userId}`);
            const result = await UnitsService.acceptPairInvite(Number(userId));
            res.json(result);
        } catch (error: any) {
            console.error('[acceptPairInvite] Error:', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    static async leavePair(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.userId;
            await UnitsService.leavePair(Number(userId));
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

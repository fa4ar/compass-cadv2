import { Request, Response, NextFunction } from 'express';
import { FinesService } from '../../services/fines/fines.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class FinesController {
    static async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { characterId, amount, reason, officerId } = req.body;
            
            if (!characterId || !amount || !reason) {
                return res.status(400).json({ error: 'Missing required fields (characterId, amount, reason)' });
            }

            const fine = await FinesService.createFine({
                characterId: Number(characterId),
                officerId: officerId ? Number(officerId) : undefined,
                amount: Number(amount),
                reason
            });

            res.status(201).json(fine);
        } catch (error) {
            next(error);
        }
    }

    static async pay(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await FinesService.payFine(Number(id));
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async getByCharacter(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { characterId } = req.params;
            const fines = await FinesService.getCharacterFines(Number(characterId));
            res.json(fines);
        } catch (error) {
            next(error);
        }
    }
}

import { Request, Response } from 'express';
import { WeaponsService } from '../../services/weapons/weapons.service';

export class WeaponsController {
    getByCharacter = async (req: Request, res: Response) => {
        try {
            const { characterId } = req.params;
            const weapons = await WeaponsService.getByCharacter(Number(characterId));
            res.json(weapons);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    register = async (req: Request, res: Response) => {
        try {
            const { characterId, serial, model } = req.body;
            const weapon = await WeaponsService.register({ characterId: Number(characterId), serial, model });
            res.status(201).json(weapon);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const weapon = await WeaponsService.update(Number(id), req.body);
            res.json(weapon);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await WeaponsService.delete(Number(id));
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}

export const WeaponsControl = new WeaponsController();

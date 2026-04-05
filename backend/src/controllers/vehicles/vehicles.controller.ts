import { Request, Response } from 'express';
import { VehiclesService } from '../../services/vehicles/vehicles.service';

export class VehiclesController {
    getByCharacter = async (req: Request, res: Response) => {
        try {
            const { characterId } = req.params;
            const vehicles = await VehiclesService.getByCharacter(Number(characterId));
            res.json(vehicles);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    register = async (req: Request, res: Response) => {
        try {
            const { characterId, plate, model, color } = req.body;
            const vehicle = await VehiclesService.register({ characterId: Number(characterId), plate, model, color });
            res.status(201).json(vehicle);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const vehicle = await VehiclesService.update(Number(id), req.body);
            res.json(vehicle);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await VehiclesService.delete(Number(id));
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}

export const VehiclesControl = new VehiclesController();

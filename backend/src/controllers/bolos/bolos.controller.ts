import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { BOLOService } from '../../services/bolos/bolos.service';
import { io } from '../../server';

export class BOLOController {
    create = async (req: AuthRequest, res: Response) => {
        try {
            const { type, description, details, plate, color, model, characterId, priority, expiresAt } = req.body;
            
            if (!type || !description) {
                return res.status(400).json({ error: 'Missing required fields: type, description' });
            }
            
            const createdBy = req.user?.userId;
            const creatorName = req.user?.username;

            if (!createdBy) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const newBOLO = await BOLOService.createBOLO({
                type,
                description,
                details,
                plate,
                color,
                model,
                characterId,
                createdBy,
                creatorName,
                priority,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            });
            
            res.status(201).json(newBOLO);
        } catch (error: any) {
            console.error("BOLOController create error:", error);
            res.status(500).json({ error: error.message || "Failed to create BOLO" });
        }
    };

    getActive = async (req: AuthRequest, res: Response) => {
        try {
            const bolos = await BOLOService.getActiveBOLOs();
            res.json(bolos);
        } catch (error: any) {
            console.error("BOLOController getActive error:", error);
            res.status(500).json({ error: error.message || "Failed to fetch active BOLOs" });
        }
    };

    getAll = async (req: AuthRequest, res: Response) => {
        try {
            const bolos = await BOLOService.getAllBOLOs();
            res.json(bolos);
        } catch (error: any) {
            console.error("BOLOController getAll error:", error);
            res.status(500).json({ error: error.message || "Failed to fetch BOLOs" });
        }
    };

    getById = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const bolo = await BOLOService.getBOLOById(Number(id));
            
            if (!bolo) {
                return res.status(404).json({ error: "BOLO not found" });
            }
            
            res.json(bolo);
        } catch (error: any) {
            console.error("BOLOController getById error:", error);
            res.status(500).json({ error: error.message || "Failed to fetch BOLO" });
        }
    };

    close = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { closeReason } = req.body;
            const closedBy = req.user?.userId;
            
            if (!closedBy) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            const bolo = await BOLOService.closeBOLO(Number(id), closedBy, closeReason);
            
            res.json(bolo);
        } catch (error: any) {
            console.error("BOLOController close error:", error);
            res.status(500).json({ error: error.message || "Failed to close BOLO" });
        }
    };

    update = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { type, description, details, plate, color, model, characterId, priority, expiresAt } = req.body;
            
            const bolo = await BOLOService.updateBOLO(Number(id), {
                type,
                description,
                details,
                plate,
                color,
                model,
                characterId,
                priority,
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            });
            
            res.json(bolo);
        } catch (error: any) {
            console.error("BOLOController update error:", error);
            res.status(500).json({ error: error.message || "Failed to update BOLO" });
        }
    };

    delete = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            await BOLOService.deleteBOLO(Number(id));
            
            res.status(204).send();
        } catch (error: any) {
            console.error("BOLOController delete error:", error);
            res.status(500).json({ error: error.message || "Failed to delete BOLO" });
        }
    };
}

export const BOLOControl = new BOLOController();

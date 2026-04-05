import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { Calls911Service } from '../../services/calls911/calls911.service';
import { io } from '../../server';

export class Calls911Controller {
    create = async (req: AuthRequest, res: Response) => {
        try {
            const { callerName, location, description } = req.body;
            const callerId = req.user?.userId;

            const newCall = await Calls911Service.createCall({
                callerId,
                callerName,
                location,
                description
            });
            
            // 🔥 Emit socket event
            io.emit('new_911_call', newCall);
            
            res.status(201).json(newCall);
        } catch (error: any) {
            console.error("Calls911Controller create error:", error);
            res.status(500).json({ error: error.message || "Failed to create 911 call" });
        }
    };

    getActive = async (req: AuthRequest, res: Response) => {
        try {
            const calls = await Calls911Service.getActiveCalls();
            res.json(calls);
        } catch (error: any) {
            console.error("Calls911Controller getActive error:", error);
            res.status(500).json({ error: error.message || "Failed to fetch 911 calls" });
        }
    };

    getMyCalls = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            const calls = await Calls911Service.getCallsByCaller(Number(userId));
            res.json(calls);
        } catch (error: any) {
            console.error("Calls911Controller getMyCalls error:", error);
            res.status(500).json({ error: error.message || "Failed to fetch your 911 calls" });
        }
    };

    update = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const updatedCall = await Calls911Service.updateCallStatus(Number(id), status);
            
            // 🔥 Emit socket event
            io.emit('update_911_call', updatedCall);
            
            res.json(updatedCall);
        } catch (error: any) {
            console.error("Calls911Controller update error:", error);
            res.status(500).json({ error: error.message || "Failed to update call" });
        }
    };

    addNote = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { text, author: bodyAuthor } = req.body;
            const author = bodyAuthor || req.user?.username || "Unknown";
            const note = await Calls911Service.addNote(Number(id), author, text);
            
            // 🔥 Emit socket event
            io.emit('new_911_note', { callId: Number(id), note });
            
            res.status(201).json(note);
        } catch (error: any) {
            console.error("Calls911Controller addNote error:", error);
            res.status(500).json({ error: error.message || "Failed to add note" });
        }
    };

    delete = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            await Calls911Service.deleteCall(Number(id));
            
            // 🔥 Emit socket event
            io.emit('delete_911_call', { id: Number(id) });
            
            res.status(204).send();
        } catch (error: any) {
            console.error("Calls911Controller delete error:", error);
            res.status(500).json({ error: error.message || "Failed to delete call" });
        }
    };
}

export const Calls911Control = new Calls911Controller();

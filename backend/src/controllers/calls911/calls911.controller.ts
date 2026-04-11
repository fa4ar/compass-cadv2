import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { Calls911Service } from '../../services/calls911/calls911.service';
import { io } from '../../server';

export class Calls911Controller {
    create = async (req: AuthRequest, res: Response) => {
        try {
            const { callerName, location, description, phoneNumber, type, priority, isEmergency, x, y, z, callType } = req.body;
            
            if (!callerName || !location || !description) {
                return res.status(400).json({ error: 'Missing required fields: callerName, location, description' });
            }
            
            const characterId = req.user?.userId;

            const userUsername = req.user?.username;
            const userDiscordId = req.user?.discordId;
            const userAvatarUrl = req.user?.avatarUrl;

            const newCall = await Calls911Service.createCall({
                callerId: characterId,
                callerName,
                location,
                description,
                phoneNumber,
                type: type || null,
                priority: priority || null,
                isEmergency: isEmergency || null,
                x: x || null,
                y: y || null,
                z: z || null,
                userUsername,
                userDiscordId,
                userAvatarUrl,
                callType: callType || 'police'
            });
            
            if (io) {
                // Use provided type/priority or detect from description
                const descLower = description?.toLowerCase() || '';
                let callType = type || 'other';
                let callPriority = priority || 'routine';
                
                if (!type) {
                    if (descLower.includes('дтп') || descLower.includes('авари') || descLower.includes('accident')) {
                        callType = 'traffic_accident';
                    } else if (descLower.includes('пожар') || descLower.includes('fire')) {
                        callType = 'fire';
                    } else if (descLower.includes('медицин') || descLower.includes('medical')) {
                        callType = 'medical';
                    } else if (descLower.includes('ограблен') || descLower.includes('robbery')) {
                        callType = 'robbery';
                    } else if (descLower.includes('нападен') || descLower.includes('assault')) {
                        callType = 'assault';
                    }
                }
                
                if (!priority && (isEmergency || descLower.includes('срочно') || descLower.includes('экстрен'))) {
                    callPriority = 'high';
                } else if (!priority && (descLower.includes('важно') || descLower.includes('средн'))) {
                    callPriority = 'medium';
                }
                
                io.emit('new_911_call', {
                    ...newCall,
                    type: callType || type || 'other',
                    callType: callType || 'police',
                    priority: callPriority,
                    isEmergency: (newCall as any).isEmergency,
                    createdAt: newCall.createdAt.getTime(),
                    phoneNumber: newCall.phoneNumber,
                    x: (newCall as any).x,
                    y: (newCall as any).y,
                    z: (newCall as any).z,
                    units: [],
                    mainUnitId: null
                });
            }
            
            res.status(201).json(newCall);
        } catch (error: any) {
            console.error("Calls911Controller create error:", error);
            res.status(500).json({ error: error.message || "Failed to create 911 call" });
        }
    };

    getClosed = async (req: AuthRequest, res: Response) => {
        try {
            const calls = await Calls911Service.getClosedCalls();
            res.json(calls);
        } catch (error: any) {
            console.error("Calls911Controller getClosed error:", error);
            res.status(500).json({ error: error.message || "Failed to fetch closed calls" });
        }
    };

    getActive = async (req: AuthRequest, res: Response) => {
        try {
            const calls = await Calls911Service.getActiveCalls();
            res.json({ calls });
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

    attachUnit = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            const result = await Calls911Service.attachUnit(Number(id), userId);
            
            io.emit('update_911_call', result[1]);
            
            res.json(result[1]);
        } catch (error: any) {
            console.error("Calls911Controller attachUnit error:", error);
            res.status(500).json({ error: error.message || "Failed to attach unit" });
        }
    };

    detachUnit = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            const result = await Calls911Service.detachUnit(userId);
            
            res.json(result);
        } catch (error: any) {
            console.error("Calls911Controller detachUnit error:", error);
            res.status(500).json({ error: error.message || "Failed to detach unit" });
        }
    };

    setMainUnit = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { userId } = req.body;
            
            const result = await Calls911Service.setMainUnit(Number(id), userId);
            
            io.emit('update_911_call', result);
            
            res.json(result);
        } catch (error: any) {
            console.error("Calls911Controller setMainUnit error:", error);
            res.status(500).json({ error: error.message || "Failed to set main unit" });
        }
    };
}

export const Calls911Control = new Calls911Controller();

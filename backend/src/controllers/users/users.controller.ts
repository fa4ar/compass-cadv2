import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { usersService } from '../../services/users/users.service';

export class UsersController {
    getProfile = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const profile = await usersService.getUserProfile(userId);
            if (!profile) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(profile);
        } catch (error: any) {
            console.error("UsersController getProfile error:", error);
            res.status(500).json({ error: error.message || "Failed to fetch profile" });
        }
    };

    updateProfile = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            const { username, avatarUrl, theme, uiProfiles } = req.body;
            const updated = await usersService.updateProfile(userId, { username, avatarUrl, theme, uiProfiles });
            res.json(updated);
        } catch (error: any) {
            console.error("UsersController updateProfile error:", error);
            res.status(500).json({ error: error.message || "Failed to update profile" });
        }
    };
}

export const UsersControl = new UsersController();

import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { SettingsService } from '../../services/settings/settings.service';

export class SettingsController {
    getBetaTest = async (req: AuthRequest, res: Response) => {
        try {
            const enabled = await SettingsService.getBetaTestEnabled();
            const roleId = await SettingsService.getBetaTestRoleId();
            res.json({ enabled, roleId });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    setBetaTest = async (req: AuthRequest, res: Response) => {
        try {
            const { enabled } = req.body;
            await SettingsService.setBetaTestEnabled(enabled);
            res.json({ success: true, enabled });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}

export const SettingsControl = new SettingsController();

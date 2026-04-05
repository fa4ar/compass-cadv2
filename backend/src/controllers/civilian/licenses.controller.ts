import { Request, Response } from 'express';
import { LicensesService } from '../../services/licenses/licenses.service';

export class LicensesController {
    getAvailable = async (req: Request, res: Response) => {
        try {
            const licenses = await LicensesService.getAvailableLicenses();
            res.json(licenses);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    getCharacterLicenses = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const licenses = await LicensesService.getCharacterLicenses(Number(id));
            res.json(licenses);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    addLicense = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { licenseId } = req.body;
            const license = await LicensesService.addLicense(Number(id), Number(licenseId));
            res.json(license);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };

    removeLicense = async (req: Request, res: Response) => {
        try {
            const { characterId, licenseId } = req.params;
            await LicensesService.removeLicense(Number(characterId), Number(licenseId));
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}

export const LicensesControl = new LicensesController();

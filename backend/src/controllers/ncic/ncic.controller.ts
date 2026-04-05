import { Request, Response, NextFunction } from 'express';
import { NCICService } from '../../services/ncic/ncic.service';

export class NCICController {
    static async search(req: Request, res: Response, next: NextFunction) {
        try {
            const { firstName, lastName, ssn, plate, weaponSerial } = req.query;
            
            const results = await NCICService.search({
                firstName: firstName as string,
                lastName: lastName as string,
                ssn: ssn as string,
                plate: plate as string,
                weaponSerial: weaponSerial as string
            });
            
            res.json(results);
        } catch (error) {
            next(error);
        }
    }
}

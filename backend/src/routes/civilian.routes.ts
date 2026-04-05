import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { VehiclesControl } from '../controllers/vehicles/vehicles.controller';
import { WeaponsControl } from '../controllers/weapons/weapons.controller';
import { LicensesControl } from '../controllers/civilian/licenses.controller';

const router = Router();

// Vehicles
router.get('/characters/:characterId/vehicles', authMiddleware, VehiclesControl.getByCharacter);
router.post('/vehicles', authMiddleware, VehiclesControl.register);
router.patch('/vehicles/:id', authMiddleware, VehiclesControl.update);
router.delete('/vehicles/:id', authMiddleware, VehiclesControl.delete);

// Weapons
router.get('/characters/:characterId/weapons', authMiddleware, WeaponsControl.getByCharacter);
router.post('/weapons', authMiddleware, WeaponsControl.register);
router.patch('/weapons/:id', authMiddleware, WeaponsControl.update);
router.delete('/weapons/:id', authMiddleware, WeaponsControl.delete);

// Licenses
router.get('/licenses', authMiddleware, LicensesControl.getAvailable);
router.get('/characters/:id/licenses', authMiddleware, LicensesControl.getCharacterLicenses);
router.post('/characters/:id/licenses', authMiddleware, LicensesControl.addLicense);
router.delete('/characters/:characterId/licenses/:licenseId', authMiddleware, LicensesControl.removeLicense);

export default router;

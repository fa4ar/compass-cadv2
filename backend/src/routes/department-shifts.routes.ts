import { Router } from 'express';
import { DepartmentShiftsController } from '../controllers/department-shifts/department-shifts.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Start a shift in a specific department
router.post('/start', DepartmentShiftsController.startShift);

// Force start a shift with optional progress preservation
router.post('/force-start', DepartmentShiftsController.forceStartShift);

// End a shift in a specific department
router.post('/end', DepartmentShiftsController.endShift);

// Get active shift for current user in a specific department
router.get('/active/:departmentType', DepartmentShiftsController.getActiveShift);

// Get all active shifts for current user across all departments
router.get('/my-shifts', DepartmentShiftsController.getMyShifts);

// Update shift status
router.post('/update-status', DepartmentShiftsController.updateStatus);

// Update shift progress
router.post('/update-progress', DepartmentShiftsController.updateProgress);

// Attach shift to a call
router.post('/attach-call', DepartmentShiftsController.attachToCall);

// Detach shift from a call
router.post('/detach-call', DepartmentShiftsController.detachFromCall);

// Get all active shifts by department (admin/dispatcher view)
router.get('/all/:departmentType?', DepartmentShiftsController.getAllShifts);

// Get shift activity logs
router.get('/:shiftId/logs', DepartmentShiftsController.getShiftLogs);

// Get shift history for a specific user (admin)
router.get('/history/:userId/:departmentType?', DepartmentShiftsController.getShiftHistory);

// Get current user's shift history
router.get('/my-history/:departmentType?', DepartmentShiftsController.getMyShiftHistory);

export default router;

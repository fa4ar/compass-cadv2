import { Request, Response } from 'express';
import { DepartmentShiftsService } from '../../services/department-shifts/department-shifts.service';

export class DepartmentShiftsController {
  /**
   * Start a shift in a specific department
   * POST /api/department-shifts/start
   */
  static async startShift(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { departmentType, characterId, departmentMemberId, callSign, subdivision, vehicleModel, vehiclePlate } = req.body;

      if (!departmentType) {
        return res.status(400).json({ error: 'departmentType is required' });
      }

      const ipAddress = req.ip;
      const shift = await DepartmentShiftsService.startShift(
        userId,
        departmentType,
        { characterId, departmentMemberId, callSign, subdivision, vehicleModel, vehiclePlate },
        ipAddress
      );

      res.json({ success: true, shift });
    } catch (error: any) {
      console.error('[DepartmentShiftsController] Error in startShift:', error);
      res.status(500).json({ error: error.message || 'Failed to start shift' });
    }
  }

  /**
   * Force start a shift with optional progress preservation
   * POST /api/department-shifts/force-start
   */
  static async forceStartShift(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { 
        departmentType, 
        characterId, 
        departmentMemberId, 
        callSign, 
        subdivision, 
        vehicleModel, 
        vehiclePlate,
        preserveProgress = true,
        reason
      } = req.body;

      if (!departmentType) {
        return res.status(400).json({ error: 'departmentType is required' });
      }

      const ipAddress = req.ip;
      const shift = await DepartmentShiftsService.forceStartShift(
        userId,
        departmentType,
        { 
          characterId, 
          departmentMemberId, 
          callSign, 
          subdivision, 
          vehicleModel, 
          vehiclePlate,
          preserveProgress,
          reason
        },
        ipAddress
      );

      res.json({ success: true, shift });
    } catch (error: any) {
      console.error('[DepartmentShiftsController] Error in forceStartShift:', error);
      res.status(500).json({ error: error.message || 'Failed to force start shift' });
    }
  }

  /**
   * End a shift in a specific department
   * POST /api/department-shifts/end
   */
  static async endShift(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { departmentType } = req.body;

      if (!departmentType) {
        return res.status(400).json({ error: 'departmentType is required' });
      }

      const ipAddress = req.ip;
      const result = await DepartmentShiftsService.endShift(userId, departmentType, ipAddress);

      res.json(result);
    } catch (error: any) {
      console.error('[DepartmentShiftsController] Error in endShift:', error);
      res.status(500).json({ error: error.message || 'Failed to end shift' });
    }
  }

  /**
   * Get active shift for a user in a specific department
   * GET /api/department-shifts/active/:departmentType
   */
  static async getActiveShift(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { departmentType } = req.params;

      const shift = await DepartmentShiftsService.getActiveShift(userId, departmentType);

      res.json({ success: true, shift });
    } catch (error: any) {
      console.error('[DepartmentShiftsController] Error in getActiveShift:', error);
      res.status(500).json({ error: error.message || 'Failed to get active shift' });
    }
  }

  /**
   * Get all active shifts for the current user across all departments
   * GET /api/department-shifts/my-shifts
   */
  static async getMyShifts(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const shifts = await DepartmentShiftsService.getAllActiveShifts(userId);

      res.json({ success: true, shifts });
    } catch (error: any) {
      console.error('[DepartmentShiftsController] Error in getMyShifts:', error);
      res.status(500).json({ error: error.message || 'Failed to get shifts' });
    }
  }

  /**
   * Update shift status
   * POST /api/department-shifts/update-status
   */
  static async updateStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { departmentType, status } = req.body;

      if (!departmentType || !status) {
        return res.status(400).json({ error: 'departmentType and status are required' });
      }

      const ipAddress = req.ip;
      const shift = await DepartmentShiftsService.updateShiftStatus(userId, departmentType, status, ipAddress);

      res.json({ success: true, shift });
    } catch (error: any) {
      console.error('[DepartmentShiftsController] Error in updateStatus:', error);
      res.status(500).json({ error: error.message || 'Failed to update status' });
    }
  }

  /**
   * Update shift progress
   * POST /api/department-shifts/update-progress
   */
  static async updateProgress(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { departmentType, progress } = req.body;

      if (!departmentType || !progress) {
        return res.status(400).json({ error: 'departmentType and progress are required' });
      }

      const updatedProgress = await DepartmentShiftsService.updateShiftProgress(userId, departmentType, progress);

      res.json({ success: true, progress: updatedProgress });
    } catch (error: any) {
      console.error('[DepartmentShiftsController] Error in updateProgress:', error);
      res.status(500).json({ error: error.message || 'Failed to update progress' });
    }
  }

  /**
   * Attach shift to a call
   * POST /api/department-shifts/attach-call
   */
  static async attachToCall(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { departmentType, callId } = req.body;

      if (!departmentType || !callId) {
        return res.status(400).json({ error: 'departmentType and callId are required' });
      }

      const ipAddress = req.ip;
      const shift = await DepartmentShiftsService.attachToCall(userId, departmentType, callId, ipAddress);

      res.json({ success: true, shift });
    } catch (error: any) {
      console.error('[DepartmentShiftsController] Error in attachToCall:', error);
      res.status(500).json({ error: error.message || 'Failed to attach to call' });
    }
  }

  /**
   * Detach shift from a call
   * POST /api/department-shifts/detach-call
   */
  static async detachFromCall(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { departmentType } = req.body;

      if (!departmentType) {
        return res.status(400).json({ error: 'departmentType is required' });
      }

      const ipAddress = req.ip;
      const shift = await DepartmentShiftsService.detachFromCall(userId, departmentType, ipAddress);

      res.json({ success: true, shift });
    } catch (error: any) {
      console.error('[DepartmentShiftsController] Error in detachFromCall:', error);
      res.status(500).json({ error: error.message || 'Failed to detach from call' });
    }
  }

  /**
   * Get all active shifts by department (admin/dispatcher view)
   * GET /api/department-shifts/all/:departmentType?
   */
  static async getAllShifts(req: Request, res: Response) {
    try {
      const { departmentType } = req.params;

      const shifts = await DepartmentShiftsService.getAllActiveShiftsByDepartment(departmentType);

      res.json({ success: true, shifts });
    } catch (error: any) {
      console.error('[DepartmentShiftsController] Error in getAllShifts:', error);
      res.status(500).json({ error: error.message || 'Failed to get shifts' });
    }
  }

  /**
   * Get shift activity logs
   * GET /api/department-shifts/:shiftId/logs
   */
  static async getShiftLogs(req: Request, res: Response) {
    try {
      const { shiftId } = req.params;
      const { limit } = req.query;

      const logs = await DepartmentShiftsService.getShiftActivityLogs(
        parseInt(shiftId),
        limit ? parseInt(limit as string) : 50
      );

      res.json({ success: true, logs });
    } catch (error: any) {
      console.error('[DepartmentShiftsController] Error in getShiftLogs:', error);
      res.status(500).json({ error: error.message || 'Failed to get shift logs' });
    }
  }

  /**
   * Get shift history for a user
   * GET /api/department-shifts/history/:userId/:departmentType?
   */
  static async getShiftHistory(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { departmentType } = req.params;
      const { limit } = req.query;

      const history = await DepartmentShiftsService.getShiftHistory(
        parseInt(userId),
        departmentType,
        limit ? parseInt(limit as string) : 50
      );

      res.json({ success: true, history });
    } catch (error: any) {
      console.error('[DepartmentShiftsController] Error in getShiftHistory:', error);
      res.status(500).json({ error: error.message || 'Failed to get shift history' });
    }
  }

  /**
   * Get current user's shift history
   * GET /api/department-shifts/my-history/:departmentType?
   */
  static async getMyShiftHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { departmentType } = req.params;
      const { limit } = req.query;

      const history = await DepartmentShiftsService.getShiftHistory(
        userId,
        departmentType,
        limit ? parseInt(limit as string) : 50
      );

      res.json({ success: true, history });
    } catch (error: any) {
      console.error('[DepartmentShiftsController] Error in getMyShiftHistory:', error);
      res.status(500).json({ error: error.message || 'Failed to get shift history' });
    }
  }
}

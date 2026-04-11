import prisma from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { io, activeUserSessions } from '../../server';

export interface ShiftProgress {
  callsHandled?: number;
  timeOnScene?: number;
  distanceTraveled?: number;
  arrestsMade?: number;
  patientsTreated?: number;
  [key: string]: any;
}

export interface ShiftStartOptions {
  characterId?: number | null;
  departmentMemberId?: number | null;
  callSign?: string;
  subdivision?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
}

export interface ForceShiftOptions extends ShiftStartOptions {
  preserveProgress: boolean;
  reason?: string;
}

export class DepartmentShiftsService {
  /**
   * Start a shift in a specific department (completely isolated from other departments)
   * This allows a user to have simultaneous shifts in different departments
   */
  static async startShift(
    userId: number,
    departmentType: string,
    options: ShiftStartOptions = {},
    ipAddress?: string
  ) {
    const { characterId, departmentMemberId, callSign, subdivision, vehicleModel, vehiclePlate } = options;

    console.log(`[DepartmentShiftsService] Starting ${departmentType} shift for userId: ${userId}`, {
      characterId,
      departmentMemberId,
      callSign
    });

    try {
      // Check if user already has an active shift in this specific department
      const existingShift = await prisma.departmentShift.findUnique({
        where: {
          userId_departmentType: {
            userId,
            departmentType
          }
        },
        include: {
          character: true,
          departmentMember: {
            include: {
              department: true,
              rank: true
            }
          }
        }
      });

      if (existingShift && existingShift.endedAt === null) {
        // Shift is already active - update it instead of creating new one
        const updatedShift = await prisma.departmentShift.update({
          where: { id: existingShift.id },
          data: {
            characterId: characterId || existingShift.characterId,
            departmentMemberId: departmentMemberId || existingShift.departmentMemberId,
            status: 'Available',
            callSign: callSign || existingShift.callSign,
            subdivision: subdivision || existingShift.subdivision,
            vehicleModel: vehicleModel || existingShift.vehicleModel,
            vehiclePlate: vehiclePlate || existingShift.vehiclePlate,
            lastStatusAt: new Date(),
            isForced: false,
            previousShiftData: Prisma.JsonNull
          },
          include: {
            character: true,
            departmentMember: {
              include: {
                department: true,
                rank: true
              }
            }
          }
        });

        // Log the shift update
        await this.logActivity(updatedShift.id, userId, 'SHIFT_UPDATED', 'Shift updated with new parameters', {
          oldData: existingShift,
          newData: updatedShift
        }, ipAddress);

        return this.formatShiftResponse(updatedShift);
      }

      // Create new shift
      const shift = await prisma.departmentShift.create({
        data: {
          userId,
          departmentType,
          characterId: characterId || null,
          departmentMemberId: departmentMemberId || null,
          status: 'Available',
          callSign,
          subdivision,
          vehicleModel,
          vehiclePlate,
          shiftProgress: {
            callsHandled: 0,
            timeOnScene: 0,
            distanceTraveled: 0
          }
        },
        include: {
          character: true,
          departmentMember: {
            include: {
              department: true,
              rank: true
            }
          }
        }
      });

      // Log the shift start
      await this.logActivity(shift.id, userId, 'START_SHIFT', 'Started new shift', null, ipAddress);

      // Emit socket event
      if (io) {
        io.emit('department_shift_started', {
          userId,
          departmentType,
          shiftId: shift.id,
          callSign: shift.callSign
        });
      }

      console.log(`[DepartmentShiftsService] ${departmentType} shift started successfully: ${shift.id}`);

      return this.formatShiftResponse(shift);
    } catch (error: any) {
      console.error(`[DepartmentShiftsService] Error in startShift:`, error);
      throw error;
    }
  }

  /**
   * Force start a shift in a department, overwriting any existing shift
   * with optional progress preservation
   */
  static async forceStartShift(
    userId: number,
    departmentType: string,
    options: ForceShiftOptions,
    ipAddress?: string
  ) {
    const { preserveProgress, reason = 'Force shift', ...shiftOptions } = options;

    console.log(`[DepartmentShiftsService] Force starting ${departmentType} shift for userId: ${userId}`, {
      preserveProgress,
      reason
    });

    try {
      // Get existing shift if it exists
      const existingShift = await prisma.departmentShift.findUnique({
        where: {
          userId_departmentType: {
            userId,
            departmentType
          }
        }
      });

      let previousShiftData: any = null;
      let shiftProgress = {
        callsHandled: 0,
        timeOnScene: 0,
        distanceTraveled: 0
      };

      if (existingShift) {
        if (preserveProgress && existingShift.shiftProgress) {
          // Preserve existing progress
          shiftProgress = {
            ...shiftProgress,
            ...(existingShift.shiftProgress as ShiftProgress)
          };
        }

        // Save previous shift data for history
        previousShiftData = {
          status: existingShift.status,
          callSign: existingShift.callSign,
          characterId: existingShift.characterId,
          departmentMemberId: existingShift.departmentMemberId,
          startedAt: existingShift.startedAt,
          shiftProgress: existingShift.shiftProgress
        };

        // End the existing shift
        await this.endShiftInternal(existingShift.id, 'force_switch', ipAddress);

        // Create history entry for the ended shift
        await this.createShiftHistory(existingShift, 'force_switch');
      }

      // Create new forced shift
      const shift = await prisma.departmentShift.create({
        data: {
          userId,
          departmentType,
          characterId: shiftOptions.characterId || null,
          departmentMemberId: shiftOptions.departmentMemberId || null,
          status: 'Available',
          callSign: shiftOptions.callSign,
          subdivision: shiftOptions.subdivision,
          vehicleModel: shiftOptions.vehicleModel,
          vehiclePlate: shiftOptions.vehiclePlate,
          shiftProgress,
          isForced: true,
          previousShiftData
        },
        include: {
          character: true,
          departmentMember: {
            include: {
              department: true,
              rank: true
            }
          }
        }
      });

      // Log the force shift
      await this.logActivity(shift.id, userId, 'FORCE_SWITCH', reason, {
        preservedProgress: preserveProgress,
        previousShiftData
      }, ipAddress);

      // Emit socket event
      if (io) {
        io.emit('department_shift_forced', {
          userId,
          departmentType,
          shiftId: shift.id,
          callSign: shift.callSign,
          reason
        });
      }

      console.log(`[DepartmentShiftsService] Force ${departmentType} shift started successfully: ${shift.id}`);

      return this.formatShiftResponse(shift);
    } catch (error: any) {
      console.error(`[DepartmentShiftsService] Error in forceStartShift:`, error);
      throw error;
    }
  }

  /**
   * End a shift in a specific department
   */
  static async endShift(userId: number, departmentType: string, ipAddress?: string) {
    console.log(`[DepartmentShiftsService] Ending ${departmentType} shift for userId: ${userId}`);

    try {
      const shift = await prisma.departmentShift.findUnique({
        where: {
          userId_departmentType: {
            userId,
            departmentType
          }
        }
      });

      if (!shift) {
        throw new Error(`No active ${departmentType} shift found for user`);
      }

      if (shift.endedAt !== null) {
        throw new Error(`Shift already ended`);
      }

      // End the shift
      await this.endShiftInternal(shift.id, 'normal', ipAddress);

      // Create history entry
      await this.createShiftHistory(shift, 'normal');

      // Emit socket event
      if (io) {
        io.emit('department_shift_ended', {
          userId,
          departmentType,
          shiftId: shift.id
        });
      }

      console.log(`[DepartmentShiftsService] ${departmentType} shift ended successfully: ${shift.id}`);

      return { success: true, message: `${departmentType} shift ended` };
    } catch (error: any) {
      console.error(`[DepartmentShiftsService] Error in endShift:`, error);
      throw error;
    }
  }

  /**
   * Get active shift for a user in a specific department
   * This is completely isolated - only checks the specified department
   */
  static async getActiveShift(userId: number, departmentType: string) {
    try {
      const shift = await prisma.departmentShift.findUnique({
        where: {
          userId_departmentType: {
            userId,
            departmentType
          }
        },
        include: {
          character: true,
          departmentMember: {
            include: {
              department: true,
              rank: true
            }
          },
          call: true
        }
      });

      if (!shift || shift.endedAt !== null) {
        return null;
      }

      return this.formatShiftResponse(shift);
    } catch (error: any) {
      console.error(`[DepartmentShiftsService] Error in getActiveShift:`, error);
      throw error;
    }
  }

  /**
   * Get all active shifts for a user across all departments
   */
  static async getAllActiveShifts(userId: number) {
    try {
      const shifts = await prisma.departmentShift.findMany({
        where: {
          userId,
          endedAt: null
        },
        include: {
          character: true,
          departmentMember: {
            include: {
              department: true,
              rank: true
            }
          },
          call: true
        }
      });

      return shifts.map(shift => this.formatShiftResponse(shift));
    } catch (error: any) {
      console.error(`[DepartmentShiftsService] Error in getAllActiveShifts:`, error);
      throw error;
    }
  }

  /**
   * Update shift status for a specific department
   */
  static async updateShiftStatus(
    userId: number,
    departmentType: string,
    status: string,
    ipAddress?: string
  ) {
    console.log(`[DepartmentShiftsService] Updating ${departmentType} shift status to ${status} for userId: ${userId}`);

    try {
      const shift = await prisma.departmentShift.update({
        where: {
          userId_departmentType: {
            userId,
            departmentType
          }
        },
        data: {
          status,
          lastStatusAt: new Date()
        },
        include: {
          character: true,
          departmentMember: {
            include: {
              department: true,
              rank: true
            }
          }
        }
      });

      // Log the status change
      await this.logActivity(shift.id, userId, 'STATUS_CHANGE', `Status changed to ${status}`, {
        newStatus: status
      }, ipAddress);

      // Emit socket event
      if (io) {
        io.emit('department_shift_status_changed', {
          userId,
          departmentType,
          status,
          shiftId: shift.id
        });
      }

      return this.formatShiftResponse(shift);
    } catch (error: any) {
      console.error(`[DepartmentShiftsService] Error in updateShiftStatus:`, error);
      throw error;
    }
  }

  /**
   * Update shift progress
   */
  static async updateShiftProgress(
    userId: number,
    departmentType: string,
    progress: Partial<ShiftProgress>
  ) {
    console.log(`[DepartmentShiftsService] Updating ${departmentType} shift progress for userId: ${userId}`, progress);

    try {
      const shift = await prisma.departmentShift.findUnique({
        where: {
          userId_departmentType: {
            userId,
            departmentType
          }
        }
      });

      if (!shift || shift.endedAt !== null) {
        throw new Error(`No active ${departmentType} shift found`);
      }

      const currentProgress = (shift.shiftProgress as ShiftProgress) || {};
      const updatedProgress = {
        ...currentProgress,
        ...progress
      };

      const updatedShift = await prisma.departmentShift.update({
        where: { id: shift.id },
        data: {
          shiftProgress: updatedProgress,
          lastStatusAt: new Date()
        }
      });

      return updatedProgress;
    } catch (error: any) {
      console.error(`[DepartmentShiftsService] Error in updateShiftProgress:`, error);
      throw error;
    }
  }

  /**
   * Attach shift to a call
   */
  static async attachToCall(
    userId: number,
    departmentType: string,
    callId: number,
    ipAddress?: string
  ) {
    console.log(`[DepartmentShiftsService] Attaching ${departmentType} shift to call ${callId} for userId: ${userId}`);

    try {
      const shift = await prisma.departmentShift.update({
        where: {
          userId_departmentType: {
            userId,
            departmentType
          }
        },
        data: {
          callId,
          status: 'OnScene',
          lastStatusAt: new Date()
        },
        include: {
          character: true,
          departmentMember: {
            include: {
              department: true,
              rank: true
            }
          }
        }
      });

      // Update progress
      await this.updateShiftProgress(userId, departmentType, {
        callsHandled: ((shift.shiftProgress as ShiftProgress)?.callsHandled || 0) + 1
      });

      // Log the attachment
      await this.logActivity(shift.id, userId, 'CALL_ATTACHED', `Attached to call ${callId}`, {
        callId
      }, ipAddress);

      // Emit socket event
      if (io) {
        io.emit('department_shift_attached_to_call', {
          userId,
          departmentType,
          shiftId: shift.id,
          callId
        });
      }

      return this.formatShiftResponse(shift);
    } catch (error: any) {
      console.error(`[DepartmentShiftsService] Error in attachToCall:`, error);
      throw error;
    }
  }

  /**
   * Detach shift from a call
   */
  static async detachFromCall(
    userId: number,
    departmentType: string,
    ipAddress?: string
  ) {
    console.log(`[DepartmentShiftsService] Detaching ${departmentType} shift from call for userId: ${userId}`);

    try {
      const shift = await prisma.departmentShift.update({
        where: {
          userId_departmentType: {
            userId,
            departmentType
          }
        },
        data: {
          callId: null,
          status: 'Available',
          lastStatusAt: new Date()
        },
        include: {
          character: true,
          departmentMember: {
            include: {
              department: true,
              rank: true
            }
          }
        }
      });

      // Log the detachment
      await this.logActivity(shift.id, userId, 'CALL_DETACHED', 'Detached from call', null, ipAddress);

      // Emit socket event
      if (io) {
        io.emit('department_shift_detached_from_call', {
          userId,
          departmentType,
          shiftId: shift.id
        });
      }

      return this.formatShiftResponse(shift);
    } catch (error: any) {
      console.error(`[DepartmentShiftsService] Error in detachFromCall:`, error);
      throw error;
    }
  }

  /**
   * Get all active shifts across all departments (for admin/dispatcher)
   */
  static async getAllActiveShiftsByDepartment(departmentType?: string) {
    try {
      const where: any = {
        endedAt: null
      };

      if (departmentType) {
        where.departmentType = departmentType;
      }

      const shifts = await prisma.departmentShift.findMany({
        where,
        include: {
          character: true,
          departmentMember: {
            include: {
              department: true,
              rank: true
            }
          },
          call: true,
          user: {
            select: {
              username: true,
              avatarUrl: true
            }
          }
        },
        orderBy: {
          startedAt: 'desc'
        }
      });

      return shifts.map(shift => this.formatShiftResponse(shift));
    } catch (error: any) {
      console.error(`[DepartmentShiftsService] Error in getAllActiveShiftsByDepartment:`, error);
      throw error;
    }
  }

  /**
   * Get shift activity logs
   */
  static async getShiftActivityLogs(shiftId: number, limit = 50) {
    try {
      const logs = await prisma.shiftActivityLog.findMany({
        where: { departmentShiftId: shiftId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return logs;
    } catch (error: any) {
      console.error(`[DepartmentShiftsService] Error in getShiftActivityLogs:`, error);
      throw error;
    }
  }

  /**
   * Get shift history for a user
   */
  static async getShiftHistory(userId: number, departmentType?: string, limit = 50) {
    try {
      const where: any = { userId };

      if (departmentType) {
        where.departmentType = departmentType;
      }

      const history = await prisma.shiftHistory.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit
      });

      return history;
    } catch (error: any) {
      console.error(`[DepartmentShiftsService] Error in getShiftHistory:`, error);
      throw error;
    }
  }

  // ============ PRIVATE HELPER METHODS ============

  private static async endShiftInternal(shiftId: number, endReason: string, ipAddress?: string) {
    const shift = await prisma.departmentShift.findUnique({
      where: { id: shiftId }
    });

    if (!shift) {
      throw new Error('Shift not found');
    }

    const endedShift = await prisma.departmentShift.update({
      where: { id: shiftId },
      data: {
        endedAt: new Date(),
        status: 'Offline'
      }
    });

    // Log the shift end
    await this.logActivity(shiftId, shift.userId, 'END_SHIFT', `Shift ended: ${endReason}`, {
      endReason,
      duration: endedShift.endedAt!.getTime() - shift.startedAt.getTime()
    }, ipAddress);

    return endedShift;
  }

  private static async createShiftHistory(shift: any, endReason: string) {
    const duration = shift.endedAt 
      ? Math.floor((shift.endedAt.getTime() - shift.startedAt.getTime()) / 1000)
      : null;

    const progress = shift.shiftProgress as ShiftProgress || {};

    await prisma.shiftHistory.create({
      data: {
        userId: shift.userId,
        departmentType: shift.departmentType,
        characterId: shift.characterId,
        departmentMemberId: shift.departmentMemberId,
        startedAt: shift.startedAt,
        endedAt: shift.endedAt,
        duration,
        callsHandled: progress.callsHandled || 0,
        timeOnScene: progress.timeOnScene,
        endReason,
        shiftData: {
          status: shift.status,
          callSign: shift.callSign,
          subdivision: shift.subdivision,
          vehicleModel: shift.vehicleModel,
          vehiclePlate: shift.vehiclePlate,
          shiftProgress: shift.shiftProgress
        }
      }
    });
  }

  private static async logActivity(
    shiftId: number,
    userId: number,
    action: string,
    description: string,
    metadata: any = null,
    ipAddress?: string
  ) {
    try {
      await prisma.shiftActivityLog.create({
        data: {
          departmentShiftId: shiftId,
          userId,
          action,
          description,
          metadata: metadata as any,
          ipAddress
        }
      });
    } catch (error) {
      console.error(`[DepartmentShiftsService] Error logging activity:`, error);
      // Don't throw - logging errors shouldn't break the main flow
    }
  }

  private static formatShiftResponse(shift: any) {
    return {
      id: shift.id,
      userId: shift.userId,
      departmentType: shift.departmentType,
      status: shift.status,
      callSign: shift.callSign || shift.departmentMember?.callSign || shift.departmentMember?.badgeNumber || shift.id.toString(),
      subdivision: shift.subdivision,
      vehicleModel: shift.vehicleModel,
      vehiclePlate: shift.vehiclePlate,
      callId: shift.callId,
      characterId: shift.characterId,
      character: shift.character ? `${shift.character.firstName} ${shift.character.lastName}` : null,
      departmentMember: shift.departmentMember,
      startedAt: shift.startedAt,
      lastStatusAt: shift.lastStatusAt,
      endedAt: shift.endedAt,
      shiftProgress: shift.shiftProgress,
      isForced: shift.isForced,
      previousShiftData: shift.previousShiftData,
      call: shift.call
    };
  }
}

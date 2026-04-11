import prisma from '../../lib/prisma';
import { io } from '../../server';

/**
 * Call Signs Management Service
 * Handles saving, restoring, and logging of unit call signs for paired patrols
 */
export class CallSignsService {
  /**
   * Generate a unique patrol ID for a paired patrol
   */
  private static generatePatrolId(userId1: number, userId2: number): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `PATROL-${userId1}-${userId2}-${timestamp}-${random}`;
  }

  /**
   * Generate a temporary call sign for paired patrol
   */
  private static generateTemporaryCallSign(unit1CallSign: string, unit2CallSign: string, customCallSign?: string): string {
    if (customCallSign && customCallSign.trim()) {
      return customCallSign.trim();
    }
    // Format: UNIT1+UNIT2 (e.g., 1A-12+1B-34)
    return `${unit1CallSign}+${unit2CallSign}`;
  }

  /**
   * Log a call sign operation
   */
  private static async logCallSignOperation(
    userId: number,
    unitId: number,
    patrolId: string | null,
    operation: string,
    oldCallSign: string | null,
    newCallSign: string | null,
    reason?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await prisma.callSignLog.create({
        data: {
          userId,
          unitId,
          patrolId,
          operation,
          oldCallSign,
          newCallSign,
          reason,
          ipAddress
        }
      });
      console.log(`[CallSignLog] Logged ${operation} for userId: ${userId}, unitId: ${unitId}`);
    } catch (error) {
      console.error('[CallSignLog] Failed to log operation:', error);
      // Don't throw error - logging failure shouldn't break the main operation
    }
  }

  /**
   * Save original call signs and apply temporary call signs when creating a paired patrol
   */
  static async saveAndApplyTemporaryCallSigns(
    userId1: number,
    userId2: number,
    customCallSign?: string,
    ipAddress?: string
  ): Promise<{ patrolId: string; temporaryCallSign: string }> {
    try {
      console.log(`[CallSignsService] Saving call signs for patrol: userId1: ${userId1}, userId2: ${userId2}`);

      // Get both units
      const unit1 = await prisma.unit.findUnique({ where: { userId: userId1 } });
      const unit2 = await prisma.unit.findUnique({ where: { userId: userId2 } });

      if (!unit1 || !unit2) {
        throw new Error('Both units must exist');
      }

      // Check for manual override flag
      if (unit1.callSignOverride || unit2.callSignOverride) {
        console.warn('[CallSignsService] One or both units have manual call sign override, skipping automatic save');
        throw new Error('Cannot override manually set call signs');
      }

      // Generate patrol ID
      const patrolId = this.generatePatrolId(userId1, userId2);

      // Save original call signs
      const originalCallSign1 = unit1.callSign;
      const originalCallSign2 = unit2.callSign;

      // Generate temporary call sign
      const badge1 = unit1.callSign || unit1.id.toString();
      const badge2 = unit2.callSign || unit2.id.toString();
      const temporaryCallSign = this.generateTemporaryCallSign(badge1, badge2, customCallSign);

      console.log(`[CallSignsService] Patrol ID: ${patrolId}, Temporary call sign: ${temporaryCallSign}`);

      // Update unit1
      await prisma.unit.update({
        where: { userId: userId1 },
        data: {
          originalCallSign: originalCallSign1,
          callSign: temporaryCallSign,
          patrolId: patrolId
        }
      });

      // Log operation for unit1
      await this.logCallSignOperation(
        userId1,
        unit1.id,
        patrolId,
        'SAVE',
        originalCallSign1,
        temporaryCallSign,
        'Paired patrol created',
        ipAddress
      );

      // Update unit2
      await prisma.unit.update({
        where: { userId: userId2 },
        data: {
          originalCallSign: originalCallSign2,
          callSign: temporaryCallSign,
          patrolId: patrolId
        }
      });

      // Log operation for unit2
      await this.logCallSignOperation(
        userId2,
        unit2.id,
        patrolId,
        'SAVE',
        originalCallSign2,
        temporaryCallSign,
        'Paired patrol created',
        ipAddress
      );

      return { patrolId, temporaryCallSign };
    } catch (error) {
      console.error('[CallSignsService] Failed to save and apply temporary call signs:', error);
      throw error;
    }
  }

  /**
   * Restore original call signs when disbanding a paired patrol
   */
  static async restoreOriginalCallSigns(
    userId1: number,
    userId2: number,
    reason: string = 'Patrol disbanded',
    ipAddress?: string
  ): Promise<void> {
    try {
      console.log(`[CallSignsService] Restoring call signs for patrol: userId1: ${userId1}, userId2: ${userId2}`);

      // Get both units
      const unit1 = await prisma.unit.findUnique({ where: { userId: userId1 } });
      const unit2 = await prisma.unit.findUnique({ where: { userId: userId2 } });

      // Handle unit1
      if (unit1 && unit1.originalCallSign && !unit1.callSignOverride) {
        const patrolId = unit1.patrolId;
        const oldCallSign = unit1.callSign;

        await prisma.unit.update({
          where: { userId: userId1 },
          data: {
            callSign: unit1.originalCallSign,
            originalCallSign: null,
            patrolId: null
          }
        });

        // Log operation
        await this.logCallSignOperation(
          userId1,
          unit1.id,
          patrolId,
          'RESTORE',
          oldCallSign,
          unit1.originalCallSign,
          reason,
          ipAddress
        );

        console.log(`[CallSignsService] Restored call sign for userId: ${userId1} from ${oldCallSign} to ${unit1.originalCallSign}`);
      } else if (unit1) {
        // Unit doesn't have original call sign or has manual override
        await prisma.unit.update({
          where: { userId: userId1 },
          data: {
            originalCallSign: null,
            patrolId: null
          }
        });
        console.log(`[CallSignsService] Cleared patrol data for userId: ${userId1} (no restore needed)`);
      }

      // Handle unit2
      if (unit2 && unit2.originalCallSign && !unit2.callSignOverride) {
        const patrolId = unit2.patrolId;
        const oldCallSign = unit2.callSign;

        await prisma.unit.update({
          where: { userId: userId2 },
          data: {
            callSign: unit2.originalCallSign,
            originalCallSign: null,
            patrolId: null
          }
        });

        // Log operation
        await this.logCallSignOperation(
          userId2,
          unit2.id,
          patrolId,
          'RESTORE',
          oldCallSign,
          unit2.originalCallSign,
          reason,
          ipAddress
        );

        console.log(`[CallSignsService] Restored call sign for userId: ${userId2} from ${oldCallSign} to ${unit2.originalCallSign}`);
      } else if (unit2) {
        // Unit doesn't have original call sign or has manual override
        await prisma.unit.update({
          where: { userId: userId2 },
          data: {
            originalCallSign: null,
            patrolId: null
          }
        });
        console.log(`[CallSignsService] Cleared patrol data for userId: ${userId2} (no restore needed)`);
      }

    } catch (error) {
      console.error('[CallSignsService] Failed to restore original call signs:', error);
      throw error;
    }
  }

  /**
   * Restore call sign for a single unit (for edge cases like unit going off duty)
   */
  static async restoreSingleUnitCallSign(
    userId: number,
    reason: string = 'Unit left patrol',
    ipAddress?: string
  ): Promise<void> {
    try {
      console.log(`[CallSignsService] Restoring call sign for single unit: userId: ${userId}`);

      const unit = await prisma.unit.findUnique({ where: { userId } });

      if (!unit) {
        console.warn(`[CallSignsService] Unit not found for userId: ${userId}`);
        return;
      }

      if (unit.originalCallSign && !unit.callSignOverride) {
        const patrolId = unit.patrolId;
        const oldCallSign = unit.callSign;

        await prisma.unit.update({
          where: { userId },
          data: {
            callSign: unit.originalCallSign,
            originalCallSign: null,
            patrolId: null
          }
        });

        // Log operation
        await this.logCallSignOperation(
          userId,
          unit.id,
          patrolId,
          'RESTORE',
          oldCallSign,
          unit.originalCallSign,
          reason,
          ipAddress
        );

        console.log(`[CallSignsService] Restored call sign for userId: ${userId} from ${oldCallSign} to ${unit.originalCallSign}`);
      } else {
        // Clear patrol data even if no restore needed
        await prisma.unit.update({
          where: { userId },
          data: {
            originalCallSign: null,
            patrolId: null
          }
        });
        console.log(`[CallSignsService] Cleared patrol data for userId: ${userId} (no restore needed)`);
      }
    } catch (error) {
      console.error('[CallSignsService] Failed to restore single unit call sign:', error);
      // Don't throw - this is for edge cases and shouldn't break the flow
    }
  }

  /**
   * Handle manual call sign override
   */
  static async setManualCallSignOverride(
    userId: number,
    newCallSign: string,
    reason: string = 'Manual override',
    ipAddress?: string
  ): Promise<void> {
    try {
      console.log(`[CallSignsService] Setting manual call sign override for userId: ${userId}, newCallSign: ${newCallSign}`);

      const unit = await prisma.unit.findUnique({ where: { userId } });

      if (!unit) {
        throw new Error('Unit not found');
      }

      const oldCallSign = unit.callSign;

      await prisma.unit.update({
        where: { userId },
        data: {
          callSign: newCallSign,
          callSignOverride: true
        }
      });

      // Log operation
      await this.logCallSignOperation(
        userId,
        unit.id,
        unit.patrolId,
        'OVERRIDE',
        oldCallSign,
        newCallSign,
        reason,
        ipAddress
      );

      console.log(`[CallSignsService] Manual override set for userId: ${userId}`);
    } catch (error) {
      console.error('[CallSignsService] Failed to set manual call sign override:', error);
      throw error;
    }
  }

  /**
   * Clear manual call sign override
   */
  static async clearManualCallSignOverride(userId: number, ipAddress?: string): Promise<void> {
    try {
      console.log(`[CallSignsService] Clearing manual call sign override for userId: ${userId}`);

      const unit = await prisma.unit.findUnique({ where: { userId } });

      if (!unit) {
        throw new Error('Unit not found');
      }

      await prisma.unit.update({
        where: { userId },
        data: {
          callSignOverride: false
        }
      });

      console.log(`[CallSignsService] Manual override cleared for userId: ${userId}`);
    } catch (error) {
      console.error('[CallSignsService] Failed to clear manual call sign override:', error);
      throw error;
    }
  }

  /**
   * Get call sign logs for a unit or patrol
   */
  static async getCallSignLogs(filters: { userId?: number; unitId?: number; patrolId?: string }) {
    try {
      const where: any = {};
      if (filters.userId) where.userId = filters.userId;
      if (filters.unitId) where.unitId = filters.unitId;
      if (filters.patrolId) where.patrolId = filters.patrolId;

      const logs = await prisma.callSignLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      return logs;
    } catch (error) {
      console.error('[CallSignsService] Failed to get call sign logs:', error);
      throw error;
    }
  }
}

/**
 * Coordinate Utility Service (Backend)
 * Handles coordinate transformations and validation for the backend
 */

/**
 * Game coordinates from FiveM
 */
export interface GameCoordinates {
  x: number;
  y: number;
  z: number;
  heading?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Calibration constants (matching frontend)
 */
export const CALIBRATION = {
  SCALE_Y: 0.505,
  SCALE_X: 0.59,
  OFFSET_Y: -2217,
  OFFSET_X: -208,
};

/**
 * Validate game coordinates
 */
export function validateGameCoordinates(coords: GameCoordinates): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof coords.x !== 'number' || isNaN(coords.x)) {
    errors.push('X coordinate must be a valid number');
  }
  if (typeof coords.y !== 'number' || isNaN(coords.y)) {
    errors.push('Y coordinate must be a valid number');
  }
  if (typeof coords.z !== 'number' || isNaN(coords.z)) {
    errors.push('Z coordinate must be a valid number');
  }

  // GTA V map bounds
  if (coords.x < -4500 || coords.x > 4500) {
    warnings.push('X coordinate is outside typical map bounds');
  }
  if (coords.y < -4500 || coords.y > 8000) {
    warnings.push('Y coordinate is outside typical map bounds');
  }
  if (coords.z < -500 || coords.z > 2000) {
    warnings.push('Z coordinate is outside typical map bounds');
  }

  if (coords.heading !== undefined) {
    if (typeof coords.heading !== 'number' || isNaN(coords.heading)) {
      errors.push('Heading must be a valid number');
    } else if (coords.heading < 0 || coords.heading > 360) {
      warnings.push('Heading should be between 0 and 360 degrees');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate distance between two coordinates in meters
 */
export function calculateDistance(coords1: GameCoordinates, coords2: GameCoordinates): number {
  const dx = coords2.x - coords1.x;
  const dy = coords2.y - coords1.y;
  const dz = coords2.z - coords1.z;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(coords: GameCoordinates, precision: number = 2): string {
  return `X: ${coords.x.toFixed(precision)}, Y: ${coords.y.toFixed(precision)}, Z: ${coords.z.toFixed(precision)}`;
}

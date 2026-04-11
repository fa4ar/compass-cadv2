/**
 * Coordinate Utility Service
 * Handles coordinate transformations, validation, and utility functions
 */

import { GameCoordinates, MapCoordinates, CalibrationConfig, ValidationResult } from '@/types/coordinates';

/**
 * Default calibration constants (from LiveMap.tsx)
 */
export const DEFAULT_CALIBRATION: CalibrationConfig = {
  SCALE_Y: 0.505,
  SCALE_X: 0.59,
  OFFSET_Y: -2217,
  OFFSET_X: -208,
};

/**
 * Convert game coordinates (x, y, z) to map coordinates (lat, lng, alt)
 * @param gameCoords - Game coordinates from FiveM
 * @param calibration - Calibration configuration
 * @returns Map coordinates for Leaflet
 */
export function gameToMap(
  gameCoords: GameCoordinates,
  calibration: CalibrationConfig = DEFAULT_CALIBRATION
): MapCoordinates {
  const lat = (gameCoords.y * calibration.SCALE_Y) + calibration.OFFSET_Y;
  const lng = (gameCoords.x * calibration.SCALE_X) + calibration.OFFSET_X;
  const alt = gameCoords.z || 0;

  return { lat, lng, alt };
}

/**
 * Convert map coordinates (lat, lng) back to game coordinates (x, y)
 * @param mapCoords - Map coordinates from Leaflet
 * @param calibration - Calibration configuration
 * @returns Game coordinates for FiveM
 */
export function mapToGame(
  mapCoords: MapCoordinates,
  calibration: CalibrationConfig = DEFAULT_CALIBRATION
): GameCoordinates {
  const y = (mapCoords.lat - calibration.OFFSET_Y) / calibration.SCALE_Y;
  const x = (mapCoords.lng - calibration.OFFSET_X) / calibration.SCALE_X;
  const z = mapCoords.alt || 0;

  return { x, y, z };
}

/**
 * Validate game coordinates
 * @param coords - Game coordinates to validate
 * @returns Validation result with errors and warnings
 */
export function validateGameCoordinates(coords: GameCoordinates): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if coordinates are numbers
  if (typeof coords.x !== 'number' || isNaN(coords.x)) {
    errors.push('X coordinate must be a valid number');
  }
  if (typeof coords.y !== 'number' || isNaN(coords.y)) {
    errors.push('Y coordinate must be a valid number');
  }
  if (typeof coords.z !== 'number' || isNaN(coords.z)) {
    errors.push('Z coordinate must be a valid number');
  }

  // Check for reasonable bounds (GTA V map bounds)
  if (coords.x < -4500 || coords.x > 4500) {
    warnings.push('X coordinate is outside typical map bounds');
  }
  if (coords.y < -4500 || coords.y > 8000) {
    warnings.push('Y coordinate is outside typical map bounds');
  }
  if (coords.z < -500 || coords.z > 2000) {
    warnings.push('Z coordinate is outside typical map bounds');
  }

  // Check heading if provided
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
 * Validate map coordinates
 * @param coords - Map coordinates to validate
 * @returns Validation result with errors and warnings
 */
export function validateMapCoordinates(coords: MapCoordinates): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if coordinates are numbers
  if (typeof coords.lat !== 'number' || isNaN(coords.lat)) {
    errors.push('Latitude must be a valid number');
  }
  if (typeof coords.lng !== 'number' || isNaN(coords.lng)) {
    errors.push('Longitude must be a valid number');
  }

  // Check for reasonable bounds (based on calibration)
  if (coords.lat < -4500 || coords.lat > 2000) {
    warnings.push('Latitude is outside typical map bounds');
  }
  if (coords.lng < -3000 || coords.lng > 2500) {
    warnings.push('Longitude is outside typical map bounds');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate distance between two game coordinates in meters
 * @param coords1 - First coordinate
 * @param coords2 - Second coordinate
 * @returns Distance in meters
 */
export function calculateDistance(coords1: GameCoordinates, coords2: GameCoordinates): number {
  const dx = coords2.x - coords1.x;
  const dy = coords2.y - coords1.y;
  const dz = coords2.z - coords1.z;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate distance between two map coordinates
 * @param coords1 - First coordinate
 * @param coords2 - Second coordinate
 * @returns Distance in meters
 */
export function calculateMapDistance(coords1: MapCoordinates, coords2: MapCoordinates): number {
  const dx = coords2.lng - coords1.lng;
  const dy = coords2.lat - coords1.lat;
  
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalize heading to 0-360 range
 * @param heading - Heading in degrees
 * @returns Normalized heading
 */
export function normalizeHeading(heading: number): number {
  let normalized = heading % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized;
}

/**
 * Calculate bearing between two coordinates
 * @param from - Starting coordinate
 * @param to - Ending coordinate
 * @returns Bearing in degrees
 */
export function calculateBearing(from: GameCoordinates, to: GameCoordinates): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  const bearing = Math.atan2(dx, dy) * (180 / Math.PI);
  return normalizeHeading(bearing);
}

/**
 * Check if coordinates are within a radius
 * @param center - Center coordinate
 * @param point - Point to check
 * @param radius - Radius in meters
 * @returns True if point is within radius
 */
export function isWithinRadius(
  center: GameCoordinates,
  point: GameCoordinates,
  radius: number
): boolean {
  return calculateDistance(center, point) <= radius;
}

/**
 * Format coordinates for display
 * @param coords - Coordinates to format
 * @param precision - Number of decimal places
 * @returns Formatted string
 */
export function formatCoordinates(coords: GameCoordinates | MapCoordinates, precision: number = 2): string {
  if ('x' in coords) {
    // Game coordinates
    return `X: ${coords.x.toFixed(precision)}, Y: ${coords.y.toFixed(precision)}, Z: ${coords.z.toFixed(precision)}`;
  } else {
    // Map coordinates
    return `Lat: ${coords.lat.toFixed(precision)}, Lng: ${coords.lng.toFixed(precision)}`;
  }
}

/**
 * Create a coordinate hash for caching
 * @param coords - Coordinates to hash
 * @returns Hash string
 */
export function coordinateHash(coords: GameCoordinates | MapCoordinates): string {
  if ('x' in coords) {
    return `${coords.x.toFixed(4)},${coords.y.toFixed(4)},${coords.z.toFixed(4)}`;
  } else {
    return `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
  }
}

/**
 * Round coordinates to specified precision
 * @param coords - Coordinates to round
 * @param precision - Number of decimal places
 * @returns Rounded coordinates
 */
export function roundCoordinates(
  coords: GameCoordinates | MapCoordinates,
  precision: number = 2
): GameCoordinates | MapCoordinates {
  const factor = Math.pow(10, precision);
  
  if ('x' in coords) {
    return {
      x: Math.round(coords.x * factor) / factor,
      y: Math.round(coords.y * factor) / factor,
      z: Math.round(coords.z * factor) / factor,
      heading: coords.heading !== undefined 
        ? Math.round(coords.heading * factor) / factor 
        : undefined,
    };
  } else {
    return {
      lat: Math.round(coords.lat * factor) / factor,
      lng: Math.round(coords.lng * factor) / factor,
      alt: coords.alt !== undefined 
        ? Math.round(coords.alt * factor) / factor 
        : undefined,
    };
  }
}

/**
 * Check if two coordinates are approximately equal
 * @param coords1 - First coordinate
 * @param coords2 - Second coordinate
 * @param tolerance - Tolerance in meters
 * @returns True if coordinates are within tolerance
 */
export function areCoordinatesEqual(
  coords1: GameCoordinates | MapCoordinates,
  coords2: GameCoordinates | MapCoordinates,
  tolerance: number = 1.0
): boolean {
  if ('x' in coords1 && 'x' in coords2) {
    return calculateDistance(coords1, coords2) <= tolerance;
  } else if ('lat' in coords1 && 'lat' in coords2) {
    return calculateMapDistance(coords1, coords2) <= tolerance;
  }
  return false;
}

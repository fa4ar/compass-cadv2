/**
 * Coordinate Validation Middleware
 * Validates incoming coordinates from FiveM and API requests
 */

import { Request, Response, NextFunction } from 'express';
import { validateGameCoordinates, GameCoordinates } from '../lib/coordinates';

/**
 * Middleware to validate game coordinates in request body
 */
export function validateCoordinates(req: Request, res: Response, next: NextFunction) {
  const { x, y, z } = req.body;

  // If coordinates are not provided, skip validation
  if (x === undefined || y === undefined || z === undefined) {
    return next();
  }

  const coords: GameCoordinates = { x, y, z, heading: req.body.heading };
  const validation = validateGameCoordinates(coords);

  if (!validation.isValid) {
    console.error('[CoordinateValidation] Invalid coordinates:', validation.errors);
    return res.status(400).json({
      error: 'Invalid coordinates',
      details: validation.errors,
    });
  }

  if (validation.warnings.length > 0) {
    console.warn('[CoordinateValidation] Coordinate warnings:', validation.warnings);
  }

  // Attach validation result to request for later use
  req.body.coordinateValidation = validation;
  next();
}

/**
 * Middleware to validate coordinates specifically for 911 calls
 */
export function validateCallCoordinates(req: Request, res: Response, next: NextFunction) {
  const { x, y, z } = req.body;

  // For calls, coordinates are optional
  if (x === undefined && y === undefined && z === undefined) {
    return next();
  }

  // If partial coordinates provided, require all three
  if (x === undefined || y === undefined || z === undefined) {
    return res.status(400).json({
      error: 'Partial coordinates provided. Provide all X, Y, Z coordinates or none.',
    });
  }

  const coords: GameCoordinates = { x, y, z };
  const validation = validateGameCoordinates(coords);

  if (!validation.isValid) {
    console.error('[CallCoordinateValidation] Invalid call coordinates:', validation.errors);
    return res.status(400).json({
      error: 'Invalid call coordinates',
      details: validation.errors,
    });
  }

  if (validation.warnings.length > 0) {
    console.warn('[CallCoordinateValidation] Call coordinate warnings:', validation.warnings);
  }

  req.body.coordinateValidation = validation;
  next();
}

/**
 * Middleware to validate coordinates for unit blips
 */
export function validateBlipCoordinates(req: Request, res: Response, next: NextFunction) {
  const { blips } = req.body;

  if (!blips || !Array.isArray(blips)) {
    return next();
  }

  const invalidBlips: number[] = [];

  blips.forEach((blip: any, index: number) => {
    if (!blip.x || !blip.y || !blip.z) {
      invalidBlips.push(index);
      return;
    }

    const validation = validateGameCoordinates({
      x: blip.x,
      y: blip.y,
      z: blip.z,
      heading: blip.heading,
    });

    if (!validation.isValid) {
      invalidBlips.push(index);
      console.warn(`[BlipValidation] Invalid blip at index ${index}:`, validation.errors);
    }
  });

  if (invalidBlips.length > 0) {
    console.warn(`[BlipValidation] Filtered ${invalidBlips.length} invalid blips`);
    // Filter out invalid blips
    req.body.blips = blips.filter((_: any, index: number) => !invalidBlips.includes(index));
  }

  next();
}

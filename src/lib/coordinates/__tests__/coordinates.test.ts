/**
 * Unit Tests for Coordinate Utilities
 */

import {
  gameToMap,
  mapToGame,
  validateGameCoordinates,
  validateMapCoordinates,
  calculateDistance,
  calculateMapDistance,
  normalizeHeading,
  calculateBearing,
  isWithinRadius,
  formatCoordinates,
  coordinateHash,
  roundCoordinates,
  areCoordinatesEqual,
  DEFAULT_CALIBRATION,
} from '../coordinates';
import type { GameCoordinates, MapCoordinates } from '@/types/coordinates';

describe('Coordinate Utilities', () => {
  describe('gameToMap', () => {
    it('should convert game coordinates to map coordinates', () => {
      const gameCoords: GameCoordinates = { x: 0, y: 0, z: 0 };
      const mapCoords = gameToMap(gameCoords, DEFAULT_CALIBRATION);
      
      expect(mapCoords.lat).toBeCloseTo(DEFAULT_CALIBRATION.OFFSET_Y);
      expect(mapCoords.lng).toBeCloseTo(DEFAULT_CALIBRATION.OFFSET_X);
      expect(mapCoords.alt).toBe(0);
    });

    it('should convert with heading preserved', () => {
      const gameCoords: GameCoordinates = { x: 100, y: 200, z: 50, heading: 45 };
      const mapCoords = gameToMap(gameCoords, DEFAULT_CALIBRATION);
      
      expect(mapCoords.alt).toBe(50);
    });

    it('should handle negative coordinates', () => {
      const gameCoords: GameCoordinates = { x: -500, y: -1000, z: -50 };
      const mapCoords = gameToMap(gameCoords, DEFAULT_CALIBRATION);
      
      expect(mapCoords.lat).toBeLessThan(DEFAULT_CALIBRATION.OFFSET_Y);
      expect(mapCoords.lng).toBeLessThan(DEFAULT_CALIBRATION.OFFSET_X);
    });
  });

  describe('mapToGame', () => {
    it('should convert map coordinates back to game coordinates', () => {
      const mapCoords: MapCoordinates = { lat: DEFAULT_CALIBRATION.OFFSET_Y, lng: DEFAULT_CALIBRATION.OFFSET_X };
      const gameCoords = mapToGame(mapCoords, DEFAULT_CALIBRATION);
      
      expect(gameCoords.x).toBeCloseTo(0);
      expect(gameCoords.y).toBeCloseTo(0);
      expect(gameCoords.z).toBe(0);
    });

    it('should be reversible with gameToMap', () => {
      const original: GameCoordinates = { x: 500, y: 1000, z: 100 };
      const mapCoords = gameToMap(original, DEFAULT_CALIBRATION);
      const backToGame = mapToGame(mapCoords, DEFAULT_CALIBRATION);
      
      expect(backToGame.x).toBeCloseTo(original.x, 5);
      expect(backToGame.y).toBeCloseTo(original.y, 5);
      expect(backToGame.z).toBeCloseTo(original.z);
    });
  });

  describe('validateGameCoordinates', () => {
    it('should validate correct coordinates', () => {
      const coords: GameCoordinates = { x: 100, y: 200, z: 50 };
      const result = validateGameCoordinates(coords);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject NaN coordinates', () => {
      const coords: GameCoordinates = { x: NaN, y: 200, z: 50 };
      const result = validateGameCoordinates(coords);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('X coordinate must be a valid number');
    });

    it('should warn about coordinates outside map bounds', () => {
      const coords: GameCoordinates = { x: 5000, y: 10000, z: 3000 };
      const result = validateGameCoordinates(coords);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should validate heading if provided', () => {
      const coords: GameCoordinates = { x: 100, y: 200, z: 50, heading: 370 };
      const result = validateGameCoordinates(coords);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Heading should be between 0 and 360 degrees');
    });
  });

  describe('validateMapCoordinates', () => {
    it('should validate correct map coordinates', () => {
      const coords: MapCoordinates = { lat: -2000, lng: -1000 };
      const result = validateMapCoordinates(coords);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      const coords: MapCoordinates = { lat: NaN, lng: -1000 };
      const result = validateMapCoordinates(coords);
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const coords1: GameCoordinates = { x: 0, y: 0, z: 0 };
      const coords2: GameCoordinates = { x: 100, y: 0, z: 0 };
      
      const distance = calculateDistance(coords1, coords2);
      expect(distance).toBe(100);
    });

    it('should calculate 3D distance', () => {
      const coords1: GameCoordinates = { x: 0, y: 0, z: 0 };
      const coords2: GameCoordinates = { x: 100, y: 100, z: 100 };
      
      const distance = calculateDistance(coords1, coords2);
      expect(distance).toBeCloseTo(Math.sqrt(30000), 5);
    });
  });

  describe('calculateMapDistance', () => {
    it('should calculate map distance', () => {
      const coords1: MapCoordinates = { lat: 0, lng: 0 };
      const coords2: MapCoordinates = { lat: 100, lng: 100 };
      
      const distance = calculateMapDistance(coords1, coords2);
      expect(distance).toBeCloseTo(Math.sqrt(20000), 5);
    });
  });

  describe('normalizeHeading', () => {
    it('should normalize heading to 0-360', () => {
      expect(normalizeHeading(0)).toBe(0);
      expect(normalizeHeading(360)).toBe(0);
      expect(normalizeHeading(450)).toBe(90);
      expect(normalizeHeading(-90)).toBe(270);
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing between points', () => {
      const from: GameCoordinates = { x: 0, y: 0, z: 0 };
      const to: GameCoordinates = { x: 100, y: 0, z: 0 };
      
      const bearing = calculateBearing(from, to);
      expect(bearing).toBeCloseTo(0, 1);
    });

    it('should calculate bearing for north', () => {
      const from: GameCoordinates = { x: 0, y: 0, z: 0 };
      const to: GameCoordinates = { x: 0, y: 100, z: 0 };
      
      const bearing = calculateBearing(from, to);
      expect(bearing).toBeCloseTo(90, 1);
    });
  });

  describe('isWithinRadius', () => {
    it('should check if point is within radius', () => {
      const center: GameCoordinates = { x: 0, y: 0, z: 0 };
      const point: GameCoordinates = { x: 50, y: 0, z: 0 };
      
      expect(isWithinRadius(center, point, 100)).toBe(true);
      expect(isWithinRadius(center, point, 25)).toBe(false);
    });
  });

  describe('formatCoordinates', () => {
    it('should format game coordinates', () => {
      const coords: GameCoordinates = { x: 100.123, y: 200.456, z: 50.789 };
      const formatted = formatCoordinates(coords, 2);
      
      expect(formatted).toBe('X: 100.12, Y: 200.46, Z: 50.79');
    });

    it('should format map coordinates', () => {
      const coords: MapCoordinates = { lat: -2000.123, lng: -1000.456 };
      const formatted = formatCoordinates(coords, 2);
      
      expect(formatted).toBe('Lat: -2000.12, Lng: -1000.46');
    });
  });

  describe('coordinateHash', () => {
    it('should create consistent hash', () => {
      const coords: GameCoordinates = { x: 100, y: 200, z: 50 };
      const hash1 = coordinateHash(coords);
      const hash2 = coordinateHash(coords);
      
      expect(hash1).toBe(hash2);
    });

    it('should create different hashes for different coordinates', () => {
      const coords1: GameCoordinates = { x: 100, y: 200, z: 50 };
      const coords2: GameCoordinates = { x: 101, y: 200, z: 50 };
      
      expect(coordinateHash(coords1)).not.toBe(coordinateHash(coords2));
    });
  });

  describe('roundCoordinates', () => {
    it('should round game coordinates', () => {
      const coords: GameCoordinates = { x: 100.123, y: 200.456, z: 50.789 };
      const rounded = roundCoordinates(coords, 1) as GameCoordinates;
      
      expect(rounded.x).toBe(100.1);
      expect(rounded.y).toBe(200.5);
      expect(rounded.z).toBe(50.8);
    });

    it('should round map coordinates', () => {
      const coords: MapCoordinates = { lat: -2000.123, lng: -1000.456 };
      const rounded = roundCoordinates(coords, 1) as MapCoordinates;
      
      expect(rounded.lat).toBe(-2000.1);
      expect(rounded.lng).toBe(-1000.5);
    });
  });

  describe('areCoordinatesEqual', () => {
    it('should detect equal coordinates', () => {
      const coords1: GameCoordinates = { x: 100, y: 200, z: 50 };
      const coords2: GameCoordinates = { x: 100, y: 200, z: 50 };
      
      expect(areCoordinatesEqual(coords1, coords2)).toBe(true);
    });

    it('should detect unequal coordinates', () => {
      const coords1: GameCoordinates = { x: 100, y: 200, z: 50 };
      const coords2: GameCoordinates = { x: 101, y: 200, z: 50 };
      
      expect(areCoordinatesEqual(coords1, coords2)).toBe(false);
    });

    it('should use tolerance', () => {
      const coords1: GameCoordinates = { x: 100, y: 200, z: 50 };
      const coords2: GameCoordinates = { x: 100.5, y: 200, z: 50 };
      
      expect(areCoordinatesEqual(coords1, coords2, 1)).toBe(true);
      expect(areCoordinatesEqual(coords1, coords2, 0.1)).toBe(false);
    });
  });
});

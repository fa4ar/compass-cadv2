/**
 * Coordinate System Types
 * Defines the data structures for handling game coordinates and map transformations
 */

/**
 * Raw game coordinates from FiveM
 */
export interface GameCoordinates {
  x: number;
  y: number;
  z: number;
  heading?: number;
}

/**
 * Map coordinates (Leaflet LatLng)
 */
export interface MapCoordinates {
  lat: number;
  lng: number;
  alt?: number;
}

/**
 * Calibration constants for coordinate transformation
 */
export interface CalibrationConfig {
  SCALE_Y: number;
  SCALE_X: number;
  OFFSET_Y: number;
  OFFSET_X: number;
}

/**
 * Coordinate validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Unit blip data structure
 */
export interface UnitBlip {
  identifier: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  type: string;
  label: string;
  color: string;
  location?: string;
  status?: string;
  department?: string;
  inVehicle?: boolean;
  subdivision?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  lastSeen?: number;
}

/**
 * 911 call data structure with coordinates
 */
export interface Call911 {
  id: number;
  type: string;
  location: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  callerName: string;
  status: 'pending' | 'dispatched' | 'enroute' | 'on_scene' | 'closed';
  x: number;
  y: number;
  z: number;
  createdAt: number;
  source?: string;
  callerPhone?: string;
  units?: CallUnit[];
  updatedAt?: number;
}

/**
 * Unit attached to a call
 */
export interface CallUnit {
  userId: number;
  characterId?: number;
  name: string;
  status: string;
  callSign: string;
  isLead: boolean;
}

/**
 * Coordinate update event data
 */
export interface CoordinateUpdateEvent {
  timestamp: number;
  source: 'fivem' | 'cad' | 'websocket';
  data: GameCoordinates | MapCoordinates;
}

/**
 * Batch coordinate update for performance
 */
export interface BatchCoordinateUpdate {
  updates: CoordinateUpdateEvent[];
  batchId: string;
  timestamp: number;
}

/**
 * Coordinate history for tracking movement
 */
export interface CoordinateHistory {
  unitId: string;
  coordinates: Array<{
    x: number;
    y: number;
    z: number;
    timestamp: number;
  }>;
  maxEntries: number;
}

/**
 * Map viewport state
 */
export interface MapViewport {
  center: MapCoordinates;
  zoom: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

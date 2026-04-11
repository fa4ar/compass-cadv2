# Coordinate System Documentation

## Overview

This document describes the coordinate system used for handling game coordinates from FiveM and displaying them on the CAD map. The system includes type definitions, utility functions, validation, and real-time synchronization.

## Architecture

### Frontend (React/TypeScript)

- **Types**: `src/types/coordinates.ts` - TypeScript interfaces for all coordinate-related data structures
- **Utilities**: `src/lib/coordinates.ts` - Coordinate transformation and validation functions
- **Map Component**: `src/components/Map/LiveMap.tsx` - Main map display with coordinate handling

### Backend (Node.js/Express)

- **Utilities**: `backend/src/lib/coordinates.ts` - Backend coordinate utilities
- **Middleware**: `backend/src/middleware/coordinateValidation.middleware.ts` - Request validation middleware
- **Routes**: `backend/src/routes/fivem.routes.ts` - API endpoints with coordinate validation

## Data Structures

### GameCoordinates

Represents raw coordinates from FiveM:

```typescript
interface GameCoordinates {
  x: number;      // Game world X coordinate
  y: number;      // Game world Y coordinate
  z: number;      // Game world Z coordinate (altitude)
  heading?: number; // Direction in degrees (0-360)
}
```

### MapCoordinates

Represents coordinates for Leaflet map display:

```typescript
interface MapCoordinates {
  lat: number;    // Latitude for Leaflet
  lng: number;    // Longitude for Leaflet
  alt?: number;   // Altitude (optional)
}
```

### UnitBlip

Represents an active unit on the map:

```typescript
interface UnitBlip {
  identifier: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  type: string;        // 'police', 'ems', 'fire', etc.
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
```

### Call911

Represents a 911 emergency call with coordinates:

```typescript
interface Call911 {
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
```

## Coordinate Transformation

### Calibration Constants

The system uses calibration constants to convert between game coordinates and map coordinates:

```typescript
const CALIBRATION = {
  SCALE_Y: 0.505,
  SCALE_X: 0.59,
  OFFSET_Y: -2217,
  OFFSET_X: -208,
};
```

### Game to Map Conversion

```typescript
import { gameToMap } from '@/lib/coordinates';

const gameCoords: GameCoordinates = { x: 100, y: 200, z: 50 };
const mapCoords = gameToMap(gameCoords);

// Result: { lat: -2117, lng: -149, alt: 50 }
```

### Map to Game Conversion

```typescript
import { mapToGame } from '@/lib/coordinates';

const mapCoords: MapCoordinates = { lat: -2117, lng: -149 };
const gameCoords = mapToGame(mapCoords);

// Result: { x: 100, y: 200, z: 0 }
```

## Coordinate Validation

### Frontend Validation

```typescript
import { validateGameCoordinates } from '@/lib/coordinates';

const coords: GameCoordinates = { x: 100, y: 200, z: 50 };
const validation = validateGameCoordinates(coords);

if (!validation.isValid) {
  console.error('Invalid coordinates:', validation.errors);
}
```

### Backend Middleware

The backend automatically validates coordinates on incoming requests:

```typescript
import { validateCallCoordinates } from '../middleware/coordinateValidation.middleware';

router.post('/create-call', validateCallCoordinates, async (req, res) => {
  // Coordinates are already validated
});
```

## API Endpoints

### POST /api/fivem/update-map

Receives unit blips from FiveM server with coordinates:

```json
{
  "blips": [
    {
      "identifier": "license:xxxxxxxx",
      "x": 100.5,
      "y": 200.3,
      "z": 50.1,
      "heading": 45,
      "license": "license:xxxxxxxx",
      "location": "Downtown"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "units": [...],
  "newCalls": [...]
}
```

### POST /api/fivem/create-call

Creates a 911 call from FiveM with coordinates:

```json
{
  "callerName": "John Doe",
  "location": "123 Main St",
  "description": "Emergency assistance needed",
  "type": "emergency",
  "priority": "high",
  "x": 150.5,
  "y": 250.3,
  "z": 55.1
}
```

**Response**:
```json
{
  "success": true,
  "call": {
    "id": 123,
    "callerName": "John Doe",
    "location": "123 Main St",
    "x": 150.5,
    "y": 250.3,
    "z": 55.1,
    "status": "pending",
    "source": "cad_sync"
  }
}
```

## Real-time Synchronization

### WebSocket Events

#### blips_updated

Emitted when unit positions are updated:

```typescript
socket.on('blips_updated', (blips: UnitBlip[]) => {
  // Update map with new unit positions
});
```

#### calls_updated

Emitted when 911 calls are created or updated:

```typescript
socket.on('calls_updated', (calls: Call911[]) => {
  // Filter for CAD_SYNC calls
  const cadSyncCalls = calls.filter(call => call.source === 'cad_sync');
  // Update map with new calls
});
```

## Utility Functions

### Distance Calculation

```typescript
import { calculateDistance } from '@/lib/coordinates';

const coords1: GameCoordinates = { x: 0, y: 0, z: 0 };
const coords2: GameCoordinates = { x: 100, y: 0, z: 0 };
const distance = calculateDistance(coords1, coords2); // 100 meters
```

### Heading Normalization

```typescript
import { normalizeHeading } from '@/lib/coordinates';

const heading = normalizeHeading(450); // 90 degrees
```

### Bearing Calculation

```typescript
import { calculateBearing } from '@/lib/coordinates';

const from: GameCoordinates = { x: 0, y: 0, z: 0 };
const to: GameCoordinates = { x: 100, y: 0, z: 0 };
const bearing = calculateBearing(from, to); // 0 degrees (East)
```

### Coordinate Formatting

```typescript
import { formatCoordinates } from '@/lib/coordinates';

const coords: GameCoordinates = { x: 100.123, y: 200.456, z: 50.789 };
const formatted = formatCoordinates(coords, 2);
// "X: 100.12, Y: 200.46, Z: 50.79"
```

## Integration Guide

### FiveM Resource Integration

1. **Send unit positions to CAD**:

```lua
-- In your FiveM resource
local blips = {}
for _, player in ipairs(GetPlayers()) do
    local ped = GetPlayerPed(player)
    local coords = GetEntityCoords(ped)
    local heading = GetEntityHeading(ped)
    
    table.insert(blips, {
        identifier = GetPlayerIdentifierByType(player, 'license'),
        x = coords.x,
        y = coords.y,
        z = coords.z,
        heading = heading,
        license = GetPlayerIdentifierByType(player, 'license'),
    })
end

-- Send to CAD API
PerformHttpRequest('http://your-cad-url/api/fivem/update-map', 
    function(code, body, headers)
        print('Blips updated')
    end, 
    'POST', 
    json.encode({ blips = blips }),
    { ['Content-Type'] = 'application/json' }
)
```

2. **Create 911 call with coordinates**:

```lua
-- In your FiveM resource
local ped = PlayerPedId()
local coords = GetEntityCoords(ped)

PerformHttpRequest('http://your-cad-url/api/fivem/create-call',
    function(code, body, headers)
        print('Call created')
    end,
    'POST',
    json.encode({
        callerName = GetPlayerName(source),
        location = GetStreetNameFromHash(GetStreetNameAtCoord(coords.x, coords.y, coords.z)),
        description = "Emergency assistance needed",
        type = "emergency",
        priority = "high",
        x = coords.x,
        y = coords.y,
        z = coords.z
    }),
    { ['Content-Type'] = 'application/json', ['X-API-Key'] = 'your-api-key' }
)
```

## Performance Considerations

### Coordinate Caching

The system uses icon caching to avoid recreating Leaflet icons:

```typescript
const iconCache = new Map<string, L.DivIcon>();
```

### Batch Updates

For multiple coordinate updates, consider batching:

```typescript
const updates: CoordinateUpdateEvent[] = [];
// ... collect updates
// ... send batch
```

### Validation Optimization

Coordinate validation is performed at the middleware level to prevent invalid data from reaching the database.

## Error Handling

### Invalid Coordinates

Invalid coordinates are logged and filtered out:

```typescript
const validation = validateGameCoordinates(coords);
if (!validation.isValid) {
  console.warn(`Invalid coordinates: ${validation.errors}`);
  return;
}
```

### Missing Coordinates

For 911 calls, coordinates are optional. If not provided, the call is still created but won't appear on the map.

## Testing

Run unit tests for coordinate utilities:

```bash
npm test -- coordinates.test.ts
```

## Troubleshooting

### Coordinates Not Displaying

1. Check browser console for validation errors
2. Verify calibration constants match between frontend and backend
3. Ensure WebSocket connection is active
4. Check that call source is 'cad_sync'

### Incorrect Position on Map

1. Verify calibration constants
2. Check coordinate transformation logic
3. Ensure map tiles are loaded correctly

### Performance Issues

1. Reduce update frequency
2. Implement coordinate batching
3. Use coordinate caching
4. Limit number of displayed units/calls

## Future Enhancements

- Add coordinate history tracking
- Implement geofencing features
- Add route planning between coordinates
- Support for multiple map calibrations
- Coordinate prediction based on movement patterns

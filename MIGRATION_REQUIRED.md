# Database Migration Required

## Changes Made to Fix LiveMap Call Filtering Issue

### Problem
Calls created through the web interface were appearing on the minimap, violating the architectural principle that only calls from CAD_SYNC using the /911 command should be displayed on LiveMap.

### Solution Implemented

#### 1. Schema Changes (backend/prisma/schema.prisma)
- Added `source` field to `Call911` model with default value "web"
- Added index on `source` field for performance
- Possible values: "cad_sync" (for /911 command), "web" (for web interface)

#### 2. Service Layer Updates (backend/src/services/calls911/calls911.service.ts)
- Updated `createCall` method to accept `source` parameter
- Added logging to track call source when calls are created

#### 3. New API Endpoint (backend/src/routes/fivem.routes.ts)
- Added `POST /api/fivem/create-call` endpoint for CAD_SYNC to create calls
- This endpoint sets `source: 'cad_sync'` automatically
- Emits socket event to update all clients

#### 4. Frontend Filtering (src/components/Map/LiveMap.tsx)
- Added filtering logic in `callHandler` to only show calls with `source === 'cad_sync'`
- Added logging to track how many calls are filtered
- Web-created calls (source: 'web') are now blocked from minimap display

#### 5. Unit Tests (src/components/Map/__tests__/LiveMap.test.tsx)
- Created tests for call filtering logic
- Tests cover filtering by source, empty arrays, and undefined/null sources

## Required Action: Database Migration

The schema changes have been made and Prisma client has been regenerated, but the database migration has NOT been run yet due to database authentication errors.

### To apply the migration:

```bash
cd backend
npx prisma migrate dev --name add_call_source_field
```

Or if you prefer to push changes directly:

```bash
cd backend
npx prisma db push
```

### After Migration:
1. The TypeScript errors about 'source' field will be resolved
2. Existing calls will have `source` set to NULL (will default to "web")
3. New calls from web interface will have `source: "web"`
4. New calls from CAD_SYNC /911 command will have `source: "cad_sync"`
5. LiveMap will only display calls with `source: "cad_sync"`

## Testing

After migration, test the following:
1. Create a call through web interface - should NOT appear on LiveMap
2. Create a call through CAD_SYNC /911 command - SHOULD appear on LiveMap
3. Check console logs for filtering statistics
4. Verify that CAD_SYNC functionality remains intact

## Notes

- The migration requires valid database credentials in .env file
- Current error: "Authentication failed against database server"
- Please ensure DATABASE_URL is correctly configured before running migration

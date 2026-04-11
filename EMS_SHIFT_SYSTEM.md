# EMS Shift System Documentation

## Overview

The EMS Shift System is a completely independent department shift management system that allows users to have simultaneous shifts across different departments (e.g., Police and EMS) without any conflicts or restrictions. This system provides full data isolation between departments, force-shift capabilities with progress preservation, comprehensive logging, and administrative monitoring tools.

## Key Features

### 1. Department Isolation
- **Independent Shift Tracking**: Each department maintains its own shift records using the `DepartmentShift` model
- **Unique Constraint**: Users can have one active shift per department type (police, ems, fire, etc.)
- **No Cross-Department Interference**: Shift operations in one department never affect shifts in other departments

### 2. Force-Shift Mechanism
- **Data Preservation**: When force-switching shifts, previous shift progress can be preserved
- **Automatic History**: Forced shifts are logged with reasons and previous shift data is archived
- **Safe Overwriting**: Existing shifts are properly ended and archived before creating new forced shifts

### 3. Comprehensive Logging
- **Activity Logs**: Every shift operation (start, end, status change, call attachment) is logged
- **Shift History**: Complete historical record of all shifts with statistics
- **IP Tracking**: Logs include IP addresses for audit purposes

### 4. Progress Tracking
- **Shift Progress**: Tracks calls handled, time on scene, distance traveled, etc.
- **Real-time Updates**: Progress can be updated during active shifts
- **Historical Analysis**: Shift history includes duration and performance metrics

### 5. Admin Monitoring
- **Real-time Dashboard**: View all active shifts across all departments
- **Simultaneous Shift Detection**: Identifies users with multiple active department shifts
- **Force-Shift Alerts**: Highlights forced shifts for administrative review
- **Detailed Shift Information**: View shift details, activity logs, and history

## Architecture

### Database Schema

#### DepartmentShift Model
```prisma
model DepartmentShift {
  id                 Int      @id @default(autoincrement())
  userId             Int
  departmentType     String   // police, ems, fire, sheriff, trooper, dispatch, corrections
  characterId        Int?
  departmentMemberId Int?
  
  status             String   @default("Available")
  callSign           String?
  subdivision        String?
  vehicleModel       String?
  vehiclePlate       String?
  callId             Int?
  
  startedAt          DateTime @default(now())
  lastStatusAt       DateTime @default(now())
  endedAt            DateTime?
  
  shiftProgress      Json?    // Progress tracking data
  isForced           Boolean  @default(false)
  previousShiftData  Json?    // Previous shift data on force switch
  
  @@unique([userId, departmentType])
}
```

**Key Design Decision**: The unique constraint on `[userId, departmentType]` allows a user to have one shift per department type, enabling simultaneous multi-department shifts.

#### ShiftActivityLog Model
```prisma
model ShiftActivityLog {
  id               Int      @id @default(autoincrement())
  departmentShiftId Int
  userId           Int
  action           String   // START_SHIFT, END_SHIFT, STATUS_CHANGE, etc.
  description      String?
  metadata         Json?
  ipAddress        String?
  createdAt        DateTime @default(now())
}
```

#### ShiftHistory Model
```prisma
model ShiftHistory {
  id               Int      @id @default(autoincrement())
  userId           Int
  departmentType   String
  startedAt        DateTime
  endedAt          DateTime?
  duration         Int?
  callsHandled     Int      @default(0)
  timeOnScene      Int?
  endReason        String?
  shiftData        Json?
  createdAt        DateTime @default(now())
}
```

### Service Layer

**Location**: `backend/src/services/department-shifts/department-shifts.service.ts`

The `DepartmentShiftsService` provides the following methods:

#### Core Methods

- `startShift(userId, departmentType, options, ipAddress)` - Start a new shift in a department
- `forceStartShift(userId, departmentType, options, ipAddress)` - Force start a shift with optional progress preservation
- `endShift(userId, departmentType, ipAddress)` - End a shift in a specific department
- `getActiveShift(userId, departmentType)` - Get active shift for a user in a specific department
- `getAllActiveShifts(userId)` - Get all active shifts for a user across all departments

#### Status Management

- `updateShiftStatus(userId, departmentType, status, ipAddress)` - Update shift status
- `updateShiftProgress(userId, departmentType, progress)` - Update shift progress

#### Call Management

- `attachToCall(userId, departmentType, callId, ipAddress)` - Attach shift to a call
- `detachFromCall(userId, departmentType, ipAddress)` - Detach shift from a call

#### Admin/Dispatcher Methods

- `getAllActiveShiftsByDepartment(departmentType?)` - Get all active shifts by department
- `getShiftActivityLogs(shiftId, limit)` - Get activity logs for a shift
- `getShiftHistory(userId, departmentType?, limit)` - Get shift history for a user

### API Routes

**Base Path**: `/api/department-shifts`

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/start` | Start a shift in a specific department |
| POST | `/force-start` | Force start a shift with progress preservation |
| POST | `/end` | End a shift in a specific department |
| GET | `/active/:departmentType` | Get active shift for current user |
| GET | `/my-shifts` | Get all active shifts for current user |
| POST | `/update-status` | Update shift status |
| POST | `/update-progress` | Update shift progress |
| POST | `/attach-call` | Attach shift to a call |
| POST | `/detach-call` | Detach shift from a call |
| GET | `/all/:departmentType?` | Get all active shifts (admin) |
| GET | `/:shiftId/logs` | Get shift activity logs |
| GET | `/history/:userId/:departmentType?` | Get shift history (admin) |
| GET | `/my-history/:departmentType?` | Get current user's shift history |

### Admin Interface

**Location**: `src/app/admin/department-shifts/page.tsx`

The admin dashboard provides:

1. **Statistics Overview**
   - Total active shifts
   - Users with simultaneous shifts
   - Active forced shifts
   - Average shift duration

2. **Simultaneous Shift Alerts**
   - Warning card showing users with multiple department shifts
   - Color-coded badges for each department

3. **Active Shifts List**
   - Filter by department
   - View shift details (call sign, character, status, duration)
   - Forced shift indicators
   - Click to view detailed information

4. **Shift Details Panel**
   - Complete shift information
   - Activity logs timeline
   - Shift history for the user

## Usage Examples

### Starting a Shift

```typescript
// Start an EMS shift
POST /api/department-shifts/start
{
  "departmentType": "ems",
  "characterId": 123,
  "departmentMemberId": 456,
  "callSign": "MED-1",
  "subdivision": "Central",
  "vehicleModel": "Ambulance",
  "vehiclePlate": "EMS-001"
}
```

### Force-Starting a Shift with Progress Preservation

```typescript
// Force start an EMS shift while preserving progress
POST /api/department-shifts/force-start
{
  "departmentType": "ems",
  "characterId": 123,
  "callSign": "MED-2",
  "preserveProgress": true,
  "reason": "Unit reassignment"
}
```

### Updating Shift Status

```typescript
// Update EMS shift status to OnScene
POST /api/department-shifts/update-status
{
  "departmentType": "ems",
  "status": "OnScene"
}
```

### Attaching to a Call

```typescript
// Attach EMS shift to a 911 call
POST /api/department-shifts/attach-call
{
  "departmentType": "ems",
  "callId": 789
}
```

### Getting All Active Shifts for a User

```typescript
// Get all active shifts across all departments
GET /api/department-shifts/my-shifts

Response:
{
  "success": true,
  "shifts": [
    {
      "id": 1,
      "departmentType": "police",
      "status": "Available",
      "callSign": "PD-1",
      "startedAt": "2026-04-11T10:00:00Z"
    },
    {
      "id": 2,
      "departmentType": "ems",
      "status": "OnScene",
      "callSign": "MED-1",
      "startedAt": "2026-04-11T11:00:00Z"
    }
  ]
}
```

## Department Isolation Mechanism

The system achieves complete department isolation through:

1. **Database-Level Isolation**: The unique constraint on `[userId, departmentType]` ensures each user can have only one shift per department type, but multiple shifts across different departments.

2. **Service-Level Isolation**: The `DepartmentShiftsService` methods always operate on a specific department type, never checking or modifying shifts in other departments.

3. **API-Level Isolation**: Each API endpoint requires the `departmentType` parameter, ensuring operations are scoped to a single department.

4. **No Cross-Department Logic**: There is no logic that checks for shifts in other departments when performing operations. A user can start an EMS shift regardless of whether they have an active Police shift.

## Force-Shift Mechanism

The force-shift mechanism works as follows:

1. **Check for Existing Shift**: The system checks if the user has an existing shift in the target department.

2. **Preserve Progress (Optional)**: If `preserveProgress` is true, the current shift progress is saved.

3. **Archive Previous Shift**: The existing shift is ended and archived in `ShiftHistory` with `endReason: 'force_switch'`.

4. **Save Previous Data**: The previous shift's data is stored in `previousShiftData` for reference.

5. **Create New Shift**: A new shift is created with `isForced: true` and the preserved progress.

6. **Log the Operation**: A `FORCE_SWITCH` activity log is created with the reason and metadata.

## Logging and Audit Trail

Every shift operation is logged with:

- **Action Type**: START_SHIFT, END_SHIFT, STATUS_CHANGE, CALL_ATTACHED, CALL_DETACHED, FORCE_SWITCH
- **Description**: Human-readable description of the action
- **Metadata**: Additional context (e.g., new status, call ID, previous shift data)
- **IP Address**: Client IP address for audit purposes
- **Timestamp**: Exact time of the action

Logs can be retrieved via:
- API: `GET /api/department-shifts/:shiftId/logs`
- Admin Dashboard: Click on a shift to view its activity logs

## Migration Instructions

To apply the database schema changes:

```bash
cd backend
npx prisma migrate dev --name add_department_shifts
npx prisma generate
```

This will create the following tables:
- `DepartmentShift`
- `ShiftActivityLog`
- `ShiftHistory`

And add relations to existing tables:
- `User.departmentShifts`
- `Character.departmentShifts`
- `DepartmentMember.departmentShifts`
- `Call911.departmentShifts`

## Testing Scenarios

### Scenario 1: Simultaneous Police and EMS Shifts

1. User starts a Police shift
2. User starts an EMS shift (should succeed without affecting Police shift)
3. Verify both shifts are active via `/my-shifts`
4. End Police shift (EMS shift should remain active)
5. Verify EMS shift is still active

### Scenario 2: Force-Shift with Progress Preservation

1. User starts an EMS shift
2. Update shift progress (calls handled, time on scene)
3. Force-start new EMS shift with `preserveProgress: true`
4. Verify progress is preserved in new shift
5. Check ShiftHistory for archived previous shift

### Scenario 3: Department Switching

1. User has active Police shift
2. User starts EMS shift
3. User updates EMS status to OnScene
4. Verify Police shift status is unchanged
5. User ends EMS shift
6. Verify Police shift is still active

### Scenario 4: Admin Monitoring

1. Multiple users start shifts in different departments
2. One user starts simultaneous Police and EMS shifts
3. Admin accesses `/admin/department-shifts`
4. Verify simultaneous shift warning appears
5. Click on a shift to view details and logs
6. Filter by department type

## Security Considerations

1. **Authentication**: All endpoints require authentication via `authMiddleware`
2. **Authorization**: Users can only modify their own shifts (admin endpoints for viewing others)
3. **IP Logging**: All operations log IP addresses for audit trails
4. **Input Validation**: All inputs are validated before processing
5. **Error Handling**: Comprehensive error handling with descriptive messages

## Performance Considerations

1. **Database Indexes**: All frequently queried fields are indexed (userId, departmentType, status, callId, startedAt)
2. **Efficient Queries**: Queries use includes only when necessary
3. **Socket Events**: Real-time updates via socket.io for shift changes
4. **Pagination**: History and logs endpoints support limit parameters

## Future Enhancements

Potential improvements for the system:

1. **Shift Templates**: Pre-configured shift settings per department
2. **Automatic Rotation**: Automatic shift rotation based on time limits
3. **Performance Analytics**: Advanced analytics on shift performance
4. **Integration with Units**: Sync with existing Unit system for backward compatibility
5. **Mobile Support**: Mobile-optimized admin interface
6. **Real-time Map**: Live map view of active shifts
7. **Shift Scheduling**: Scheduled shift start/end times
8. **Team Management**: Group shifts into teams for coordination

## Troubleshooting

### Issue: Prisma Client Types Not Updated

**Solution**: Run `npx prisma generate` to regenerate the TypeScript types after schema changes.

### Issue: Migration Fails

**Solution**: Check database connection and ensure you have the necessary permissions. Review the migration SQL for any conflicts.

### Issue: Shift Not Starting

**Solution**: Check that:
- User is authenticated
- Department type is valid
- Character and department member exist (if provided)
- User doesn't already have an active shift in that department (unless using force-start)

### Issue: Admin Dashboard Not Loading

**Solution**: Ensure:
- Backend is running
- API endpoints are accessible
- User has admin permissions
- Database tables exist (run migrations)

## Support

For issues or questions about the EMS Shift System:
1. Check this documentation
2. Review the code comments in `department-shifts.service.ts`
3. Check the admin dashboard for real-time shift information
4. Review activity logs for detailed operation history

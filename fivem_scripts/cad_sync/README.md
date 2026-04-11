# CAD Sync - FiveM Resource

A comprehensive FiveM resource for integrating with CAD (Computer Aided Dispatch) systems, featuring player account linking, 911 call notifications, and real-time call management UI.

## Features

- **Account Linking**: Link FiveM licenses to CAD API IDs via `/cad-link [api_id]`
- **911 Call Notifications**: Real-time notifications for PD/EMS via webhooks
- **Call Management UI**: Modern NUI interface for active call management
- **Multi-language Support**: English and Russian localization
- **Performance Optimized**: Designed for minimal server impact (0.05ms idle, 0.15ms active)
- **OneSync Infinity**: Full support with coordinate synchronization

## Requirements

- **FiveM Server**: Latest stable version with OneSync Infinity
- **Dependencies**:
  - `oxmysql` - For database operations
  - `ox_lib` - For utility functions
- **Database**: MySQL or PostgreSQL
- **CAD System**: External CAD API with webhook support

## Installation

1. **Clone or download** the `cad_sync` folder to your server's `resources` directory:
   ```
   resources/
   └── [your_scripts]/
       └── cad_sync/
   ```

2. **Configure** the resource by editing `config.lua`:
   ```lua
   Config.API = {
       BaseURL = 'http://your-cad-domain.com/api',
       ValidateEndpoint = '/validate-link',
       WebhookEndpoint = '/webhook/911-call',
       APIKey = 'your-secret-api-key',
   }
   
   Config.Database = {
       LinkTable = 'cad_links',
       AutoCreate = true,
   }
   ```

3. **Add to server.cfg**:
   ```
   ensure oxmysql
   ensure ox_lib
   ensure cad_sync
   ```

4. **Set up ACE permissions** for PD/EMS roles in `server.cfg`:
   ```
   add_ace group.police cad_sync.notify allow
   add_ace group.ambulance cad_sync.notify allow
   ```

5. **Configure CAD webhook** to point to:
   ```
   http://your-server-ip:30120/webhook/911-call
   ```
   - Include header: `X-API-Key: your-secret-api-key`

## Database Setup

The resource will auto-create the required table on first start. The table structure:

```sql
CREATE TABLE cad_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    license VARCHAR(255) UNIQUE NOT NULL,
    api_id VARCHAR(255) UNIQUE NOT NULL,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_license (license),
    INDEX idx_api_id (api_id)
);
```

## Usage

### Player Commands

- **`/cad-link [api_id]`** - Link your FiveM account to CAD
  - Validates API ID format
  - Checks with CAD API
  - Prevents duplicate links

- **`/cad-unlink`** - Remove CAD account link
  - Requires existing link
  - Removes from database

### Officer Commands

- **`/accept-call [id]`** - Attach to a 911 call
  - Shows call card UI
  - Requires police or ambulance role

- **`/detach-call`** - Detach from current call
  - Hides call card
  - Updates CAD system

- **`/close-call`** - Close the current call
  - Requires attachment
  - Updates call status

### UI Card Features

The call card displays:
- Call ID and timestamp
- Call type and address
- Description and priority
- Number of attached units
- Action buttons: Mark Arrived, Detach, Close

## API Endpoints

### Validate Link
```
POST /api/validate-link
Content-Type: application/json

{
  "api_id": "user_api_id",
  "license": "license:xxxxxxxxxxxxxxxx",
  "api_key": "your-api-key"
}

Response:
{
  "valid": true,
  "message": "Success"
}
```

### 911 Call Webhook
```
POST /webhook/911-call
Headers:
  X-API-Key: your-secret-api-key

Body:
{
  "id": 123,
  "type": "Emergency",
  "address": "123 Main St",
  "description": "Assistance needed",
  "priority": "high",
  "coordinates": { "x": 100.0, "y": -200.0, "z": 30.0 },
  "status": "active",
  "created_at": 1234567890
}
```

## Configuration Options

### API Settings
- `BaseURL`: CAD API base URL
- `ValidateEndpoint`: Link validation endpoint
- `WebhookEndpoint`: 911 call webhook endpoint
- `APIKey`: Secret key for API authentication
- `Timeout`: Request timeout in milliseconds

### Notification Settings
- `SoundEnabled`: Enable/disable notification sounds
- `BlipEnabled`: Enable/disable map blips
- `AllowedRoles`: Roles that receive notifications
- `Duration`: Notification display duration

### UI Settings
- `Position`: Card position on screen
- `AutoHide`: Auto-hide after inactivity
- `UpdateInterval`: Real-time update interval

## Localization

Edit `config.lua` to change language:
```lua
Config.Locale = 'en' -- or 'ru'
```

Add new languages by creating files in `locales/` directory following the format of `en.lua`.

## Performance

The resource is optimized for minimal impact:
- **Idle**: < 0.05ms per tick
- **Active Card**: < 0.15ms per tick
- **Database**: Connection pooling with oxmysql
- **NUI**: Efficient DOM updates

## Logging

Logs are written to `logs/cad_sync_[date].log`:
- Database operations
- API requests/responses
- Player link/unlink actions
- Webhook events
- Errors and warnings

Configure logging level in `config.lua`:
```lua
Config.Logging = {
    Enabled = true,
    LogLevel = 'info', -- debug, info, warn, error
}
```

## Troubleshooting

### Linking fails
- Check API endpoint is accessible
- Verify API key matches CAD system
- Ensure API ID format is correct (8-64 alphanumeric characters)

### Notifications not received
- Verify player has police/ambulance ACE permission
- Check webhook is configured correctly in CAD
- Ensure sound file exists in `nui/sounds/`

### UI not showing
- Check NUI files are present
- Verify fxmanifest.lua includes NUI files
- Check browser developer console for errors

### Database errors
- Ensure oxmysql is running
- Check database connection settings
- Verify table was created (check logs)

## Testing

### Unit Testing
Test core functionality:
```lua
-- Test API validation
/test-validate-api

-- Test database operations
/test-db-operations

-- Test webhook handling
/test-webhook
```

### Load Testing
Test with multiple simultaneous calls:
- 50+ concurrent 911 calls
- 10+ linked players
- Multiple UI cards active

### Resolution Testing
Test on various screen resolutions:
- 1920x1080 (Full HD)
- 2560x1440 (2K)
- 3440x1440 (Ultrawide)

## Security Considerations

- Keep API keys secret and rotate regularly
- Use HTTPS for API endpoints in production
- Implement rate limiting on webhook endpoint
- Validate all incoming webhook data
- Use prepared statements for database queries

## Support

For issues or questions:
- Check logs in `logs/` directory
- Verify configuration in `config.lua`
- Ensure all dependencies are running
- Check CAD system webhook logs

## License

This resource is provided as-is for use with compatible CAD systems.

## Credits

Developed for FiveM CAD integration
Compatible with oxmysql and ox_lib frameworks

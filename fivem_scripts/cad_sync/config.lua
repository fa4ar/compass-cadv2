Config = {}

-- API Configuration
Config.API = {
    -- CAD API endpoint for validation
    BaseURL = 'http://localhost:3000/api',
    ValidateEndpoint = '/validate-link',
    WebhookEndpoint = '/webhook/911-call',
    
    -- Request timeout in milliseconds
    Timeout = 10000,
}

-- Database Configuration
Config.Database = {
    -- Table name for CAD links
    LinkTable = 'cad_links',
    
    -- Auto-create table if not exists
    AutoCreate = true,
    
    -- Connection check interval (ms)
    CheckInterval = 60000,
}

-- Notification Configuration
Config.Notifications = {
    -- Sound settings
    SoundEnabled = true,
    SoundFile = 'alert.mp3',
    SoundVolume = 0.5,
    
    -- Blip settings
    BlipEnabled = true,
    BlipSprite = 359, -- Emergency blip
    BlipColor = 1, -- Red
    BlipScale = 1.0,
    BlipDuration = 30000, -- 30 seconds
    
    -- Notification duration (ms)
    Duration = 15000,
    
    -- Roles that receive 911 notifications
    AllowedRoles = {
        'police',
        'ambulance',
    },
}

-- UI Configuration
Config.UI = {
    -- Position: 'left-center', 'right-center', 'top-left', etc.
    Position = 'left-center',
    
    -- Auto-hide after inactivity (ms)
    AutoHide = 300000, -- 5 minutes
    
    -- Update interval for real-time data (ms)
    UpdateInterval = 1000,
    
    -- Maximum performance budget (ms)
    MaxIdleTime = 0.05,
    MaxActiveTime = 0.15,
}

-- Localization
Config.Locale = 'en' -- 'en' or 'ru'

-- Logging
Config.Logging = {
    Enabled = true,
    LogPath = 'logs/cad_sync_[date].log',
    LogLevel = 'info', -- 'debug', 'info', 'warn', 'error'
}

-- OneSync Configuration
Config.OneSync = {
    Enabled = true,
    CoordinateSync = true,
    SyncInterval = 500, -- ms
}

-- CAD Browser Configuration
Config.CADBrowser = {
    -- CAD web URL
    URL = 'http://localhost:3000',
    
    -- Key to open CAD browser (default: F10)
    Key = 'F10',
    
    -- Enable browser
    Enabled = true,
    
    -- Auto-close on Escape
    CloseOnEscape = true,
}

Config = {}

-- Locales table (must be defined before loading locale files)
Locales = {}

-- API Configuration
Config.API = {
    -- CAD API endpoint for validation
    BaseURL = 'https://api.california-travel.ru',
    ValidateEndpoint = '/api/fivem/link',
    Timeout = 10000,
    APIKey = 'compass-cad-fivem-secret-key',
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

    -- Allowed roles for call notifications
    AllowedRoles = {
        'dispatcher',
        'police',
        'ems',
    },
}

-- CAD Browser Configuration (DUI-based in-game browser)
Config.CADBrowser = {
    Enabled = false, -- Disabled by default, requires FiveM build 5181+
    URL = 'https://cad.california-travel.ru/',
    Key = 'F10',
    CloseOnEscape = true,
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

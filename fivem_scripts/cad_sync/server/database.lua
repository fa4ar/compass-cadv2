-- CAD Sync In-Memory Storage Module
-- Handles CAD links using in-memory Lua tables

local function log(level, message)
    if Config.Logging.Enabled then
        local timestamp = os.date('%Y-%m-%d %H:%M:%S')
        local logPath = Config.Logging.LogPath:gsub('%[date%]', os.date('%Y-%m-%d'))
        local logLine = string.format('[%s] [%s] [Storage] %s\n', timestamp, string.upper(level), message)
        local file = io.open(GetResourcePath(GetCurrentResourceName()) .. '/' .. logPath, 'a')
        if file then
            file:write(logLine)
            file:close()
        end
    end
end

-- In-memory storage for CAD links
local CADLinks = {}

-- Create a new CAD link
-- @param license string - Player's FiveM license
-- @param apiId string - Player's CAD API ID
-- @return boolean success, string|nil error
function CreateCADLink(license, apiId)
    if CADLinks[license] then
        return false, 'Link already exists for this license'
    end
    
    -- Check if API ID is already linked
    for lic, data in pairs(CADLinks) do
        if data.api_id == apiId then
            return false, 'API ID already linked to another account'
        end
    end
    
    CADLinks[license] = {
        api_id = apiId,
        linked_at = os.date('%Y-%m-%d %H:%M:%S'),
        last_sync = os.date('%Y-%m-%d %H:%M:%S'),
    }
    
    log('info', string.format('Created CAD link: %s -> %s', license, apiId))
    
    -- Update local cache
    CADSync.LinkedPlayers[license] = CADLinks[license]
    
    return true
end

-- Get CAD link by license
-- @param license string - Player's FiveM license
-- @return table|nil link data
function GetCADLink(license)
    return CADLinks[license]
end

-- Get CAD link by API ID
-- @param apiId string - Player's CAD API ID
-- @return table|nil link data
function GetCADLinkByApiId(apiId)
    for license, data in pairs(CADLinks) do
        if data.api_id == apiId then
            return data
        end
    end
    return nil
end

-- Delete CAD link
-- @param license string - Player's FiveM license
-- @return boolean success
function DeleteCADLink(license)
    if CADLinks[license] then
        CADLinks[license] = nil
        log('info', string.format('Deleted CAD link: %s', license))
        
        -- Update local cache
        CADSync.LinkedPlayers[license] = nil
        
        return true
    end
    
    return false
end

-- Update last sync timestamp
-- @param license string - Player's FiveM license
-- @return boolean success
function UpdateLastSync(license)
    if CADLinks[license] then
        CADLinks[license].last_sync = os.date('%Y-%m-%d %H:%M:%S')
        
        -- Update local cache
        if CADSync.LinkedPlayers[license] then
            CADSync.LinkedPlayers[license].last_sync = CADLinks[license].last_sync
        end
        
        return true
    end
    
    return false
end

-- Get all links
-- @return table all links
function GetAllCADLinks()
    return CADLinks
end

log('info', 'In-memory storage module loaded')

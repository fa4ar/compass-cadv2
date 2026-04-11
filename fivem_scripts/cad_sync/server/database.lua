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

-- File path for persistence
local LINKS_FILE = 'cad_links.json'

-- Load links from file on startup
local function LoadLinksFromFile()
    local file = io.open(LINKS_FILE, 'r')
    if file then
        local content = file:read('*all')
        file:close()
        if content and content ~= '' then
            local success, data = pcall(json.decode, content)
            if success and data then
                CADLinks = data
                log('info', string.format('Loaded %d CAD links from file', #CADLinks or 0))
            end
        end
    else
        log('info', 'No existing links file found, starting fresh')
    end
end

-- Save links to file
local function SaveLinksToFile()
    local file = io.open(LINKS_FILE, 'w')
    if file then
        file:write(json.encode(CADLinks))
        file:close()
        log('info', string.format('Saved %d CAD links to file', #CADLinks or 0))
    end
end

-- Load links on startup
LoadLinksFromFile()

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

    -- Save to file
    SaveLinksToFile()

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

        -- Save to file
        SaveLinksToFile()

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

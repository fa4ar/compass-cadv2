-- CAD Sync Database Module
-- Handles MySQL/PostgreSQL operations for CAD links

local function log(level, message)
    if Config.Logging.Enabled then
        local timestamp = os.date('%Y-%m-%d %H:%M:%S')
        local logPath = Config.Logging.LogPath:gsub('%[date%]', os.date('%Y-%m-%d'))
        local logLine = string.format('[%s] [%s] [DB] %s\n', timestamp, string.upper(level), message)
        local file = io.open(GetResourcePath(GetCurrentResourceName()) .. '/' .. logPath, 'a')
        if file then
            file:write(logLine)
            file:close()
        end
    end
end

-- Initialize database table
Citizen.CreateThread(function()
    Wait(2000)
    
    if Config.Database.AutoCreate then
        local createTableQuery = [[
            CREATE TABLE IF NOT EXISTS ]] .. Config.Database.LinkTable .. [[ (
                id INT AUTO_INCREMENT PRIMARY KEY,
                license VARCHAR(255) UNIQUE NOT NULL,
                api_id VARCHAR(255) UNIQUE NOT NULL,
                linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_license (license),
                INDEX idx_api_id (api_id)
            )
        ]]
        
        local success = MySQL.query.await(createTableQuery)
        if success then
            log('info', 'Database table "' .. Config.Database.LinkTable .. '" created or already exists')
        else
            log('error', 'Failed to create database table')
        end
    end
end)

-- Create a new CAD link
-- @param license string - Player's FiveM license
-- @param apiId string - Player's CAD API ID
-- @return boolean success, string|nil error
function CreateCADLink(license, apiId)
    local query = string.format(
        'INSERT INTO %s (license, api_id) VALUES (?, ?)',
        Config.Database.LinkTable
    )
    
    local success, result = pcall(MySQL.insert.await, query, { license, apiId })
    
    if success then
        log('info', string.format('Created CAD link: %s -> %s', license, apiId))
        
        -- Update local cache
        CADSync.LinkedPlayers[license] = {
            api_id = apiId,
            linked_at = os.date('%Y-%m-%d %H:%M:%S'),
            last_sync = os.date('%Y-%m-%d %H:%M:%S'),
        }
        
        return true
    else
        log('error', string.format('Failed to create CAD link: %s', result))
        return false, result
    end
end

-- Get CAD link by license
-- @param license string - Player's FiveM license
-- @return table|nil link data
function GetCADLink(license)
    local query = string.format(
        'SELECT * FROM %s WHERE license = ?',
        Config.Database.LinkTable
    )
    
    local result = MySQL.query.await(query, { license })
    
    if result and #result > 0 then
        return result[1]
    end
    
    return nil
end

-- Get CAD link by API ID
-- @param apiId string - Player's CAD API ID
-- @return table|nil link data
function GetCADLinkByApiId(apiId)
    local query = string.format(
        'SELECT * FROM %s WHERE api_id = ?',
        Config.Database.LinkTable
    )
    
    local result = MySQL.query.await(query, { apiId })
    
    if result and #result > 0 then
        return result[1]
    end
    
    return nil
end

-- Delete CAD link
-- @param license string - Player's FiveM license
-- @return boolean success
function DeleteCADLink(license)
    local query = string.format(
        'DELETE FROM %s WHERE license = ?',
        Config.Database.LinkTable
    )
    
    local success = MySQL.query.await(query, { license })
    
    if success then
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
    local query = string.format(
        'UPDATE %s SET last_sync = CURRENT_TIMESTAMP WHERE license = ?',
        Config.Database.LinkTable
    )
    
    local success = MySQL.query.await(query, { license })
    
    if success and CADSync.LinkedPlayers[license] then
        CADSync.LinkedPlayers[license].last_sync = os.date('%Y-%m-%d %H:%M:%S')
    end
    
    return success ~= nil
end

-- Get all links
-- @return table all links
function GetAllCADLinks()
    local query = string.format(
        'SELECT * FROM %s',
        Config.Database.LinkTable
    )
    
    local result = MySQL.query.await(query)
    
    return result or {}
end

log('info', 'Database module loaded')

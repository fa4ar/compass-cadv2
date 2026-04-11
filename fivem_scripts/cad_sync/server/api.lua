-- CAD Sync API Module
-- Handles API validation and communication with CAD system

local function log(level, message)
    if Config.Logging.Enabled then
        local timestamp = os.date('%Y-%m-%d %H:%M:%S')
        local logPath = Config.Logging.LogPath:gsub('%[date%]', os.date('%Y-%m-%d'))
        local logLine = string.format('[%s] [%s] [API] %s\n', timestamp, string.upper(level), message)
        local file = io.open(GetResourcePath(GetCurrentResourceName()) .. '/' .. logPath, 'a')
        if file then
            file:write(logLine)
            file:close()
        end
    end
end

-- Validate API ID format
-- @param apiId string - The API ID to validate
-- @return boolean isValid
function ValidateApiIdFormat(apiId)
    if not apiId or type(apiId) ~= 'string' then
        return false
    end
    
    -- API ID should be alphanumeric with possible hyphens/underscores, 8-64 characters
    local pattern = '^[%w%-_]{8,64}$'
    return string.match(apiId, pattern) ~= nil
end

-- Validate API ID through CAD endpoint
-- @param apiId string - The API ID to validate
-- @param license string - Player's FiveM license
-- @return boolean isValid, table|nil response
function ValidateApiIdWithCAD(apiId, license)
    local url = Config.API.BaseURL .. Config.API.ValidateEndpoint
    
    local payload = {
        api_id = apiId,
        license = license,
    }
    
    log('info', string.format('Validating API ID %s with CAD endpoint', apiId))
    
    -- Perform HTTP request
    local response = nil
    local errorCode = nil
    
    PerformHttpRequest(url, function(code, body, headers)
        response = { code = code, body = body, headers = headers }
    end, 'POST', json.encode(payload), {
        ['Content-Type'] = 'application/json',
    }, Config.API.Timeout)
    
    -- Wait for response
    local timeout = Config.API.Timeout / 10
    local count = 0
    while response == nil and count < timeout do
        Wait(10)
        count = count + 1
    end
    
    if not response then
        log('error', 'API validation request timed out')
        return false, nil
    end
    
    if response.code >= 200 and response.code < 300 then
        local data = json.decode(response.body)
        if data and data.valid then
            log('info', string.format('API ID %s validated successfully', apiId))
            return true, data
        else
            log('warn', string.format('API ID %s validation failed: %s', apiId, data and data.message or 'Unknown reason'))
            return false, data
        end
    else
        log('error', string.format('API validation request failed with code %d', response.code))
        return false, { code = response.code, body = response.body }
    end
end

-- Send player data to CAD system
-- @param source number - Player server ID
-- @param apiId string - Player's CAD API ID
-- @return boolean success
function SyncPlayerToCAD(source, apiId)
    local url = Config.API.BaseURL .. '/sync/player'
    
    local playerData = {
        api_id = apiId,
        license = GetPlayerIdentifierByType(source, 'license'),
        name = GetPlayerName(source),
        -- Add additional fields as needed
    }
    
    log('info', string.format('Syncing player %s data to CAD', apiId))
    
    local response = nil
    PerformHttpRequest(url, function(code, body, headers)
        response = { code = code, body = body, headers = headers }
    end, 'POST', json.encode(playerData), {
        ['Content-Type'] = 'application/json',
    }, Config.API.Timeout)
    
    local timeout = Config.API.Timeout / 10
    local count = 0
    while response == nil and count < timeout do
        Wait(10)
        count = count + 1
    end
    
    if response and response.code >= 200 and response.code < 300 then
        log('info', string.format('Player %s synced successfully', apiId))
        UpdateLastSync(playerData.license)
        return true
    else
        log('error', string.format('Player sync failed: %s', response and response.code or 'timeout'))
        return false
    end
end

-- Send call status update to CAD
-- @param callId number - Call ID
-- @param status string - New status
-- @param unitId number - Unit server ID
-- @return boolean success
function UpdateCallStatusInCAD(callId, status, unitId)
    local url = Config.API.BaseURL .. '/sync/call/status'
    
    local payload = {
        call_id = callId,
        status = status,
        unit_id = unitId,
        api_key = Config.API.APIKey,
    }
    
    log('info', string.format('Updating call %d status to %s', callId, status))
    
    local response = nil
    PerformHttpRequest(url, function(code, body, headers)
        response = { code = code, body = body, headers = headers }
    end, 'POST', json.encode(payload), {
        ['Content-Type'] = 'application/json',
    }, Config.API.Timeout)
    
    local timeout = Config.API.Timeout / 10
    local count = 0
    while response == nil and count < timeout do
        Wait(10)
        count = count + 1
    end
    
    return response and response.code >= 200 and response.code < 300
end

-- Send unit attachment to CAD
-- @param callId number - Call ID
-- @param unitId number - Unit server ID
-- @param action string - 'attach' or 'detach'
-- @return boolean success
function UpdateUnitAttachmentInCAD(callId, unitId, action)
    local url = Config.API.BaseURL .. '/sync/call/unit'
    
    local payload = {
        call_id = callId,
        unit_id = unitId,
        action = action,
        api_key = Config.API.APIKey,
    }
    
    log('info', string.format('%s unit %d to call %d', action, unitId, callId))
    
    local response = nil
    PerformHttpRequest(url, function(code, body, headers)
        response = { code = code, body = body, headers = headers }
    end, 'POST', json.encode(payload), {
        ['Content-Type'] = 'application/json',
    }, Config.API.Timeout)
    
    local timeout = Config.API.Timeout / 10
    local count = 0
    while response == nil and count < timeout do
        Wait(10)
        count = count + 1
    end
    
    return response and response.code >= 200 and response.code < 300
end

log('info', 'API module loaded')

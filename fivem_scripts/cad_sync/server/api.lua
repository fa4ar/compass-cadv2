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
        log('error', 'API ID is nil or not a string')
        return false
    end

    local len = #apiId
    log('info', string.format('API ID validation: "%s" (len: %d)', apiId, len))

    -- Basic checks
    if len < 8 or len > 64 then
        log('warn', string.format('API ID length %d is outside valid range (8-64)', len))
        return false
    end

    -- Check for valid characters (alphanumeric, hyphen, underscore)
    for i = 1, len do
        local char = string.sub(apiId, i, i)
        local isAlnum = string.match(char, '[A-Za-z0-9]') ~= nil
        local isHyphen = char == '-'
        local isUnderscore = char == '_'
        
        if not isAlnum and not isHyphen and not isUnderscore then
            log('warn', string.format('Invalid character at position %d: "%s"', i, char))
            return false
        end
    end

    log('info', 'API ID format is valid')
    return true
end

-- Validate API ID through CAD endpoint
-- @param apiId string - The API ID to validate
-- @param license string - Player's FiveM license
-- @return boolean isValid, table|nil response
function ValidateApiIdWithCAD(apiId, license)
    local url = Config.API.BaseURL .. Config.API.ValidateEndpoint
    
    local payload = {
        apiId = apiId,
        license = license,
    }
    
    log('info', string.format('Validating API ID %s with CAD endpoint', apiId))

    -- Perform HTTP request
    local response = nil
    local errorCode = nil

    PerformHttpRequest(url, function(code, body, headers)
        log('info', string.format('HTTP Response: Code %d, Body: %s', code, body))
        response = { code = code, body = body, headers = headers }
    end, 'POST', json.encode(payload), {
        ['Content-Type'] = 'application/json',
        ['X-API-Key'] = Config.API.APIKey,
    }, {
        timeout = Config.API.Timeout
    })
    
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

    log('info', string.format('API validation response: code=%d, body=%s', response.code, response.body))

    if response.code >= 200 and response.code < 300 then
        local data = json.decode(response.body)
        log('info', string.format('Parsed data: %s', json.encode(data)))
        -- Check if response indicates success (either valid=true or success message)
        if data and (data.valid == true or (data.message and (string.find(data.message, 'success') or string.find(data.message, 'linked')))) then
            log('info', string.format('API ID %s validated successfully', apiId))
            return true, data
        else
            log('error', string.format('API ID %s validation failed: %s', apiId, data and data.message or 'Unknown error'))
            return false, { message = data and data.message or 'Validation failed' }
        end
    else
        log('error', string.format('API validation request failed with code %d: %s', response.code, response.body))
        return false, { message = string.format('HTTP %d: %s', response.code, response.body) }
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

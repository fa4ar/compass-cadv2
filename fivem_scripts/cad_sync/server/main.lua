-- CAD Sync Server Main
-- Core server logic and initialization

-- Load locale
local locale = Config.Locale or 'en'
local function t(key, ...)
    if Locales[locale] and Locales[locale][key] then
        return string.format(Locales[locale][key], ...)
    end
    return key
end

-- Logging system
local function log(level, message)
    if not Config.Logging.Enabled then return end
    
    local levels = { debug = 1, info = 2, warn = 3, error = 4 }
    local currentLevel = levels[Config.Logging.LogLevel] or 2
    local messageLevel = levels[level] or 2
    
    if messageLevel >= currentLevel then
        local timestamp = os.date('%Y-%m-%d %H:%M:%S')
        local logPath = Config.Logging.LogPath:gsub('%[date%]', os.date('%Y-%m-%d'))
        local logLine = string.format('[%s] [%s] %s\n', timestamp, string.upper(level), message)
        
        -- Write to log file
        local file = io.open(GetResourcePath(GetCurrentResourceName()) .. '/' .. logPath, 'a')
        if file then
            file:write(logLine)
            file:close()
        end
        
        -- Also print to console
        print('^2[CAD Sync]^7 ' .. logLine)
    end
end

-- Global state
CADSync = {
    ActiveCalls = {},
    LinkedPlayers = {},
    AttachedUnits = {},
}

-- Initialize database
Citizen.CreateThread(function()
    Wait(1000)
    log('info', 'Initializing CAD Sync system...')
    
    -- Load existing links from database
    local links = MySQL.query.await('SELECT license, api_id, linked_at, last_sync FROM ' .. Config.Database.LinkTable)
    if links then
        for _, link in ipairs(links) do
            CADSync.LinkedPlayers[link.license] = {
                api_id = link.api_id,
                linked_at = link.linked_at,
                last_sync = link.last_sync,
            }
        end
        log('info', string.format('Loaded %d linked players from database', #links))
    end
    
    log('info', t('system_loaded'))
end)

-- Export: Check if player is linked
exports('IsPlayerLinked', function(source)
    local license = GetPlayerIdentifierByType(source, 'license')
    return CADSync.LinkedPlayers[license] ~= nil
end)

-- Export: Get player API ID
exports('GetPlayerApiId', function(source)
    local license = GetPlayerIdentifierByType(source, 'license')
    if CADSync.LinkedPlayers[license] then
        return CADSync.LinkedPlayers[license].api_id
    end
    return nil
end)

-- Export: Get active calls
exports('GetActiveCalls', function()
    return CADSync.ActiveCalls
end)

-- Event: Player disconnecting
AddEventHandler('playerDropped', function(reason)
    local source = source
    local license = GetPlayerIdentifierByType(source, 'license')
    
    -- Detach from any active calls
    for callId, units in pairs(CADSync.AttachedUnits) do
        for i, unitId in ipairs(units) do
            if unitId == source then
                table.remove(units, i)
                log('info', string.format('Player %s detached from call %d on disconnect', source, callId))
                
                -- Notify clients
                TriggerClientEvent('cad_sync:callUpdated', -1, callId, CADSync.ActiveCalls[callId])
                break
            end
        end
    end
end)

-- Event: Resource stopping
AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        log('info', 'CAD Sync system shutting down...')
    end
end)

-- Event: Link account
RegisterNetEvent('cad_sync:server:linkAccount', function(apiId)
    local source = source
    local license = GetPlayerIdentifierByType(source, 'license')
    
    if not license then
        TriggerClientEvent('cad_sync:client:linkFailed', source, 'Could not get license identifier')
        return
    end
    
    -- Check if already linked
    if CADSync.LinkedPlayers[license] then
        TriggerClientEvent('cad_sync:client:linkFailed', source, 'Already linked')
        return
    end
    
    -- Validate format
    if not ValidateApiIdFormat(apiId) then
        TriggerClientEvent('cad_sync:client:linkFailed', source, 'Invalid API ID format')
        return
    end
    
    -- Check if API ID is already linked to another account
    local existingLink = GetCADLinkByApiId(apiId)
    if existingLink then
        TriggerClientEvent('cad_sync:client:linkFailed', source, 'API ID already linked to another account')
        return
    end
    
    -- Validate with CAD API
    local isValid, response = ValidateApiIdWithCAD(apiId, license)
    if not isValid then
        TriggerClientEvent('cad_sync:client:linkFailed', source, response and response.message or 'API validation failed')
        return
    end
    
    -- Create link in database
    local success, error = CreateCADLink(license, apiId)
    if success then
        TriggerClientEvent('cad_sync:client:linkSuccess', source, apiId)
        -- Set KVP for client to check
        TriggerClientEvent('cad_sync:client:setLinked', source, true)
        log('info', string.format('Player %s linked account with API ID: %s', GetPlayerName(source), apiId))
    else
        TriggerClientEvent('cad_sync:client:linkFailed', source, error or 'Database error')
    end
end)

-- Event: Unlink account
RegisterNetEvent('cad_sync:server:unlinkAccount', function()
    local source = source
    local license = GetPlayerIdentifierByType(source, 'license')
    
    if not license then
        TriggerClientEvent('cad_sync:client:unlinkFailed', source, 'Could not get license identifier')
        return
    end
    
    -- Check if linked
    if not CADSync.LinkedPlayers[license] then
        TriggerClientEvent('cad_sync:client:unlinkFailed', source, 'Not linked')
        return
    end
    
    -- Delete from database
    local success = DeleteCADLink(license)
    if success then
        TriggerClientEvent('cad_sync:client:unlinkSuccess', source)
        -- Clear KVP for client
        TriggerClientEvent('cad_sync:client:setLinked', source, false)
        log('info', string.format('Player %s unlinked account', GetPlayerName(source)))
    else
        TriggerClientEvent('cad_sync:client:unlinkFailed', source, 'Database error')
    end
end)

-- Event: Update coordinates for call
RegisterNetEvent('cad_sync:server:updateCoordinates', function(callId, coords)
    local source = source
    local license = GetPlayerIdentifierByType(source, 'license')
    
    -- Verify player is linked
    if not CADSync.LinkedPlayers[license] then
        return
    end
    
    -- Verify call exists and player is attached
    if not CADSync.ActiveCalls[callId] then
        return
    end
    
    local isAttached = false
    for _, unitId in ipairs(CADSync.AttachedUnits[callId] or {}) do
        if unitId == source then
            isAttached = true
            break
        end
    end
    
    if not isAttached then
        return
    end
    
    -- Send coordinates to CAD API
    SendCoordinatesToCAD(source, callId, coords)
end)

-- Function: Send coordinates to CAD
function SendCoordinatesToCAD(source, callId, coords)
    local license = GetPlayerIdentifierByType(source, 'license')
    local apiId = CADSync.LinkedPlayers[license] and CADSync.LinkedPlayers[license].api_id
    
    if not apiId then
        return
    end
    
    local url = Config.API.BaseURL .. '/api/fivem/update-unit-coordinates'
    local payload = {
        api_id = apiId,
        license = license,
        call_id = callId,
        coordinates = {
            x = coords.x,
            y = coords.y,
            z = coords.z,
        },
    }
    
    log('debug', string.format('Sending coordinates to CAD: %s -> %s', license, url))
    
    PerformHttpRequest(url, function(code, body, headers)
        if code >= 200 and code < 300 then
            log('debug', string.format('Coordinates sent successfully for call %d', callId))
        else
            log('warn', string.format('Failed to send coordinates: HTTP %d', code))
        end
    end, 'POST', json.encode(payload), {
        ['Content-Type'] = 'application/json',
    }, Config.API.Timeout)
end

-- Periodic coordinate sync for all linked players
Citizen.CreateThread(function()
    while true do
        Wait(5000) -- Sync every 5 seconds
        
        local blips = {}
        
        -- Collect coordinates from all linked players
        for _, playerId in ipairs(GetPlayers()) do
            local license = GetPlayerIdentifierByType(playerId, 'license')
            
            -- Only send linked players
            if CADSync.LinkedPlayers[license] then
                local ped = GetPlayerPed(playerId)
                local coords = GetEntityCoords(ped)
                local heading = GetEntityHeading(ped)
                
                table.insert(blips, {
                    identifier = license,
                    x = coords.x,
                    y = coords.y,
                    z = coords.z,
                    heading = heading,
                    license = license,
                    inVehicle = IsPedInAnyVehicle(ped, false),
                })
            end
        end
        
        -- Send to CAD if we have blips
        if #blips > 0 then
            SendBlipsToCAD(blips)
        end
    end
end)

-- Function: Send blips to CAD
function SendBlipsToCAD(blips)
    local url = Config.API.BaseURL .. '/api/fivem/update-map'
    local payload = {
        blips = blips,
    }
    
    log('debug', string.format('Sending %d blips to CAD', #blips))
    
    PerformHttpRequest(url, function(code, body, headers)
        if code >= 200 and code < 300 then
            log('debug', string.format('Blips sent successfully: %d units', #blips))
        else
            log('warn', string.format('Failed to send blips: HTTP %d', code))
        end
    end, 'POST', json.encode(payload), {
        ['Content-Type'] = 'application/json',
    }, Config.API.Timeout)
end

-- Event: Sync coordinates from client
RegisterNetEvent('cad_sync:server:syncCoordinates', function(data)
    local source = source
    local license = data.license
    
    -- Verify player is linked
    if not CADSync.LinkedPlayers[license] then
        return
    end
    
    -- Send individual blip to CAD
    local blip = {
        identifier = license,
        x = data.x,
        y = data.y,
        z = data.z,
        heading = data.heading,
        license = license,
        inVehicle = data.inVehicle,
    }
    
    SendBlipsToCAD({ blip })
    
    -- Confirm to client
    TriggerClientEvent('cad_sync:client:coordinatesSynced', source, true)
end)

log('info', 'Server main.lua loaded')

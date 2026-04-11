-- CAD Sync Server Main
-- Core server logic and initialization

-- Load locale files
local locale = Config.Locale or 'en'
Locales = {}

-- Load English locale
local enLocale = load(LoadResourceFile(GetCurrentResourceName(), 'locales/en.lua'))
if enLocale then
    Locales['en'] = enLocale()
end

-- Load Russian locale
local ruLocale = load(LoadResourceFile(GetCurrentResourceName(), 'locales/ru.lua'))
if ruLocale then
    Locales['ru'] = ruLocale()
end

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

-- Initialize system
Citizen.CreateThread(function()
    Wait(1000)
    log('info', 'Initializing CAD Sync system...')
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
    log('info', string.format('Validating API ID format: %s (length: %d)', apiId, #apiId))
    local isValidFormat = ValidateApiIdFormat(apiId)
    log('info', string.format('Format validation result: %s', isValidFormat and 'VALID' or 'INVALID'))
    if not isValidFormat then
        TriggerClientEvent('cad_sync:client:linkFailed', source, 'Invalid API ID format')
        return
    end
    
    -- Check if API ID is already linked to another account
    log('info', string.format('Checking if API ID %s is already linked', apiId))
    local existingLink = GetCADLinkByApiId(apiId)
    if existingLink then
        log('warn', string.format('API ID %s already linked to another account', apiId))
        TriggerClientEvent('cad_sync:client:linkFailed', source, 'API ID already linked to another account')
        return
    end
    log('info', string.format('API ID %s not linked, creating direct link', apiId))

    -- Create link in database (skip CAD validation for now)
    log('info', string.format('Calling CreateCADLink with license=%s, apiId=%s', license, apiId))
    local success, error = CreateCADLink(license, apiId)
    log('info', string.format('CreateCADLink result: success=%s, error=%s', tostring(success), error or 'nil'))
    if success then
        log('info', string.format('CADSync.LinkedPlayers after link: %s', json.encode(CADSync.LinkedPlayers)))
        TriggerClientEvent('cad_sync:client:linkSuccess', source, apiId)
        -- Set KVP for client to check
        TriggerClientEvent('cad_sync:client:setLinked', source, true)
        log('info', string.format('Player %s linked account with API ID: %s', GetPlayerName(source), apiId))
    else
        log('error', string.format('CreateCADLink failed: %s', error or 'Database error'))
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

    log('info', string.format('Unlink request from license: %s', license))

    local count = 0
    for _ in pairs(CADSync.LinkedPlayers or {}) do
        count = count + 1
    end
    log('info', string.format('Linked players count: %d', count))

    -- Check if linked
    if not CADSync.LinkedPlayers[license] then
        log('warn', string.format('License %s not found in LinkedPlayers', license))
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

-- Event: Unit attaches to call
RegisterNetEvent('cad_sync:server:attachToCall', function(callId)
    local source = source
    local license = GetPlayerIdentifierByType(source, 'license')

    log('info', string.format('attachToCall: source=%d, callId=%d, license=%s', source, callId, license or 'nil'))
    log('info', string.format('CADSync.LinkedPlayers: %s', json.encode(CADSync.LinkedPlayers)))

    -- Verify player is linked
    if not CADSync.LinkedPlayers[license] then
        log('warn', string.format('Player %s not linked', license or 'unknown'))
        TriggerClientEvent('cad_sync:notification', source, 'error', 'You must link your CAD account first')
        return
    end

    -- Verify call exists
    if not CADSync.ActiveCalls[callId] then
        log('warn', string.format('Call %d not found in ActiveCalls', callId))
        log('info', string.format('Active calls: %s', json.encode(CADSync.ActiveCalls)))
        TriggerClientEvent('cad_sync:notification', source, 'error', 'Call not found')
        return
    end

    -- Check if already attached
    for _, unitId in ipairs(CADSync.AttachedUnits[callId] or {}) do
        if unitId == source then
            TriggerClientEvent('cad_sync:notification', source, 'warn', 'You are already attached to this call')
            return
        end
    end

    -- Attach unit
    if not CADSync.AttachedUnits[callId] then
        CADSync.AttachedUnits[callId] = {}
    end
    table.insert(CADSync.AttachedUnits[callId], source)

    if not CADSync.ActiveCalls[callId].units then
        CADSync.ActiveCalls[callId].units = {}
    end
    table.insert(CADSync.ActiveCalls[callId].units, source)

    log('info', string.format('Unit %d attached to call %d', source, callId))

    -- Notify CAD backend about unit attachment
    local license = GetPlayerIdentifierByType(source, 'license')
    local apiId = CADSync.LinkedPlayers[license] and CADSync.LinkedPlayers[license].api_id
    if apiId then
        -- First attach the unit
        local url = Config.API.BaseURL .. '/api/calls911/' .. callId .. '/attach'
        local payload = {
            api_id = apiId,
            license = license,
        }
        PerformHttpRequest(url, function(code, body, headers)
            if code >= 200 and code < 300 then
                log('info', string.format('Unit attachment synced to CAD: call %d, unit %d', callId, source))

                -- Then set as main unit
                local mainUnitUrl = Config.API.BaseURL .. '/api/calls911/' .. callId .. '/main-unit'
                local mainUnitPayload = {
                    userId = apiId,
                }
                PerformHttpRequest(mainUnitUrl, function(mainCode, mainBody, mainHeaders)
                    if mainCode >= 200 and mainCode < 300 then
                        log('info', string.format('Unit set as main unit in CAD: call %d, unit %d', callId, source))
                    else
                        log('warn', string.format('Failed to set main unit in CAD: HTTP %d', mainCode))
                    end
                end, 'PATCH', json.encode(mainUnitPayload), {
                    ['Content-Type'] = 'application/json',
                    ['X-API-Key'] = Config.API.APIKey,
                }, {
                    timeout = Config.API.Timeout
                })
            else
                log('warn', string.format('Failed to sync attachment to CAD: HTTP %d', code))
            end
        end, 'POST', json.encode(payload), {
            ['Content-Type'] = 'application/json',
            ['X-API-Key'] = Config.API.APIKey,
        }, {
            timeout = Config.API.Timeout
        })
    end

    -- Show UI card to player
    log('info', string.format('Sending showCallCard to player %d for call %d', source, callId))
    local callData = CADSync.ActiveCalls[callId]
    callData.x = callData.coordinates.x
    callData.y = callData.coordinates.y
    callData.z = callData.coordinates.z
    TriggerClientEvent('cad_sync:showCallCard', source, callId, callData)

    -- Update all clients
    TriggerClientEvent('cad_sync:callUpdated', -1, callId, CADSync.ActiveCalls[callId])
end)

-- Event: Unit detaches from call
RegisterNetEvent('cad_sync:server:detachFromCall', function(callId)
    local source = source

    if not CADSync.ActiveCalls[callId] or not CADSync.AttachedUnits[callId] then
        return
    end

    -- Remove unit from call
    for i, unitId in ipairs(CADSync.AttachedUnits[callId]) do
        if unitId == source then
            table.remove(CADSync.AttachedUnits[callId], i)
            break
        end
    end

    if CADSync.ActiveCalls[callId].units then
        for i, unitId in ipairs(CADSync.ActiveCalls[callId].units) do
            if unitId == source then
                table.remove(CADSync.ActiveCalls[callId].units, i)
                break
            end
        end
    end

    log('info', string.format('Unit %d detached from call %d', source, callId))

    -- Notify CAD backend about unit detachment
    local license = GetPlayerIdentifierByType(source, 'license')
    local apiId = CADSync.LinkedPlayers[license] and CADSync.LinkedPlayers[license].api_id
    if apiId then
        local url = Config.API.BaseURL .. '/api/calls911/' .. callId .. '/detach'
        local payload = {
            api_id = apiId,
            license = license,
        }
        PerformHttpRequest(url, function(code, body, headers)
            if code >= 200 and code < 300 then
                log('info', string.format('Unit detachment synced to CAD: call %d, unit %d', callId, source))
            else
                log('warn', string.format('Failed to sync detachment to CAD: HTTP %d', code))
            end
        end, 'POST', json.encode(payload), {
            ['Content-Type'] = 'application/json',
        }, {
            timeout = Config.API.Timeout
        })
    end

    -- Hide UI card
    TriggerClientEvent('cad_sync:hideCallCard', source)

    -- Update all clients
    TriggerClientEvent('cad_sync:callUpdated', -1, callId, CADSync.ActiveCalls[callId])
end)

-- Event: Create 911 call
RegisterNetEvent('cad_sync:server:create911Call', function(callType, description, location, coords)
    local source = source
    local license = GetPlayerIdentifierByType(source, 'license')

    log('info', string.format('create911Call: source=%d, callType=%s, description=%s, location=%s', source, callType, description, location))

    -- Verify player is linked
    if not CADSync.LinkedPlayers[license] then
        log('warn', string.format('Player %s not linked', license or 'unknown'))
        TriggerClientEvent('cad_sync:notification', source, 'error', 'You must link your CAD account first')
        return
    end

    -- Get player info
    local playerName = GetPlayerName(source)
    local apiId = CADSync.LinkedPlayers[license].api_id

    -- Send to CAD backend
    local url = Config.API.BaseURL .. '/api/calls911/create'
    local payload = {
        callerName = playerName,
        location = location,
        description = description,
        type = callType,
        x = coords.x,
        y = coords.y,
        z = coords.z,
        source = 'fivem',
        callType = 'police',
    }

    PerformHttpRequest(url, function(code, body, headers)
        if code >= 200 and code < 300 then
            log('info', string.format('911 call created in CAD: %s', description))
            TriggerClientEvent('cad_sync:notification', source, 'success', '911 call created successfully')
        else
            log('warn', string.format('Failed to create 911 call in CAD: HTTP %d', code))
            TriggerClientEvent('cad_sync:notification', source, 'error', 'Failed to create 911 call')
        end
    end, 'POST', json.encode(payload), {
        ['Content-Type'] = 'application/json',
        ['X-API-Key'] = Config.API.APIKey,
    }, {
        timeout = Config.API.Timeout
    })
end)

-- Event: Unit closes call
RegisterNetEvent('cad_sync:server:closeCall', function(callId)
    local source = source

    if not CADSync.ActiveCalls[callId] then
        return
    end

    -- Check if unit is attached
    local isAttached = false
    for _, unitId in ipairs(CADSync.AttachedUnits[callId] or {}) do
        if unitId == source then
            isAttached = true
            break
        end
    end

    if not isAttached then
        TriggerClientEvent('cad_sync:notification', source, 'error', 'You must be attached to this call')
        return
    end

    log('info', string.format('Unit %d closed call %d', source, callId))

    -- Update call status
    CADSync.ActiveCalls[callId].status = 'closed'

    -- Hide UI for all attached units
    for _, unitId in ipairs(CADSync.AttachedUnits[callId]) do
        TriggerClientEvent('cad_sync:hideCallCard', unitId)
    end

    -- Update all clients
    TriggerClientEvent('cad_sync:callUpdated', -1, callId, CADSync.ActiveCalls[callId])
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
    }, {
        timeout = Config.API.Timeout
    })
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
    }, {
        timeout = Config.API.Timeout
    })
end

-- Event: Sync coordinates from client
RegisterNetEvent('cad_sync:server:syncCoordinates', function(data)
    local source = source
    local license = GetPlayerIdentifierByType(source, 'license')

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

-- Periodic coordinate sync for attached units
Citizen.CreateThread(function()
    while true do
        Wait(Config.OneSync.SyncInterval)

        if not Config.OneSync.CoordinateSync then
            goto continue
        end

        -- Sync coordinates for all attached units
        for callId, attachedUnits in pairs(CADSync.AttachedUnits) do
            for _, playerId in ipairs(attachedUnits) do
                if CADSync.ActiveCalls[callId] then
                    local ped = GetPlayerPed(playerId)
                    if DoesEntityExist(ped) then
                        local coords = GetEntityCoords(ped)
                        SendCoordinatesToCAD(playerId, callId, coords)
                    end
                end
            end
        end

        ::continue::
    end
end)

-- Poll for active calls from CAD
Citizen.CreateThread(function()
    Wait(5000)
    log('info', 'Polling thread starting...')

    while true do
        Wait(Config.OneSync.SyncInterval)

        if not Config.OneSync.CoordinateSync then
            goto continue
        end

        local url = Config.API.BaseURL .. '/api/calls911/active'

        PerformHttpRequest(url, function(code, body, headers)
            log('info', string.format('Polling active calls: HTTP %d', code))
            if code == 200 then
                local success, data = pcall(json.decode, body)
                if success and data and data.calls then
                    log('info', string.format('Received %d active calls from CAD', #data.calls))
                    -- Update active calls
                    for _, call in ipairs(data.calls) do
                        if not CADSync.ActiveCalls[call.id] then
                            -- New call
                            CADSync.ActiveCalls[call.id] = {
                                id = call.id,
                                type = call.type,
                                address = call.location,
                                description = call.description,
                                phone = call.phoneNumber,
                                priority = call.priority,
                                coordinates = { x = call.x or 0, y = call.y or 0, z = call.z or 0 },
                                status = call.status,
                                created_at = call.createdAt,
                                units = {},
                            }
                            CADSync.AttachedUnits[call.id] = {}

                            log('info', string.format('New 911 call #%d: %s at %s', call.id, call.type, call.location))

                            -- Broadcast to all players with required roles
                            local players = GetPlayers()
                            for _, playerId in ipairs(players) do
                                local hasRole = false
                                for _, role in ipairs(Config.Notifications.AllowedRoles) do
                                    if IsPlayerAceAllowed(playerId, role) then
                                        hasRole = true
                                        break
                                    end
                                end
                                if hasRole then
                                    TriggerClientEvent('cad_sync:newCall', playerId, CADSync.ActiveCalls[call.id])
                                end
                            end
                        else
                            -- Update existing call
                            CADSync.ActiveCalls[call.id].status = call.status
                            CADSync.ActiveCalls[call.id].priority = call.priority

                            -- Sync attached units from CAD
                            if call.units then
                                log('info', string.format('Call %d has %d units from CAD', call.id, #call.units))
                                CADSync.AttachedUnits[call.id] = {}
                                CADSync.ActiveCalls[call.id].units = {}

                                for _, unit in ipairs(call.units) do
                                    log('info', string.format('Unit from CAD: %s', json.encode(unit)))
                                    -- Find player by license
                                    local players = GetPlayers()
                                    for _, playerId in ipairs(players) do
                                        local license = GetPlayerIdentifierByType(playerId, 'license')
                                        log('info', string.format('Player %d has license: %s', playerId, license or 'nil'))
                                        if license and unit.user and unit.user.license == license then
                                            table.insert(CADSync.AttachedUnits[call.id], playerId)
                                            table.insert(CADSync.ActiveCalls[call.id].units, playerId)

                                            -- Show UI to attached player
                                            log('info', string.format('Showing UI to player %d for call %d (synced from CAD)', playerId, call.id))
                                            TriggerClientEvent('cad_sync:showCallCard', playerId, call.id, CADSync.ActiveCalls[call.id])
                                        end
                                    end
                                end
                            else
                                log('info', string.format('Call %d has no units from CAD', call.id))
                            end
                        end
                    end
                else
                    log('error', string.format('Failed to parse active calls response: %s', body))
                end
            else
                log('warn', string.format('Failed to fetch active calls: HTTP %d', code))
            end
        end, 'GET', nil, {
            ['Content-Type'] = 'application/json',
            ['X-API-Key'] = Config.API.APIKey,
        }, {
            timeout = Config.API.Timeout
        })

        ::continue::
    end
end)

-- CAD Sync Commands Module
-- Handles chat commands for CAD linking

local locale = Config.Locale or 'en'
local function t(key, ...)
    if Locales[locale] and Locales[locale][key] then
        return string.format(Locales[locale][key], ...)
    end
    return key
end

-- Cooldown tracking for 911 calls (in milliseconds)
local CALL_COOLDOWN = 30000 -- 30 seconds
local lastCallTime = 0

-- Command: /cad-link [api_id]
RegisterCommand('cad-link', function(source, args, rawCommand)
    local timer = GetGameTimer()

    local apiId = args[1]

    if not apiId then
        TriggerEvent('cad_sync:notification', 'warn', t('cad_link_usage'))
        return
    end

    -- Send to server for validation (server handles format validation)
    TriggerServerEvent('cad_sync:server:linkAccount', apiId)
    
    local elapsed = GetGameTimer() - timer
    if elapsed > 5 then
        print(string.format('^3[CAD Sync]^7 Command /cad-link took %0.3fms', elapsed))
    end
end, false)

-- Command: /cad-unlink
RegisterCommand('cad-unlink', function(source, args, rawCommand)
    local timer = GetGameTimer()

    -- Send to server
    TriggerServerEvent('cad_sync:server:unlinkAccount')
    
    local elapsed = GetGameTimer() - timer
    if elapsed > 5 then
        print(string.format('^3[CAD Sync]^7 Command /cad-unlink took %0.3fms', elapsed))
    end
end, false)

-- Command: /accept-call [id]
RegisterCommand('accept-call', function(source, args, rawCommand)
    local timer = GetGameTimer()

    local callId = tonumber(args[1])

    if not callId then
        TriggerEvent('cad_sync:notification', 'warn', 'Usage: /accept-call [call_id]')
        return
    end

    -- Send to server
    TriggerServerEvent('cad_sync:server:attachToCall', callId)

    local elapsed = GetGameTimer() - timer
    if elapsed > 5 then
        print(string.format('^3[CAD Sync]^7 Command /accept-call took %0.3fms', elapsed))
    end
end, false)

-- Command: /9111 [type] [description]
RegisterCommand('9111', function(source, args, rawCommand)
    local timer = GetGameTimer()

    -- Check cooldown
    local currentTime = GetGameTimer()
    local timeSinceLastCall = currentTime - lastCallTime
    if timeSinceLastCall < CALL_COOLDOWN then
        local remainingTime = math.ceil((CALL_COOLDOWN - timeSinceLastCall) / 1000)
        TriggerEvent('cad_sync:notification', 'error', string.format('Подождите %d сек. перед следующим вызовом', remainingTime))
        return
    end

    local callType = args[1] or 'emergency'
    local description = table.concat(args, ' ', 2)

    if not description or description == '' then
        TriggerEvent('cad_sync:notification', 'warn', 'Usage: /9111 [type] [description]')
        return
    end

    -- Get player coordinates
    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)

    -- Get location name (street name)
    local street = GetStreetNameAtCoord(coords.x, coords.y, coords.z)
    local location = GetStreetNameFromHashKey(street)

    -- Update last call time
    lastCallTime = currentTime

    -- Send to server
    TriggerServerEvent('cad_sync:server:create911Call', callType, description, location, coords)

    local elapsed = GetGameTimer() - timer
    if elapsed > 5 then
        print(string.format('^3[CAD Sync]^7 Command /9111 took %0.3fms', elapsed))
    end
end, false)

-- Command: /detach-call
RegisterCommand('detach-call', function(source, args, rawCommand)
    local timer = GetGameTimer()

    -- Send to server with current call
    if ClientState and ClientState.CurrentCall then
        TriggerServerEvent('cad_sync:server:detachFromCall', ClientState.CurrentCall.id)
    else
        TriggerEvent('cad_sync:notification', 'warn', 'You are not attached to any call')
    end
    
    local elapsed = GetGameTimer() - timer
    if elapsed > 5 then
        print(string.format('^3[CAD Sync]^7 Command /detach-call took %0.3fms', elapsed))
    end
end, false)

-- Command: /close-call
RegisterCommand('close-call', function(source, args, rawCommand)
    local timer = GetGameTimer()

    -- Send to server with current call
    if ClientState and ClientState.CurrentCall then
        TriggerServerEvent('cad_sync:server:closeCall', ClientState.CurrentCall.id)
    else
        TriggerEvent('cad_sync:notification', 'warn', 'You are not attached to any call')
    end
    
    local elapsed = GetGameTimer() - timer
    if elapsed > 5 then
        print(string.format('^3[CAD Sync]^7 Command /close-call took %0.3fms', elapsed))
    end
end, false)

-- Server event handlers for command responses
RegisterNetEvent('cad_sync:client:linkSuccess', function(apiId)
    TriggerEvent('cad_sync:notification', 'success', string.format(t('cad_link_success'), apiId))
end)

RegisterNetEvent('cad_sync:client:linkFailed', function(reason)
    TriggerEvent('cad_sync:notification', 'error', reason or t('cad_link_failed'))
end)

RegisterNetEvent('cad_sync:client:unlinkSuccess', function()
    TriggerEvent('cad_sync:notification', 'success', t('cad_unlink_success'))
end)

RegisterNetEvent('cad_sync:client:unlinkFailed', function(reason)
    TriggerEvent('cad_sync:notification', 'error', reason or t('cad_unlink_not_linked'))
end)

print('^2[CAD Sync]^7 Client commands.lua loaded')

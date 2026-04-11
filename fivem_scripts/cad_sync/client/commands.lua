-- CAD Sync Commands Module
-- Handles chat commands for CAD linking

local locale = Config.Locale or 'en'
local function t(key, ...)
    if Locales[locale] and Locales[locale][key] then
        return string.format(Locales[locale][key], ...)
    end
    return key
end

-- Command: /cad-link [api_id]
RegisterCommand('cad-link', function(source, args, rawCommand)
    local timer = GetGameTimer()
    
    if source == 0 then
        print('^3[CAD Sync]^7 This command can only be used by players')
        return
    end
    
    local apiId = args[1]
    
    if not apiId then
        TriggerEvent('cad_sync:notification', 'warn', t('cad_link_usage'))
        return
    end
    
    -- Validate format
    local isValidFormat = ValidateApiIdFormat(apiId)
    if not isValidFormat then
        TriggerEvent('cad_sync:notification', 'error', t('cad_link_invalid'))
        return
    end
    
    -- Check if already linked
    local license = GetPlayerIdentifierByType(source, 'license')
    if CADSync.LinkedPlayers and CADSync.LinkedPlayers[license] then
        TriggerEvent('cad_sync:notification', 'warn', t('cad_link_already'))
        return
    end
    
    -- Send to server for validation
    TriggerServerEvent('cad_sync:server:linkAccount', apiId)
    
    local elapsed = GetGameTimer() - timer
    if elapsed > 5 then
        print(string.format('^3[CAD Sync]^7 Command /cad-link took %0.3fms', elapsed))
    end
end, false)

-- Command: /cad-unlink
RegisterCommand('cad-unlink', function(source, args, rawCommand)
    local timer = GetGameTimer()
    
    if source == 0 then
        print('^3[CAD Sync]^7 This command can only be used by players')
        return
    end
    
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
    
    if source == 0 then
        print('^3[CAD Sync]^7 This command can only be used by players')
        return
    end
    
    local callId = tonumber(args[1])
    
    if not callId then
        TriggerEvent('cad_sync:notification', 'warn', 'Usage: /accept-call [call_id]')
        return
    end
    
    -- Check if player has required role
    local hasRole = false
    for _, role in ipairs(Config.Notifications.AllowedRoles) do
        if IsPlayerAceAllowed(source, role) then
            hasRole = true
            break
        end
    end
    
    if not hasRole then
        TriggerEvent('cad_sync:notification', 'error', t('error_permission'))
        return
    end
    
    -- Send to server
    TriggerServerEvent('cad_sync:server:attachToCall', callId)
    
    local elapsed = GetGameTimer() - timer
    if elapsed > 5 then
        print(string.format('^3[CAD Sync]^7 Command /accept-call took %0.3fms', elapsed))
    end
end, false)

-- Command: /detach-call
RegisterCommand('detach-call', function(source, args, rawCommand)
    local timer = GetGameTimer()
    
    if source == 0 then
        print('^3[CAD Sync]^7 This command can only be used by players')
        return
    end
    
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
    
    if source == 0 then
        print('^3[CAD Sync]^7 This command can only be used by players')
        return
    end
    
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

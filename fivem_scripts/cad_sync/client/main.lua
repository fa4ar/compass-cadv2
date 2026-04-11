-- CAD Sync Client Main
-- Core client-side logic

local locale = Config.Locale or 'en'
local function t(key, ...)
    if Locales[locale] and Locales[locale][key] then
        return string.format(Locales[locale][key], ...)
    end
    return key
end

-- Client state
local ClientState = {
    CurrentCall = nil,
    IsCardVisible = false,
    LastUpdate = 0,
    BlipHandle = nil,
    SoundHandle = nil,
}

-- Performance monitoring
local function startPerfTimer()
    return GetGameTimer()
end

local function endPerfTimer(startTime)
    local elapsed = GetGameTimer() - startTime
    if elapsed > (ClientState.IsCardVisible and Config.UI.MaxActiveTime or Config.UI.MaxIdleTime) then
        print(string.format('^3[CAD Sync] Performance warning: %0.3fms exceeded limit of %0.2fms^7', 
            elapsed / 1000, 
            ClientState.IsCardVisible and Config.UI.MaxActiveTime or Config.UI.MaxIdleTime))
    end
    return elapsed
end

-- Initialize client
Citizen.CreateThread(function()
    Wait(1000)
    print('^2[CAD Sync]^7 Client initialized')
end)

-- Event: Show notification from server
RegisterNetEvent('cad_sync:notification', function(type, message)
    local timer = startPerfTimer()
    
    if type == 'success' then
        -- Use framework notification or custom
        SetNotificationTextEntry('STRING')
        AddTextComponentString(message)
        DrawNotification(false, false)
    elseif type == 'error' then
        SetNotificationTextEntry('STRING')
        AddTextComponentString('~r~' .. message)
        DrawNotification(false, false)
    elseif type == 'warn' then
        SetNotificationTextEntry('STRING')
        AddTextComponentString('~y~' .. message)
        DrawNotification(false, false)
    else
        SetNotificationTextEntry('STRING')
        AddTextComponentString(message)
        DrawNotification(false, false)
    end
    
    endPerfTimer(timer)
end)

-- Event: Show call card
RegisterNetEvent('cad_sync:showCallCard', function(callId, callData)
    local timer = startPerfTimer()
    
    ClientState.CurrentCall = callData
    ClientState.IsCardVisible = true
    ClientState.LastUpdate = GetGameTimer()
    
    -- Send data to NUI
    SendNUIMessage({
        type = 'showCard',
        call = callData,
        locale = locale,
    })
    
    -- Create blip if coordinates available
    if Config.Notifications.BlipEnabled and callData.coordinates then
        local coords = callData.coordinates
        ClientState.BlipHandle = AddBlipForCoord(coords.x, coords.y, coords.z)
        SetBlipSprite(ClientState.BlipHandle, Config.Notifications.BlipSprite)
        SetBlipColour(ClientState.BlipHandle, Config.Notifications.BlipColor)
        SetBlipScale(ClientState.BlipHandle, Config.Notifications.BlipScale)
        SetBlipAsShortRange(ClientState.BlipHandle, true)
        BeginTextCommandSetBlipName('STRING')
        AddTextComponentString('911 Call #' .. callId)
        EndTextCommandSetBlipName(ClientState.BlipHandle)
        
        -- Remove blip after duration
        SetTimeout(Config.Notifications.BlipDuration, function()
            if ClientState.BlipHandle then
                RemoveBlip(ClientState.BlipHandle)
                ClientState.BlipHandle = nil
            end
        end)
    end
    
    endPerfTimer(timer)
end)

-- Event: Hide call card
RegisterNetEvent('cad_sync:hideCallCard', function()
    local timer = startPerfTimer()
    
    ClientState.CurrentCall = nil
    ClientState.IsCardVisible = false
    
    -- Hide NUI
    SendNUIMessage({
        type = 'hideCard',
    })
    
    -- Remove blip
    if ClientState.BlipHandle then
        RemoveBlip(ClientState.BlipHandle)
        ClientState.BlipHandle = nil
    end
    
    endPerfTimer(timer)
end)

-- Event: Call updated
RegisterNetEvent('cad_sync:callUpdated', function(callId, callData)
    local timer = startPerfTimer()
    
    if ClientState.CurrentCall and ClientState.CurrentCall.id == callId then
        ClientState.CurrentCall = callData
        ClientState.LastUpdate = GetGameTimer()
        
        -- Update NUI
        SendNUIMessage({
            type = 'updateCard',
            call = callData,
        })
    end
    
    endPerfTimer(timer)
end)

-- Event: New call received
RegisterNetEvent('cad_sync:newCall', function(callData)
    local timer = startPerfTimer()
    
    -- Play sound
    if Config.Notifications.SoundEnabled then
        PlaySoundFrontend(-1, 'SELECT', 'HUD_FRONTEND_DEFAULT_SOUNDSET', true)
    end
    
    -- Show notification
    local notification = string.format('911 Call #%d: %s at %s', callData.id, callData.type, callData.address)
    SetNotificationTextEntry('STRING')
    AddTextComponentString(notification)
    DrawNotification(false, false)
    
    -- Create temporary blip
    if Config.Notifications.BlipEnabled and callData.coordinates then
        local coords = callData.coordinates
        local blip = AddBlipForCoord(coords.x, coords.y, coords.z)
        SetBlipSprite(blip, Config.Notifications.BlipSprite)
        SetBlipColour(blip, Config.Notifications.BlipColor)
        SetBlipScale(blip, Config.Notifications.BlipScale)
        SetBlipAsShortRange(blip, true)
        SetBlipFlashInterval(blip, 500)
        BeginTextCommandSetBlipName('STRING')
        AddTextComponentString('911 Call #' .. callData.id)
        EndTextCommandSetBlipName(blip)
        
        -- Remove after duration
        SetTimeout(Config.Notifications.BlipDuration, function()
            RemoveBlip(blip)
        end)
    end
    
    endPerfTimer(timer)
end)

-- Auto-hide card after inactivity
Citizen.CreateThread(function()
    while true do
        Wait(1000)
        
        if ClientState.IsCardVisible and Config.UI.AutoHide > 0 then
            local inactiveTime = GetGameTimer() - ClientState.LastUpdate
            if inactiveTime > Config.UI.AutoHide then
                TriggerEvent('cad_sync:hideCallCard')
            end
        end
    end
end)

-- OneSync coordinate sync
if Config.OneSync.Enabled and Config.OneSync.CoordinateSync then
    Citizen.CreateThread(function()
        while true do
            Wait(Config.OneSync.SyncInterval)
            
            if ClientState.IsCardVisible and ClientState.CurrentCall then
                local ped = PlayerPedId()
                local coords = GetEntityCoords(ped)
                
                -- Send coordinates to server for sync
                TriggerServerEvent('cad_sync:server:updateCoordinates', ClientState.CurrentCall.id, coords)
            end
        end
    end)
end

print('^2[CAD Sync]^7 Client main.lua loaded')

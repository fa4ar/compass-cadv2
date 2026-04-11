-- CAD Sync Notifications Module
-- Handles 911 call notifications and alerts

local locale = Config.Locale or 'en'
local function t(key, ...)
    if Locales[locale] and Locales[locale][key] then
        return string.format(Locales[locale][key], ...)
    end
    return key
end

-- Notification queue
local NotificationQueue = {}
local IsDisplayingNotification = false

-- Display notification with custom UI
local function DisplayCustomNotification(callData)
    SendNUIMessage({
        type = 'showNotification',
        call = callData,
        duration = Config.Notifications.Duration,
        locale = locale,
    })
end

-- Play notification sound
local function PlayNotificationSound()
    if not Config.Notifications.SoundEnabled then
        return
    end
    
    -- Play sound through NUI
    SendNUIMessage({
        type = 'playSound',
        sound = Config.Notifications.SoundFile,
        volume = Config.Notifications.SoundVolume,
    })
end

-- Create flashing blip on minimap
local function CreateEmergencyBlip(callData)
    if not Config.Notifications.BlipEnabled then
        return
    end
    
    if not callData.coordinates then
        return
    end
    
    local coords = callData.coordinates
    local blip = AddBlipForCoord(coords.x, coords.y, coords.z)
    
    SetBlipSprite(blip, Config.Notifications.BlipSprite)
    SetBlipColour(blip, Config.Notifications.BlipColor)
    SetBlipScale(blip, Config.Notifications.BlipScale)
    SetBlipAsShortRange(blip, true)
    SetBlipFlashInterval(blip, 500)
    SetBlipFlashes(blip, true)
    
    -- Set blip name
    BeginTextCommandSetBlipName('STRING')
    AddTextComponentString(string.format('911 - %s', callData.type))
    EndTextCommandSetBlipName(blip)
    
    -- Set route if player wants to navigate
    SetBlipRoute(blip, true)
    SetBlipRouteColour(blip, Config.Notifications.BlipColor)
    
    -- Remove blip after duration
    SetTimeout(Config.Notifications.BlipDuration, function()
        if DoesBlipExist(blip) then
            RemoveBlip(blip)
        end
    end)
    
    return blip
end

-- Event: New call notification (enhanced)
RegisterNetEvent('cad_sync:newCall', function(callData)
    local timer = GetGameTimer()

    print('^2[CAD Sync]^7 Received newCall event for call #' .. callData.id)

    -- Play sound
    PlayNotificationSound()
    
    -- Create blip
    local blip = CreateEmergencyBlip(callData)
    
    -- Show custom notification
    DisplayCustomNotification(callData)
    
    -- Also show GTA notification for backup
    local notificationText = string.format('~b~911 Call #%d~w~\n%s\n%s', 
        callData.id, 
        callData.type, 
        callData.address
    )
    
    SetNotificationTextEntry('STRING')
    AddTextComponentString(notificationText)
    DrawNotification(false, true)
    
    local elapsed = GetGameTimer() - timer
    if elapsed > 10 then
        print(string.format('^3[CAD Sync]^7 Notification took %0.3fms', elapsed))
    end
end)

-- Event: Priority alert for high-priority calls
RegisterNetEvent('cad_sync:priorityAlert', function(callData)
    local timer = GetGameTimer()
    
    -- Play sound multiple times for priority
    PlayNotificationSound()
    Wait(200)
    PlayNotificationSound()
    
    -- Create larger, more visible blip
    if Config.Notifications.BlipEnabled and callData.coordinates then
        local coords = callData.coordinates
        local blip = AddBlipForCoord(coords.x, coords.y, coords.z)
        
        SetBlipSprite(blip, 304) -- Priority blip
        SetBlipColour(blip, 5) -- Yellow/Orange
        SetBlipScale(blip, 1.5)
        SetBlipAsShortRange(blip, false)
        SetBlipFlashes(blip, true)
        SetBlipFlashInterval(blip, 200)
        
        BeginTextCommandSetBlipName('STRING')
        AddTextComponentString('PRIORITY: ' .. callData.type)
        EndTextCommandSetBlipName(blip)
        
        SetTimeout(Config.Notifications.BlipDuration * 2, function()
            if DoesBlipExist(blip) then
                RemoveBlip(blip)
            end
        end)
    end
    
    -- Show alert
    local alertText = string.format('~r~PRIORITY ALERT~w~\nCall #%d\n%s\n%s', 
        callData.id, 
        callData.type, 
        callData.address
    )
    
    SetNotificationTextEntry('STRING')
    AddTextComponentString(alertText)
    DrawNotification(false, true)
    
    local elapsed = GetGameTimer() - timer
    if elapsed > 10 then
        print(string.format('^3[CAD Sync]^7 Priority alert took %0.3fms', elapsed))
    end
end)

-- Event: Call status update notification
RegisterNetEvent('cad_sync:callStatusUpdate', function(callId, oldStatus, newStatus)
    if ClientState and ClientState.CurrentCall and ClientState.CurrentCall.id == callId then
        local statusText = string.format('Call #%d status: %s -> %s', callId, oldStatus, newStatus)
        SetNotificationTextEntry('STRING')
        AddTextComponentString(statusText)
        DrawNotification(false, false)
    end
end)

-- Event: Unit attached notification
RegisterNetEvent('cad_sync:unitAttached', function(callId, unitName)
    if ClientState and ClientState.CurrentCall and ClientState.CurrentCall.id == callId then
        local text = string.format('%s attached to call', unitName)
        SetNotificationTextEntry('STRING')
        AddTextComponentString(text)
        DrawNotification(false, false)
    end
end)

-- Event: Unit detached notification
RegisterNetEvent('cad_sync:unitDetached', function(callId, unitName)
    if ClientState and ClientState.CurrentCall and ClientState.CurrentCall.id == callId then
        local text = string.format('%s detached from call', unitName)
        SetNotificationTextEntry('STRING')
        AddTextComponentString(text)
        DrawNotification(false, false)
    end
end)

print('^2[CAD Sync]^7 Client notifications.lua loaded')

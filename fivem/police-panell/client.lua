-- =====================================================
-- COMPASS CAD POLICE PANEL - Client-side
-- UI management and display
-- =====================================================

-- Global state
local ActivePanels = {}  -- { callId = panelData }
local PanelVisible = true
local LastSoundTime = {}

-- Sound files (you'll need to add these to html/sounds/)
local Sounds = {
    newCall = "assets/sounds/new_call.mp3",
    update = "assets/sounds/update.mp3"
}

-- Initialize on resource start
AddEventHandler('onResourceStart', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        -- Load HTML/JS assets
        local htmlLoaded = LoadResourceFile(GetCurrentResourceName(), "html/index.html")
        if htmlLoaded then
            print("^2[COMPASS-PANEL] ^7HTML assets loaded")
        else
            print("^1[COMPASS-PANEL] ^7Warning: HTML file not found")
        end
    end
end)

-- ============ EVENT HANDLERS ============

-- Show call panel - ONLY when unit is attached to a call
RegisterNetEvent('compass:showCallPanel')
AddEventHandler('compass:showCallPanel', function(callData)
    local source = source
    local callId = callData.id
    
    -- Store call data
    ActivePanels[callId] = callData
    
    -- Send to UI
    SendNUIMessage({
        action = "showPanel",
        data = callData
    })
    
    -- Show toast notification instead of in-game notification
    local typeLabel = callData.type or "Вызов"
    local priorityLabel = callData.priority or "routine"
    local toastType = "info"
    
    if priorityLabel == "emergency" or priorityLabel == "high" then
        toastType = "error"
    elseif priorityLabel == "medium" then
        toastType = "warning"
    end
    
    if callData.isDispatched then
        SendNUIMessage({
            action = "showToast",
            title = "Вам назначен вызов",
            message = "#" .. callId .. " - " .. typeLabel,
            type = toastType,
            duration = 6000
        })
    else
        SendNUIMessage({
            action = "showToast",
            title = "Вы присоединились к вызову",
            message = "#" .. callId .. " - " .. typeLabel,
            type = "success",
            duration = 4000
        })
    end
end)

-- Hide call panel - when unit detaches from call OR call is closed
RegisterNetEvent('compass:hideCallPanel')
AddEventHandler('compass:hideCallPanel', function(callId)
    if not ActivePanels[callId] then return end
    
    ActivePanels[callId] = nil
    
    SendNUIMessage({
        action = "hidePanel",
        callId = callId
    })
    
    SendNUIMessage({
        action = "showToast",
        title = "Вы откреплены от вызова",
        message = "#" .. callId,
        type = "warning",
        duration = 3000
    })
end)

-- Update call data in real-time
RegisterNetEvent('compass:updateCallData')
AddEventHandler('compass:updateCallData', function(callData)
    local callId = callData.id
    
    -- Update stored data
    if ActivePanels[callId] then
        -- Check what changed for notification
        local oldData = ActivePanels[callId]
        local changed = false
        
        if callData.priority ~= oldData.priority then
            changed = true
        elseif callData.status ~= oldData.status then
            changed = true
        end
        
        ActivePanels[callId] = callData
        
        -- Send to UI
        SendNUIMessage({
            action = "updatePanel",
            data = callData,
            changed = changed
        })
        
        -- Play sound on update if flag set
        if callData.playSound and changed then
            PlaySoundAlert("update")
            SendNUIMessage({
                action = "showToast",
                title = "Обновление вызова",
                message = "#" .. callId,
                type = "info",
                duration = 4000
            })
        end
    end
end)

-- Call closed notification
RegisterNetEvent('compass:callClosedNotify')
AddEventHandler('compass:callClosedNotify', function(callId)
    ActivePanels[callId] = nil
    
    SendNUIMessage({
        action = "removePanel",
        callId = callId
    })
    
    SendNUIMessage({
        action = "showToast",
        title = "Вызов закрыт",
        message = "#" .. callId,
        type = "info",
        duration = 3000
    })
end)

-- Officer attached notification
RegisterNetEvent('compass:officerAttached')
AddEventHandler('compass:officerAttached', function(data)
    if ActivePanels[data.callId] then
        local responders = ActivePanels[data.callId].responders or {}
        table.insert(responders, {
            name = data.officerName,
            status = "enroute"
        })
        ActivePanels[data.callId].responders = responders
        
        SendNUIMessage({
            action = "updatePanel",
            data = ActivePanels[data.callId]
        })
        
        SendNUIMessage({
            action = "showToast",
            title = "Офицер присоединился",
            message = data.officerName .. " к вызову #" .. data.callId,
            type = "info",
            duration = 3000
        })
    end
end)

-- Officer detached notification
RegisterNetEvent('compass:officerDetached')
AddEventHandler('compass:officerDetached', function(data)
    if ActivePanels[data.callId] then
        local responders = ActivePanels[data.callId].responders or {}
        for i, r in ipairs(responders) do
            if r.name == data.officerName then
                table.remove(responders, i)
                break
            end
        end
        ActivePanels[data.callId].responders = responders
        
        SendNUIMessage({
            action = "updatePanel",
            data = ActivePanels[data.callId]
        })
    end
end)

-- Toggle panel visibility
RegisterNetEvent('compass:togglePanel')
AddEventHandler('compass:togglePanel', function()
    PanelVisible = not PanelVisible
    
    SendNUIMessage({
        action = "toggleVisibility",
        visible = PanelVisible
    })
end)

-- ============ COMMANDS ============

RegisterCommand('911test', function()
    -- Test: Create sample 911 call
    local testCall = {
        id = tostring(math.random(1000, 9999)),
        type = "traffic_accident",
        location = "Vinewood Blvd & Strawberry Ave",
        description = "Тяжелый удар в заднюю часть. Один человек без сознания.",
        priority = "high",
        callerName = "John Doe",
        callerPhone = "(555) 123-4567",
        createdAt = os.time() * 1000,
        status = "dispatched",
        responders = {
            { name = "Officer Johnson", status = "enroute" }
        }
    }
    
    TriggerEvent('compass:showCallPanel', testCall)
end)

-- ============ HELPER FUNCTIONS ============

function PlaySoundAlert(soundType)
    -- Prevent sound spam with cooldown
    local now = GetGameTimer()
    local lastTime = LastSoundTime[soundType] or 0
    
    if now - lastTime < 5000 then
        return  -- Cooldown active
    end
    
    LastSoundTime[soundType] = now
    
    -- Play sound (using FiveM's PlaySound)
    if soundType == "newCall" then
        PlaySound(-1, "CHARACTER_SELECT", "HUD_FRONTEND_DEFAULT_SOUNDSET", 0, 0, 1)
    elseif soundType == "update" then
        PlaySound(-1, "5_Second_Timer", "HUD_FRONTEND_DEFAULT_SOUNDSET", 0, 0, 1)
    end
end

function ShowNotification(text, urgent)
    -- Use FiveM's notification system
    SetNotificationTextEntry("STRING")
    AddTextComponentString(text)
    if urgent then
        SetNotificationMessage("CHAR_DEFAULT", "CHAR_DEFAULT", true, 1, text)
    else
        SetNotificationMessage("CHAR_DEFAULT", "CHAR_DEFAULT", false, 0, text)
    end
    DrawNotification(false, true)
end

-- ============ KEYBOARD CONTROLS ============

-- Toggle panel with F5 key
RegisterCommand('+togglePanel', function()
    PanelVisible = not PanelVisible
    SendNUIMessage({
        action = "toggleVisibility",
        visible = PanelVisible
    })
end, false)

RegisterCommand('-togglePanel', function() end, false)

-- Bind to F5
RegisterKeyMapping('+togglePanel', 'Toggle Police Panel', 'keyboard', 'F5')

print("^2[COMPASS-PANEL] ^7Client initialized")
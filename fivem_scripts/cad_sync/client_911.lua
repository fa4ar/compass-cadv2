-- =====================================================
-- CAD Sync - 911 Call Notification
-- Show left card ONLY when unit is assigned to a call
-- =====================================================

local CallUI = {
    state = { activeCall = nil, soundCooldown = 0, isAssigned = false },
    typeTranslations = {
        traffic_accident = "ДТП", disturbance = "Нарушение порядка", robbery = "Ограбление",
        assault = "Нападение", domestic = "Семейный конфликт", welfare_check = "Проверка безопасности",
        suspicious = "Подозрительная активность", fire = "Пожар", medical = "Медицинская помощь",
        accident = "Авария", other = "Другое"
    }
}

-- Show toast notification for any new 911 call (for awareness)
function CallUI:showNotification(call)
    local now = GetGameTimer()
    if now < self.state.soundCooldown then return end
    self.state.soundCooldown = now + 10000
    
    -- Play sound
    PlaySoundFrontend(-1, "Event_Message_Purple", "GTAO_FM_Events_Soundset", 0.7)
    
    -- Send toast notification only (not the full card)
    SendNUIMessage({ action = "toast", call = call })
    
    print("[CAD-911] New call notification: #" .. call.id)
end

-- Show LEFT CARD only when unit is assigned to this specific call
function CallUI:showCallPanel(call)
    self.state.activeCall = call
    self.state.isAssigned = true
    SendNUIMessage({ action = "showCall", call = call })
    
    -- Create blip on minimap
    if call.x and call.y then
        local blip = AddBlipForCoord(call.x, call.y, call.z)
        SetBlipSprite(blip, 478)
        SetBlipScale(blip, 0.9)
        SetBlipColour(blip, 4)
        SetBlipAsShortRange(blip, true)
        BeginTextCommandSetBlipName("STRING")
        AddTextComponentString("911 - " .. (call.location or ""))
        EndTextCommandSetBlipName(blip)
        
        self.state.blip = blip
    end
    
    print("[CAD-911] Assigned to call: #" .. call.id)
end

function CallUI:hideCallPanel()
    if self.state.blip then
        RemoveBlip(self.state.blip)
        self.state.blip = nil
    end
    self.state.activeCall = nil
    self.state.isAssigned = false
    SendNUIMessage({ action = "hideCall" })
end

function CallUI:updateCall(call)
    if self.state.activeCall and self.state.activeCall.id == call.id then
        self.state.activeCall = call
        SendNUIMessage({ action = "updateCall", call = call })
    end
end

-- Net Events
RegisterNetEvent('cad_sync:new911Call')
AddEventHandler('cad_sync:new911Call', function(call)
    -- Show toast notification for awareness
    CallUI:showNotification(call)
end)

RegisterNetEvent('cad_sync:callAssigned')
AddEventHandler('cad_sync:callAssigned', function(call)
    -- Show LEFT CARD only when THIS unit is assigned
    CallUI:showCallPanel(call)
end)

RegisterNetEvent('cad_sync:callUpdated')
AddEventHandler('cad_sync:callUpdated', function(call)
    CallUI:updateCall(call)
end)

RegisterNetEvent('cad_sync:callClosed')
AddEventHandler('cad_sync:callClosed', function(callId)
    if CallUI.state.activeCall and CallUI.state.activeCall.id == callId then
        CallUI:hideCallPanel()
    end
end)

-- Debug commands
RegisterCommand('test911', function(source, args, rawCommand)
    local testCall = {
        id = math.random(1000, 9999),
        type = args[1] or "traffic_accident",
        location = "Vinewood Blvd & Strawberry Ave",
        description = "Тяжелый удар в заднюю часть. Один человек без сознания.",
        priority = args[2] or "high",
        callerName = "John Doe",
        callerPhone = "(555) 123-4567",
        x = -234.5, y = -789.2,
        createdAt = os.time() * 1000,
        responders = {
            { name = "Officer Johnson", status = "enroute" },
            { name = "Officer Smith", status = "dispatched" }
        }
    }
    CallUI:showNotification(testCall)
    print("[TEST911] Notification: #" .. testCall.id)
end, false)

-- Test assigned call (simulates being attached to a call)
RegisterCommand('testassigned', function(source, args, rawCommand)
    local testCall = {
        id = math.random(1000, 9999),
        type = args[1] or "traffic_accident",
        location = "Vinewood Blvd & Strawberry Ave",
        description = "Тяжелый удар в заднюю часть. Один человек без сознания.",
        priority = args[2] or "high",
        callerName = "John Doe",
        callerPhone = "(555) 123-4567",
        x = -234.5, y = -789.2,
        createdAt = os.time() * 1000,
        responders = {
            { name = "Officer Johnson", status = "enroute" }
        }
    }
    CallUI:showCallPanel(testCall)
    print("[TESTASSIGNED] Left card shown for call: #" .. testCall.id)
end, false)

-- Toggle with F6
RegisterCommand('+toggle911Panel', function()
    if CallUI.state.isAssigned then
        CallUI:hideCallPanel()
    end
end, false)
RegisterCommand('-toggle911Panel', function() end, false)
RegisterKeyMapping('+toggle911Panel', 'Toggle 911 Panel', 'keyboard', 'F6')

print("[CAD-911] Notification system ready")
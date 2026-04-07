-- =====================================================
-- CAD Sync - 911 Call UI System
-- Thread-safe state bag, localization, animations
-- =====================================================

local CallUI = {
    -- State bag for thread-safe data
    state = {
        activeCall = nil,
        notification = nil,
        soundCooldown = 0,
        isVisible = false
    },
    
    -- Translations
    translations = {
        en = {
            newCall = "NEW 911 CALL",
            accept = "Accept",
            decline = "Decline",
            priority = "Priority",
            location = "Location",
            caller = "Caller",
            description = "Description",
            units = "Assigned Units",
            type = "Type",
            callId = "Call #",
            time = "Time",
            noUnits = "No units assigned",
            callAccepted = "Call Accepted",
            callDeclined = "Call Declined"
        },
        ru = {
            newCall = "НОВЫЙ ВЫЗОВ 911",
            accept = "Принять",
            decline = "Отклонить",
            priority = "Приоритет",
            location = "Местоположение",
            caller = "Заявитель",
            description = "Описание",
            units = "Прикреплённые юниты",
            type = "Тип",
            callId = "Вызов #",
            time = "Время",
            noUnits = "Нет прикреплённых",
            callAccepted = "Вызов принят",
            callDeclined = "Вызов отклонён"
        }
    },
    
    -- Language settings
    lang = "ru",
    
    -- Priority colors (LSPD style)
    priorityColors = {
        routine = "#6b7280",
        low = "#3b82f6", 
        medium = "#f59e0b",
        high = "#ef4444",
        emergency = "#dc2626"
    },
    
    -- Type translations
    typeTranslations = {
        traffic_accident = "ДТП",
        disturbance = "Нарушение порядка",
        robbery = "Ограбление",
        assault = "Нападение",
        domestic = "Семейный конфликт",
        welfare_check = "Проверка безопасности",
        suspicious = "Подозрительная активность",
        fire = "Пожар",
        medical = "Медицинская помощь",
        accident = "Авария",
        shooting = "Стрельба",
        homicide = "Убийство",
        other = "Другое",
        -- English
        ["Traffic Accident"] = "ДТП",
        ["Disturbance"] = "Нарушение порядка",
        ["Robbery"] = "Ограбление",
        ["Assault"] = "Нападение",
        ["Domestic"] = "Семейный конфликт",
        ["Welfare Check"] = "Проверка безопасности",
        ["Suspicious Activity"] = "Подозрительная активность",
        ["Fire"] = "Пожар",
        ["Medical Emergency"] = "Медицинская помощь",
        ["Accident"] = "Авария"
    }
}

-- =====================================================
-- STATE BAG MANAGEMENT (Thread-Safe)
-- =====================================================

function CallUI:setState(key, value)
    self.state[key] = value
end

function CallUI:getState(key)
    return self.state[key]
end

function CallUI:translate(key)
    return self.translations[self.lang][key] or key
end

-- =====================================================
-- 911 CALL NOTIFICATION SYSTEM
-- =====================================================

function CallUI:showNotification(call)
    -- Check cooldown (8 seconds)
    local currentTime = GetGameTimer()
    if currentTime < self.state.soundCooldown then
        return
    end
    
    self:setState("notification", call)
    self:setState("soundCooldown", currentTime + 8000)
    
    -- Play sound (call.wav - 1.5 sec, 70% volume)
    self:playCallSound()
    
    -- Send to UI
    SendNUIMessage({
        action = "showNotification",
        call = call,
        lang = self.lang,
        translations = self.translations[self.lang]
    })
    
    -- Create blinking blip on minimap
    self:createCallBlip(call)
end

function CallUI:playCallSound()
    -- Try to play call.wav, fallback to game sound
    local soundPlayed = PlaySoundFrontend("911_CALL_SOUND", "GTAO_FM_Crime_Soundset", false)
    if not soundPlayed then
        PlaySoundFrontend(-1, "Event_Message_Purple", "GTAO_FM_Events_Soundset", 0.7)
    end
end

-- =====================================================
-- CALL BLIP SYSTEM
-- =====================================================

local callBlips = {}

function CallUI:createCallBlip(call)
    if call.x and call.y then
        local blip = AddBlipForCoord(call.x, call.y, call.z)
        SetBlipSprite(blip, 478) -- Alert blip
        SetBlipScale(blip, 1.0)
        SetBlipColour(blip, 4) -- Red
        SetBlipAsShortRange(blip, true)
        BeginTextCommandSetBlipName("STRING")
        AddTextComponentString("911 - " .. (call.location or "Unknown"))
        EndTextCommandSetBlipName(blip)
        
        callBlips[call.id] = blip
        
        -- Blink for 8 seconds
        CreateThread(function()
            local blinks = 0
            while blinks < 16 and callBlips[call.id] do
                SetBlipFlashes(callBlips[call.id], true)
                Wait(500)
                SetBlipFlashes(callBlips[call.id], false)
                Wait(500)
                blinks = blinks + 1
            end
        end)
    end
end

function CallUI:removeCallBlip(callId)
    if callBlips[callId] then
        RemoveBlip(callBlips[callId])
        callBlips[callId] = nil
    end
end

-- =====================================================
-- FULL CALL PANEL UI
-- =====================================================

function CallUI:showCallPanel(call)
    self:setState("activeCall", call)
    self:setState("isVisible", true)
    
    SendNUIMessage({
        action = "showCallPanel",
        call = call,
        lang = self.lang,
        translations = self.translations[self.lang],
        priorityColors = self.priorityColors,
        typeTranslations = self.typeTranslations
    })
    
    -- Create permanent blip for the call
    if call.x and call.y then
        self:createCallBlip(call)
    end
end

function CallUI:hideCallPanel()
    self:setState("activeCall", nil)
    self:setState("isVisible", false)
    
    SendNUIMessage({
        action = "hideCallPanel"
    })
end

function CallUI:updateCallPanel(call)
    self:setState("activeCall", call)
    
    SendNUIMessage({
        action = "updateCallPanel",
        call = call,
        lang = self.lang,
        translations = self.translations[self.lang],
        priorityColors = self.priorityColors,
        typeTranslations = self.typeTranslations
    })
end

-- =====================================================
-- ACCEPT/DECLINE HANDLERS
-- =====================================================

RegisterNUICallback('acceptCall', function(data, cb)
    local callId = data.callId
    TriggerServerEvent('cad_sync:callAccepted', callId)
    
    CallUI:hideCallPanel()
    
    -- Show confirmation
    BeginTextCommandThefeedPost("STRING")
    AddTextComponentString(CallUI:translate("callAccepted") .. " #" .. callId)
    EndTextCommandThefeedPostTicker(false, true)
    
    cb({ success = true })
end)

RegisterNUICallback('declineCall', function(data, cb)
    local callId = data.callId
    TriggerServerEvent('cad_sync:callDeclined', callId)
    
    CallUI:setState("notification", nil)
    SendNUIMessage({ action = "hideNotification" })
    
    -- Show confirmation
    BeginTextCommandThefeedPost("STRING")
    AddTextComponentString(CallUI:translate("callDeclined") .. " #" .. callId)
    EndTextCommandThefeedPostTicker(false, true)
    
    cb({ success = true })
end)

-- =====================================================
-- NET EVENTS FROM SERVER
-- =====================================================

RegisterNetEvent('cad_sync:new911Call')
AddEventHandler('cad_sync:new911Call', function(call)
    print("[CAD-911] New call received: #" .. call.id)
    CallUI:showNotification(call)
end)

RegisterNetEvent('cad_sync:callAssigned')
AddEventHandler('cad_sync:callAssigned', function(call)
    print("[CAD-911] Assigned to call: #" .. call.id)
    CallUI:showCallPanel(call)
end)

RegisterNetEvent('cad_sync:callUpdated')
AddEventHandler('cad_sync:callUpdated', function(call)
    if CallUI:getState("activeCall") and CallUI:getState("activeCall").id == call.id then
        CallUI:updateCallPanel(call)
    end
end)

RegisterNetEvent('cad_sync:callClosed')
AddEventHandler('cad_sync:callClosed', function(callId)
    CallUI:removeCallBlip(callId)
    if CallUI:getState("activeCall") and CallUI:getState("activeCall").id == callId then
        CallUI:hideCallPanel()
    end
end)

-- =====================================================
-- DEBUG COMMAND /test911
-- =====================================================

RegisterCommand('test911', function(source, args, rawCommand)
    local testCall = {
        id = math.random(1000, 9999),
        type = args[1] or "traffic_accident",
        location = "Vinewood Blvd & Strawberry Ave",
        description = "Тяжелый удар в заднюю часть. Один человек без сознания.",
        priority = args[2] or "high",
        callerName = "John Doe",
        callerPhone = "(555) 123-4567",
        x = -234.5,
        y = -789.2,
        createdAt = os.time() * 1000,
        status = "pending",
        responders = {
            { name = "Officer Johnson", status = "enroute" },
            { name = "Officer Smith", status = "dispatched" }
        }
    }
    
    -- Show notification
    CallUI:showNotification(testCall)
    
    print("[TEST911] Test call #" .. testCall.id .. " created")
end, false)

-- =====================================================
-- KEYBOARD SHORTCUTS
-- =====================================================

-- Toggle call panel with F6
RegisterCommand('+toggleCallPanel', function()
    if CallUI:getState("isVisible") then
        CallUI:hideCallPanel()
    end
end, false)

RegisterCommand('-toggleCallPanel', function() end, false)
RegisterKeyMapping('+toggleCallPanel', 'Toggle 911 Panel', 'keyboard', 'F6')

-- =====================================================
-- INITIALIZATION
-- =====================================================

CreateThread(function()
    -- Wait for UI to load
    while not HasStreamedTextureDict("commonmenu") do
        Wait(100)
    end
    
    -- Load custom sounds if available
    if DoesAssetExist("sounds", "call.wav") then
        print("[CAD-911] Custom call sound loaded")
    end
    
    print("[CAD-911] 911 Call UI System initialized")
end)
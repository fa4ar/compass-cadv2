-- =====================================================
-- COMPASS CAD POLICE PANEL - FiveM Resource
-- Server-side code for 911 call management
-- =====================================================

-- Configuration
Config = {
    -- API endpoint for CAD integration
    apiUrl = "http://localhost:3000",
    -- Enable/disable CAD sync
    syncEnabled = true,
    -- Cooldown between sound alerts (ms)
    soundCooldown = 5000,
    -- Max active calls per officer
    maxCalls = 3,
}

-- Active 911 calls storage
ActiveCalls = {}

-- Initialize server
AddEventHandler('onResourceStart', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        print("^2[COMPASS-PANEL] ^7Police Panel started successfully")
        print("^2[COMPASS-PANEL] ^7API URL: " .. Config.apiUrl)
    end
end)

-- ============ EVENTS ============

-- Create a new 911 call (called when officer attaches)
RegisterServerEvent('compass:callAttached')
AddEventHandler('compass:callAttached', function(callId, attachedByDispatcher)
    local source = source
    local playerName = GetPlayerName(source)
    local isDispatched = attachedByDispatcher == true
    
    print(string.format("^3[COMPASS-PANEL] ^7Player %s (ID: %d) attached to call #%s (dispatched: %s)", 
        playerName, source, callId, tostring(isDispatched)))
    
    -- Get call data from ActiveCalls
    local callData = ActiveCalls[callId] or { id = callId }
    callData.isDispatched = isDispatched
    
    -- Send call data to client
    TriggerClientEvent('compass:showCallPanel', source, callData)
    
    -- Notify other officers on same call
    for _, playerId in ipairs(GetPlayers()) do
        if playerId ~= source then
            local playerCalls = GetPlayerAttachedCalls(playerId)
            if playerCalls[callId] then
                TriggerClientEvent('compass:officerAttached', playerId, {
                    officerId = source,
                    officerName = playerName,
                    callId = callId
                })
            end
        end
    end
end)

-- Detach from call
RegisterServerEvent('compass:callDetached')
AddEventHandler('compass:callDetached', function(callId)
    local source = source
    local playerName = GetPlayerName(source)
    
    print(string.format("^3[COMPASS-PANEL] ^7Player %s (ID: %d) detached from call #%s", 
        playerName, source, callId))
    
    -- Hide panel for this officer
    TriggerClientEvent('compass:hideCallPanel', source, callId)
    
    -- Notify other officers
    for _, playerId in ipairs(GetPlayers()) do
        if playerId ~= source then
            TriggerClientEvent('compass:officerDetached', playerId, {
                officerId = source,
                callId = callId
            })
        end
    end
end)

-- Update call data (real-time sync)
RegisterServerEvent('compass:callUpdated')
AddEventHandler('compass:callUpdated', function(callData)
    local source = source
    
    -- Store/update call data
    ActiveCalls[callData.id] = callData
    
    -- Broadcast to all officers attached to this call
    for _, playerId in ipairs(GetPlayers()) do
        local playerCalls = GetPlayerAttachedCalls(playerId)
        if playerCalls[callData.id] then
            -- Check cooldown for sound alert
            local lastSound = GetPlayerLastSoundTime(playerId, callData.id)
            local now = os.time() * 1000
            
            if lastSound == 0 or (now - lastSound) > Config.soundCooldown then
                callData.playSound = true
                SetPlayerLastSoundTime(playerId, callData.id, now)
            else
                callData.playSound = false
            end
            
            TriggerClientEvent('compass:updateCallData', playerId, callData)
        end
    end
    
    -- Optionally sync to CAD
    if Config.syncEnabled then
        SyncToCAD(callData)
    end
end)

-- Close call
RegisterServerEvent('compass:callClosed')
AddEventHandler('compass:callClosed', function(callId)
    local source = source
    
    print(string.format("^3[COMPASS-PANEL] ^7Call #%s closed by officer %s", 
        callId, GetPlayerName(source)))
    
    -- Notify all attached officers
    for _, playerId in ipairs(GetPlayers()) do
        local playerCalls = GetPlayerAttachedCalls(playerId)
        if playerCalls[callId] then
            TriggerClientEvent('compass:callClosedNotify', playerId, callId)
        end
    end
    
    -- Remove from active calls
    ActiveCalls[callId] = nil
end)

-- ============ COMMANDS ============

-- Test command to simulate 911 call (dispatched by dispatcher)
RegisterCommand('compass:testcall', function(source, args, rawCommand)
    local callId = args[1] or tostring(math.random(1000, 9999))
    local dispatched = args[2] == "dispatched"
    
    local testCall = {
        id = callId,
        type = "traffic_accident",
        location = "Vinewood Blvd & Strawberry Ave",
        description = "Тяжелый удар в заднюю часть. Один человек без сознания.",
        priority = "high",
        callerName = "John Doe",
        callerPhone = "(555) 123-4567",
        createdAt = os.time() * 1000,
        isDispatched = dispatched,
        responders = {
            { name = GetPlayerName(source), status = dispatched and "dispatched" or "enroute" }
        }
    }
    
    ActiveCalls[callId] = testCall
    testCall.isDispatched = dispatched
    TriggerClientEvent('compass:showCallPanel', source, testCall)
    
    print(string.format("^2[COMPASS-PANEL] ^7Test call #%s created for %s (dispatched: %s)", 
        callId, GetPlayerName(source), tostring(dispatched)))
end, true)

-- Command to simulate call attachment (self-attach)
RegisterCommand('compass:attach', function(source, args, rawCommand)
    local callId = args[1]
    if not callId then
        print("^1[COMPASS-PANEL] ^7Usage: /compass:attach <callId>")
        return
    end
    
    local callData = ActiveCalls[callId] or {
        id = callId,
        type = "test_incident",
        location = "Test Location",
        description = "Тестовый вызов",
        priority = "routine",
        callerName = "Test Caller",
        createdAt = os.time() * 1000,
        isDispatched = false
    }
    
    callData.isDispatched = false
    ActiveCalls[callId] = callData
    TriggerClientEvent('compass:showCallPanel', source, callData)
        createdAt = os.time() * 1000
    }
    
    ActiveCalls[callId] = callData
    TriggerClientEvent('compass:showCallPanel', source, callData)
    
    print(string.format("^2[COMPASS-PANEL] ^7Attached to call #%s", callId))
end, true)

-- Command to close current call
RegisterCommand('compass:close', function(source, args, rawCommand)
    local callId = args[1]
    if callId and ActiveCalls[callId] then
        TriggerClientEvent('compass:callClosedNotify', source, callId)
        ActiveCalls[callId] = nil
    end
end, true)

-- Toggle panel visibility
RegisterCommand('compass:toggle', function(source, args, rawCommand)
    TriggerClientEvent('compass:togglePanel', source)
end, true)

-- ============ HELPER FUNCTIONS ============

function GetPlayerAttachedCalls(playerId)
    -- In production, this would track per-player attached calls
    -- For now, return all active calls
    local calls = {}
    for callId, callData in pairs(ActiveCalls) do
        calls[callId] = callData
    end
    return calls
end

function GetPlayerLastSoundTime(playerId, callId)
    -- Track last sound time per player per call
    if not PlayerSoundTimes[playerId] then
        PlayerSoundTimes[playerId] = {}
    end
    return PlayerSoundTimes[playerId][callId] or 0
end

function SetPlayerLastSoundTime(playerId, callId, time)
    if not PlayerSoundTimes[playerId] then
        PlayerSoundTimes[playerId] = {}
    end
    PlayerSoundTimes[playerId][callId] = time
end

-- Initialize player sound tracking
PlayerSoundTimes = {}

function SyncToCAD(callData)
    -- This would sync to your CAD API
    -- PerformAsync request to API endpoint
    print(string.format("^3[COMPASS-PANEL] ^7Syncing call #%s to CAD", callData.id))
end

-- ============ NUI CALLBACKS ============

-- Handle NUI callback from UI
RegisterNUICallback('compass:closeCall', function(data, cb)
    local source = source
    local callId = data.callId
    
    if ActiveCalls[callId] then
        TriggerClientEvent('compass:callClosedNotify', source, callId)
        ActiveCalls[callId] = nil
    end
    
    cb({ success = true })
end)

RegisterNUICallback('compass:setStatus', function(data, cb)
    local source = source
    local callId = data.callId
    local status = data.status
    
    if ActiveCalls[callId] then
        ActiveCalls[callId].status = status
        -- Broadcast update
        for _, playerId in ipairs(GetPlayers()) do
            local playerCalls = GetPlayerAttachedCalls(playerId)
            if playerCalls[callId] then
                TriggerClientEvent('compass:updateCallData', playerId, ActiveCalls[callId])
            end
        end
    end
    
    cb({ success = true })
end)

-- ============ SERVER START ============

print("^2============================================")
print("^2  COMPASS CAD POLICE PANEL - Server Ready")
print("^2  Version: 1.0.0")
print("^2  Commands:")
print("^3  /compass:testcall [id]   - Create test call")
print("^3  /compass:attach <id>     - Attach to call")
print("^3  /compass:close <id>      - Close call")
print("^3  /compass:toggle         - Toggle panel")
print("^2============================================")
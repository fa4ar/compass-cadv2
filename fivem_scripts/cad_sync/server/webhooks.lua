-- CAD Sync Webhooks Module
-- Handles incoming webhooks from CAD system for 911 calls

local function log(level, message)
    if Config.Logging.Enabled then
        local timestamp = os.date('%Y-%m-%d %H:%M:%S')
        local logPath = Config.Logging.LogPath:gsub('%[date%]', os.date('%Y-%m-%d'))
        local logLine = string.format('[%s] [%s] [WEBHOOK] %s\n', timestamp, string.upper(level), message)
        local file = io.open(GetResourcePath(GetCurrentResourceName()) .. '/' .. logPath, 'a')
        if file then
            file:write(logLine)
            file:close()
        end
    end
end

-- Setup HTTP endpoint for 911 call webhooks
Citizen.CreateThread(function()
    Wait(3000)
    
    -- Register webhook endpoint
    SetHttpHandler(function(req, res)
        local path = req.path
        
        if path == '/webhook/911-call' then
            if req.method == 'POST' then
                Handle911Webhook(req, res)
            else
                res.writeHead(405)
                res.send('Method Not Allowed')
            end
        else
            res.writeHead(404)
            res.send('Not Found')
        end
    end)
    
    log('info', 'Webhook HTTP handler registered on /webhook/911-call')
end)

-- Handle incoming 911 call webhook
-- @param req table - HTTP request
-- @param res table - HTTP response
function Handle911Webhook(req, res)
    local body = req.body
    local headers = req.headers
    
    log('info', 'Received 911 call webhook')
    
    -- Validate API key
    local apiKey = headers['X-API-Key'] or headers['x-api-key']
    if apiKey ~= Config.API.APIKey then
        log('warn', 'Invalid API key in webhook request')
        res.writeHead(401)
        res.send(json.encode({ error = 'Unauthorized' }))
        return
    end
    
    -- Parse and validate call data
    local success, callData = pcall(json.decode, body)
    if not success or not callData then
        log('error', 'Failed to parse webhook body')
        res.writeHead(400)
        res.send(json.encode({ error = 'Invalid JSON' }))
        return
    end
    
    -- Validate required fields
    if not callData.id or not callData.type or not callData.address then
        log('error', 'Missing required fields in webhook data')
        res.writeHead(400)
        res.send(json.encode({ error = 'Missing required fields' }))
        return
    end
    
    -- Store call in active calls
    local callId = callData.id
    CADSync.ActiveCalls[callId] = {
        id = callId,
        type = callData.type,
        address = callData.address,
        description = callData.description or '',
        priority = callData.priority or 'normal',
        coordinates = callData.coordinates or { x = 0, y = 0, z = 0 },
        status = callData.status or 'active',
        created_at = callData.created_at or os.time(),
        units = {},
    }
    
    CADSync.AttachedUnits[callId] = {}
    
    log('info', string.format('New 911 call #%d registered: %s at %s', callId, callData.type, callData.address))
    
    -- Send success response
    res.writeHead(200)
    res.send(json.encode({ success = true, call_id = callId }))
    
    -- Broadcast call to all online PD/EMS players
    BroadcastCallToUnits(callId, CADSync.ActiveCalls[callId])
end

-- Broadcast call notification to all online PD/EMS units
-- @param callId number - Call ID
-- @param callData table - Call data
function BroadcastCallToUnits(callId, callData)
    local players = GetPlayers()
    local notifiedCount = 0
    
    for _, playerId in ipairs(players) do
        -- Check if player has required role
        local hasRole = false
        for _, role in ipairs(Config.Notifications.AllowedRoles) do
            if IsPlayerAceAllowed(playerId, role) then
                hasRole = true
                break
            end
        end
        
        if hasRole then
            TriggerClientEvent('cad_sync:newCall', playerId, callData)
            notifiedCount = notifiedCount + 1
        end
    end
    
    log('info', string.format('Call #%d broadcasted to %d units', callId, notifiedCount))
end

-- Event: Unit attaches to call
RegisterNetEvent('cad_sync:server:attachToCall', function(callId)
    local source = source
    local license = GetPlayerIdentifierByType(source, 'license')
    
    -- Verify player is linked
    if not CADSync.LinkedPlayers[license] then
        TriggerClientEvent('cad_sync:notification', source, 'error', 'You must link your CAD account first')
        return
    end
    
    -- Verify call exists
    if not CADSync.ActiveCalls[callId] then
        TriggerClientEvent('cad_sync:notification', source, 'error', 'Call not found')
        return
    end
    
    -- Check if already attached
    for _, unitId in ipairs(CADSync.AttachedUnits[callId]) do
        if unitId == source then
            TriggerClientEvent('cad_sync:notification', source, 'warn', 'You are already attached to this call')
            return
        end
    end
    
    -- Attach unit
    table.insert(CADSync.AttachedUnits[callId], source)
    table.insert(CADSync.ActiveCalls[callId].units, source)
    
    log('info', string.format('Unit %d attached to call %d', source, callId))
    
    -- Notify CAD system
    UpdateUnitAttachmentInCAD(callId, source, 'attach')
    
    -- Show UI card to player
    TriggerClientEvent('cad_sync:showCallCard', source, callId, CADSync.ActiveCalls[callId])
    
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
    
    for i, unitId in ipairs(CADSync.ActiveCalls[callId].units) do
        if unitId == source then
            table.remove(CADSync.ActiveCalls[callId].units, i)
            break
        end
    end
    
    log('info', string.format('Unit %d detached from call %d', source, callId))
    
    -- Notify CAD system
    UpdateUnitAttachmentInCAD(callId, source, 'detach')
    
    -- Hide UI card
    TriggerClientEvent('cad_sync:hideCallCard', source)
    
    -- Update all clients
    TriggerClientEvent('cad_sync:callUpdated', -1, callId, CADSync.ActiveCalls[callId])
end)

-- Event: Unit marks as arrived
RegisterNetEvent('cad_sync:server:markArrived', function(callId)
    local source = source
    
    if not CADSync.ActiveCalls[callId] then
        return
    end
    
    -- Check if unit is attached
    local isAttached = false
    for _, unitId in ipairs(CADSync.AttachedUnits[callId]) do
        if unitId == source then
            isAttached = true
            break
        end
    end
    
    if not isAttached then
        TriggerClientEvent('cad_sync:notification', source, 'error', 'You must be attached to this call')
        return
    end
    
    log('info', string.format('Unit %d marked arrived at call %d', source, callId))
    
    -- Notify CAD system
    UpdateCallStatusInCAD(callId, 'unit_arrived', source)
    
    -- Update UI
    TriggerClientEvent('cad_sync:notification', source, 'success', 'Marked as arrived')
end)

-- Event: Unit closes call
RegisterNetEvent('cad_sync:server:closeCall', function(callId)
    local source = source
    
    if not CADSync.ActiveCalls[callId] then
        return
    end
    
    -- Check if unit is attached
    local isAttached = false
    for _, unitId in ipairs(CADSync.AttachedUnits[callId]) do
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
    
    -- Notify CAD system
    UpdateCallStatusInCAD(callId, 'closed', source)
    
    -- Hide UI for all attached units
    for _, unitId in ipairs(CADSync.AttachedUnits[callId]) do
        TriggerClientEvent('cad_sync:hideCallCard', unitId)
    end
    
    -- Update all clients
    TriggerClientEvent('cad_sync:callUpdated', -1, callId, CADSync.ActiveCalls[callId])
end)

log('info', 'Webhooks module loaded')

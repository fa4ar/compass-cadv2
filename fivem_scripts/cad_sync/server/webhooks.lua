-- CAD Sync Polling Module
-- Polls CAD backend for new 911 calls

print('^2[CAD Sync]^7 Polling module loading...')

local function log(level, message)
    if Config.Logging.Enabled then
        local timestamp = os.date('%Y-%m-%d %H:%M:%S')
        local logPath = Config.Logging.LogPath:gsub('%[date%]', os.date('%Y-%m-%d'))
        local logLine = string.format('[%s] [%s] [POLLING] %s\n', timestamp, string.upper(level), message)
        local file = io.open(GetResourcePath(GetCurrentResourceName()) .. '/' .. logPath, 'a')
        if file then
            file:write(logLine)
            file:close()
        end
    end
end

-- Poll for active calls from CAD
Citizen.CreateThread(function()
    log('info', 'Polling thread starting...')
    Wait(5000)
    log('info', 'Polling thread ready, beginning loop')

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
                if success and data then
                    log('info', string.format('Received %d active calls from CAD', #data))
                    -- Update active calls
                    for _, call in ipairs(data) do
                        if not CADSync.ActiveCalls[call.id] then
                            -- New call
                            CADSync.ActiveCalls[call.id] = {
                                id = call.id,
                                type = call.type,
                                address = call.location,
                                description = call.description,
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
        }, {
            timeout = Config.API.Timeout
        })
        
        ::continue::
    end
end)

log('info', 'Polling module loaded')
print('^2[CAD Sync]^7 Polling module loaded')

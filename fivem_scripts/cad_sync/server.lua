-- CAD Sync Server Side
local linkedPlayers = {}
local activeCalls = {} -- Store active 911 calls for unit assignment

-- Mapping CAD userId to FiveM source
local userIdToSource = {}

-- Функция для получения Discord ID
function GetDiscordId(src)
    for _, id in ipairs(GetPlayerIdentifiers(src)) do
        if string.match(id, "discord:") then
            return string.gsub(id, "discord:", "")
        end
    end
    return nil
end

-- Авто-привязка при входе игрока
AddEventHandler('playerJoining', function()
    local src = source
    local discordId = GetDiscordId(src)
    if discordId then
        PerformHttpRequest(Config.ApiUrl .. "/link/check?discordId=" .. discordId, function(status, body, headers)
            if status == 200 then
                local data = json.decode(body)
                if data and data.linked then
                    linkedPlayers[src] = {
                        discordId = discordId,
                        username = data.username,
                        x = 0, y = 0, z = 0, heading = 0, location = "Connecting..."
                    }
                    print("[CAD-SYNC] Auto-linked " .. GetPlayerName(src) .. " to " .. data.username)
                end
            end
        end, 'GET', '', { ['Content-Type'] = 'application/json' })
    end
end)

-- Инициализация сокетов в JS-мосте
CreateThread(function()
    Wait(1000)
    TriggerEvent('cad_sync:init', Config.ApiUrl)
end)

-- Команда ручной привязки (если авто не сработало или новый юзер)
RegisterCommand('cad-link', function(source, args, rawCommand)
    local apiId = args[1]
    if not apiId then
        TriggerClientEvent('chat:addMessage', source, { args = { '^1[CAD]', 'Использование: /cad-link [ваш API ID]' } })
        return
    end

    local discordId = GetDiscordId(source)
    if not discordId then
        TriggerClientEvent('chat:addMessage', source, { args = { '^1[CAD]', 'Ошибка Discord.' } })
        return
    end

    PerformHttpRequest(Config.ApiUrl .. "/link", function(status, body, headers)
        if status == 200 then
            local data = json.decode(body)
            linkedPlayers[source] = {
                discordId = discordId,
                username = data.username,
                x = 0, y = 0, z = 0, heading = 0, location = "Connecting..."
            }
            TriggerClientEvent('chat:addMessage', source, { args = { '^2[CAD]', 'Привязано к ' .. data.username } })
        end
    end, 'POST', json.encode({ discordId = discordId, apiId = apiId }), { ['Content-Type'] = 'application/json' })
end, false)

-- Прием координат от клиента
RegisterNetEvent('cad_sync:updatePosition')
AddEventHandler('cad_sync:updatePosition', function(data)
    local src = source
    if linkedPlayers[src] then
        linkedPlayers[src].x = data.x
        linkedPlayers[src].y = data.y
        linkedPlayers[src].z = data.z
        linkedPlayers[src].heading = data.heading
        linkedPlayers[src].location = data.location
        linkedPlayers[src].inVehicle = data.inVehicle
    else
        local dId = GetDiscordId(src)
        if dId then
             linkedPlayers[src] = { discordId = dId, x = data.x, y = data.y, z = data.z, heading = data.heading, location = data.location, inVehicle = data.inVehicle }
        end
    end
end)

AddEventHandler('playerDropped', function()
    linkedPlayers[source] = nil
end)

-- =====================================================
-- 911 CALL HANDLING
-- =====================================================

-- Client accepts a call
RegisterNetEvent('cad_sync:callAccepted')
AddEventHandler('cad_sync:callAccepted', function(callId)
    local src = source
    local playerName = GetPlayerName(src)
    print("[CAD-911] Player " .. playerName .. " accepted call #" .. callId)
end)

-- Client declines a call
RegisterNetEvent('cad_sync:callDeclined')
AddEventHandler('cad_sync:callDeclined', function(callId)
    local src = source
    local playerName = GetPlayerName(src)
    print("[CAD-911] Player " .. playerName .. " declined call #" .. callId)
end)

-- Store active call for unit assignment
function StoreActiveCall(call)
    activeCalls[call.id] = call
    -- Broadcast to all online players
    TriggerClientEvent('cad_sync:new911Call', -1, call)
end

-- Send call to specific unit when assigned
function SendCallToUnit(src, call)
    TriggerClientEvent('cad_sync:callAssigned', src, call)
end

-- Test 911 call command
RegisterCommand('test911', function(source, args, rawCommand)
    local priority = args[1] or "high"
    local callType = args[2] or "traffic_accident"
    
    local testCall = {
        id = math.random(1000, 9999),
        type = callType,
        location = "Vinewood Blvd & Strawberry Ave",
        description = "Тяжелый удар в заднюю часть. Один человек без сознания.",
        priority = priority,
        callerName = "John Doe",
        callerPhone = "(555) 123-4567",
        x = -234.5,
        y = -789.2,
        createdAt = os.time() * 1000,
        status = "pending",
        responders = {}
    }
    
    -- Show to all players
    for _, player in ipairs(GetPlayers()) do
        TriggerClientEvent('cad_sync:new911Call', player, testCall)
    end
    
    print("[CAD-911] Test call #" .. testCall.id .. " broadcasted to all players")
end, true)

-- =====================================================
-- MAP SYNC LOOP (via Sockets)
-- =====================================================

-- Цикл синхронизации через сокеты
CreateThread(function()
    while true do
        Wait(2000) -- Синхронизация каждые 2 секунды (более плавно с сокетами)
        
        local blips = {}
        for pid, data in pairs(linkedPlayers) do
            if data.x and data.x ~= 0 then
                table.insert(blips, {
                    identifier = "FIVEM_" .. pid,
                    discordId = data.discordId,
                    x = data.x, y = data.y, z = data.z, heading = data.heading, 
                    location = data.location,
                    inVehicle = data.inVehicle
                })
            end
        end

        -- Отправляем в JS-скрипт для передачи через сокет
        if #blips > 0 then
            TriggerEvent('cad_sync:sendMapUpdate', blips)
        end
    end
end)

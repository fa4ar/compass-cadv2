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
        end, 'GET', '', { ['Content-Type'] = 'application/json', ['X-API-Key'] = Config.ApiKey })
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
    end, 'POST', json.encode({ discordId = discordId, apiId = apiId }), { ['Content-Type'] = 'application/json', ['X-API-Key'] = Config.ApiKey })
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

        -- Добавляем активные вызовы 911
        local calls = {}
        for callId, call in pairs(activeCalls) do
            if call.x and call.y and call.status ~= "closed" then
                table.insert(calls, {
                    id = call.id,
                    type = call.type,
                    location = call.location,
                    description = call.description,
                    priority = call.priority,
                    callerName = call.callerName,
                    status = call.status,
                    x = call.x,
                    y = call.y,
                    z = call.z,
                    createdAt = call.createdAt
                })
            end
        end

        -- Отправляем в JS-скрипт для передачи через сокет
        if #blips > 0 or #calls > 0 then
            TriggerEvent('cad_sync:sendMapUpdate', blips, calls)
        end
    end
end)

-- =====================================================
-- 911 CALL SYSTEM (Integration with Backend API)
-- =====================================================

-- Команда для вызова 911 из игры
RegisterCommand('911', function(source, args, rawCommand)
    local src = source
    local callType = args[1] or "other"
    local description = table.concat(args, " ", 2)
    
    if #description < 10 then
        TriggerClientEvent('chat:addMessage', src, { args = { '^1[911]', 'Опишите ситуацию подробнее (минимум 10 символов)' } })
        return
    end
    
    -- Получаем координаты игрока
    local ped = GetPlayerPed(src)
    local coords = GetEntityCoords(ped)
    local streetHash, crossingHash = GetStreetNameAtCoord(coords.x, coords.y, coords.z)
    local streetName = GetStreetNameFromHashKey(streetHash)
    local areaName = GetNameOfZone(coords.x, coords.y, coords.z)
    local location = streetName .. ", " .. (areaName or "Unknown")
    
    -- Получаем информацию о звонящем
    local playerName = GetPlayerName(src)
    local discordId = GetDiscordId(src)
    
    -- Формируем данные вызова
    local callData = {
        type = callType,
        location = location,
        description = description,
        priority = "medium",
        callerName = playerName,
        callerDiscordId = discordId,
        x = coords.x,
        y = coords.y,
        z = coords.z,
        status = "pending",
        createdAt = os.time() * 1000,
        responders = {}
    }
    
    -- Отправляем в backend API
    PerformHttpRequest(Config.ApiUrl .. "/calls911", function(status, body, headers)
        if status == 201 then
            local response = json.decode(body)
            callData.id = response.id

            -- Сохраняем активный вызов
            StoreActiveCall(callData)

            -- Уведомляем игрока
            TriggerClientEvent('chat:addMessage', src, { args = { '^2[911]', 'Вызов #' .. response.id .. ' отправлен. Ожидайте ответа.' } })

            print("[CAD-911] New call #" .. response.id .. " from " .. playerName .. " at " .. location)
        else
            TriggerClientEvent('chat:addMessage', src, { args = { '^1[911]', 'Ошибка отправки вызова. Попробуйте снова.' } })
            print("[CAD-911] Failed to create call. Status: " .. status)
        end
    end, 'POST', json.encode(callData), { ['Content-Type'] = 'application/json', ['X-API-Key'] = Config.ApiKey })
end, false)

-- Команда для отмены вызова
RegisterCommand('cancel911', function(source, args, rawCommand)
    local src = source
    local callId = args[1]
    
    if not callId then
        TriggerClientEvent('chat:addMessage', src, { args = { '^1[911]', 'Использование: /cancel911 [ID вызова]' } })
        return
    end
    
    -- Проверяем, есть ли такой вызов
    local call = activeCalls[tonumber(callId)]
    if not call then
        TriggerClientEvent('chat:addMessage', src, { args = { '^1[911]', 'Вызов с таким ID не найден' } })
        return
    end
    
    -- Отправляем запрос на отмену в API
    PerformHttpRequest(Config.ApiUrl .. "/calls911/" .. callId .. "/cancel", function(status, body, headers)
        if status == 200 then
            -- Удаляем из активных
            activeCalls[tonumber(callId)] = nil

            -- Уведомляем всех игроков
            TriggerClientEvent('cad_sync:callClosed', -1, tonumber(callId))

            TriggerClientEvent('chat:addMessage', src, { args = { '^2[911]', 'Вызов #' .. callId .. ' отменен' } })
            print("[CAD-911] Call #" .. callId .. " cancelled")
        else
            TriggerClientEvent('chat:addMessage', src, { args = { '^1[911]', 'Ошибка отмены вызова' } })
        end
    end, 'POST', '', { ['Content-Type'] = 'application/json', ['X-API-Key'] = Config.ApiKey })
end, false)

-- Синхронизация вызовов с backend API (получение активных вызовов)
CreateThread(function()
    while true do
        Wait(5000) -- Каждые 5 секунд
        
        -- Получаем активные вызовы из API
        PerformHttpRequest(Config.ApiUrl .. "/calls911/active", function(status, body, headers)
            if status == 200 then
                local data = json.decode(body)
                if data and data.calls then
                    for _, call in ipairs(data.calls) do
                        -- Если вызов новый, сохраняем и транслируем
                        if not activeCalls[call.id] then
                            activeCalls[call.id] = call
                            TriggerClientEvent('cad_sync:new911Call', -1, call)
                        elseif activeCalls[call.id].status ~= call.status then
                            -- Если статус изменился, обновляем и уведомляем
                            activeCalls[call.id] = call
                            TriggerClientEvent('cad_sync:callUpdated', -1, call)
                        end
                    end
                end
            end
        end, 'GET', '', { ['Content-Type'] = 'application/json', ['X-API-Key'] = Config.ApiKey })
    end
end)

-- Назначение юнита на вызов (вызывается из CAD)
RegisterNetEvent('cad_sync:assignUnitToCall')
AddEventHandler('cad_sync:assignUnitToCall', function(callId, unitId)
    local src = source
    
    -- Находим игрока по unitId (можно расширить логику)
    for pid, data in pairs(linkedPlayers) do
        if data.unitId == unitId then
            -- Получаем детали вызова
            local call = activeCalls[callId]
            if call then
                SendCallToUnit(pid, call)
                print("[CAD-911] Unit " .. unitId .. " assigned to call #" .. callId)
            end
            break
        end
    end
end)

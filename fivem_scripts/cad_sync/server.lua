-- CAD Sync Server Side
local linkedPlayers = {}

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

AddEventHandler('playerDropped', function() linkedPlayers[source] = nil end)

-- Цикл синхронизации
CreateThread(function()
    while true do
        Wait(1500)
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

        PerformHttpRequest(Config.ApiUrl .. "/update-map", function(status, body, headers)
            if status == 200 then
                local res = json.decode(body)
                if res and res.success then
                    if res.units then TriggerClientEvent('cad_sync:updateMinimap', -1, res.units) end
                    if res.newCalls then
                        for _, call in ipairs(res.newCalls) do TriggerClientEvent('cad_sync:receiveCall', -1, call) end
                    end
                end
            end
        end, 'POST', json.encode({ blips = blips }), { ['Content-Type'] = 'application/json' })
    end
end)

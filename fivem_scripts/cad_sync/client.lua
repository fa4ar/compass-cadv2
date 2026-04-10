-- CAD Sync Client Side
local activeBlips = {}
local isOnDuty = false
local playerJob = nil
local playerDutyStatus = nil

-- Функция для проверки статуса смены через API
local function CheckDutyStatus()
    local src = GetPlayerServerId(PlayerId())
    
    -- Получаем Discord ID
    local discordId = nil
    for _, id in ipairs(GetPlayerIdentifiers(src)) do
        if string.match(id, "discord:") then
            discordId = string.gsub(id, "discord:", "")
            break
        end
    end
    
    if not discordId then
        isOnDuty = false
        playerJob = nil
        return
    end
    
    -- Запрашиваем статус смены из API
    PerformHttpRequest(Config.ApiUrl .. "/link/check?discordId=" .. discordId, function(status, body, headers)
        if status == 200 then
            local data = json.decode(body)
            if data and data.linked and data.user then
                -- API теперь возвращает job напрямую
                if data.user.onDuty and data.user.job then
                    isOnDuty = true
                    playerJob = data.user.job
                else
                    isOnDuty = false
                    playerJob = nil
                end
            else
                isOnDuty = false
                playerJob = nil
            end
        else
            isOnDuty = false
            playerJob = nil
        end
    end, 'GET', '', { ['Content-Type'] = 'application/json' })
end

-- Проверяем статус смены при входе и периодически
CreateThread(function()
    Wait(2000) -- Ждем загрузки
    CheckDutyStatus()
    
    -- Проверяем каждые 30 секунд
    while true do
        Wait(30000)
        CheckDutyStatus()
    end
end)

-- Export duty status for client_911.lua
exports('getDutyStatus', function()
    return isOnDuty, playerJob
end)

-- Also update client_911.lua when duty status changes
local lastDutyStatus = false
local lastJob = nil

CreateThread(function()
    while true do
        Wait(1000)
        if lastDutyStatus ~= isOnDuty or lastJob ~= playerJob then
            lastDutyStatus = isOnDuty
            lastJob = playerJob
            -- Notify client_911.lua of duty status change
            local success = pcall(function()
                exports.cad_sync:setDutyStatus(isOnDuty, playerJob)
            end)
        end
    end
end)

-- Поток отправки собственных координат на сервер
CreateThread(function()
    while true do
        Wait(1000) -- Отправляем раз в секунду для точности
        
        local playerPed = PlayerPedId()
        if DoesEntityExist(playerPed) then
            local coords = GetEntityCoords(playerPed)
            local heading = GetEntityHeading(playerPed)
            local inVehicle = IsPedInAnyVehicle(playerPed, false)
            
            -- Получаем название улицы и зоны
            local streetHash = GetStreetNameAtCoord(coords.x, coords.y, coords.z)
            local streetName = GetStreetNameFromHashKey(streetHash)
            local zoneName = GetLabelText(GetNameOfZone(coords.x, coords.y, coords.z))
            
            TriggerServerEvent('cad_sync:updatePosition', {
                x = coords.x,
                y = coords.y,
                z = coords.z,
                heading = heading,
                inVehicle = inVehicle,
                location = streetName .. ", " .. zoneName,
                onDuty = isOnDuty,
                job = playerJob
            })
        end
    end
end)

-- Обработка синхронизации миникарты (другие юниты)
RegisterNetEvent('cad_sync:updateMinimap')
AddEventHandler('cad_sync:updateMinimap', function(units)
    local currentIdentifiers = {}
    local myServerId = GetPlayerServerId(PlayerId())

    for _, unit in ipairs(units) do
        -- Не рисуем блип для самих себя на миникарте
        if unit.identifier ~= "FIVEM_" .. myServerId then
            local id = unit.identifier
            currentIdentifiers[id] = true
            
            if activeBlips[id] then
                SetBlipCoords(activeBlips[id], unit.x, unit.y, unit.z)
                SetBlipRotation(activeBlips[id], math.floor(unit.heading))
            else
                local blip = AddBlipForCoord(unit.x, unit.y, unit.z)
                
                local sprite = 1
                if unit.type == "police" then sprite = 60
                elseif unit.type == "ems" then sprite = 61
                elseif unit.type == "fire" then sprite = 436
                elseif unit.type == "dot" then sprite = 477
                end
                
                SetBlipSprite(blip, sprite)
                SetBlipScale(blip, 0.8)
                
                local color = 0
                if unit.type == "police" then color = 3
                elseif unit.type == "ems" or unit.type == "fire" then color = 1
                elseif unit.type == "dot" then color = 5
                end
                
                SetBlipColour(blip, color)
                SetBlipAsShortRange(blip, true)
                
                BeginTextCommandSetBlipName("STRING")
                AddTextComponentString(unit.label)
                EndTextCommandSetBlipName(blip)
                
                activeBlips[id] = blip
            end
        end
    end
    
    for id, blip in pairs(activeBlips) do
        if not currentIdentifiers[id] then
            RemoveBlip(blip)
            activeBlips[id] = nil
        end
    end
end)

RegisterNetEvent('cad_sync:receiveCall')
AddEventHandler('cad_sync:receiveCall', function(call)
    TriggerEvent('chat:addMessage', { args = { '^1[911]', 'Новый вызов: ' .. call.description .. ' @ ' .. call.location } })
    PlaySoundFrontend(-1, "Event_Message_Purple", "GTAO_FM_Events_Soundset", 1)
end)

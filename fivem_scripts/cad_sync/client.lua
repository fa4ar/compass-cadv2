-- CAD Sync Client Side
local activeBlips = {}

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
                location = streetName .. ", " .. zoneName
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

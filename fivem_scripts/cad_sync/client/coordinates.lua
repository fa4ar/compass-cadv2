-- CAD Sync Client Coordinates
-- Handles coordinate transmission for linked players

local locale = Config.Locale or 'en'
local function t(key, ...)
    if Locales[locale] and Locales[locale][key] then
        return string.format(Locales[locale][key], ...)
    end
    return key
end

-- Client state
local CoordState = {
    LastSync = 0,
    SyncInterval = 5000, -- 5 seconds
    IsLinked = false,
}

-- Check if player is linked
Citizen.CreateThread(function()
    Wait(2000)
    
    while true do
        Wait(1000)
        
        local license = GetPlayerIdentifierByType(PlayerId(), 'license')
        
        -- Check if linked via export
        local isLinked = GetResourceKvpString('cad_linked') == 'true'
        if isLinked and not CoordState.IsLinked then
            CoordState.IsLinked = true
            print('^2[CAD Sync]^7 Coordinates sync enabled')
        elseif not isLinked and CoordState.IsLinked then
            CoordState.IsLinked = false
            print('^3[CAD Sync]^7 Coordinates sync disabled')
        end
    end
end)

-- Periodic coordinate sync
Citizen.CreateThread(function()
    while true do
        Wait(CoordState.SyncInterval)
        
        if CoordState.IsLinked then
            local ped = PlayerPedId()
            local coords = GetEntityCoords(ped)
            local heading = GetEntityHeading(ped)
            local license = GetPlayerIdentifierByType(PlayerId(), 'license')
            
            -- Send to server
            TriggerServerEvent('cad_sync:server:syncCoordinates', {
                license = license,
                x = coords.x,
                y = coords.y,
                z = coords.z,
                heading = heading,
                inVehicle = IsPedInAnyVehicle(ped, false),
            })
        end
    end
end)

-- Event: Coordinates synced confirmation
RegisterNetEvent('cad_sync:client:coordinatesSynced', function(success)
    if success then
        CoordState.LastSync = GetGameTimer()
    end
end)

-- Event: Set linked status
RegisterNetEvent('cad_sync:client:setLinked', function(isLinked)
    CoordState.IsLinked = isLinked
    if isLinked then
        SetResourceKvp('cad_linked', 'true')
        print('^2[CAD Sync]^7 Coordinates sync enabled')
    else
        SetResourceKvp('cad_linked', 'false')
        print('^3[CAD Sync]^7 Coordinates sync disabled')
    end
end)

print('^2[CAD Sync]^7 Client coordinates.lua loaded')

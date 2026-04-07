CompPos = CompPos or {}

local function tableCount(t)
    local count = 0
    for _ in pairs(t) do count = count + 1 end
    return count
end

CompPos.Config = CompPos.Config or {
    componentNames = {
        [0] = "Лицо", [1] = "Маска", [2] = "Волосы", [7] = "Аксессуар",
        [8] = "Майка", [9] = "Бронежилет", [10] = "Бейдж", [11] = "Верх 2"
    }
}

CompPos.Server = {
    players = {},
    dataFile = "comppos_data.json",
}

function CompPos.Server.loadData()
    local path = string.format("resources/%s/%s", GetCurrentResourceName(), CompPos.Server.dataFile)
    local data = LoadResourceFile(GetCurrentResourceName(), CompPos.Server.dataFile)
    
    if data then
        local success, decoded = pcall(json.decode, data)
        if success then
            CompPos.Server.players = decoded
            print("[CompPos] Loaded data for " .. tableCount(CompPos.Server.players) .. " players")
            return true
        end
    end
    
    CompPos.Server.players = {}
    print("[CompPos] No saved data found, starting fresh")
    return false
end

function CompPos.Server.saveData()
    local data = json.encode(CompPos.Server.players)
    local path = CompPos.Server.dataFile
    SaveResourceFile(GetCurrentResourceName(), path, data, #data)
    print("[CompPos] Data saved successfully")
end

function CompPos.Server.getPlayerData(source)
    local playerData = CompPos.Server.players[tostring(source)]
    if not playerData then
        playerData = {
            components = {},
            lastUpdate = os.time()
        }
        CompPos.Server.players[tostring(source)] = playerData
    end
    return playerData
end

function CompPos.Server.updateComponent(source, componentId, position, rotation, scale)
    local playerData = CompPos.Server.getPlayerData(source)
    playerData.components[tostring(componentId)] = {
        position = position,
        rotation = rotation,
        scale = scale or {x = 1.0, y = 1.0, z = 1.0},
        lastUpdate = os.time()
    }
    playerData.lastUpdate = os.time()
    CompPos.Server.saveData()
    
    TriggerClientEvent("comppos:syncComponent", -1, source, componentId, playerData.components[tostring(componentId)])
end

function CompPos.Server.resetComponent(source, componentId)
    local playerData = CompPos.Server.getPlayerData(source)
    playerData.components[tostring(componentId)] = nil
    playerData.lastUpdate = os.time()
    CompPos.Server.saveData()
    
    TriggerClientEvent("comppos:syncComponent", -1, source, componentId, nil)
end

function CompPos.Server.resetAllComponents(source)
    local playerData = CompPos.Server.getPlayerData(source)
    playerData.components = {}
    playerData.lastUpdate = os.time()
    CompPos.Server.saveData()
    
    TriggerClientEvent("comppos:syncAllComponents", -1, source, {})
end

function CompPos.Server.getAllPlayerComponents(source)
    local playerData = CompPos.Server.getPlayerData(source)
    return playerData.components
end

AddEventHandler("playerConnecting", function(playerId, reason, deferrals)
    deferrals.defer()
    deferrals.update("Loading component positions...")
    
    local source = tostring(playerId)
    if not CompPos.Server.players[source] then
        CompPos.Server.players[source] = {
            components = {},
            lastUpdate = os.time()
        }
    end
    
    deferrals.done()
end)

AddEventHandler("playerDropped", function(reason)
    local source = source
    local playerData = CompPos.Server.getPlayerData(source)
    if playerData then
        playerData.lastUpdate = os.time()
        CompPos.Server.saveData()
    end
end)

RegisterNetEvent("comppos:requestData")
AddEventHandler("comppos:requestData", function()
    local source = source
    local playerData = CompPos.Server.getPlayerData(source)
    
    TriggerClientEvent("comppos:receiveData", source, playerData.components)
end)

RegisterNetEvent("comppos:updateComponent")
AddEventHandler("comppos:updateComponent", function(componentId, position, rotation, scale)
    local source = source
    CompPos.Server.updateComponent(source, componentId, position, rotation, scale)
end)

RegisterNetEvent("comppos:resetComponent")
AddEventHandler("comppos:resetComponent", function(componentId)
    local source = source
    CompPos.Server.resetComponent(source, componentId)
end)

RegisterNetEvent("comppos:resetAllComponents")
AddEventHandler("comppos:resetAllComponents", function()
    local source = source
    CompPos.Server.resetAllComponents(source)
end)

RegisterNetEvent("comppos:requestPlayerComponents")
AddEventHandler("comppos:requestPlayerComponents", function(targetSource)
    local source = source
    local playerData = CompPos.Server.getPlayerData(targetSource)
    
    TriggerClientEvent("comppos:receivePlayerComponents", source, targetSource, playerData.components)
end)

CompPos.Server.loadData()

RegisterCommand("comppos_reload", function(source, args, raw)
    if source == 0 then
        CompPos.Server.loadData()
        print("[CompPos] Data reloaded manually")
    end
end, true)

print("[CompPos] Server started successfully")

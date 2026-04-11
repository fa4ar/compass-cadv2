-- ============================================
-- Component Position Editor - Server Script
-- ============================================

local DATABASE_FILE = 'component_offsets.json'
local componentOffsets = {}

-- Сохранить данные в файл
local function SaveDatabase()
    local jsonStr = json.encode(componentOffsets, { indent = true })
    SaveResourceFile(GetCurrentResourceName(), DATABASE_FILE, jsonStr, -1)
    print("^2[Comppos Server] Saved component offsets to database")
end

-- Загрузить данные из файла
local function LoadDatabase()
    local file = LoadResourceFile(GetCurrentResourceName(), DATABASE_FILE)
    if file then
        local success, data = pcall(function()
            return json.decode(file)
        end)
        if success and data then
            componentOffsets = data
            print("^2[Comppos Server] Loaded " .. #componentOffsets .. " component offsets from database")
        else
            print("^1[Comppos Server] Failed to parse database file")
            componentOffsets = {}
        end
    else
        print("^3[Comppos Server] Database file not found, creating new one")
        componentOffsets = {}
        SaveDatabase()
    end
end

-- Получить смещение для игрока и слота
local function GetOffset(playerId, slot)
    local identifier = GetPlayerIdentifier(playerId, 0)
    if not identifier then return nil end
    
    if componentOffsets[identifier] and componentOffsets[identifier][slot] then
        return componentOffsets[identifier][slot]
    end
    
    return nil
end

-- Сохранить смещение для игрока и слота
local function SetOffset(playerId, slot, offset, rotation)
    local identifier = GetPlayerIdentifier(playerId, 0)
    if not identifier then return false end
    
    if not componentOffsets[identifier] then
        componentOffsets[identifier] = {}
    end
    
    componentOffsets[identifier][slot] = {
        pos = { x = offset.x, y = offset.y, z = offset.z },
        rot = { pitch = rotation.pitch, roll = rotation.roll, yaw = rotation.yaw }
    }
    
    SaveDatabase()
    return true
end

-- Получить все смещения для игрока
local function GetAllOffsets(playerId)
    local identifier = GetPlayerIdentifier(playerId, 0)
    if not identifier then return nil end
    
    return componentOffsets[identifier]
end

-- Регистрация серверных событий
RegisterNetEvent('comppos:getOffset', function(slot)
    local source = source
    local offset = GetOffset(source, slot)
    TriggerClientEvent('comppos:receiveOffset', source, slot, offset)
end)

RegisterNetEvent('comppos:setOffset', function(slot, offset, rotation)
    local source = source
    SetOffset(source, slot, offset, rotation)
end)

RegisterNetEvent('comppos:getAllOffsets', function()
    local source = source
    local offsets = GetAllOffsets(source)
    TriggerClientEvent('comppos:receiveAllOffsets', source, offsets)
end)

-- При спавне игрока отправляем его сохранённые смещения
AddEventHandler('playerSpawned', function()
    local source = source
    local offsets = GetAllOffsets(source)
    if offsets then
        TriggerClientEvent('comppos:loadOffsets', source, offsets)
    end
end)

-- Инициализация базы данных при запуске ресурса
CreateThread(function()
    Wait(1000)  -- Даём время загрузиться ресурсу
    LoadDatabase()
end)

-- Экспорт функций для использования другими ресурсами
exports('GetOffset', GetOffset)
exports('SetOffset', SetOffset)
exports('GetAllOffsets', GetAllOffsets)

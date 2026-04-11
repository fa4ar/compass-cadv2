-- ============================================
-- Component Position Editor - Client Script
-- ============================================

-- Переменные состояния редактирования
local isEditing = false
local currentSlot = nil
local currentProp = nil
local originalDrawable = nil
local originalTexture = nil
local currentOffset = { x = 0.0, y = 0.0, z = 0.0 }
local currentRotation = { pitch = 0.0, roll = 0.0, yaw = 0.0 }
local playerProps = {}  -- Хранилище пропов других игроков [playerId][slot]
local isDragging = false
local dragAxis = nil  -- 'x', 'y', 'z', 'rx', 'ry', 'rz'
local dragStartPos = { x = 0, y = 0 }
local dragStartValue = 0.0

-- ============================================
-- Вспомогательные функции
-- ============================================

-- Нарисовать 3D оси вокруг компонента
local function Draw3DAxis()
    if not isEditing or not currentSlot then return end
    
    local ped = PlayerPedId()
    local boneConfig = Config.Bones[currentSlot]
    local boneIndex = GetPedBoneIndex(ped, boneConfig.hash)
    
    if boneIndex == -1 then return end
    
    local bonePos = GetPedBoneCoords(ped, boneIndex)
    local axisLength = 0.3
    
    local xEnd = bonePos + vector3(axisLength, 0, 0)
    DrawLine(bonePos, xEnd, 255, 0, 0, 255)
    
    local yEnd = bonePos + vector3(0, axisLength, 0)
    DrawLine(bonePos, yEnd, 0, 255, 0, 255)
    
    local zEnd = bonePos + vector3(0, 0, axisLength)
    DrawLine(bonePos, zEnd, 0, 0, 255, 255)
    
    DrawMarker(28, bonePos.x, bonePos.y, bonePos.z, 0, 0, 0, 0, 0, 0, 0.05, 0.05, 0.05, 255, 255, 0, 100, false, false, 2, false, false, false, false)
end

-- Screen to World для мыши
local function ScreenToWorld(screenX, screenY)
    local camRot = GetGameplayCamRot(2)
    local camPos = GetGameplayCamCoord()
    
    local radX = math.rad(camRot.x)
    local radZ = math.rad(camRot.z)
    
    local forward = vector3(
        -math.sin(radZ) * math.abs(math.cos(radX)),
        math.cos(radZ) * math.abs(math.cos(radX)),
        math.sin(radX)
    )
    
    local right = vector3(
        math.cos(radZ),
        math.sin(radZ),
        0
    )
    
    local up = vector3(
        right.y * forward.z - right.z * forward.y,
        right.z * forward.x - right.x * forward.z,
        right.x * forward.y - right.y * forward.x
    )
    
    local fov = GetGameplayCamFov()
    local scale = (1.0 / math.tan(fov * 0.5))
    
    local screenW, screenH = GetScreenResolution()
    local x = (2.0 * (screenX / screenW) - 1.0) / GetAspectRatio() / scale
    local y = (1.0 - 2.0 * (screenY / screenH)) / scale
    
    local direction = forward + right * x + up * y
    direction = direction / #direction
    
    return camPos, direction
end

-- Проверка наведения мыши на ось
local function GetHoveredAxis(screenX, screenY)
    if not isEditing or not currentSlot then return nil end
    
    local ped = PlayerPedId()
    local boneConfig = Config.Bones[currentSlot]
    local boneIndex = GetPedBoneIndex(ped, boneConfig.hash)
    local bonePos = GetPedBoneCoords(ped, boneIndex)
    
    local camPos, direction = ScreenToWorld(screenX, screenY)
    local axisLength = 0.3
    
    local axes = {
        { name = 'x', endPos = bonePos + vector3(axisLength, 0, 0) },
        { name = 'y', endPos = bonePos + vector3(0, axisLength, 0) },
        { name = 'z', endPos = bonePos + vector3(0, 0, axisLength) }
    }
    
    for _, axis in ipairs(axes) do
        local dist = DistanceToLine(camPos, direction, bonePos, axis.endPos)
        if dist < 0.05 then
            return axis.name
        end
    end
    
    return nil
end

-- Расстояние от точки до линии
local function DistanceToLine(lineStart, lineDir, pointA, pointB)
    local pa = pointA - lineStart
    local ba = pointB - pointA
    
    local baLenSq = ba.x * ba.x + ba.y * ba.y + ba.z * ba.z
    if baLenSq == 0 then return #pa end
    
    local t = math.max(0, math.min(1, (pa.x * ba.x + pa.y * ba.y + pa.z * ba.z) / baLenSq))
    local projection = pointA + ba * t
    
    return #(pa - (projection - pointA))
end

-- ============================================
-- UI функции
-- ============================================

local function DrawUI()
    if not isEditing then return end
    
    local slotName = Config.SlotNames[currentSlot] or "Unknown"
    
    SetTextFont(4)
    SetTextScale(0.4, 0.4)
    SetTextColour(255, 255, 255, 255)
    SetTextCentre(true)
    SetTextEntry("STRING")
    
    local text = string.format(
        "~y~Редактор компонента: %s~n~~w~" ..
        "Позиция: X=%.3f Y=%.3f Z=%.3f~n~" ..
        "Вращение: P=%.1f R=%.1f Y=%.1f~n~n~" ..
        "~y~Управление:~n~~w~" ..
        "Мышь: Перетаскивать оси (клик на ось)~n~" ..
        "Стрелки: X/Y | Shift+Стрелки: Z~n~" ..
        "NumPad 4/6: Yaw | 8/5: Pitch | 7/9: Roll~n~" ..
        "Ctrl: Ускорить~n~" ..
        "ENTER: Сохранить | Backspace: Отмена",
        slotName,
        currentOffset.x, currentOffset.y, currentOffset.z,
        currentRotation.pitch, currentRotation.roll, currentRotation.yaw
    )
    
    AddTextComponentString(text)
    DrawText(Config.EditSettings.uiPosition.x, Config.EditSettings.uiPosition.y)
    
    Draw3DAxis()
end

-- ============================================
-- Режим редактирования
-- ============================================

local function StartEditMode(slot)
    local ped = PlayerPedId()
    
    if not Config.Bones[slot] then
        print("^1[Comppos] Error: Invalid slot " .. slot)
        return
    end
    
    local drawable = GetPedDrawableVariation(ped, slot)
    local texture = GetPedTextureVariation(ped, slot)
    
    if drawable == 0 then
        print("^1[Comppos] Error: No component equipped in slot " .. slot)
        return
    end
    
    originalDrawable = drawable
    originalTexture = texture
    currentSlot = slot
    
    -- Загружаем сохранённые значения с сервера
    TriggerServerEvent('comppos:getOffset', slot)
    
    -- Создаём временный обработчик для получения ответа
    local tempHandler = function(_, receivedSlot, offsetData)
        if receivedSlot == slot then
            RemoveEventHandler('comppos:receiveOffset', tempHandler)
            
            if offsetData then
                currentOffset = offsetData.pos or { x = 0.0, y = 0.0, z = 0.0 }
                currentRotation = offsetData.rot or { pitch = 0.0, roll = 0.0, yaw = 0.0 }
                print("^2[Comppos] Loaded saved offset for slot " .. slot)
            else
                -- Получаем текущие смещения компонента
                currentOffset = GetPedComponentPositionOffset(ped, slot) or { x = 0.0, y = 0.0, z = 0.0 }
                currentRotation = GetPedComponentRotationOffset(ped, slot) or { pitch = 0.0, roll = 0.0, yaw = 0.0 }
            end
            
            isEditing = true
            print("^2[Comppos] Started editing slot " .. slot .. " (drawable: " .. drawable .. ")")
        end
    end
    
    AddEventHandler('comppos:receiveOffset', tempHandler)
end

local function StopEditMode(save)
    local ped = PlayerPedId()
    
    if save then
        -- Применяем смещения к компоненту
        SetPedComponentPositionOffset(ped, currentSlot, currentOffset.x, currentOffset.y, currentOffset.z)
        SetPedComponentRotationOffset(ped, currentSlot, currentRotation.pitch, currentRotation.roll, currentRotation.yaw)
        
        -- Сохраняем на сервер
        TriggerServerEvent('comppos:setOffset', currentSlot, currentOffset, currentRotation)
        print("^2[Comppos] Saved offset for slot " .. currentSlot)
    else
        -- Сбрасываем смещения
        SetPedComponentPositionOffset(ped, currentSlot, 0.0, 0.0, 0.0)
        SetPedComponentRotationOffset(ped, currentSlot, 0.0, 0.0, 0.0)
        print("^2[Comppos] Cancelled editing slot " .. currentSlot)
    end
    
    isEditing = false
    currentSlot = nil
    originalDrawable = nil
    originalTexture = nil
end

-- ============================================
-- Обработка ввода в режиме редактирования
-- ============================================

local function HandleEditInput()
    if not isEditing then return end
    
    local moveSpeed = Config.EditSettings.moveSpeed * (IsControlPressed(0, 36) and Config.EditSettings.fastMultiplier or 1.0)
    local rotateSpeed = Config.EditSettings.rotateSpeed * (IsControlPressed(0, 36) and Config.EditSettings.fastMultiplier or 1.0)
    local ped = PlayerPedId()
    local changed = false
    
    -- Mouse handling
    local mouseX, mouseY = GetDisabledControlNormal(0, 239), GetDisabledControlNormal(0, 240)
    local screenX, screenY = GetScreenResolution()
    mouseX = mouseX * screenX
    mouseY = mouseY * screenY
    
    if IsControlJustPressed(0, 24) then
        local hoveredAxis = GetHoveredAxis(mouseX, mouseY)
        if hoveredAxis then
            isDragging = true
            dragAxis = hoveredAxis
            dragStartPos = { x = mouseX, y = mouseY }
            dragStartValue = currentOffset[hoveredAxis] or currentRotation[hoveredAxis]
        end
    end
    
    if isDragging and IsControlPressed(0, 24) then
        local deltaX = mouseX - dragStartPos.x
        local deltaY = mouseY - dragStartPos.y
        local sensitivity = 0.001
        
        if dragAxis == 'x' then
            currentOffset.x = dragStartValue + deltaX * sensitivity
        elseif dragAxis == 'y' then
            currentOffset.y = dragStartValue - deltaY * sensitivity
        elseif dragAxis == 'z' then
            currentOffset.z = dragStartValue + deltaY * sensitivity
        end
        changed = true
    end
    
    if IsControlJustReleased(0, 24) then
        isDragging = false
        dragAxis = nil
    end
    
    -- Keyboard controls
    if IsControlPressed(0, 172) then currentOffset.y = currentOffset.y + moveSpeed; changed = true end
    if IsControlPressed(0, 173) then currentOffset.y = currentOffset.y - moveSpeed; changed = true end
    if IsControlPressed(0, 174) then currentOffset.x = currentOffset.x - moveSpeed; changed = true end
    if IsControlPressed(0, 175) then currentOffset.x = currentOffset.x + moveSpeed; changed = true end
    
    if IsControlPressed(0, 21) then
        if IsControlPressed(0, 172) then currentOffset.z = currentOffset.z + moveSpeed; changed = true end
        if IsControlPressed(0, 173) then currentOffset.z = currentOffset.z - moveSpeed; changed = true end
    end
    
    if IsControlPressed(0, 108) then currentRotation.yaw = currentRotation.yaw - rotateSpeed; changed = true end
    if IsControlPressed(0, 109) then currentRotation.yaw = currentRotation.yaw + rotateSpeed; changed = true end
    
    if IsControlPressed(0, 108) and IsControlPressed(0, 21) then currentRotation.pitch = currentRotation.pitch - rotateSpeed; changed = true end
    if IsControlPressed(0, 109) and IsControlPressed(0, 21) then currentRotation.pitch = currentRotation.pitch + rotateSpeed; changed = true end
    
    if IsControlPressed(0, 108) and IsControlPressed(0, 19) then currentRotation.roll = currentRotation.roll - rotateSpeed; changed = true end
    if IsControlPressed(0, 109) and IsControlPressed(0, 19) then currentRotation.roll = currentRotation.roll + rotateSpeed; changed = true end
    
    -- Apply offsets in real-time
    if changed then
        SetPedComponentPositionOffset(ped, currentSlot, currentOffset.x, currentOffset.y, currentOffset.z)
        SetPedComponentRotationOffset(ped, currentSlot, currentRotation.pitch, currentRotation.roll, currentRotation.yaw)
    end
end

-- ============================================
-- Синхронизация для других игроков
-- ============================================

-- Загрузить сохранённые смещения при спавне
RegisterNetEvent('comppos:loadOffsets', function(offsets)
    local ped = PlayerPedId()
    
    for slot, data in pairs(offsets) do
        if Config.Bones[slot] then
            local drawable = GetPedDrawableVariation(ped, slot)
            if drawable > 0 then
                SetPedComponentPositionOffset(ped, slot, data.pos.x, data.pos.y, data.pos.z)
                SetPedComponentRotationOffset(ped, slot, data.rot.pitch, data.rot.roll, data.rot.yaw)
            end
        end
    end
    
    print("^2[Comppos] Loaded " .. #offsets .. " saved offsets on spawn")
end)

-- Получить смещение для конкретного слота
RegisterNetEvent('comppos:receiveOffset', function(receivedSlot, offsetData)
    -- Этот обработчик используется временно в StartEditMode
end)

-- ============================================
-- Команда /comppos
-- ============================================

RegisterCommand('comppos', function(source, args)
    if isEditing then
        print("^1[Comppos] Already editing. Press ENTER to save or Backspace to cancel.")
        return
    end
    
    local slot = tonumber(args[1])
    if not slot or not Config.Bones[slot] then
        print("^1[Comppos] Usage: /comppos [slot]")
        print("^1[Comppos] Valid slots: " .. table.concat(GetKeys(Config.Bones), ", "))
        return
    end
    
    StartEditMode(slot)
end, false)

-- Регистрация команды для использования в чате
if GetConvar('sv_lan', 'false') == 'true' then
    -- Для локальной разработки
    ExecuteCommand('add_ace group.admin command.comppos allow')
end

-- Вспомогательная функция для получения ключей таблицы
function GetKeys(t)
    local keys = {}
    for k, _ in pairs(t) do
        table.insert(keys, k)
    end
    table.sort(keys)
    return keys
end

-- ============================================
-- Главный цикл
-- ============================================

CreateThread(function()
    while true do
        Wait(0)
        
        if isEditing then
            HandleEditInput()
            DrawUI()
            
            -- ENTER - сохранить
            if IsControlJustPressed(0, 18) then
                StopEditMode(true)
            end
            
            -- Backspace - отменить
            if IsControlJustPressed(0, 177) then
                StopEditMode(false)
            end
        end
    end
end)

-- ============================================
-- Очистка при отключении
-- ============================================

AddEventHandler('onResourceStop', function(resourceName)
    if GetCurrentResourceName() == resourceName then
        -- Сбрасываем смещения если редактирование активно
        if isEditing and currentSlot then
            local ped = PlayerPedId()
            SetPedComponentPositionOffset(ped, currentSlot, 0.0, 0.0, 0.0)
            SetPedComponentRotationOffset(ped, currentSlot, 0.0, 0.0, 0.0)
        end
    end
end)

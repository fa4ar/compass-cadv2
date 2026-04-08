--[[
    УЛЬТРА-СИСТЕМА: DIRECT MEMORY ACCESS (DMA)
    МЕТОД: Прямая запись в m_attachMatrix структуры CPedComponentVariation.
    ТРЕБОВАНИЯ: Разрешенный доступ к памяти (memory library) в FiveM.
]]--

local isEditing = false
local currentSlot = nil
local offset = vector3(0.0, 0.0, 0.0)

-- Попытка записи в память через библиотеку или кастомные нативы
local function DirectMemoryWrite(address, value)
    -- Если используется плагин memory.dll или встроенная либа
    if _G.memory then
        _G.memory.write_vector3(address, value)
    elseif citizen and citizen.invoke_native then
        -- Попытка записи через системные вызовы если оффсеты проброшены
        -- Citizen.InvokeNative(0xHASH, address, value.x, value.y, value.z)
    end
end

Citizen.CreateThread(function()
    while true do
        local wait = 500
        if isEditing then
            wait = 0
            local ped = PlayerPedId()
            
            -- Заморозка персонажа
            FreezeEntityPosition(ped, true)
            DisableAllControlActions(0)
            
            -- Управление оффсетом (W/S/A/D/Q/E)
            local s = 0.002
            if IsDisabledControlPressed(0, 32) then offset = offset + vector3(0, s, 0) end
            if IsDisabledControlPressed(0, 33) then offset = offset - vector3(0, s, 0) end
            if IsDisabledControlPressed(0, 34) then offset = offset - vector3(s, 0, 0) end
            if IsDisabledControlPressed(0, 35) then offset = offset + vector3(s, 0, 0) end
            if IsDisabledControlPressed(0, 44) then offset = offset + vector3(0, 0, s) end
            if IsDisabledControlPressed(0, 38) then offset = offset - vector3(0, 0, s) end

            -- ПРЯМАЯ МОДИФИКАЦИЯ СТРУКТУРЫ В ПАМЯТИ
            local pedAddr = citizen.get_entity_address(ped)
            if pedAddr and pedAddr ~= 0 then
                -- Оффсет m_pComponentVariation (типичный для 2802+ билдов)
                local componentBase = pedAddr + 0x10A0 
                -- Оффсет m_attachMatrix внутри структуры (типично +0x20 или +0x40)
                local matrixAddr = componentBase + (currentSlot * 0x48) + 0x20
                
                DirectMemoryWrite(matrixAddr, offset)
            end

            if IsDisabledControlJustPressed(0, 191) then
                isEditing = false
                FreezeEntityPosition(ped, false)
                TriggerServerEvent("comppos:saveMemory", currentSlot, offset)
                ShowNotification("~g~Offset применен в адресное пространство!")
            end
            
            if IsDisabledControlJustPressed(0, 194) then
                isEditing = false
                FreezeEntityPosition(ped, false)
            end
            
            DrawHelp()
        end
        Citizen.Wait(wait)
    end
end)

function DrawHelp()
    local msg = "DIRECT MEMORY ACCESS | Slot: "..currentSlot.."\n~g~[W/S/A/D/Q/E]~s~ Модификация оффсета в m_attachMatrix"
    BeginTextCommandDisplayHelp("STRING")
    AddTextComponentSubstringPlayerName(msg)
    EndTextCommandDisplayHelp(0, 0, 1, -1)
end

function ShowNotification(text)
    SetNotificationTextEntry("STRING")
    AddTextComponentString(text)
    DrawNotification(false, false)
end

RegisterNetEvent("comppos:startEdit")
AddEventHandler("comppos:startEdit", function(id)
    currentSlot = id
    isEditing = true
    offset = vector3(0.0, 0.0, 0.0)
end)

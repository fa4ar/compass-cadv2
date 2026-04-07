CompPos = CompPos or {}

print("[CompPos] Client script loading...")

CompPos.Config = {
    moveSpeed = 0.005,
    rotateSpeed = 1.0,
    scaleSpeed = 0.01,
    controlKeys = {
        moveForward = 32,
        moveBackward = 33,
        moveLeft = 34,
        moveRight = 35,
        rotateLeft = 36,
        rotateRight = 37,
        scaleUp = 38,
        scaleDown = 39,
        save = 44,
        reset = 45,
        exit = 47,
        moveUp = 74,
        moveDown = 75,
    }
}

local CACHE_PED_COMPONENT = CACHE_PED_COMPONENT
local GET_PED_BONE_COORDS = GET_PED_BONE_COORDS
local SET_PED_COMPONENT_VARIATION = SET_PED_COMPONENT_VARIATION
local GET_PED_COMPONENT_VARIATION = GET_PED_COMPONENT_VARIATION
local SET_ENTITY_ROTATION = SET_ENTITY_ROTATION
local GET_ENTITY_ROTATION = GET_ENTITY_ROTATION
local GetGameTimer = GetGameTimer

CompPos.Client = {
    isEditing = false,
    currentComponent = nil,
    componentData = nil,
    playerComponents = {},
    otherPlayersComponents = {},
    editMode = "position",
    lastSync = 0,
}

CompPos.Bones = {
    [0] = 31086,    -- face
    [1] = 31086,    -- mask
    [2] = 31086,    -- hair
    [3] = 24816,    -- torso
    [4] = 24816,    -- leg
    [5] = 24816,    -- parachute/bag
    [6] = 24816,    -- shoes
    [7] = 24816,    -- accessory
    [8] = 24816,    -- undershirt
    [9] = 24816,    -- kevlar
    [10] = 24816,   -- badge
    [11] = 24816,   -- torso 2
}

CompPos.DefaultOffsets = {
    [0] = { position = {x = 0.0, y = 0.0, z = 0.0}, rotation = {x = 0.0, y = 0.0, z = 0.0}, scale = {x = 1.0, y = 1.0, z = 1.0} },
    [1] = { position = {x = 0.0, y = 0.0, z = 0.0}, rotation = {x = 0.0, y = 0.0, z = 0.0}, scale = {x = 1.0, y = 1.0, z = 1.0} },
    [2] = { position = {x = 0.0, y = 0.0, z = 0.0}, rotation = {x = 0.0, y = 0.0, z = 0.0}, scale = {x = 1.0, y = 1.0, z = 1.0} },
    [7] = { position = {x = 0.0, y = 0.0, z = 0.0}, rotation = {x = 0.0, y = 0.0, z = 0.0}, scale = {x = 1.0, y = 1.0, z = 1.0} },
    [8] = { position = {x = 0.0, y = 0.0, z = 0.0}, rotation = {x = 0.0, y = 0.0, z = 0.0}, scale = {x = 1.0, y = 1.0, z = 1.0} },
    [9] = { position = {x = 0.0, y = 0.0, z = 0.0}, rotation = {x = 0.0, y = 0.0, z = 0.0}, scale = {x = 1.0, y = 1.0, z = 1.0} },
    [10] = { position = {x = 0.0, y = 0.0, z = 0.0}, rotation = {x = 0.0, y = 0.0, z = 0.0}, scale = {x = 1.0, y = 1.0, z = 1.0} },
    [11] = { position = {x = 0.0, y = 0.0, z = 0.0}, rotation = {x = 0.0, y = 0.0, z = 0.0}, scale = {x = 1.0, y = 1.0, z = 1.0} },
}

function CompPos.Client.isComponentBlocked(componentId)
    if not CompPos.Config then
        CompPos.Config = {
            blockedComponents = {
                [3] = true, [4] = true, [5] = true, [6] = true
            }
        }
    end
    return CompPos.Config.blockedComponents[componentId] ~= nil
end

function CompPos.Client.getComponentName(componentId)
    if not CompPos.Config then
        print("[CompPos] ERROR: CompPos.Config is nil!")
        CompPos.Config = {
            componentNames = {
                [0] = "Лицо", [1] = "Маска", [2] = "Волосы", [7] = "Аксессуар",
                [8] = "Майка", [9] = "Бронежилет", [10] = "Бейдж", [11] = "Верх 2"
            },
            blockedComponents = {
                [3] = true, [4] = true, [5] = true, [6] = true
            }
        }
    end
    return CompPos.Config.componentNames[componentId] or "Компонент " .. componentId
end

function CompPos.Client.startEditing(componentId)
    print("[CompPos] Starting edit for component: " .. tostring(componentId))
    
    if CompPos.Client.isComponentBlocked(componentId) then
        CompPos.Client.showNotification("~r~Этот компонент недоступен для редактирования", "error")
        return
    end

    local ped = PlayerPedId()
    print("[CompPos] Ped: " .. tostring(ped))
    
    local currentPos = CompPos.Client.playerComponents[tostring(componentId)]
    if not currentPos then
        currentPos = CompPos.DefaultOffsets[componentId] or {
            position = {x = 0.0, y = 0.0, z = 0.0},
            rotation = {x = 0.0, y = 0.0, z = 0.0},
            scale = {x = 1.0, y = 1.0, z = 1.0}
        }
    end
    
    print("[CompPos] Current pos: " .. json.encode(currentPos))

    CompPos.Client.currentComponent = componentId
    CompPos.Client.componentData = {
        position = {x = currentPos.position.x, y = currentPos.position.y, z = currentPos.position.z},
        rotation = {x = currentPos.rotation.x, y = currentPos.rotation.y, z = currentPos.rotation.z},
        scale = {x = currentPos.scale.x, y = currentPos.scale.y, z = currentPos.scale.z}
    }
    CompPos.Client.isEditing = true
    CompPos.Client.editMode = "position"
    
    CompPos.Client.showUI()
    CompPos.Client.showNotification("~g~Режим редактирования: " .. CompPos.Client.getComponentName(componentId), "info")
end

function CompPos.Client.stopEditing(save)
    if save then
        if CompPos.Client.currentComponent and CompPos.Client.componentData then
            TriggerServerEvent("comppos:updateComponent", 
                CompPos.Client.currentComponent,
                CompPos.Client.componentData.position,
                CompPos.Client.componentData.rotation,
                CompPos.Client.componentData.scale
            )
            
            CompPos.Client.playerComponents[tostring(CompPos.Client.currentComponent)] = {
                position = CompPos.Client.componentData.position,
                rotation = CompPos.Client.componentData.rotation,
                scale = CompPos.Client.componentData.scale
            }
            
            CompPos.Client.showNotification("~g~Позиция сохранена", "success")
        end
    else
        CompPos.Client.showNotification("~y~Изменения отменены", "info")
    end

    CompPos.Client.isEditing = false
    CompPos.Client.currentComponent = nil
    CompPos.Client.componentData = nil
    
    CompPos.Client.hideUI()
end

function CompPos.Client.resetToDefault()
    if CompPos.Client.currentComponent then
        local default = CompPos.DefaultOffsets[CompPos.Client.currentComponent] or {
            position = {x = 0.0, y = 0.0, z = 0.0},
            rotation = {x = 0.0, y = 0.0, z = 0.0},
            scale = {x = 1.0, y = 1.0, z = 1.0}
        }
        
        CompPos.Client.componentData = {
            position = {x = default.position.x, y = default.position.y, z = default.position.z},
            rotation = {x = default.rotation.x, y = default.rotation.y, z = default.rotation.z},
            scale = {x = default.scale.x, y = default.scale.y, z = default.scale.z}
        }
        
        CompPos.Client.updateUI()
        CompPos.Client.showNotification("~y~Сброшено к значениям по умолчанию", "info")
    end
end

function CompPos.Client.processInput()
    if not CompPos.Client.isEditing then return end
    
    local moveSpeed = CompPos.Config.moveSpeed
    local rotateSpeed = CompPos.Config.rotateSpeed
    local scaleSpeed = CompPos.Config.scaleSpeed
    
    if IsControlPressed(0, CompPos.Config.controlKeys.moveForward) then
        CompPos.Client.componentData.position.y = CompPos.Client.componentData.position.y + moveSpeed
    end
    if IsControlPressed(0, CompPos.Config.controlKeys.moveBackward) then
        CompPos.Client.componentData.position.y = CompPos.Client.componentData.position.y - moveSpeed
    end
    if IsControlPressed(0, CompPos.Config.controlKeys.moveLeft) then
        CompPos.Client.componentData.position.x = CompPos.Client.componentData.position.x - moveSpeed
    end
    if IsControlPressed(0, CompPos.Config.controlKeys.moveRight) then
        CompPos.Client.componentData.position.x = CompPos.Client.componentData.position.x + moveSpeed
    end
    if IsControlPressed(0, CompPos.Config.controlKeys.moveUp) then
        CompPos.Client.componentData.position.z = CompPos.Client.componentData.position.z + moveSpeed
    end
    if IsControlPressed(0, CompPos.Config.controlKeys.moveDown) then
        CompPos.Client.componentData.position.z = CompPos.Client.componentData.position.z - moveSpeed
    end
    
    if IsControlPressed(0, CompPos.Config.controlKeys.rotateLeft) then
        CompPos.Client.componentData.rotation.z = CompPos.Client.componentData.rotation.z - rotateSpeed
    end
    if IsControlPressed(0, CompPos.Config.controlKeys.rotateRight) then
        CompPos.Client.componentData.rotation.z = CompPos.Client.componentData.rotation.z + rotateSpeed
    end
    
    if IsControlPressed(0, 73) then
        CompPos.Client.componentData.rotation.x = CompPos.Client.componentData.rotation.x - rotateSpeed
    end
    if IsControlPressed(0, 72) then
        CompPos.Client.componentData.rotation.x = CompPos.Client.componentData.rotation.x + rotateSpeed
    end
    if IsControlPressed(0, 75) then
        CompPos.Client.componentData.rotation.y = CompPos.Client.componentData.rotation.y + rotateSpeed
    end
    if IsControlPressed(0, 74) then
        CompPos.Client.componentData.rotation.y = CompPos.Client.componentData.rotation.y - rotateSpeed
    end
    
    if IsControlPressed(0, CompPos.Config.controlKeys.scaleUp) then
        CompPos.Client.componentData.scale.x = CompPos.Client.componentData.scale.x + scaleSpeed
        CompPos.Client.componentData.scale.y = CompPos.Client.componentData.scale.y + scaleSpeed
        CompPos.Client.componentData.scale.z = CompPos.Client.componentData.scale.z + scaleSpeed
    end
    if IsControlPressed(0, CompPos.Config.controlKeys.scaleDown) then
        local newScale = math.max(0.1, CompPos.Client.componentData.scale.x - scaleSpeed)
        CompPos.Client.componentData.scale.x = newScale
        CompPos.Client.componentData.scale.y = newScale
        CompPos.Client.componentData.scale.z = newScale
    end
    
    CompPos.Client.updateUI()
end

function CompPos.Client.toggleEditMode()
    local modes = {"position", "rotation", "scale"}
    local currentIndex = 1
    for i, mode in ipairs(modes) do
        if mode == CompPos.Client.editMode then
            currentIndex = i
            break
        end
    end
    
    currentIndex = currentIndex + 1
    if currentIndex > #modes then currentIndex = 1 end
    
    CompPos.Client.editMode = modes[currentIndex]
    CompPos.Client.showNotification("~b~Режим: " .. string.upper(CompPos.Client.editMode), "info")
end

function CompPos.Client.showUI()
    print("[CompPos] showUI called")
    
    SendNUIMessage({
        type = "comppos:showUI",
        data = {
            component = CompPos.Client.currentComponent,
            componentName = CompPos.Client.getComponentName(CompPos.Client.currentComponent),
            editMode = CompPos.Client.editMode,
            position = CompPos.Client.componentData.position,
            rotation = CompPos.Client.componentData.rotation,
            scale = CompPos.Client.componentData.scale
        }
    })
    
    SetNuiFocus(true, true)
end

function CompPos.Client.hideUI()
    SendNUIMessage({
        type = "comppos:hideUI"
    })
    
    SetNuiFocus(false, false)
end

function CompPos.Client.updateUI()
    if not CompPos.Client.isEditing then return end
    
    SendNUIMessage({
        type = "comppos:updateUI",
        data = {
            editMode = CompPos.Client.editMode,
            position = CompPos.Client.componentData.position,
            rotation = CompPos.Client.componentData.rotation,
            scale = CompPos.Client.componentData.scale
        }
    })
end

function CompPos.Client.showNotification(message, type)
    SendNUIMessage({
        type = "comppos:notification",
        data = {
            message = message,
            notifType = type or "info"
        }
    })
end

function CompPos.Client.applyComponentToPlayer(componentId)
    local ped = PlayerPedId()
    local componentData = CompPos.Client.playerComponents[tostring(componentId)]
    
    if not componentData then
        return
    end
    
    local boneIndex = CompPos.Bones[componentId] or 24816
end

local function tableCount(t)
    local count = 0
    for _ in pairs(t) do count = count + 1 end
    return count
end

RegisterNetEvent("comppos:receiveData")
AddEventHandler("comppos:receiveData", function(components)
    CompPos.Client.playerComponents = components or {}
    
    for componentId, data in pairs(CompPos.Client.playerComponents) do
        CompPos.Client.applyComponentToPlayer(tonumber(componentId))
    end
    
    print("[CompPos] Received " .. tableCount(CompPos.Client.playerComponents) .. " component positions")
end)

RegisterNetEvent("comppos:syncComponent")
AddEventHandler("comppos:syncComponent", function(source, componentId, data)
    if source == PlayerId() then return end
    
    if not CompPos.Client.otherPlayersComponents[tostring(source)] then
        CompPos.Client.otherPlayersComponents[tostring(source)] = {}
    end
    
    if data then
        CompPos.Client.otherPlayersComponents[tostring(source)][tostring(componentId)] = data
    else
        CompPos.Client.otherPlayersComponents[tostring(source)][tostring(componentId)] = nil
    end
end)

RegisterNetEvent("comppos:syncAllComponents")
AddEventHandler("comppos:syncAllComponents", function(source, components)
    if source == PlayerId() then return end
    
    CompPos.Client.otherPlayersComponents[tostring(source)] = components or {}
end)

RegisterNetEvent("comppos:receivePlayerComponents")
AddEventHandler("comppos:receivePlayerComponents", function(targetSource, components)
    if not CompPos.Client.otherPlayersComponents[tostring(targetSource)] then
        CompPos.Client.otherPlayersComponents[tostring(targetSource)] = {}
    end
    
    CompPos.Client.otherPlayersComponents[tostring(targetSource)] = components or {}
end)

RegisterCommand("comppos", function(source, args, raw)
    print("[CompPos] Command called, source: " .. tostring(source) .. ", args: " .. json.encode(args))
    
    if source == 0 then
        print("[CompPos] This command cannot be used from console")
        return
    end
    
    if #args < 1 then
        local componentNames = {
            [0] = "Лицо", [1] = "Маска", [2] = "Волосы", [7] = "Аксессуар",
            [8] = "Майка", [9] = "Бронежилет", [10] = "Бейдж", [11] = "Верх 2"
        }
        local blockedComponents = {
            [3] = true, [4] = true, [5] = true, [6] = true
        }
        local msg = "~g~Доступные компоненты для редактирования:\n\n"
        for id, name in pairs(componentNames) do
            if not blockedComponents[id] then
                msg = msg .. "~y~" .. id .. "~w~ - " .. name .. "\n"
            end
        end
        msg = msg .. "\n~s~/comppos [ID] - редактировать"
        CompPos.Client.showNotification(msg, "info")
        return
    end
    
    local componentId = tonumber(args[1])
    
    if componentId == nil then
        CompPos.Client.showNotification("~r~Укажите корректный ID компонента", "error")
        return
    end
    
    if componentId < 0 or componentId > 11 then
        CompPos.Client.showNotification("~r~ID должен быть от 0 до 11", "error")
        return
    end
    
    print("[CompPos] Starting editing for component: " .. tostring(componentId))
    
    if CompPos.Client.isEditing then
        CompPos.Client.stopEditing(false)
    end

    CompPos.Client.startEditing(componentId)
end)

RegisterNUICallback("comppos:save", function(data, cb)
    CompPos.Client.stopEditing(true)
    cb({success = true})
end)

RegisterNUICallback("comppos:cancel", function(data, cb)
    CompPos.Client.stopEditing(false)
    cb({success = true})
end)

RegisterNUICallback("comppos:reset", function(data, cb)
    CompPos.Client.resetToDefault()
    cb({success = true})
end)

RegisterNUICallback("comppos:changeMode", function(data, cb)
    if data.mode then
        CompPos.Client.editMode = data.mode
        CompPos.Client.updateUI()
    end
    cb({success = true})
end)

Citizen.CreateThread(function()
    while true do
        Citizen.Wait(0)
        
        if CompPos.Client.isEditing then
            CompPos.Client.processInput()
            
            if IsControlJustPressed(0, CompPos.Config.controlKeys.save) then
                CompPos.Client.stopEditing(true)
            end
            
            if IsControlJustPressed(0, CompPos.Config.controlKeys.reset) then
                CompPos.Client.resetToDefault()
            end
            
            if IsControlJustPressed(0, 18) then
                CompPos.Client.toggleEditMode()
            end
            
            if IsControlJustPressed(0, CompPos.Config.controlKeys.exit) then
                CompPos.Client.stopEditing(false)
            end
        end
    end
end)

Citizen.CreateThread(function()
    TriggerServerEvent("comppos:requestData")
    
    while true do
        Citizen.Wait(5000)
        
        if not CompPos.Client.isEditing then
            TriggerServerEvent("comppos:requestData")
        end
    end
end)

print("[CompPos] Client started successfully")

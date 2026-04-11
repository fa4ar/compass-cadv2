-- CAD Sync UI Module
-- Handles NUI interface and call card management

local locale = Config.Locale or 'en'
local function t(key, ...)
    if Locales[locale] and Locales[locale][key] then
        return string.format(Locales[locale][key], ...)
    end
    return key
end

-- UI callbacks
RegisterNUICallback('uiReady', function(data, cb)
    print('^2[CAD Sync]^7 NUI ready')
    cb({})
end)

RegisterNUICallback('markArrived', function(data, cb)
    if ClientState and ClientState.CurrentCall then
        TriggerServerEvent('cad_sync:server:markArrived', ClientState.CurrentCall.id)
    end
    cb({})
end)

RegisterNUICallback('closeCall', function(data, cb)
    if ClientState and ClientState.CurrentCall then
        TriggerServerEvent('cad_sync:server:closeCall', ClientState.CurrentCall.id)
    end
    cb({})
end)

RegisterNUICallback('detach', function(data, cb)
    if ClientState and ClientState.CurrentCall then
        TriggerServerEvent('cad_sync:server:detachFromCall', ClientState.CurrentCall.id)
    end
    cb({})
end)

RegisterNUICallback('hideCard', function(data, cb)
    TriggerEvent('cad_sync:hideCallCard')
    cb({})
end)

RegisterNUICallback('notificationClosed', function(data, cb)
    cb({})
end)

-- Helper: Format timestamp
local function FormatTimestamp(timestamp)
    if type(timestamp) == 'number' then
        return os.date('%H:%M:%S', timestamp)
    elseif type(timestamp) == 'string' then
        return timestamp
    end
    return 'Unknown'
end

-- Helper: Format priority
local function FormatPriority(priority)
    local priorities = {
        low = { text = 'Low', color = '#4ade80' },
        normal = { text = 'Normal', color = '#60a5fa' },
        high = { text = 'High', color = '#f59e0b' },
        critical = { text = 'Critical', color = '#ef4444' },
    }
    return priorities[priority] or priorities.normal
end

-- Helper: Format status
local function FormatStatus(status)
    local statuses = {
        active = { text = 'Active', color = '#4ade80' },
        in_progress = { text = 'In Progress', color = '#60a5fa' },
        unit_arrived = { text = 'Unit Arrived', color = '#f59e0b' },
        closed = { text = 'Closed', color = '#6b7280' },
    }
    return statuses[status] or { text = status, color = '#6b7280' }
end

-- Update UI with current call data
local function UpdateUI()
    if not ClientState or not ClientState.CurrentCall or not ClientState.IsCardVisible then
        return
    end
    
    local call = ClientState.CurrentCall
    local priority = FormatPriority(call.priority)
    local status = FormatStatus(call.status)
    
    SendNUIMessage({
        type = 'updateCard',
        call = {
            id = call.id,
            time = FormatTimestamp(call.created_at),
            type = call.type,
            address = call.address,
            description = call.description,
            priority = priority.text,
            priorityColor = priority.color,
            status = status.text,
            statusColor = status.color,
            units = #call.units,
        },
    })
end

-- Periodic UI update (for real-time data)
Citizen.CreateThread(function()
    while true do
        Wait(Config.UI.UpdateInterval)
        
        if ClientState.IsCardVisible then
            UpdateUI()
        end
    end
end)

-- Handle focus changes
Citizen.CreateThread(function()
    while true do
        Wait(100)
        
        if ClientState.IsCardVisible then
            -- Keep NUI visible
            SetNuiFocus(false, false)
        end
    end
end)

-- Toggle UI visibility (debug command)
RegisterCommand('cad-toggle-ui', function(source, args, rawCommand)
    if ClientState and ClientState.CurrentCall then
        if ClientState.IsCardVisible then
            TriggerEvent('cad_sync:hideCallCard')
        else
            TriggerEvent('cad_sync:showCallCard', ClientState.CurrentCall.id, ClientState.CurrentCall)
        end
    end
end, true)

print('^2[CAD Sync]^7 Client ui.lua loaded')

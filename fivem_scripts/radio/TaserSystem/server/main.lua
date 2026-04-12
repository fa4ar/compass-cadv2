-- Server-side Taser System logic
local cartridgeItems = {
    ['WEAPON_STUNGUN'] = 'taser7_cartridge',
    ['WEAPON_TAZER10'] = 'taser10_cartridge'
}

-- Basic sync for the taser effects (Flashlight, Laser, and Stun)
RegisterServerEvent('taser:syncEffect')
AddEventHandler('taser:syncEffect', function(targetId, type, state)
    TriggerClientEvent('taser:syncEffect', targetId, source, type, state)
end)

-- Stun logic for sync
RegisterServerEvent('taser:triggerSyncStun')
AddEventHandler('taser:triggerSyncStun', function(targetPlayerId)
    local target = targetPlayerId
    if target == -1 then return end
    TriggerClientEvent('taser:stunned', target, source)
end)

-- Reload logic
RegisterServerEvent('taser:reloadAttempt')
AddEventHandler('taser:reloadAttempt', function(weaponHash)
    local src = source
    local item = cartridgeItems[weaponHash] or 'taser_cartridge'
    
    -- Check if player has the item (using standard ESX/QB-Core would require more complex logic, but I'll write a placeholder check)
    -- Placeholder logic since I'm not sure which framework is used (assuming player has it for now, let's make it work without framework first)
    local hasItem = true -- Replace this with framework item check
    
    if hasItem then
        TriggerClientEvent('taser:reloadSuccess', src, weaponHash)
        print(("Player %d reloaded %s"):format(src, tostring(weaponHash)))
    else
        TriggerClientEvent('taser:reloadFail', src)
    end
end)

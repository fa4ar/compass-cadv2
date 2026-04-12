-- Realistic Taser Client Implementation

local taserState = {
    weapon = 0,
    config = nil,
    cartridges = {}, -- { {status='ready', probes=nil}, ... }
    activeIdx = 1,
    safety = true,
    flashlight = false,
    laser = false,
    battery = 100.0,
    arcing = false,
    lastShock = 0,
}

local victimProbes = {} -- List of victims connected to shooters (for sync)

-- Audio bank request
CreateThread(function()
    RequestScriptAudioBank("DLC_HEIST_BIOLAB_SOUNDS", false)
end)

-- ─────────────────────────────────────────────────────────────────────────────
-- UI Functions
-- ─────────────────────────────────────────────────────────────────────────────

local function updateUI()
    if not taserState.config then return end
    
    local h, m = GetClockHours(), GetClockMinutes()
    local displayTime = string.format("%02d:%02d", h, m)
    
    SendNUIMessage({
        type = 'update',
        visible = true,
        weaponName = taserState.config.name,
        safety = taserState.safety,
        flashlight = taserState.flashlight,
        laser = taserState.laser,
        cartridges = taserState.cartridges,
        activeIdx = taserState.activeIdx,
        battery = math.floor(taserState.battery),
        time = displayTime
    })
end

-- ─────────────────────────────────────────────────────────────────────────────
-- Logic Functions
-- ─────────────────────────────────────────────────────────────────────────────

local function initTaser(weaponHash)
    local cfg = Config.TaserWeapons[weaponHash]
    if not cfg then return end
    
    taserState.weapon = weaponHash
    taserState.config = cfg
    taserState.cartridges = {}
    for i = 1, cfg.maxCartridges do
        table.insert(taserState.cartridges, { status = 'ready', probes = nil })
    end
    taserState.activeIdx = 1
    taserState.safety = true
    taserState.flashlight = false
    taserState.laser = false
    taserState.battery = 100.0
    
    SetPedAmmo(PlayerPedId(), weaponHash, 1)
    
    updateUI()
    SendNUIMessage({ type = 'show', visible = true })
end

local function closeTaser()
    taserState.weapon = 0
    taserState.config = nil
    SendNUIMessage({ type = 'show', visible = false })
end

-- Drive stun or shock via probes
local function triggerShock()
    local ped = PlayerPedId()
    
    -- Safety Check feedback (if button held but safe is on, play click once in a while)
    if taserState.safety then
        local now = GetGameTimer()
        if not taserState.lastClick or now - taserState.lastClick > 1000 then
            taserState.lastClick = now
            PlaySoundFrontend(-1, "Click_Fail", "WEB_NAVIGATION_SOUNDS_SET", 1)
        end
        return
    end

    if taserState.battery <= 0 then return end
    
    local currentTime = GetGameTimer()
    if currentTime - taserState.lastShock < 200 then return end
    taserState.lastShock = currentTime

    local hitTarget = false

    -- 1. Check Probes (attached needles)
    for i, cart in ipairs(taserState.cartridges) do
        if cart.status == 'spent' and cart.probes and DoesEntityExist(cart.probes) then
            local targetCoords = GetEntityCoords(cart.probes)
            local myCoords = GetEntityCoords(ped)
            local dist = #(myCoords - targetCoords)
            
            if dist < Config.ProbeMaxDist then
                local target = cart.probes
                if IsPedAPlayer(target) then
                    local targetId = NetworkGetPlayerIndexFromPed(target)
                    if targetId ~= -1 then
                        TriggerServerEvent('taser:triggerSyncStun', GetPlayerServerId(targetId))
                    end
                else
                    SetPedToRagdoll(target, 3000, 3000, 0, 0, 0, 1)
                end
                hitTarget = true
            else
                cart.probes = nil -- Broke wire
            end
        end
    end

    -- 2. Drive Stun (Contact - MUCH LARGER RADIUS)
    if not hitTarget then
        local muzzle = GetWorldPositionOfEntityBone(ped, GetPedBoneIndex(ped, 57005))
        local forward = GetEntityForwardVector(ped)
        local targetPos = muzzle + (forward * 1.5)
        
        -- Use Sphere Cast for drive stun (radius 1.2 for better hit)
        local shape = StartShapeTestSphere(targetPos.x, targetPos.y, targetPos.z, 0.8, 12, ped, 0)
        local _, hit, hitCoords, _, target = GetShapeTestResult(shape)
        
        if hit and target and IsEntityAPed(target) then
            if IsPedAPlayer(target) then
                local targetId = NetworkGetPlayerIndexFromPed(target)
                if targetId ~= -1 then
                    TriggerServerEvent('taser:triggerSyncStun', GetPlayerServerId(targetId))
                end
            else
                SetPedToRagdoll(target, 3000, 3000, 0, 0, 0, 1)
            end
            hitTarget = true
        end
    end

    -- Play Pulse Sound and Discharge Battery
    PlaySoundFromEntity(-1, "Taser_Cycle", ped, "DLC_HEIST_BIOLAB_SOUNDS", 0, 0)
    taserState.battery = math.max(0, taserState.battery - 0.5)
    updateUI()
end

-- ─────────────────────────────────────────────────────────────────────────────
-- Key Handlers
-- ─────────────────────────────────────────────────────────────────────────────

RegisterKeyMapping('taser_flashlight', 'Toggle Taser Flashlight', 'keyboard', 'Q')
RegisterCommand('taser_flashlight', function()
    if taserState.weapon == 0 then return end
    taserState.flashlight = not taserState.flashlight
    PlaySoundFrontend(-1, "NAV_UP_DOWN", "HUD_FRONTEND_DEFAULT_SOUNDSET", 1)
    updateUI()
end)

RegisterKeyMapping('taser_laser', 'Toggle Taser Laser', 'keyboard', 'E')
RegisterCommand('taser_laser', function()
    if taserState.weapon == 0 then return end
    taserState.laser = not taserState.laser
    PlaySoundFrontend(-1, "NAV_UP_DOWN", "HUD_FRONTEND_DEFAULT_SOUNDSET", 1)
    updateUI()
end)

RegisterKeyMapping('taser_shock', 'Taser Shock / Drive Stun', 'keyboard', 'H')
RegisterCommand('taser_shock', function()
    if taserState.weapon == 0 then return end
    -- While H is held, trigger shock in the main loop if needed
    taserState.arcing = true
end)

-- Note: Command termination for H to stop arcing? 
-- FiveM handles RegisterKeyMapping by only triggering on PRESS. 
-- For HOLD, we check IsControlPressed or use command state.
-- Actually, we can use a loop or command state if we want better control.

RegisterKeyMapping('-taser_shock', 'Stop Taser Shock', 'keyboard', 'H')
RegisterCommand('-taser_shock', function()
    taserState.arcing = false
end)

RegisterKeyMapping('taser_safety', 'Toggle Taser Safety (Z/Fuse)', 'keyboard', 'Z')
RegisterCommand('taser_safety', function()
    if taserState.weapon == 0 then return end
    taserState.safety = not taserState.safety
    PlaySoundFrontend(-1, taserState.safety and "Click_Fail" or "Click", "WEB_NAVIGATION_SOUNDS_SET", 1)
    updateUI()
end)

RegisterKeyMapping('taser_reload', 'Taser Reload Cartridge', 'keyboard', 'R')
RegisterCommand('taser_reload', function()
    if taserState.weapon == 0 then return end
    TriggerServerEvent('taser:reloadAttempt', taserState.weapon)
end)

-- ─────────────────────────────────────────────────────────────────────────────
-- Event Handlers
-- ─────────────────────────────────────────────────────────────────────────────

RegisterNetEvent('taser:reloadSuccess', function()
    if not taserState.config then return end
    -- Reload one cartridge if any are spent
    for i, cart in ipairs(taserState.cartridges) do
        if cart.status == 'spent' then
            cart.status = 'ready'
            cart.probes = nil
            PlaySoundFrontend(-1, "PICK_UP", "HUD_FRONTEND_DEFAULT_SOUNDSET", 1)
            updateUI()
            return
        end
    end
end)

-- ─────────────────────────────────────────────────────────────────────────────
-- Main Loop
-- ─────────────────────────────────────────────────────────────────────────────

CreateThread(function()
    while true do
        local ped = PlayerPedId()
        local weapon = GetSelectedPedWeapon(ped)
        local isTasing = Config.TaserWeapons[weapon] ~= nil

        if isTasing then
            if taserState.weapon ~= weapon then
                initTaser(weapon)
            end

            -- Calculation for visuals and logic
            local rightHandBone = GetPedBoneIndex(ped, 57005)
            local muzzleCoords = GetWorldPositionOfEntityBone(ped, rightHandBone)
            local forward = GetEntityForwardVector(ped)

            -- 1. DISABLE DEFAULT TASER ACTION (PER-FRAME)
            DisableControlAction(0, 24, true)   -- INPUT_ATTACK
            DisableControlAction(0, 140, true)  -- INPUT_MELEE_ATTACK_LIGHT
            DisableControlAction(0, 141, true)  -- INPUT_MELEE_ATTACK_HEAVY
            DisableControlAction(0, 142, true)  -- INPUT_MELEE_ATTACK_ALTERNATE
            DisableControlAction(0, 257, true)  -- INPUT_ATTACK2
            DisableControlAction(0, 263, true)  -- INPUT_MELEE_ATTACK1
            DisableControlAction(0, 264, true)  -- INPUT_MELEE_ATTACK2
            DisableControlAction(0, 45, true)   -- INPUT_RELOAD
            
            -- We keep 1 ammo to allow aiming animation, but block the attack button (24)
            if GetAmmoInPedWeapon(ped, weapon) ~= 1 then
                SetPedAmmo(ped, weapon, 1)
            end

            -- 2. HANDLE SHOOTING
            if not taserState.safety and taserState.battery > 0 then
                local currentCart = taserState.cartridges[taserState.activeIdx]
                if currentCart and currentCart.status == 'ready' then
                    if IsDisabledControlJustPressed(0, 24) then
                        -- Fire logic (Custom Sound/Visuals only)
                        PlaySoundFrontend(-1, "GUARDIAN_DEFENDER_SHOOT", "HIGH_SECURITY_SOUNDS", 1)
                        
                        -- Set cartridge spent
                        currentCart.status = 'spent'
                        taserState.battery = math.max(0, taserState.battery - 2.0)
                        
                        -- Find target (Sphere Cast for more forgiving probe connection)
                        local coords = muzzleCoords
                        local endCoords = coords + (forward * Config.ProbeMaxDist)
                        local ray = StartShapeTestSphere(coords.x, coords.y, coords.z, 0.5, 12, ped, 0)
                        local _, hit, hitCoords, _, target = GetShapeTestResult(ray)
                        
                        if hit and target and IsEntityAPed(target) then
                            currentCart.probes = target
                        end

                        -- Muzzle Visual Effect
                        UseParticleFxAssetNextCall("core")
                        StartNetworkedParticleFxNonLoopedAtCoord("muz_stungun", muzzleCoords.x, muzzleCoords.y, muzzleCoords.z, 0.0, 0.0, 0.0, 1.0, false, false, false)

                        -- Auto-switch to next ready if current is spent
                        for i = 1, #taserState.cartridges do
                            if taserState.cartridges[i].status == 'ready' then
                                taserState.activeIdx = i
                                break
                            end
                        end

                        updateUI()
                    end
                end
            end

            -- 3. HANDLE SHOCK (H)
            if taserState.arcing then
                triggerShock()
            end

            -- 4. RENDER LIGHTS/LASERS
            
            if taserState.flashlight then
                DrawSpotLight(muzzleCoords.x, muzzleCoords.y, muzzleCoords.z, forward.x, forward.y, forward.z, 255, 255, 255, 40.0, 20.0, 0.0, 15.0, 2.0)
            end

            if taserState.laser then
                for _, laserCfg in ipairs(taserState.config.lasers) do
                    local endCoords = muzzleCoords + (forward * 50.0)
                    local ray = StartShapeTestRay(muzzleCoords.x, muzzleCoords.y, muzzleCoords.z, endCoords.x, endCoords.y, endCoords.z, -1, ped, 0)
                    local _, hit, hitCoords = GetShapeTestResult(ray)
                    
                    local r, g, b = table.unpack(laserCfg.color)
                    if hit then
                        DrawMarker(28, hitCoords.x, hitCoords.y, hitCoords.z, 0, 0, 0, 0, 0, 0, 0.04, 0.04, 0.04, r, g, b, 255, false, false, 2, false, nil, nil, false)
                    end
                    DrawLine(muzzleCoords.x, muzzleCoords.y, muzzleCoords.z, endCoords.x, endCoords.y, endCoords.z, r, g, b, 50)
                end
            end

            -- 5. RENDER PROBES
            for i, cart in ipairs(taserState.cartridges) do
                if cart.status == 'spent' and cart.probes and DoesEntityExist(cart.probes) then
                    local targetCoords = GetEntityCoords(cart.probes)
                    local dist = #(muzzleCoords - targetCoords)
                    if dist < Config.ProbeMaxDist then
                        DrawLine(muzzleCoords.x, muzzleCoords.y, muzzleCoords.z, targetCoords.x, targetCoords.y, targetCoords.z, 150, 150, 150, 150)
                    end
                end
            end

            -- Block native ammo display
            HideHudComponentThisFrame(22)
            Wait(0)
        else
            if taserState.weapon ~= 0 then
                closeTaser()
            end
            Wait(500)
        end
    end
end)

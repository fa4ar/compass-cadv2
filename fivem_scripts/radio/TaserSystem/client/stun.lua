-- Stun effects and victim management
local isTazed = false

RegisterNetEvent('taser:stunned', function(shooterId)
    local ped = PlayerPedId()
    if not isTazed then
        isTazed = true
        
        -- Start Stunning
        CreateThread(function()
            local stunEnd = GetGameTimer() + Config.StunDuration
            
            -- Victim screams and falls
            PlaySoundFrontend(-1, "HACK_FAILED", "HUD_FRONTEND_DEFAULT_SOUNDSET", 1)
            
            while GetGameTimer() < stunEnd do
                SetPedToRagdoll(ped, 1000, 1000, 0, 0, 0, 1)
                
                -- Visual effect (electric sparks? Standard FiveM/GTA doesn't have a simple spark, we'll use screen shake/blur)
                ShakeGameplayCam("SMALL_EXPLOSION_SHAKE", 1.0)
                SetTimecycleModifier("prologue_ending_fog")
                
                Wait(500)
            end
            
            -- Stop Stunning
            isTazed = false
            ClearTimecycleModifier()
            StopGameplayCamShaking(true)
            
            -- Post-stun recovery
            SetTimecycleModifier("super_blurred")
            Wait(3000)
            ClearTimecycleModifier()
        end)
    end
end)

-- Detect getting tased (weapon hash detection)
-- Standard stun gun behavior needs to be blocked? No, we use custom logic.
-- However, we can use a loop to sync effects.
CreateThread(function()
    while true do
        local ped = PlayerPedId()
        -- If hit by a stun gun but no custom stun active? 
        -- Actually, we've disabled the damage from default TASER by blocking the fire.
        -- But if someone uses a native taser, we can handle it if needed.
        Wait(1000)
    end
end)

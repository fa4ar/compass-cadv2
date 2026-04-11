-- CAD Sync Browser Module
-- Handles in-game CAD browser window using DUI

local locale = Config.Locale or 'en'
local function t(key, ...)
    if Locales[locale] and Locales[locale][key] then
        return string.format(Locales[locale][key], ...)
    end
    return key
end

-- Browser state
local BrowserState = {
    IsOpen = false,
    Browser = nil,
    Scaleform = nil,
}

-- Create CAD browser
local function CreateCADBrowser()
    if BrowserState.Browser then
        return
    end
    
    -- Create browser using DUI
    BrowserState.Browser = CreateBrowserDui(Config.CADBrowser.URL, 1920, 1080, false)
    BrowserState.Scaleform = CreateDui(BrowserState.Browser, 1920, 1080)
    
    -- Hide initially
    SetDuiVisible(BrowserState.Scaleform, false)
end

-- Toggle CAD browser
local function ToggleCADBrowser()
    if not Config.CADBrowser.Enabled then
        return
    end
    
    if BrowserState.IsOpen then
        -- Close browser
        if BrowserState.Scaleform then
            SetDuiVisible(BrowserState.Scaleform, false)
        end
        SetNuiFocus(false, false)
        BrowserState.IsOpen = false
    else
        -- Create browser if not exists
        if not BrowserState.Browser then
            CreateCADBrowser()
        end
        
        -- Show browser
        if BrowserState.Scaleform then
            SetDuiVisible(BrowserState.Scaleform, true)
        end
        SetNuiFocus(true, true)
        BrowserState.IsOpen = true
    end
end

-- Command to toggle CAD browser
RegisterCommand('cad', function(source, args, rawCommand)
    ToggleCADBrowser()
end, false)

-- Keybind to open CAD browser
if Config.CADBrowser.Enabled then
    RegisterKeyMapping('cad', 'Open CAD Browser', 'keyboard', Config.CADBrowser.Key)
end

-- Handle Escape key to close browser
if Config.CADBrowser.CloseOnEscape then
    Citizen.CreateThread(function()
        while true do
            Wait(0)
            
            if BrowserState.IsOpen then
                if IsControlJustPressed(0, 200) then -- 200 is ESC
                    ToggleCADBrowser()
                end
            end
        end
    end)
end

-- Event: Close browser from server
RegisterNetEvent('cad_sync:client:closeCAD', function()
    if BrowserState.IsOpen then
        ToggleCADBrowser()
    end
end)

-- Event: Open browser from server
RegisterNetEvent('cad_sync:client:openCAD', function()
    if not BrowserState.IsOpen then
        ToggleCADBrowser()
    end
end)

-- Clean up on resource stop
AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        if BrowserState.IsOpen then
            SetNuiFocus(false, false)
        end
        if BrowserState.Scaleform then
            DestroyDui(BrowserState.Scaleform)
        end
        if BrowserState.Browser then
            DestroyBrowserDui(BrowserState.Browser)
        end
    end
end)

print('^2[CAD Sync]^7 Client cad_browser.lua loaded')

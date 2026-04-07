-- =====================================================
-- COMPASS CAD POLICE PANEL - Resource Manifest
-- =====================================================

fx_version 'cerulean'
game 'gta5'

name 'compass-police-panel'
author 'Compass CAD'
version '1.0.0'
description 'Police panel for displaying 911 call information in FiveM'

-- =====================================================
-- Client Scripts
-- =====================================================

client_scripts {
    'client.lua'
}

-- =====================================================
-- Server Scripts
-- =====================================================

server_scripts {
    'server.lua'
}

-- =====================================================
-- HTML/UI Assets
-- =====================================================

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/css/styles.css',
    'html/js/app.js',
    'assets/sounds/*.mp3',
    'assets/sounds/*.ogg'
}

-- =====================================================
-- Permissions
-- =====================================================

-- Allow all players to use basic features
-- Restrict certain commands to police jobs

-- =====================================================
-- Metadata
-- =====================================================

-- No external dependencies required

export 'showCallPanel'
export 'hideCallPanel'
export 'updateCallData'

-- =====================================================
-- Configuration Notes
-- =====================================================

-- To use this resource:
-- 1. Add 'compass-police-panel' to your server.cfg
-- 2. Configure API URL in server.lua if using CAD sync
-- 3. Commands:
--    - /911test - Show test 911 call panel
--    - /compass:attach <id> - Attach to call
--    - /compass:close <id> - Close call
--    - /compass:toggle - Toggle panel visibility
--    - F5 - Toggle panel
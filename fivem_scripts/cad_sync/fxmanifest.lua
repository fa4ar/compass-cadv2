fx_version 'cerulean'
game 'gta5'
author 'CAD Sync Team'
description 'CAD Integration System with 911 Dispatch and Linking'
version '1.0.0'

lua54 'yes'
use_experimental_fxv2_oal 'yes'

shared_script 'config.lua'

server_script 'server/main.lua'
server_script 'server/database.lua'
server_script 'server/api.lua'
server_script 'server/webhooks.lua'

client_script 'client/main.lua'
client_script 'client/commands.lua'
client_script 'client/notifications.lua'
client_script 'client/ui.lua'
client_script 'client/cad_browser.lua'
client_script 'client/coordinates.lua'

ui_page 'nui/index.html'

files {
    'nui/index.html',
    'nui/style.css',
    'nui/script.js',
    'nui/sounds/*.mp3',
    'locales/*.lua'
}

dependencies {
    '/server:5181',
    'oxmysql',
    'ox_lib'
}

fx_version 'cerulean'
games { 'gta5' }

author 'Antigravity'
description 'Realistic Taser System with UI'
version '1.0.0'

client_scripts {
    'config.lua',
    'client/main.lua',
    'client/stun.lua',
}

server_scripts {
    'server/main.lua'
}

ui_page 'ui/index.html'

files {
    'ui/index.html',
    'ui/css/style.css',
    'ui/js/app.js',
}

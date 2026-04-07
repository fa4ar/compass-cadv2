fx_version 'cerulean'

game 'gta5'

author 'CAD'
description 'Component Position Editor for FiveM - Edit clothing component positions'
version '1.0.0'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/css/styles.css',
    'html/js/script.js'
}

client_script 'client.lua'

server_script 'server.lua'

dependencies {
    'basic-gamemode',
}

exports {
    'getComponentPosition',
    'setComponentPosition',
    'resetComponentPosition',
    'startEditing',
    'stopEditing',
}

server_exports {
    'getPlayerComponents',
    'setPlayerComponent',
    'resetPlayerComponent',
    'resetAllPlayerComponents',
}

lua54 'yes'

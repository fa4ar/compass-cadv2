const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

// Pull API URL from config if possible, but for Node in FiveM we might need a direct string
// or read the config.lua file manually.
const API_URL = "http://localhost:4000"; 

let socket = null;
let currentApiUrl = "http://localhost:4000";

function connectSocket(apiUrl) {
    if (socket) {
        socket.disconnect();
    }
    
    currentApiUrl = apiUrl || currentApiUrl;
    // Remove /api/fivem from URL if present for socket connection
    const socketUrl = currentApiUrl.replace(/\/api\/fivem\/?$/, '').replace(/\/api\/?$/, '');
    
    console.log('^3[CAD-SYNC]^7 Initializing socket connection to ' + socketUrl);
    
    socket = io(socketUrl, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket']
    });

    socket.on('connect', () => {
        console.log('^2[CAD-SYNC]^7 Connected to CAD socket server.');
    });

    socket.on('disconnect', () => {
        console.log('^1[CAD-SYNC]^7 Disconnected from CAD socket server.');
    });

    socket.on('connect_error', (error) => {
        console.log('^1[CAD-SYNC]^7 Socket connection error: ' + error.message);
    });

    // Receive units data from backend and send to Lua
    socket.on('units_data', (units) => {
        emitNet('cad_sync:updateMinimap', -1, units);
    });

    // Receive all blips
    socket.on('blips_updated', (units) => {
        emitNet('cad_sync:updateMinimap', -1, units);
    });

    // Receive new 911 call from backend
    socket.on('new_911_call', (call) => {
        console.log('^2[CAD-SYNC]^7 New 911 call received via socket: #' + call.id);
        emitNet('cad_sync:new911Call', -1, call);
    });

    // Update 911 call
    socket.on('update_911_call', (call) => {
        emitNet('cad_sync:callUpdated', -1, call);
    });

    // Delete/Close 911 call
    socket.on('delete_911_call', (data) => {
        emitNet('cad_sync:callClosed', -1, data.id);
    });
}

// Listen for init from Lua
on('cad_sync:init', (apiUrl) => {
    connectSocket(apiUrl);
});

// Listen for updates from Lua
on('cad_sync:sendMapUpdate', (blips) => {
    if (socket && socket.connected) {
        socket.emit('update_blip_batch', blips);
    }
});

// Clean up on resource stop
on('onResourceStop', (resourceName) => {
    if (GetCurrentResourceName() === resourceName) {
        if (socket) {
            socket.disconnect();
            console.log('^3[CAD-SYNC]^7 Socket disconnected due to resource stop.');
        }
    }
});

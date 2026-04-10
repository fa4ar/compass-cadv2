const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

// Pull API URL from config if possible, but for Node in FiveM we might need a direct string
// or read the config.lua file manually.
const API_URL = "https://api.california-travel.ru"; 

let socket = null;
let currentApiUrl = "http://localhost:4000";
let isConnecting = false;

function connectSocket(apiUrl) {
    if (isConnecting) {
        return;
    }
    
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
    
    isConnecting = true;
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
        isConnecting = false;
        console.log('^2[CAD-SYNC]^7 Connected to CAD socket server.');
    });

    socket.on('disconnect', () => {
        isConnecting = false;
        console.log('^1[CAD-SYNC]^7 Disconnected from CAD socket server.');
    });

    socket.on('connect_error', (error) => {
        isConnecting = false;
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

    // Receive new 911 call from backend (show toast to everyone)
    socket.on('new_911_call', (call) => {
        console.log('^2[CAD-SYNC]^7 New 911 call received via socket: #' + call.id);
        emitNet('cad_sync:new911Call', -1, call);
    });

    // Receive call assigned to specific unit (show call card ONLY to that unit)
    socket.on('call_assigned_to_unit', (data) => {
        console.log('^2[CAD-SYNC]^7 Call assigned to unit: #' + data.call.id + ' user: ' + data.userId);
        emitNet('cad_sync:callAssigned', data.userId, data.call);
    });

    // Receive unit unassigned from call (hide call card for that unit)
    socket.on('unit_unassigned', (data) => {
        console.log('^2[CAD-SYNC]^7 Unit unassigned: user: ' + data.userId + ' call: ' + data.callId);
        emitNet('cad_sync:callClosed', data.userId, data.callId);
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
on('cad_sync:sendMapUpdate', (blips, calls) => {
    if (socket && socket.connected) {
        socket.emit('update_blip_batch', blips);
        if (calls && calls.length > 0) {
            socket.emit('update_calls_batch', calls);
        }
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

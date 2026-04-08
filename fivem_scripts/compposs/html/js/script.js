let currentMode = 'position';
let isEditing = false;
let currentComponentData = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }
};

window.addEventListener('message', function(event) {
    const data = event.data;
    
    if (data.type === 'comppos:showUI') {
        showUI(data.data);
    } else if (data.type === 'comppos:hideUI') {
        hideUI();
    } else if (data.type === 'comppos:updateUI') {
        updateUIValues(data.data);
    } else if (data.type === 'comppos:notification') {
        showNotification(data.data.message, data.data.notifType);
    }
});

function showUI(data) {
    const container = document.getElementById('comppos-container');
    container.classList.remove('hidden');
    
    document.getElementById('component-name').textContent = data.componentName || 'Компонент';
    
    currentMode = data.editMode || 'position';
    updateModeButtons();
    updateUIValues(data);
    
    isEditing = true;
}

function hideUI() {
    const container = document.getElementById('comppos-container');
    container.classList.add('hidden');
    isEditing = false;
}

function updateModeButtons() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === currentMode) {
            btn.classList.add('active');
        }
    });
    
    document.querySelectorAll('.control-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const activeSection = document.getElementById(currentMode + '-controls');
    if (activeSection) {
        activeSection.classList.add('active');
    }
}

function updateUIValues(data) {
    currentComponentData.position = data.position || { x: 0, y: 0, z: 0 };
    currentComponentData.rotation = data.rotation || { x: 0, y: 0, z: 0 };
    currentComponentData.scale = data.scale || { x: 1, y: 1, z: 1 };
    
    document.getElementById('pos-x').value = currentComponentData.position.x;
    document.getElementById('pos-y').value = currentComponentData.position.y;
    document.getElementById('pos-z').value = currentComponentData.position.z;
    document.getElementById('pos-x-val').textContent = currentComponentData.position.x.toFixed(3);
    document.getElementById('pos-y-val').textContent = currentComponentData.position.y.toFixed(3);
    document.getElementById('pos-z-val').textContent = currentComponentData.position.z.toFixed(3);
    
    document.getElementById('rot-x').value = currentComponentData.rotation.x;
    document.getElementById('rot-y').value = currentComponentData.rotation.y;
    document.getElementById('rot-z').value = currentComponentData.rotation.z;
    document.getElementById('rot-x-val').textContent = currentComponentData.rotation.x.toFixed(0) + '°';
    document.getElementById('rot-y-val').textContent = currentComponentData.rotation.y.toFixed(0) + '°';
    document.getElementById('rot-z-val').textContent = currentComponentData.rotation.z.toFixed(0) + '°';
    
    const avgScale = (currentComponentData.scale.x + currentComponentData.scale.y + currentComponentData.scale.z) / 3;
    document.getElementById('scale').value = avgScale;
    document.getElementById('scale-val').textContent = avgScale.toFixed(2) + 'x';
}

function setMode(mode) {
    currentMode = mode;
    updateModeButtons();
    
    fetch('https://comppos/comppos:changeMode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: mode })
    }).catch(() => {});
}

function resetPosition() {
    fetch('https://comppos/comppos:reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    }).catch(() => {});
}

function savePosition() {
    fetch('https://comppos/comppos:save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    }).catch(() => {});
}

function cancelEditing() {
    fetch('https://comppos/comppos:cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    }).catch(() => {});
}

function showNotification(message, type) {
    const notification = document.getElementById('comppos-notification');
    notification.textContent = message;
    notification.className = 'notification';
    notification.classList.add(type || 'info');
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

document.getElementById('pos-x').addEventListener('input', function() {
    const val = parseFloat(this.value);
    currentComponentData.position.x = val;
    document.getElementById('pos-x-val').textContent = val.toFixed(3);
    sendUpdate();
});

document.getElementById('pos-y').addEventListener('input', function() {
    const val = parseFloat(this.value);
    currentComponentData.position.y = val;
    document.getElementById('pos-y-val').textContent = val.toFixed(3);
    sendUpdate();
});

document.getElementById('pos-z').addEventListener('input', function() {
    const val = parseFloat(this.value);
    currentComponentData.position.z = val;
    document.getElementById('pos-z-val').textContent = val.toFixed(3);
    sendUpdate();
});

document.getElementById('rot-x').addEventListener('input', function() {
    const val = parseFloat(this.value);
    currentComponentData.rotation.x = val;
    document.getElementById('rot-x-val').textContent = val.toFixed(0) + '°';
    sendUpdate();
});

document.getElementById('rot-y').addEventListener('input', function() {
    const val = parseFloat(this.value);
    currentComponentData.rotation.y = val;
    document.getElementById('rot-y-val').textContent = val.toFixed(0) + '°';
    sendUpdate();
});

document.getElementById('rot-z').addEventListener('input', function() {
    const val = parseFloat(this.value);
    currentComponentData.rotation.z = val;
    document.getElementById('rot-z-val').textContent = val.toFixed(0) + '°';
    sendUpdate();
});

document.getElementById('scale').addEventListener('input', function() {
    const val = parseFloat(this.value);
    currentComponentData.scale.x = val;
    currentComponentData.scale.y = val;
    currentComponentData.scale.z = val;
    document.getElementById('scale-val').textContent = val.toFixed(2) + 'x';
    sendUpdate();
});

function sendUpdate() {
    fetch('https://comppos/comppos:updateValues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentComponentData)
    }).catch(() => {});
}

document.addEventListener('keydown', function(e) {
    if (!isEditing) return;
    
    if (e.key === 'Escape') {
        cancelEditing();
    }
});

// CAD Sync NUI Script

let currentCall = null;
let notificationTimeout = null;

// Locale strings
const locales = {
    en: {
        btnArrived: 'Mark Arrived',
        btnDetach: 'Detach',
        btnClose: 'Close Call',
    },
    ru: {
        btnArrived: 'Отметить прибытие',
        btnDetach: 'Открепиться',
        btnClose: 'Закрыть вызов',
    },
};

let currentLocale = 'en';

// Initialize
window.onload = function() {
    fetch(`https://${GetParentResourceName()}/uiReady`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });
    
    setupEventListeners();
};

function setupEventListeners() {
    // Card buttons
    document.getElementById('btn-arrived').addEventListener('click', () => {
        fetch(`https://${GetParentResourceName()}/markArrived`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });
    });
    
    document.getElementById('btn-detach').addEventListener('click', () => {
        fetch(`https://${GetParentResourceName()}/detach`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });
    });
    
    document.getElementById('btn-close').addEventListener('click', () => {
        fetch(`https://${GetParentResourceName()}/closeCall`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });
    });
    
    // Notification close
    document.getElementById('notification-close').addEventListener('click', () => {
        hideNotification();
    });
}

// Listen for messages from Lua
window.addEventListener('message', function(event) {
    const data = event.data;
    
    switch (data.type) {
        case 'showCard':
            showCard(data.call, data.locale);
            break;
        case 'updateCard':
            updateCard(data.call);
            break;
        case 'hideCard':
            hideCard();
            break;
        case 'showNotification':
            showNotification(data.call, data.duration, data.locale);
            break;
        case 'playSound':
            playSound(data.sound, data.volume);
            break;
        case 'closeCAD':
            if (window.location.pathname.includes('cad.html')) {
                window.location.href = 'about:blank';
            }
            break;
    }
});

function showCard(call, locale) {
    currentCall = call;
    if (locale) currentLocale = locale;
    
    // Update UI
    document.getElementById('call-id-value').textContent = call.id;
    document.getElementById('call-type-value').textContent = call.type;
    document.getElementById('call-time-value').textContent = call.time || '--:--:--';
    document.getElementById('call-address-value').textContent = call.address;
    document.getElementById('call-description-value').textContent = call.description || 'No description';
    document.getElementById('call-units-value').textContent = call.units || 0;
    
    // Priority
    const priorityEl = document.getElementById('call-priority-value');
    priorityEl.textContent = call.priority || 'Normal';
    priorityEl.className = 'value priority-' + (call.priority?.toLowerCase() || 'normal');
    
    // Status
    const statusEl = document.getElementById('call-status-value');
    statusEl.textContent = call.status || 'Active';
    
    // Update button labels based on locale
    const loc = locales[currentLocale] || locales.en;
    document.getElementById('btn-arrived').textContent = loc.btnArrived;
    document.getElementById('btn-detach').textContent = loc.btnDetach;
    document.getElementById('btn-close').textContent = loc.btnClose;
    
    // Show card
    document.getElementById('call-card').classList.remove('hidden');
}

function updateCard(call) {
    if (!call) return;
    
    currentCall = call;
    
    document.getElementById('call-units-value').textContent = call.units || 0;
    
    const statusEl = document.getElementById('call-status-value');
    statusEl.textContent = call.status || 'Active';
}

function hideCard() {
    document.getElementById('call-card').classList.add('hidden');
    currentCall = null;
}

function showNotification(call, duration, locale) {
    if (locale) currentLocale = locale;
    
    document.getElementById('notification-call-id').textContent = call.id;
    document.getElementById('notification-type').textContent = call.type;
    document.getElementById('notification-address').textContent = call.address;
    
    document.getElementById('notification').classList.remove('hidden');
    
    // Auto-hide after duration
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    
    notificationTimeout = setTimeout(() => {
        hideNotification();
    }, duration || 15000);
}

function hideNotification() {
    document.getElementById('notification').classList.add('hidden');
    
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }
    
    fetch(`https://${GetParentResourceName()}/notificationClosed`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });
}

function playSound(soundFile, volume) {
    const audio = new Audio(soundFile);
    audio.volume = volume || 0.5;
    audio.play().catch(err => {
        console.error('Failed to play sound:', err);
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sanitize call data before display
function sanitizeCall(call) {
    if (!call) return null;
    
    return {
        id: call.id,
        type: escapeHtml(call.type),
        address: escapeHtml(call.address),
        description: escapeHtml(call.description),
        priority: escapeHtml(call.priority),
        status: escapeHtml(call.status),
        time: call.time,
        units: call.units,
    };
}

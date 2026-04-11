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
    // No buttons in minimal design
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
    document.getElementById('call-phone-value').textContent = call.phone || 'No phone';
    document.getElementById('call-address-value').textContent = call.address;
    document.getElementById('call-description-value').textContent = call.description || 'No description';
    document.getElementById('call-status-value').textContent = call.status || 'Active';

    // Show card
    document.getElementById('call-card').classList.remove('hidden');
}

function updateCard(call) {
    if (!call) return;

    currentCall = call;

    const statusEl = document.getElementById('call-status-value');
    statusEl.textContent = call.status || 'Active';
}

function hideCard() {
    document.getElementById('call-card').classList.add('hidden');
    currentCall = null;
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

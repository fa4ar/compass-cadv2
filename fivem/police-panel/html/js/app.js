// =====================================================
// COMPASS CAD POLICE PANEL - UI JavaScript
// =====================================================

(function() {
    'use strict';
    
    // State
    const state = {
        panels: {},
        visible: true
    };
    
    // Call type translations
    const typeTranslations = {
        traffic_accident: 'ДТП',
        disturbance: 'Нарушение порядка',
        robbery: 'Ограбление',
        assault: 'Нападение',
        domestic: 'Семейный конфликт',
        welfare_check: 'Проверка безопасности',
        suspicious: 'Подозрительная активность',
        fire: 'Пожар',
        medical: 'Медицинская помощь',
        accident: 'Авария',
        other: 'Другое'
    };
    
    // Priority translations
    const priorityTranslations = {
        routine: 'Обычный',
        low: 'Низкий',
        medium: 'Средний',
        high: 'Высокий',
        emergency: 'Экстренный'
    };
    
    // Status translations
    const statusTranslations = {
        pending: 'Ожидание',
        dispatched: 'Назначен',
        enroute: 'В пути',
        onscene: 'На месте',
        resolving: 'Решается',
        resolved: 'Завершен',
        closed: 'Закрыт'
    };
    
    // =====================================================
    // UI RENDERING
    // =====================================================
    
    function renderPanel(callData) {
        const callId = callData.id;
        const translatedType = typeTranslations[callData.type] || callData.type;
        const translatedPriority = priorityTranslations[callData.priority] || callData.priority;
        const timeAgo = getTimeAgo(callData.createdAt);
        
        // Build responders HTML
        let respondersHtml = '';
        if (callData.responders && callData.responders.length > 0) {
            respondersHtml = `
                <div class="responders-section">
                    <div class="responders-label">На месте</div>
                    <div class="responder-list">
                        ${callData.responders.map(r => `
                            <div class="responder">
                                <span class="responder-status ${r.status || 'enroute'}"></span>
                                <span class="responder-name">${r.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Build status buttons
        const currentStatus = callData.status || 'dispatched';
        const statuses = ['dispatched', 'enroute', 'onscene', 'resolved'];
        
        const panelHtml = `
            <div class="call-panel priority-${callData.priority}" id="panel-${callId}">
                <div class="update-indicator"></div>
                
                <div class="panel-header">
                    <div>
                        <div class="call-id">#${callId}</div>
                        <div class="call-type">${translatedType}</div>
                    </div>
                    <div class="priority-badge ${callData.priority}">${translatedPriority}</div>
                </div>
                
                <div class="panel-location">
                    <span class="location-icon">📍</span>
                    <span class="location-text">${callData.location || 'Не указано'}</span>
                </div>
                
                <div class="panel-description">
                    <div class="description-text">${callData.description || 'Нет описания'}</div>
                </div>
                
                <div class="caller-info">
                    ${callData.callerName ? `
                        <div class="caller-name">
                            <span>👤</span>
                            <span>${callData.callerName}</span>
                        </div>
                    ` : ''}
                    ${callData.callerPhone ? `
                        <div class="caller-phone">
                            <span>📞</span>
                            <span>${callData.callerPhone}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="call-time">Вызов: ${timeAgo}</div>
                
                <div class="status-section">
                    <div class="status-label">Статус</div>
                    <div class="status-selector">
                        ${statuses.map(s => `
                            <button class="status-btn ${currentStatus === s ? 'active' : ''}" 
                                    onclick="setCallStatus('${callId}', '${s}')">
                                ${statusTranslations[s]}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                ${respondersHtml}
                
                <div class="panel-actions">
                    <button class="action-btn primary" onclick="openGPS('${callData.location}')">
                        📍 Навигатор
                    </button>
                    <button class="action-btn danger" onclick="closeCall('${callId}')">
                        ✕ Закрыть
                    </button>
                </div>
            </div>
        `;
        
        // Add to container
        const container = document.getElementById('police-panel-container');
        if (container) {
            container.insertAdjacentHTML('beforeend', panelHtml);
        }
        
        state.panels[callId] = callData;
    }
    
    function removePanel(callId) {
        const panel = document.getElementById(`panel-${callId}`);
        if (panel) {
            panel.classList.add('hidden');
            setTimeout(() => {
                panel.remove();
                delete state.panels[callId];
            }, 300);
        }
    }
    
    function updatePanel(callData) {
        const callId = callData.id;
        const existingPanel = document.getElementById(`panel-${callId}`);
        
        if (existingPanel) {
            // Re-render panel with new data
            existingPanel.remove();
            renderPanel(callData);
            
            // Add update animation
            setTimeout(() => {
                const newPanel = document.getElementById(`panel-${callId}`);
                if (newPanel) {
                    newPanel.classList.add('updated');
                    setTimeout(() => newPanel.classList.remove('updated'), 1000);
                }
            }, 50);
        } else {
            // Panel doesn't exist, create it
            renderPanel(callData);
        }
        
        state.panels[callId] = callData;
    }
    
    // =====================================================
    // ACTIONS
    // =====================================================
    
    window.setCallStatus = function(callId, status) {
        fetch(`https://compass-call${callId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callId, status })
        }).catch(() => {});
        
        // Update local UI
        const panel = document.getElementById(`panel-${callId}`);
        if (panel) {
            panel.querySelectorAll('.status-btn').forEach(btn => {
                btn.classList.toggle('active', btn.textContent.toLowerCase().includes(statusTranslations[status].toLowerCase()));
            });
        }
    };
    
    window.closeCall = function(callId) {
        fetch(`https://compass-call${callId}`, {
            method: 'DELETE'
        }).catch(() => {});
        
        removePanel(callId);
    };
    
    window.openGPS = function(location) {
        if (location) {
            // Open GPS coordinates (would integrate with specific GPS system)
            fetch(`https://compass-gps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location })
            }).catch(() => {});
        }
    };
    
    // =====================================================
    // UTILITIES
    // =====================================================
    
    function getTimeAgo(timestamp) {
        if (!timestamp) return 'Неизвестно';
        
        const now = Date.now();
        const diff = now - timestamp;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}ч ${minutes % 60}мин назад`;
        if (minutes > 0) return `${minutes}мин назад`;
        return 'Только что';
    }
    
    // =====================================================
    // NUI EVENT HANDLERS
    // =====================================================
    
    window.addEventListener('message', function(event) {
        const data = event.data;
        
        if (!data || !data.action) return;
        
        switch (data.action) {
            case 'showPanel':
                renderPanel(data.data);
                break;
                
            case 'hidePanel':
                removePanel(data.callId);
                break;
                
            case 'updatePanel':
                updatePanel(data.data);
                break;
                
            case 'removePanel':
                removePanel(data.callId);
                break;
                
            case 'toggleVisibility':
                state.visible = data.visible;
                const container = document.getElementById('police-panel-container');
                if (container) {
                    container.classList.toggle('hidden', !data.visible);
                }
                break;
        }
    });
    
    // =====================================================
    // INITIALIZATION
    // =====================================================
    
    console.log('[COMPASS-PANEL] UI initialized');
    
})();
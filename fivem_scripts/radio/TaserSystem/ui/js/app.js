const app = document.getElementById('app');
const weaponName = document.getElementById('weapon-name');
const cartridgeGrid = document.getElementById('cartridge-grid');
const safetyStatus = document.getElementById('safety-status');
const flashlightIndicator = document.getElementById('flashlight-indicator');
const laserIndicator = document.getElementById('laser-indicator');
const batteryPercent = document.getElementById('battery-percent');
const batteryFill = document.getElementById('battery-fill');
const gameTime = document.getElementById('game-time');

window.addEventListener('message', (event) => {
    const data = event.data;

    if (data.type === 'show') {
        app.style.display = data.visible ? 'flex' : 'none';
    }

    if (data.type === 'update') {
        app.style.display = 'flex';
        
        weaponName.innerText = data.weaponName || "TASER";
        
        // Update Safety
        if (data.safety) {
            safetyStatus.innerText = "SAFE";
            safetyStatus.className = "status-safe";
        } else {
            safetyStatus.innerText = "LIVE";
            safetyStatus.className = "status-live";
        }

        // Update Indicators
        if (data.flashlight) {
            flashlightIndicator.classList.add('active');
        } else {
            flashlightIndicator.classList.remove('active');
        }
        
        if (data.laser) {
            laserIndicator.classList.add('active');
        } else {
            laserIndicator.classList.remove('active');
        }

        // Update Battery
        batteryPercent.innerText = `${data.battery}%`;
        batteryFill.style.width = `${data.battery}%`;
        if (data.battery < 20) {
            batteryFill.style.background = '#e74c3c';
        } else if (data.battery < 50) {
            batteryFill.style.background = '#f1c40f';
        } else {
            batteryFill.style.background = '#2ecc71';
        }

        // Update Cartridges
        if (data.cartridges) {
            cartridgeGrid.innerHTML = '';
            data.cartridges.forEach((cart, index) => {
                const div = document.createElement('div');
                div.className = `cartridge ${cart.status}`;
                if (index + 1 === data.activeIdx) {
                    div.classList.add('active');
                }
                cartridgeGrid.appendChild(div);
            });
        }

        // Update Time
        gameTime.innerText = data.time || "00:00";
    }
});

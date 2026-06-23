// =====================================================
// GODDESS CLICKER - Cloud Save System (Yandex SDK)
// =====================================================

let ysdk = null;
let yplayer = null;

// Initialize Yandex SDK
async function initYandexSDK() {
    try {
        if (typeof YaGames !== 'undefined') {
            ysdk = await YaGames.init();
            console.log("Yandex SDK initialized");
            return true;
        }
    } catch (e) {
        console.error("Yandex SDK init error:", e);
    }
    return false;
}

// Get Player (lazy)
async function getPlayer() {
    if (yplayer) return yplayer;
    if (!ysdk) return null;
    try {
        yplayer = await ysdk.getPlayer(false);
        return yplayer;
    } catch (e) {
        console.error("Get player error:", e);
        return null;
    }
}

// Save Game Data
async function saveGame() {
    if (!ysdk) {
        localStorage.setItem('goddessClicker', JSON.stringify(gameState));
        return true;
    }

    try {
        const player = await getPlayer();
        if (!player) {
            localStorage.setItem('goddessClicker', JSON.stringify(gameState));
            return false;
        }
        await player.setData({ data: gameState }, true);
        console.log("Game saved to cloud");
        return true;
    } catch (e) {
        console.error("Save error:", e);
        localStorage.setItem('goddessClicker', JSON.stringify(gameState));
        return false;
    }
}

// Load Game Data
async function loadGame() {
    if (!ysdk) {
        const saved = localStorage.getItem('goddessClicker');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                Object.assign(gameState, data);
                console.log("Game loaded from localStorage");
                return true;
            } catch (e) {
                console.error("Parse error:", e);
            }
        }
        return false;
    }

    try {
        const player = await getPlayer();
        if (!player) {
            const saved = localStorage.getItem('goddessClicker');
            if (saved) {
                const data = JSON.parse(saved);
                Object.assign(gameState, data);
                return true;
            }
            return false;
        }
        const data = await player.getData();

        if (data && data.data) {
            Object.assign(gameState, data.data);
            console.log("Game loaded from cloud");
            return true;
        }
    } catch (e) {
        console.error("Load error:", e);
        const saved = localStorage.getItem('goddessClicker');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                Object.assign(gameState, data);
                return true;
            } catch (err) {
                console.error("Parse error:", err);
            }
        }
    }
    return false;
}

// Calculate Offline Progress
function calculateOfflineProgress() {
    const now = Date.now();
    const deltaTime = Math.floor((now - gameState.lastTimestamp) / 1000);

    if (deltaTime < 10) return 0;

    const maxOfflineLimit = gameState.eternalStorage ? 999999999 : (gameState.maxOfflineMultiplierBought ? 28800 : 14400);
    const cappedTime = Math.min(deltaTime, maxOfflineLimit);

    const incomePerSec = getOfflineIncomePerSec();
    const offlineEarn = Math.floor(cappedTime * incomePerSec);

    gameState.lastTimestamp = now;

    return offlineEarn;
}

// Auto Save Timer
let autoSaveInterval = null;

function startAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(() => {
        gameState.lastTimestamp = Date.now();
        saveGame();
    }, 15000);
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}

// Save on Exit
function setupExitSave() {
    window.addEventListener('beforeunload', () => {
        gameState.lastTimestamp = Date.now();
        localStorage.setItem('goddessClicker', JSON.stringify(gameState));
        saveGame();
    });
}

// Initialize Save System
async function initSaveSystem() {
    await initYandexSDK();
    const loaded = await loadGame();

    if (!loaded) {
        gameState.lastTimestamp = Date.now();
        gameState.lastDailyBonusTime = 0;
    }

    const offlineEarn = calculateOfflineProgress();

    startAutoSave();
    setupExitSave();

    return offlineEarn;
}

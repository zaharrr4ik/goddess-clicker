// =====================================================
// GODDESS CLICKER - Enhanced Game Logic
// =====================================================

const STAGES = [
    { name: "Мия", desc: "Скромница", threshold: 0, teaser: "Дальше ждет дерзкая красавица с огоньком в глазах..." },
    { name: "Лина", desc: "Дерзкая студентка", threshold: 500, teaser: "Дальше ждет загорелая блондинка в школьной форме..." },
    { name: "Айра", desc: "Авантюристка", threshold: 3000, teaser: "Дальше ждет загадочная красавица с очками..." },
    { name: "Элла", desc: "Эльфийка", threshold: 15000, teaser: "Дальше ждет блондинка в костюме горничной 🔥" },
    { name: "Мари", desc: "Маг", threshold: 70000, teaser: "Дальше ждет школьница на парте... мокрая рубашка..." },
    { name: "Вера", desc: "Экзотика", threshold: 350000, teaser: "Дальше ждет темная красавица в черном свитере..." },
    { name: "Эстель", desc: "Королева", threshold: 1750000, teaser: "Дальше ждет самая горячая... синие волосы, розовый топ 🔥" },
    { name: "Люмия", desc: "Богиня", threshold: 10000000, teaser: "" }
];

// Game State
let gameState = {
    soft: 0,
    totalSoftEarned: 0,
    crystals: 0,
    currentStage: 1,
    clickMultiplier: 1,
    
    // Boosters
    autoClickActive: false,
    autoClickTimeLeft: 0,
    blessingActive: false,
    blessingTimeLeft: 0,
    superBoostActive: false,
    superBoostTimeLeft: 0,
    
    // Streak
    streakCount: 0,
    streakMultiplier: 1,
    lastClickTime: 0,
    
    // Gift System
    lastGiftClaim: Date.now(),
    giftTimeElapsed: 0,
    giftsClaimed: [],
    
    // Cosmetics
    ownedSkins: [],
    ownedBackgrounds: [],
    activeSkin: "",
    activeBackground: "",
    maxOfflineMultiplierBought: false,
    eternalStorage: false,
    criticalClick: false,
    prestigeMultiplier: 1,

    // Upgrades
    upgrades: {
        autoclick: 0,
        clickPower: 0,
        luckyBait: 0,
        rebirth: 0
    },
    crystalClickPower: 0,

    // Stats
    totalTaps: 0,
    totalCrystalsEarned: 0,
    
    // Timestamps
    lastTimestamp: Date.now(),
    lastInterstitialTime: Date.now(),
    lastDailyBonusTime: 0
};

// Timers
let streakTimeout = null;

// =====================================================
// CORE ECONOMY
// =====================================================

// Click Value Calculation
function getClickValue() {
    let base = 1;
    let clickPower = getUpgradeBonus('clickPower');
    let crystalPower = gameState.crystalClickPower || 0;
    let multiplier = gameState.clickMultiplier;
    let blessing = gameState.blessingActive ? 2 : 1;
    let superBoost = gameState.superBoostActive ? 3 : 1;
    let streak = gameState.streakMultiplier;
    let prestige = gameState.prestigeMultiplier || 1;
    let rebirth = getRebirthMultiplier();
    let result = Math.floor((base + clickPower + crystalPower) * multiplier * blessing * superBoost * streak * prestige * rebirth);
    if (gameState.criticalClick && Math.random() < 0.15) {
        const critLevel = (gameState.upgrades && gameState.upgrades.critical_click) || 1;
        result *= critLevel >= 2 ? 5 : 3;
    }
    return result;
}

// Auto Click Value
function getAutoClickValue() {
    let base = 0.5;
    let multiplier = gameState.clickMultiplier;
    let blessing = gameState.blessingActive ? 2 : 1;
    let superBoost = gameState.superBoostActive ? 3 : 1;
    return Math.floor(base * multiplier * blessing * superBoost);
}

// Offline Income per Second
function getOfflineIncomePerSec() {
    let base = (1 + gameState.currentStage) * 0.5;
    let autoBonus = gameState.autoClickActive ? getAutoClickValue() : 0;
    return base + autoBonus;
}

// Get Current Stage Info
function getCurrentStage() {
    return STAGES[gameState.currentStage - 1];
}

// Get Next Stage Info
function getNextStage() {
    if (gameState.currentStage >= STAGES.length) return null;
    return STAGES[gameState.currentStage];
}

// Get Progress Percent
function getProgressPercent() {
    const next = getNextStage();
    if (!next) return 100;
    return Math.min(100, (gameState.totalSoftEarned / next.threshold) * 100);
}

// =====================================================
// TAP HANDLING
// =====================================================

// Handle Tap
function handleTap() {
    const now = Date.now();
    const value = getClickValue();
    
    gameState.soft += value;
    gameState.totalSoftEarned += value;
    gameState.totalTaps++;
    
    // Streak logic
    updateStreak(now);
    
    checkStageUp();
    updateUI();
    
    return value;
}

// Update Streak
function updateStreak(now) {
    const timeSinceLastClick = now - gameState.lastClickTime;
    
    if (timeSinceLastClick < 500) {
        // Fast click - increase streak
        gameState.streakCount++;
        if (gameState.streakCount >= 10) {
            gameState.streakMultiplier = 1.5;
        } else if (gameState.streakCount >= 5) {
            gameState.streakMultiplier = 1.2;
        }
    } else if (timeSinceLastClick > 2000) {
        // Reset streak
        gameState.streakCount = 0;
        gameState.streakMultiplier = 1;
    }
    
    gameState.lastClickTime = now;
    
    // Reset streak after 2 seconds of no clicks
    if (streakTimeout) clearTimeout(streakTimeout);
    streakTimeout = setTimeout(() => {
        gameState.streakCount = 0;
        gameState.streakMultiplier = 1;
        updateUI();
    }, 2000);
}

// =====================================================
// STAGE PROGRESSION
// =====================================================

// Check Stage Progression
function checkStageUp() {
    if (gameState.currentStage >= STAGES.length) return;
    
    let nextStage = STAGES[gameState.currentStage];
    if (gameState.totalSoftEarned >= nextStage.threshold) {
        stageUp();
    }
}

// Stage Up Function
function stageUp() {
    if (gameState.currentStage >= STAGES.length) return;
    
    gameState.currentStage++;
    gameState.clickMultiplier = 1 + (gameState.currentStage - 1) * 0.5;
    viewStage = gameState.currentStage;
    
    // Reward crystals for new stage
    addCrystals(2, true);
    
    // Trigger stage up animation/event
    onStageUp(STAGES[gameState.currentStage - 1]);
    
    if (typeof updateAllUI === 'function') updateAllUI();
    saveGame();

    setTimeout(() => showInterstitial(), 500);
}

// =====================================================
// CURRENCY
// =====================================================

// Add Crystals
function addCrystals(amount, fromStage = false) {
    gameState.crystals += amount;
    gameState.totalCrystalsEarned += amount;
    updateUI();
}

// Format Numbers
function formatNumber(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return Math.floor(num).toString();
}

// =====================================================
// BOOSTERS
// =====================================================
// BOOSTERS
// =====================================================

// Update Boosters (call every second)
function updateBoosters() {
    let needsUpdate = false;
    
    if (gameState.blessingActive) {
        gameState.blessingTimeLeft--;
        if (gameState.blessingTimeLeft <= 0) {
            gameState.blessingActive = false;
            gameState.blessingTimeLeft = 0;
            needsUpdate = true;
        }
    }
    
    if (gameState.superBoostActive) {
        gameState.superBoostTimeLeft--;
        if (gameState.superBoostTimeLeft <= 0) {
            gameState.superBoostActive = false;
            gameState.superBoostTimeLeft = 0;
            needsUpdate = true;
        }
    }
    
    if (needsUpdate) updateUI();
}

// Activate Blessing (x2 income for duration)
function activateBlessing(duration) {
    gameState.blessingActive = true;
    gameState.blessingTimeLeft = duration;
}

// Activate Super Boost (x3 income for duration)
function activateSuperBoost(duration) {
    gameState.superBoostActive = true;
    gameState.superBoostTimeLeft = duration;
}

// Use Scroll (instant reward from remaining auto click time)
function useScroll() {
    if (!gameState.autoClickActive) return 0;
    
    const reward = Math.floor(gameState.autoClickTimeLeft * getAutoClickValue());
    gameState.soft += reward;
    gameState.totalSoftEarned += reward;
    gameState.autoClickActive = false;
    gameState.autoClickTimeLeft = 0;
    
    checkStageUp();
    return reward;
}

// =====================================================
// OFFLINE INCOME
// =====================================================

// =====================================================
// UI & DISPLAY
// =====================================================

// Update UI (to be implemented in Construct)
function updateUI() {
    console.log(`Soft: ${formatNumber(gameState.soft)} | Crystals: ${gameState.crystals} | Stage: ${getCurrentStage().name}`);
}

// Stage Up Callback (to be implemented in Construct)
function onStageUp(stage) {
    console.log(`New Stage: ${stage.name} - ${stage.desc}`);
}

// Get Active Boosters for Display
function getActiveBoosters() {
    const boosters = [];
    
    if (gameState.blessingActive) {
        boosters.push({ name: "Благословение", timeLeft: gameState.blessingTimeLeft });
    }
    
    if (gameState.autoClickActive) {
        boosters.push({ name: "Авто-клик", timeLeft: gameState.autoClickTimeLeft });
    }
    
    if (gameState.superBoostActive) {
        boosters.push({ name: "Супер-буст", timeLeft: gameState.superBoostTimeLeft });
    }
    
    if (gameState.streakMultiplier > 1) {
        boosters.push({ name: `Стрик x${gameState.streakMultiplier}`, timeLeft: 0 });
    }
    
    return boosters;
}

// Format Time
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}ч ${mins}м`;
    if (mins > 0) return `${mins}м ${secs}с`;
    return `${secs}с`;
}

// =====================================================
// INITIALIZATION
// =====================================================


// =====================================================
// GODDESS CLICKER - Shop System (Enhanced)
// =====================================================

const SHOP_ITEMS = [
    {
        id: "blessing",
        name: "Благословение",
        desc: "x2 ко всем доходам на 30 мин",
        price: 10,
        type: "booster",
        duration: 1800,
        icon: "✨"
    },
    {
        id: "eternal_storage",
        name: "Вечное хранилище",
        desc: "Оффлайн без границ",
        price: 30,
        type: "permanent",
        icon: "♾️"
    },
    {
        id: "super_boost",
        name: "Супер-бустер",
        desc: "x3 дохода на 15 минут",
        price: 15,
        type: "booster",
        duration: 900,
        icon: "🔥"
    },
    {
        id: "critical_click",
        name: "Критический клик",
        desc: "15% шанс x3 (2 уровня: x3, x5)",
        price: 20,
        type: "upgradeable_crystal",
        maxLevel: 2,
        icon: "⚡"
    },
    {
        id: "crystal_click",
        name: "+3 Сила клика",
        desc: "+3 к каждому тапу (можно много раз)",
        price: 5,
        type: "repeatable",
        icon: "💎"
    },
    {
        id: "prestige",
        name: "Золотой Престиж",
        desc: "Сброс прогресса, навсегда x2 к валюте",
        price: 50,
        type: "prestige",
        icon: "👑"
    }
];

// Check if Item Can Be Purchased
function canPurchaseItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return false;

    if (gameState.crystals < item.price) return false;

    if (item.id === "eternal_storage" && gameState.eternalStorage) return false;
    if (item.id === "critical_click") {
        if (!gameState.upgrades) gameState.upgrades = {};
        if ((gameState.upgrades.critical_click || 0) >= item.maxLevel) return false;
    }
    if (item.id === "prestige" && gameState.prestigeMultiplier > 1) return false;

    return true;
}

// Purchase Item
function purchaseItem(itemId) {
    if (!canPurchaseItem(itemId)) return false;

    const item = SHOP_ITEMS.find(i => i.id === itemId);
    gameState.crystals -= item.price;

    switch (item.id) {
        case "blessing":
            activateBlessing(item.duration);
            break;
        case "eternal_storage":
            gameState.eternalStorage = true;
            break;
        case "super_boost":
            activateSuperBoost(item.duration);
            break;
        case "critical_click":
            if (!gameState.upgrades) gameState.upgrades = {};
            gameState.upgrades.critical_click = (gameState.upgrades.critical_click || 0) + 1;
            gameState.criticalClick = true;
            break;
        case "crystal_click":
            gameState.crystalClickPower += 3;
            break;
        case "prestige":
            gameState.prestigeMultiplier *= 2;
            gameState.soft = 0;
            gameState.totalSoftEarned = 0;
            gameState.currentStage = 1;
            gameState.clickMultiplier = 1;
            break;
    }

    saveGame();
    updateUI();
    return { type: "success" };
}

// Get Active Boosters Status
function getBoostersStatus() {
    return {
        blessing: {
            active: gameState.blessingActive,
            timeLeft: gameState.blessingTimeLeft,
            formatted: gameState.blessingActive ? formatTime(gameState.blessingTimeLeft) : null
        },
        superBoost: {
            active: gameState.superBoostActive,
            timeLeft: gameState.superBoostTimeLeft,
            formatted: gameState.superBoostActive ? formatTime(gameState.superBoostTimeLeft) : null
        }
    };
}

// Get Shop Item by ID
function getShopItem(itemId) {
    return SHOP_ITEMS.find(i => i.id === itemId);
}

// Get All Shop Items
function getAllShopItems() {
    return SHOP_ITEMS;
}

// =====================================================
// UPGRADES SYSTEM (Reset on Prestige)
// =====================================================

const UPGRADES = [
    {
        id: "autoclick",
        name: "Авто-клик",
        desc: "Автоматический тап каждую секунду",
        basePrice: 50,
        priceMultiplier: 2.2,
        maxLevel: Infinity,
        icon: "🤖"
    },
    {
        id: "clickPower",
        name: "+1 Сила клика",
        desc: "+1 к базе (каждые 5 ур. +1 доп.)",
        basePrice: 15,
        priceMultiplier: 1.8,
        maxLevel: Infinity,
        icon: "👆"
    },
    {
        id: "luckyBait",
        name: "Приманка удачи",
        desc: "Чаще появляются летающие бонусы",
        basePrice: 80,
        priceMultiplier: 2.5,
        maxLevel: Infinity,
        icon: "🍀"
    },
    {
        id: "rebirth",
        name: "Перерождение",
        desc: "x1.4 ко ВСЕМ бонусам, сброс прогресса",
        basePrice: 500,
        priceMultiplier: 4.0,
        maxLevel: Infinity,
        icon: "🔄"
    }
];

function getUpgradeLevel(id) {
    return (gameState.upgrades && gameState.upgrades[id]) || 0;
}

function getUpgradePrice(id) {
    const item = UPGRADES.find(u => u.id === id);
    if (!item) return Infinity;
    const level = getUpgradeLevel(id);
    return Math.floor(item.basePrice * Math.pow(item.priceMultiplier, level));
}

function canBuyUpgrade(id) {
    const item = UPGRADES.find(u => u.id === id);
    if (!item) return false;
    const level = getUpgradeLevel(id);
    if (level >= item.maxLevel) return false;
    const price = getUpgradePrice(id);
    return gameState.soft >= price;
}

function getUpgradeBonus(id) {
    const level = getUpgradeLevel(id);
    if (level === 0) return 0;
    const tiers = Math.floor(level / 5);
    return level + tiers;
}

function buyUpgrade(id) {
    if (!canBuyUpgrade(id)) return false;
    const item = UPGRADES.find(u => u.id === id);
    const price = getUpgradePrice(id);

    if (!gameState.upgrades) gameState.upgrades = {};
    if (!gameState.upgrades[id]) gameState.upgrades[id] = 0;

    gameState.soft -= price;

    if (id === 'rebirth') {
        gameState.upgrades[id]++;
        gameState.soft = 0;
        gameState.totalSoftEarned = 0;
        gameState.currentStage = 1;
        gameState.clickMultiplier = 1;
        gameState.upgrades.autoclick = 0;
        gameState.upgrades.clickPower = 0;
        gameState.upgrades.luckyBait = 0;
    } else {
        gameState.upgrades[id]++;
    }

    saveGame();
    return true;
}

function getRebirthMultiplier() {
    const level = getUpgradeLevel('rebirth');
    return Math.pow(1.4, level);
}

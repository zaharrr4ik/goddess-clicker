// =====================================================
// GODDESS CLICKER - Yandex Games Ads
// =====================================================

const ADS = {
    INTERSTITIAL_MIN_INTERVAL: 240,
    INTERSTITIAL_MAX_INTERVAL: 300,
    REWARDED_CRYSTALS: 5,
    DAILY_BONUS_CRYSTALS: 3,
    DAILY_BONUS_WITH_AD: 6
};

function pauseAllAudio() {
    try {
        bgMusic.pause();
        clickSound.pause();
        btnSound.pause();
    } catch (e) {}
}

function resumeAllAudio() {
    try {
        if (soundEnabled) bgMusic.play().catch(() => {});
    } catch (e) {}
}

// Show Rewarded Video
async function showRewardedVideo(onRewarded) {
    if (!ysdk) {
        console.log("No SDK - simulating reward");
        if (onRewarded) onRewarded();
        return true;
    }

    try {
        await ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen: () => {
                    console.log("Rewarded video opened");
                    pauseAllAudio();
                },
                onRewarded: () => {
                    console.log("Rewarded video completed - reward given");
                    if (onRewarded) onRewarded();
                },
                onClose: () => {
                    console.log("Rewarded video closed");
                    resumeAllAudio();
                },
                onError: (e) => {
                    console.error("Rewarded video error:", e);
                    resumeAllAudio();
                }
            }
        });
        return true;
    } catch (e) {
        console.error("showRewardedVideo error:", e);
        resumeAllAudio();
        return false;
    }
}

// Show Interstitial
async function showInterstitial() {
    if (!ysdk) {
        console.log("No SDK - skipping interstitial");
        return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeSinceLast = now - Math.floor(gameState.lastInterstitialTime / 1000);

    if (timeSinceLast < ADS.INTERSTITIAL_MIN_INTERVAL) {
        console.log("Interstitial cooldown active");
        return false;
    }

    try {
        await ysdk.adv.showFullscreenAdv({
            callbacks: {
                onOpen: () => {
                    console.log("Interstitial opened");
                    pauseAllAudio();
                },
                onClose: (wasShown) => {
                    console.log("Interstitial closed, was shown:", wasShown);
                    gameState.lastInterstitialTime = Date.now();
                    resumeAllAudio();
                },
                onError: (e) => {
                    console.error("Interstitial error:", e);
                    resumeAllAudio();
                }
            }
        });
        return true;
    } catch (e) {
        console.error("showInterstitial error:", e);
        resumeAllAudio();
        return false;
    }
}

function isInterstitialReady() {
    const now = Math.floor(Date.now() / 1000);
    const timeSinceLast = now - Math.floor(gameState.lastInterstitialTime / 1000);
    return timeSinceLast >= ADS.INTERSTITIAL_MIN_INTERVAL;
}

function getRewardedCrystals() {
    return ADS.REWARDED_CRYSTALS;
}

function getDailyBonus() {
    const now = Date.now();
    const lastBonus = gameState.lastDailyBonusTime || 0;
    const hoursSinceLast = (now - lastBonus) / (1000 * 60 * 60);

    if (hoursSinceLast >= 24) {
        return {
            available: true,
            base: ADS.DAILY_BONUS_CRYSTALS,
            withAd: ADS.DAILY_BONUS_WITH_AD
        };
    }

    return {
        available: false,
        nextIn: 24 - hoursSinceLast
    };
}

function claimDailyBonus(withAd) {
    const bonus = getDailyBonus();
    if (!bonus.available) return 0;

    const amount = withAd ? bonus.withAd : bonus.base;
    gameState.crystals += amount;
    gameState.lastDailyBonusTime = Date.now();

    saveGame();
    return amount;
}

function onShopVisit() {
    if (isInterstitialReady()) {
        showInterstitial();
    }
}

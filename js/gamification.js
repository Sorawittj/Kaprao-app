// ===== GAMIFICATION SYSTEM =====

const GAMIFICATION_KEY = 'kaprao_gamification';

const ACHIEVEMENTS = {
    FIRST_ORDER: { id: 'first_order', name: 'นักชิมมือใหม่', desc: 'สั่งอาหารครั้งแรก', icon: '🍽️', points: 10 },
    REGULAR: { id: 'regular', name: 'ขาประจำ', desc: 'สั่งครบ 5 ครั้ง', icon: '⭐', points: 25 },
    VIP: { id: 'vip', name: 'VIP กะเพรา', desc: 'สั่งครบ 20 ครั้ง', icon: '👑', points: 50 },
    BIG_SPENDER: { id: 'big_spender', name: 'เศรษฐีกะเพรา', desc: 'ใช้จ่ายเกิน 1,000 บาท', icon: '💰', points: 30 },
    SAVER: { id: 'saver', name: 'นักสะสมพอยต์', desc: 'มีพอยต์สะสม 500+', icon: '🪙', points: 40 },
    EARLY_BIRD: { id: 'early_bird', name: 'นกเช้า', desc: 'สั่งก่อน 8 โมง', icon: '🌅', points: 15 },
    NIGHT_OWL: { id: 'night_owl', name: 'นกฮูกดึก', desc: 'สั่งหลัง 5 ทุ่ม', icon: '🌙', points: 15 },
    WEEKEND_WARRIOR: { id: 'weekend', name: 'สุดสัปดาห์สุดฟิน', desc: 'สั่งวันเสาร์-อาทิตย์', icon: '🎉', points: 20 },
    TRAY_MASTER: { id: 'tray', name: 'เจ้าแห่งชุดถาด', desc: 'สั่งชุดถาด 3 ครั้ง', icon: '🍱', points: 35 },
    LUCKY_WINNER: { id: 'lucky', name: 'เซียนหวย', desc: 'ถูกหวยกินฟรี', icon: '🎰', points: 100 }
};

let gamificationData = {
    level: 1,
    xp: 0,
    streak: 0,
    lastOrderDate: null,
    achievements: [],
    totalOrders: 0,
    totalSpent: 0
};

function loadGamificationData() {
    try {
        const saved = localStorage.getItem(GAMIFICATION_KEY);
        if (saved) {
            gamificationData = { ...gamificationData, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Failed to load gamification data:', e);
    }
}

function saveGamificationData() {
    localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(gamificationData));
}

function checkAndAwardAchievements(orderData) {
    const newAchievements = [];
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    if (!hasAchievement('FIRST_ORDER') && gamificationData.totalOrders === 0) {
        awardAchievement('FIRST_ORDER');
        newAchievements.push(ACHIEVEMENTS.FIRST_ORDER);
    }

    if (!hasAchievement('REGULAR') && gamificationData.totalOrders >= 4) {
        awardAchievement('REGULAR');
        newAchievements.push(ACHIEVEMENTS.REGULAR);
    }

    if (!hasAchievement('VIP') && gamificationData.totalOrders >= 19) {
        awardAchievement('VIP');
        newAchievements.push(ACHIEVEMENTS.VIP);
    }

    if (!hasAchievement('BIG_SPENDER') && gamificationData.totalSpent + orderData.total >= 1000) {
        awardAchievement('BIG_SPENDER');
        newAchievements.push(ACHIEVEMENTS.BIG_SPENDER);
    }

    if (!hasAchievement('EARLY_BIRD') && hour < 8) {
        awardAchievement('EARLY_BIRD');
        newAchievements.push(ACHIEVEMENTS.EARLY_BIRD);
    }

    if (!hasAchievement('NIGHT_OWL') && hour >= 23) {
        awardAchievement('NIGHT_OWL');
        newAchievements.push(ACHIEVEMENTS.NIGHT_OWL);
    }

    if (!hasAchievement('WEEKEND') && (day === 0 || day === 6)) {
        awardAchievement('WEEKEND');
        newAchievements.push(ACHIEVEMENTS.WEEKEND);
    }

    newAchievements.forEach((ach, index) => {
        setTimeout(() => {
            showAchievementNotification(ach);
            triggerConfettiBurst();
        }, index * 1500);
    });

    return newAchievements;
}

function hasAchievement(id) {
    return gamificationData.achievements.includes(id);
}

function awardAchievement(id) {
    if (!hasAchievement(id)) {
        gamificationData.achievements.push(id);
        gamificationData.xp += ACHIEVEMENTS[id].points;
        checkLevelUp();
        saveGamificationData();
    }
}

function checkLevelUp() {
    const newLevel = Math.floor(gamificationData.xp / 100) + 1;
    if (newLevel > gamificationData.level) {
        gamificationData.level = newLevel;
        showToast(`🎉 Level Up! คุณถึงระดับ ${newLevel} แล้ว!`, 'success');
    }
}

function updateStreak() {
    const today = new Date().toDateString();
    const lastOrder = gamificationData.lastOrderDate;

    if (lastOrder) {
        const lastDate = new Date(lastOrder);
        const todayDate = new Date();
        const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            gamificationData.streak++;
            if (gamificationData.streak >= 3) {
                showToast(`🔥 Streak ${gamificationData.streak} วัน! รักษาความต่อเนื่องไว้!`, 'success');
            }
        } else if (diffDays > 1) {
            gamificationData.streak = 1;
        }
    } else {
        gamificationData.streak = 1;
    }

    gamificationData.lastOrderDate = today;
}

function showAchievementNotification(achievement) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] animate-fade-in-down';
    toast.innerHTML = `
        <div class="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <div class="text-4xl">${achievement.icon}</div>
            <div>
                <p class="font-bold text-lg">🏆 ได้รับรางวัล!</p>
                <p class="font-bold">${achievement.name}</p>
                <p class="text-sm opacity-90">${achievement.desc} +${achievement.points} XP</p>
            </div>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function triggerConfettiBurst() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FCD34D', '#F59E0B', '#FBBF24', '#FFFFFF']
    });
}

// ===== POINTS SYSTEM =====

// New Points Logic (Updated per request):
// - < 60 = 0
// - 60-119 = 10
// - 120-149 = 30
// - 150+ = 30 + 10 for every additional 30 baht (e.g. 150=40, 180=50)
function calculatePoints(netTotal) {
    if (netTotal < 60) return 0;
    if (netTotal < 120) return 10;

    // Base 30 at 120.
    // For 150+, it accumulates.
    // Logic: 120 is base tier (30pts).
    // Steps above 120 calculated by 30-baht increments.
    return 30 + Math.floor((netTotal - 120) / 30) * 10;
}

function updatePointsDisplay() {
    const points = userStats.points || 0;
    document.getElementById('points-count').innerText = points;
    document.getElementById('available-points').innerText = points;
    updateCheckoutPointsInfo();
}

function updateCheckoutPointsInfo() {
    const subtotal = cart.reduce((sum, i) => sum + i.price, 0);
    const userPointsBalance = document.getElementById('user-points-balance');
    if (userPointsBalance) userPointsBalance.innerHTML = `มี <span id="available-points">${userStats.points || 0}</span> แต้ม`;
}

function togglePointsUsage() {
    const controlsContainer = document.getElementById('points-controls-container');
    const toggleBtn = document.getElementById('points-toggle-btn');
    const userPoints = userStats.points || 0;
    let subtotal = cart.reduce((sum, i) => sum + i.price, 0);
    const code = document.getElementById('discount-code').value.trim().toUpperCase();
    const promo = promotions.find(p => p.code === code);
    let discountFromCode = 0;
    if (promo && subtotal >= promo.minOrder) discountFromCode = promo.value;
    let netTotalBeforePoints = Math.max(0, subtotal - discountFromCode);

    if (controlsContainer.classList.contains('hidden')) {
        if (userPoints < 100) { showToast(`คุณมีพอยต์เพียง ${userPoints} พอยต์ (ต้องการอย่างน้อย 100 พอยต์)`, 'error'); return; }
        controlsContainer.classList.remove('hidden'); isPointsActive = true;
        toggleBtn.innerHTML = '<i class="fas fa-times mr-2"></i> ปิด';
        toggleBtn.classList.remove('bg-white', 'text-yellow-600', 'border-yellow-200');
        toggleBtn.classList.add('bg-red-500', 'text-white', 'border-red-500');
        const maxPointsByPrice = netTotalBeforePoints * 10;
        const maxPoints = Math.min(userPoints, maxPointsByPrice);
        const finalMaxPoints = Math.floor(maxPoints / 100) * 100;
        document.getElementById('points-range').max = finalMaxPoints;
        document.getElementById('points-max').textContent = finalMaxPoints;
        document.getElementById('points-input').max = finalMaxPoints;
        const initialPoints = finalMaxPoints;
        document.getElementById('points-range').value = initialPoints;
        document.getElementById('points-input').value = initialPoints;
        updatePointsDiscount(initialPoints);
        showToast('เปิดใช้งานพอยต์ส่วนลดแล้ว', 'success');
    } else {
        controlsContainer.classList.add('hidden'); isPointsActive = false; pointsRedeemed = 0;
        toggleBtn.innerHTML = 'แลกคะแนน';
        toggleBtn.classList.remove('bg-red-500', 'text-white', 'border-red-500');
        toggleBtn.classList.add('bg-white', 'text-yellow-600', 'border-yellow-200');
        updateTotalSummary();
        showToast('ปิดใช้งานพอยต์ส่วนลดแล้ว', 'info');
    }
    triggerHaptic();
}

function updatePointsFromUI(value) {
    const userPoints = userStats.points || 0;
    let pointsValue = parseInt(value) || 0;
    pointsValue = Math.round(pointsValue / 100) * 100;
    let subtotal = cart.reduce((sum, i) => sum + i.price, 0);
    const code = document.getElementById('discount-code').value.trim().toUpperCase();
    const promo = promotions.find(p => p.code === code);
    let discountFromCode = 0;
    if (promo && subtotal >= promo.minOrder) discountFromCode = promo.value;
    let netTotalBeforePoints = Math.max(0, subtotal - discountFromCode);
    const maxPointsByPrice = netTotalBeforePoints * 10;
    const finalMax = Math.min(userPoints, maxPointsByPrice);
    if (pointsValue > finalMax) pointsValue = Math.floor(finalMax / 100) * 100;
    document.getElementById('points-range').value = pointsValue;
    document.getElementById('points-input').value = pointsValue;
    updatePointsDiscount(pointsValue);
}

function updatePointsDiscount(pointsAmount) {
    pointsAmount = pointsAmount || parseInt(document.getElementById('points-input').value) || 0;
    const discountAmount = Math.floor(pointsAmount / 100) * 10;
    const discountDisplay = document.getElementById('points-discount-display');
    if (discountDisplay) discountDisplay.textContent = `${discountAmount}`;
    const usedDisplay = document.getElementById('points-used-display');
    if (usedDisplay) usedDisplay.textContent = `${pointsAmount}`;
    pointsRedeemed = pointsAmount;
    discountValue = discountAmount;
    updateTotalSummary();
}

function resetPointsDiscount() {
    const controlsContainer = document.getElementById('points-controls-container');
    const toggleBtn = document.getElementById('points-toggle-btn');
    if (controlsContainer) controlsContainer.classList.add('hidden');
    isPointsActive = false; pointsRedeemed = 0;
    if (toggleBtn) {
        toggleBtn.innerHTML = 'แลกคะแนน';
        toggleBtn.classList.remove('bg-red-500', 'text-white', 'border-red-500');
        toggleBtn.classList.add('bg-white', 'text-yellow-600', 'border-yellow-200');
    }
    updateTotalSummary();
}

function openPointsHistory() {
    pushModalState('points-history');
    const modal = document.getElementById('points-history-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
    const historyList = document.getElementById('points-history-list');
    historyList.innerHTML = '';
    const history = userStats.history || [];
    if (history.length === 0) {
        historyList.innerHTML = `<div class="text-center text-gray-400 py-8"><i class="fas fa-history text-3xl mb-2 opacity-30"></i><p class="text-sm">ยังไม่มีการใช้พอยต์</p></div>`;
    } else {
        history.forEach(item => {
            const dateObj = new Date(item.date);
            const dateStr = `${getStandardDate(dateObj)} ${formatTime(dateObj)}`;
            let icon, title, amountClass, amountSign, bgClass;
            if (item.type === 'earn') {
                icon = 'fa-plus-circle'; title = 'ได้รับพอยต์'; amountClass = 'text-green-500'; amountSign = '+'; bgClass = 'bg-white border-gray-200';
            } else {
                icon = 'fa-minus-circle'; title = 'ใช้ส่วนลด'; amountClass = 'text-red-500'; amountSign = '-'; bgClass = 'bg-white border-gray-200';
            }
            const el = document.createElement('div');
            el.className = `flex justify-between items-center p-3 mb-2 rounded-xl border ${bgClass}`;
            el.innerHTML = `<div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ${amountClass}"><i class="fas ${icon}"></i></div><div class="text-left"><div class="text-xs font-bold text-gray-800">${title}</div><div class="text-[10px] text-gray-400">${dateStr} #${item.orderId ? item.orderId.slice(-4) : 'PROMO'}</div></div></div><div class="font-black text-lg ${amountClass}">${amountSign}${item.amount}</div>`;
            historyList.appendChild(el);
        });
    }
}

function closePointsHistory(isBackNav = false) {
    if (!isBackNav && currentOpenModal === 'points-history') { history.back(); return; }
    const modal = document.getElementById('points-history-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
    currentOpenModal = null;
    unlockScroll();
}

async function manualRefreshPoints() {
    const btn = document.getElementById('refresh-points-btn');
    if (isSyncing) return;
    if (btn) btn.classList.add('animate-spin-fast');
    if (userAvatar.userId) {
        await syncUserStatsFromServer(userAvatar.userId);
        showToast('อัปเดตพอยต์แล้ว! 🪙', 'success');
    } else {
        showToast('กรุณาเข้าสู่ระบบก่อนครับ', 'warning');
    }
    if (btn) setTimeout(() => btn.classList.remove('animate-spin-fast'), 1000);
}

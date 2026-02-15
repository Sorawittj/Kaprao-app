// ===== CHECKOUT & ORDER SUBMISSION =====

let currentOrderId = "";

function generateOrderId() {
    const now = Date.now().toString();
    const timePart = now.slice(-2);
    const myPendingNumbers = lottoHistory.filter(t => t.status === 'pending').map(t => t.number);
    let randomPart;
    let isDuplicate = true;
    let attempts = 0;
    while (isDuplicate && attempts < 500) {
        randomPart = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        if (!myPendingNumbers.includes(randomPart) || myPendingNumbers.length >= 100) isDuplicate = false;
        attempts++;
    }
    currentOrderId = `KP-${timePart}${randomPart}`;
    return currentOrderId;
}

function saveTicketToHistory(orderId, totalPrice) {
    const today = new Date();
    const drawDateStr = getThaiLotteryDrawDate(today); // Returns "DD/MM/YYYY" string
    const todayStr = getStandardDate(today);
    const name = document.getElementById('user-name') ? document.getElementById('user-name').value || 'ลูกค้า' : 'ลูกค้า';

    // Parse draw date string to timestamp
    const [dd, mm, yyyy] = drawDateStr.split('/').map(Number);
    const drawDateTimestamp = new Date(yyyy, mm - 1, dd).getTime();

    const ticket = {
        id: orderId,
        number: orderId.slice(-2),
        date: todayStr,
        drawDate: drawDateStr,
        drawDateTimestamp: drawDateTimestamp,
        timestamp: Date.now(),
        price: totalPrice,
        status: 'pending',
        checkedDate: null,
        items: JSON.parse(JSON.stringify(cart)),
        customerName: name
    };

    lottoHistory.unshift(ticket);
    if (lottoHistory.length > 20) lottoHistory = lottoHistory.slice(0, 20);
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(lottoHistory));
    updateTicketBadge();
}

function openCheckout() {
    try {
        pushModalState('checkout');
        triggerHaptic();
        renderCheckoutList();
        if (document.getElementById('discount-code').value.trim() !== '' && discountValue > 0) applyDiscount();

        const bannerContainer = document.getElementById('order-id-banner');
        if (cart.length > 0) {
            const lottoId = generateOrderId();
            const nextDraw = getThaiLotteryDrawDate();
            bannerContainer.classList.remove('hidden');
            bannerContainer.innerHTML = `
                <div class="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-4 rounded-xl mb-3 shadow-sm relative overflow-hidden stagger-item">
                    <div class="absolute -right-4 -top-4 bg-indigo-100 opacity-50 w-20 h-20 rounded-full"></div>
                    <div class="flex flex-col z-10">
                        <span class="text-[10px] text-gray-500 uppercase tracking-wider">Order ID ของคุณ</span>
                        <div class="flex items-baseline gap-1">
                            <span class="font-bold text-xl text-gray-800">${lottoId.slice(0, -2)}</span>
                            <span class="font-black text-3xl text-yellow-500 drop-shadow-sm">${lottoId.slice(-2)}</span>
                        </div>
                        <div class="mt-2 text-xs text-indigo-600">
                            <i class="fas fa-calendar-alt mr-1"></i>
                            ลุ้นหวยงวด ${formatThaiDate(nextDraw)}
                        </div>
                    </div>
                    <div class="absolute top-4 right-4 z-10 text-3xl">🎟️</div>
                </div>
            `;
        } else bannerContainer.classList.add('hidden');

        resetPointsDiscount();
        const overlay = document.getElementById('checkout-overlay');
        const sheet = document.getElementById('checkout-sheet');
        sheet.style.transform = '';
        overlay.classList.remove('hidden');
        setTimeout(() => { overlay.classList.remove('opacity-0'); sheet.classList.remove('translate-y-full'); }, 10);
    } catch (error) { console.error('openCheckout error:', error); }
}

function closeCheckout(isBackNav = false) {
    if (!isBackNav && currentOpenModal === 'checkout') { history.back(); return; }
    const overlay = document.getElementById('checkout-overlay');
    const sheet = document.getElementById('checkout-sheet');
    overlay.classList.add('opacity-0');
    sheet.classList.add('translate-y-full');
    setTimeout(() => { overlay.classList.add('hidden'); sheet.style.transform = ''; }, 300);
    currentOpenModal = null;
    unlockScroll();
}

function openReceiptResult(imgData) {
    const modal = document.getElementById('receipt-result-modal');
    const img = document.getElementById('receipt-result-img');
    img.src = imgData;
    modal.classList.remove('hidden');
}

function downloadReceiptImage() {
    const img = document.getElementById('receipt-result-img');
    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'kaprao52-receipt-' + Date.now() + '.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('กำลังดาวน์โหลด...', 'info');
}

function reprintReceipt(ticketIndex) {
    triggerHaptic();
    if (typeof html2canvas === 'undefined') {
        showToast("ระบบกำลังโหลดโปรแกรมวาดภาพ กรุณาลองใหม่ใน 2 วินาที", "error");
        return;
    }
    if (!lottoHistory || !lottoHistory[ticketIndex]) {
        showToast("ไม่พบข้อมูลรายการอาหารของบิลเก่า 😢", 'error');
        return;
    }

    const ticket = lottoHistory[ticketIndex];
    showGlobalLoader("กำลังโหลดใบเสร็จเก่า...");

    const name = ticket.customerName || 'ลูกค้า';
    const subtotal = ticket.items ? ticket.items.reduce((sum, i) => sum + i.price, 0) : ticket.price;
    const netTotal = ticket.price;
    const discount = subtotal - netTotal;
    const tDate = new Date(ticket.timestamp);
    const dateStr = `${getStandardDate(tDate)} ${formatTime(tDate)}`;

    document.querySelector('.receipt-id').innerText = ticket.id;
    document.querySelector('.receipt-date').innerText = dateStr;
    document.querySelector('.receipt-name').innerText = escapeHtml(name);
    document.querySelector('.receipt-subtotal').innerText = subtotal + '.-';
    document.querySelector('.receipt-discount').innerText = '-' + discount + '.-';
    document.querySelector('.receipt-total').innerText = netTotal + '.-';

    const receiptAvatar = document.getElementById('receipt-avatar-img');
    receiptAvatar.crossOrigin = "Anonymous";
    receiptAvatar.src = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

    const itemsContainer = document.querySelector('.receipt-items');
    itemsContainer.innerHTML = '';
    if (ticket.items) {
        ticket.items.forEach((i, index) => {
            let detail = `${i.name}`;
            if (i.meat) detail += ` (${i.meat})`;
            if (i.addons.length) detail += ` +${i.addons.join(',')}`;
            const row = document.createElement('div');
            row.className = "flex justify-between text-xs";
            row.innerHTML = `<div class="flex gap-1 text-gray-400"><span class="w-4">${index + 1}.</span><span>${detail}</span></div><span class="font-bold text-gray-700">${i.price}.-</span>`;
            itemsContainer.appendChild(row);
        });
    }

    const div = document.getElementById('receipt-capture');
    div.style.visibility = 'visible';
    div.style.zIndex = '-100';

    setTimeout(() => {
        html2canvas(div, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }).then(canvas => {
            div.style.visibility = 'hidden';
            hideGlobalLoader();
            openReceiptResult(canvas.toDataURL('image/png'));
            showToast('เสร็จแล้ว! กดบันทึกรูปได้เลย', 'success');
        }).catch((e) => {
            div.style.visibility = 'hidden';
            console.error(e);
            hideGlobalLoader();
            showToast('เกิดข้อผิดพลาดในการบันทึกภาพ', 'error');
        });
    }, 800);
}

async function submitOrderToLine() {
    if (isSyncing) { showToast("⏳ กำลังอัปเดตข้อมูลล่าสุด กรุณารอสักครู่...", 'info'); return; }
    if (isSubmitting) return;

    const name = document.getElementById('user-name').value.trim();
    if (!name) return showToast('กรุณาใส่ชื่อผู้สั่ง', 'warning');

    isSubmitting = true;
    const btn = document.getElementById('btn-submit-order');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> กำลังส่ง...';
    btn.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        showGlobalLoader("กำลังสร้างบิลและส่งไลน์...");

        let subtotal = cart.reduce((sum, i) => sum + i.price, 0);
        let discountFromCode = 0;
        const code = document.getElementById('discount-code').value.trim().toUpperCase();
        const promo = promotions.find(p => p.code === code);
        if (promo && subtotal >= promo.minOrder) discountFromCode = promo.value;

        let discountFromPoints = 0;
        if (pointsRedeemed > 0) discountFromPoints = Math.floor(pointsRedeemed / 100) * 10;

        const netTotal = Math.max(0, subtotal - discountFromCode - discountFromPoints);
        const pointsEarned = calculatePoints(netTotal);
        const currentPoints = userStats.points || 0;
        const newPointsBalance = currentPoints + pointsEarned - pointsRedeemed;

        if (!userStats.history) userStats.history = [];
        if (!userStats.orderHistory) userStats.orderHistory = [];

        const historyTimestamp = new Date().toISOString();

        if (pointsRedeemed > 0) {
            userStats.history.unshift({ type: 'redeem', amount: pointsRedeemed, date: historyTimestamp, orderId: currentOrderId });
        }
        if (pointsEarned > 0) {
            userStats.history.unshift({ type: 'earn', amount: pointsEarned, date: historyTimestamp, orderId: currentOrderId });
        }

        // Save order to history for quick reorder
        userStats.orderHistory.unshift({
            date: getStandardDate(new Date()),
            total: netTotal,
            items: cart.map(item => ({
                name: item.name,
                price: item.price,
                meat: item.meat,
                addons: item.addons,
                note: item.note
            }))
        });

        // Keep only last 20 orders
        if (userStats.orderHistory.length > 20) {
            userStats.orderHistory = userStats.orderHistory.slice(0, 20);
        }
        if (userStats.history.length > 20) {
            userStats.history = userStats.history.slice(0, 20);
        }

        userStats.points = newPointsBalance;
        localStorage.setItem(KEYS.STATS, JSON.stringify(userStats));
        updatePointsDisplay();
        updateRecommendations(); // Update recommendations after order

        const allNotes = cart.filter(i => i.note).map(i => i.note).join(", ");
        if (!currentOrderId) generateOrderId();
        const nowStr = `${getStandardDate(new Date())} ${formatTime(new Date())}`;
        const nextDraw = getThaiLotteryDrawDate();

        let msg = `🔥 ออเดอร์ใหม่! [${currentOrderId}]\n🎟️ เลขลุ้นหวย: ${currentOrderId.slice(-2)} (งวด ${formatThaiDate(nextDraw)})\n📅 ${nowStr}\n👤 คุณ ${name}\n🪙 พอยต์ที่จะได้: +${pointsEarned} พอยต์\n------------------------\n`;
        cart.forEach((i, index) => {
            let detail = `${i.name} ${i.meat ? '(' + i.meat + ')' : ''}`;
            if (i.addons.length) detail += ` +${i.addons.join('+')}`;
            if (i.note) detail += ` [${i.note}]`;
            msg += `${index + 1}. ${detail} (${i.price}.-)\n`;
        });
        msg += `------------------------\n💵 ยอดรวม: ${subtotal} บาท\n`;
        if (discountFromCode > 0) msg += `🏷️ ส่วนลดโค้ด: -${discountFromCode} บาท\n`;
        if (discountFromPoints > 0) msg += `🪙 ส่วนลดพอยต์: -${discountFromPoints} บาท\n`;
        if (pointsRedeemed > 0) msg += `🪙 ใช้พอยต์: ${pointsRedeemed} พอยต์\n`;
        msg += `💰 ยอดสุทธิ: ${netTotal} บาท\n`;

        const sheetData = {
            orderId: currentOrderId,
            name: name,
            items: cart,
            totalPrice: subtotal,
            discountCode: discountFromCode,
            discountPoints: discountFromPoints,
            netTotal: netTotal,
            pointsEarned: pointsEarned,
            pointsRedeemed: pointsRedeemed,
            pointsBalance: newPointsBalance,
            allNotes: allNotes,
            userId: userAvatar.userId
        };

        if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('http')) {
            fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sheetData), keepalive: true }).catch(err => console.error("Sheet Error:", err));
        }

        saveTicketToHistory(currentOrderId, netTotal);
        const lineOAId = "@772ysswn";
        const encodedMsg = encodeURIComponent(msg);
        confetti();

        // Start order tracking
        startOrderTracking(currentOrderId, cart);
        updateActiveOrdersButton();

        // Update gamification
        gamificationData.totalOrders++;
        gamificationData.totalSpent += netTotal;
        updateStreak();
        checkAndAwardAchievements({ total: netTotal, items: cart });
        saveGamificationData();

        setTimeout(() => {
            cart = [];
            discountValue = 0;
            pointsRedeemed = 0;
            isPointsActive = false;
            currentOrderId = "";
            saveToLS();
            updateMiniCart();
            closeCheckout();
            hideGlobalLoader();
            window.location.href = `https://line.me/R/oaMessage/${lineOAId}/?${encodedMsg}`;
            isSubmitting = false;
            btn.innerHTML = originalText;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }, 1000);
    } catch (error) {
        hideGlobalLoader();
        showToast("เกิดข้อผิดพลาด กรุณาลองใหม่", 'error');
        isSubmitting = false;
        btn.innerHTML = originalText;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

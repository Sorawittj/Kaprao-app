// ===== CHECKOUT & ORDER SUBMISSION =====

const PROMPTPAY_NUMBER = '0928496930'; // Update with actual shop PromptPay number

let currentOrderId = "";
let currentSupabaseOrderId = null; // Store Supabase numeric ID

function generateOrderId() {
    const now = Date.now().toString();
    const timePart = now.slice(-2);
    // Assuming lottoHistory is global or loaded
    const myPendingNumbers = (typeof lottoHistory !== 'undefined' ? lottoHistory : []).filter(t => t.status === 'pending').map(t => t.number);
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

function saveTicketToHistory(orderId, totalPrice, supabaseId) {
    const today = new Date();
    // Assuming utility functions exist globally: getThaiLotteryDrawDate, getStandardDate
    const drawDateStr = typeof getThaiLotteryDrawDate === 'function' ? getThaiLotteryDrawDate(today) : new Date().toLocaleDateString();
    const todayStr = typeof getStandardDate === 'function' ? getStandardDate(today) : new Date().toLocaleDateString();
    const name = document.getElementById('user-name') ? document.getElementById('user-name').value || 'ลูกค้า' : 'ลูกค้า';

    // Parse draw date string to timestamp
    // Assuming format DD/MM/YYYY
    const parts = drawDateStr.split('/');
    let drawDateTimestamp;
    if (parts.length === 3) {
        const dd = parseInt(parts[0]);
        const mm = parseInt(parts[1]);
        const yyyy = parseInt(parts[2]);
        drawDateTimestamp = new Date(yyyy, mm - 1, dd).getTime();
    } else {
        drawDateTimestamp = Date.now();
    }

    // Lottery number: last 2 digits of Supabase order ID (if available), else from KP order ID
    const lottoNumber = supabaseId
        ? String(supabaseId).slice(-2).padStart(2, '0')
        : orderId.slice(-2);

    const ticket = {
        id: orderId,
        supabaseOrderId: supabaseId || null,
        number: lottoNumber,
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

    if (typeof lottoHistory !== 'undefined') {
        lottoHistory.unshift(ticket);
        if (lottoHistory.length > 20) lottoHistory = lottoHistory.slice(0, 20);
        localStorage.setItem(KEYS.HISTORY, JSON.stringify(lottoHistory));
        if (typeof updateTicketBadge === 'function') updateTicketBadge();
    }

    return lottoNumber;
}

function openCheckout() {
    try {
        if (typeof pushModalState === 'function') pushModalState('checkout');
        if (typeof triggerHaptic === 'function') triggerHaptic();
        if (typeof renderCheckoutList === 'function') renderCheckoutList();
        if (document.getElementById('discount-code').value.trim() !== '' && typeof discountValue !== 'undefined' && discountValue > 0) {
            if (typeof applyDiscount === 'function') applyDiscount();
        }

        const bannerContainer = document.getElementById('order-id-banner');
        if (typeof cart !== 'undefined' && cart.length > 0) {
            const lottoId = generateOrderId();
            const nextDraw = typeof getThaiLotteryDrawDate === 'function' ? getThaiLotteryDrawDate() : "";
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
                            ลุ้นหวยงวด ${typeof formatThaiDate === 'function' ? formatThaiDate(nextDraw) : nextDraw}
                        </div>
                    </div>
                    <div class="absolute top-4 right-4 z-10 text-3xl">🎟️</div>
                </div>
            `;
        } else if (bannerContainer) bannerContainer.classList.add('hidden');

        if (typeof resetPointsDiscount === 'function') resetPointsDiscount();
        const overlay = document.getElementById('checkout-overlay');
        const sheet = document.getElementById('checkout-sheet');
        sheet.style.transform = '';
        overlay.classList.remove('hidden');
        setTimeout(() => { overlay.classList.remove('opacity-0'); sheet.classList.remove('translate-y-full'); }, 10);
    } catch (error) { console.error('openCheckout error:', error); }
}

function closeCheckout(isBackNav = false) {
    if (!isBackNav && typeof currentOpenModal !== 'undefined' && currentOpenModal === 'checkout') { history.back(); return; }
    const overlay = document.getElementById('checkout-overlay');
    const sheet = document.getElementById('checkout-sheet');
    overlay.classList.add('opacity-0');
    sheet.classList.add('translate-y-full');
    setTimeout(() => { overlay.classList.add('hidden'); sheet.style.transform = ''; }, 300);
    if (typeof currentOpenModal !== 'undefined') currentOpenModal = null;
    if (typeof unlockScroll === 'function') unlockScroll();
    if (typeof setActiveNav === 'function') setActiveNav('home');
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
    if (typeof showToast === 'function') showToast('กำลังดาวน์โหลด...', 'info');
}

function reprintReceipt(ticketIndex) {
    if (typeof triggerHaptic === 'function') triggerHaptic();
    if (typeof html2canvas === 'undefined') {
        if (typeof showToast === 'function') showToast("ระบบกำลังโหลดโปรแกรมวาดภาพ กรุณาลองใหม่ใน 2 วินาที", "error");
        return;
    }
    if (typeof lottoHistory === 'undefined' || !lottoHistory || !lottoHistory[ticketIndex]) {
        if (typeof showToast === 'function') showToast("ไม่พบข้อมูลรายการอาหารของบิลเก่า 😢", 'error');
        return;
    }

    const ticket = lottoHistory[ticketIndex];
    if (typeof showGlobalLoader === 'function') showGlobalLoader("กำลังโหลดใบเสร็จเก่า...");

    const name = ticket.customerName || 'ลูกค้า';
    const subtotal = ticket.items ? ticket.items.reduce((sum, i) => sum + i.price, 0) : ticket.price;
    const netTotal = ticket.price;
    const discount = subtotal - netTotal;
    const tDate = new Date(ticket.timestamp);
    const dateStr = typeof getStandardDate === 'function' ? `${getStandardDate(tDate)} ${typeof formatTime === 'function' ? formatTime(tDate) : ''}` : tDate.toLocaleString();

    document.querySelector('.receipt-id').innerText = ticket.id;
    document.querySelector('.receipt-date').innerText = dateStr;
    document.querySelector('.receipt-name').innerText = typeof escapeHtml === 'function' ? escapeHtml(name) : name;
    document.querySelector('.receipt-subtotal').innerText = subtotal + '.-';
    document.querySelector('.receipt-discount').innerText = '-' + discount + '.-';
    document.querySelector('.receipt-total').innerText = netTotal + '.-';

    const receiptAvatar = document.getElementById('receipt-avatar-img');
    receiptAvatar.crossOrigin = "Anonymous";
    receiptAvatar.src = (typeof userAvatar !== 'undefined' && userAvatar.image) ? userAvatar.image : 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

    const itemsContainer = document.querySelector('.receipt-items');
    itemsContainer.innerHTML = '';
    if (ticket.items) {
        ticket.items.forEach((i, index) => {
            let detail = `${i.name}`;
            if (i.meat) detail += ` (${i.meat})`;
            if (i.addons && i.addons.length) detail += ` +${i.addons.join(',')}`;
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
            if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
            openReceiptResult(canvas.toDataURL('image/png'));
            if (typeof showToast === 'function') showToast('เสร็จแล้ว! กดบันทึกรูปได้เลย', 'success');
        }).catch((e) => {
            div.style.visibility = 'hidden';
            console.error(e);
            if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
            if (typeof showToast === 'function') showToast('เกิดข้อผิดพลาดในการบันทึกภาพ', 'error');
        });
    }, 800);
}

// --- PAYMENT & SUBMISSION ---

const KBANK_INFO = {
    bankName: 'ธนาคารกสิกรไทย (KBANK)',
    accNumber: '203-3-57019-0',
    accName: 'Kaprao52',
    qrImage: 'images/payment_qr.jpg'
};

function selectPaymentMethod() {
    const name = document.getElementById('user-name').value.trim();
    if (!name) return showToast('กรุณาใส่ชื่อผู้สั่งก่อนครับ', 'warning');
    if (cart.length === 0) return showToast('ตะกร้าว่างเปล่า', 'warning');

    // Remove existing modal if any
    const existingModal = document.getElementById('payment-modal');
    if (existingModal) existingModal.remove();

    // Calculate actual total with discounts
    let subtotal = cart.reduce((sum, i) => sum + i.price, 0);
    let discountFromCode = 0;
    const code = document.getElementById('discount-code') ? document.getElementById('discount-code').value.trim().toUpperCase() : '';
    if (typeof promotions !== 'undefined') {
        const promo = promotions.find(p => p.code === code);
        if (promo && subtotal >= promo.minOrder) discountFromCode = promo.value;
    }

    let discountFromPoints = (typeof pointsRedeemed !== 'undefined' && typeof isPointsActive !== 'undefined' && isPointsActive)
        ? Math.floor(pointsRedeemed / 100) * 10
        : 0;
    const total = Math.max(0, subtotal - discountFromCode - discountFromPoints);

    // Define methods for the loop
    const methods = [
        { id: 'transfer', name: t('pay_transfer'), icon: 'fas fa-university' },
        { id: 'credit', name: t('pay_credit'), icon: 'fas fa-credit-card' },
        { id: 'later', name: t('pay_later'), icon: 'fas fa-clock' }
    ];

    const modalEl = document.createElement('div');
    modalEl.id = 'payment-modal';
    modalEl.className = 'fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end justify-center animate-fade-in';

    modalEl.innerHTML = `
        <div class="bg-white rounded-t-[2rem] w-full max-w-sm p-6 animate-slide-up relative safe-area-pb">
            <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i class="fas fa-wallet text-brand-yellow"></i> ${t('payment_method')}
            </h3>
            <p class="text-sm text-gray-500 mb-6">${t('total')}: <span class="text-indigo-600 font-bold text-lg">${t('currency_unit')}${total}</span></p>

            <div class="space-y-3">
                ${methods.map(m => `
                    <button onclick="${m.id === 'transfer' ? 'showQRCode()' : `confirmOrder('${m.id}')`}" class="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-brand-yellow hover:bg-[#FDFBF7] transition-all group">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-yellow-100 group-hover:text-yellow-600 transition-colors">
                                <i class="${m.icon} text-xl"></i>
                            </div>
                            <span class="font-bold text-gray-700">${m.name}</span>
                        </div>
                        <i class="fas fa-chevron-right text-gray-300"></i>
                    </button>
                `).join('')}
            </div>
            <button onclick="document.getElementById('payment-modal').remove()" class="mt-6 w-full py-3 rounded-xl bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-colors">${t('btn_close')}</button>
        </div >
        `;

    document.body.appendChild(modalEl);
}

function showQRCode() {
    const modalBody = document.querySelector('#payment-modal > div');
    let subtotal = cart.reduce((sum, i) => sum + i.price, 0);
    let discountFromCode = 0;
    const code = document.getElementById('discount-code') ? document.getElementById('discount-code').value.trim().toUpperCase() : '';
    if (typeof promotions !== 'undefined') {
        const promo = promotions.find(p => p.code === code);
        if (promo && subtotal >= promo.minOrder) discountFromCode = promo.value;
    }
    let discountFromPoints = (typeof pointsRedeemed !== 'undefined' && typeof isPointsActive !== 'undefined' && isPointsActive)
        ? Math.floor(pointsRedeemed / 100) * 10
        : 0;
    const total = Math.max(0, subtotal - discountFromCode - discountFromPoints);

    modalBody.innerHTML = `
        <div class="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4"></div>
        <div class="text-center mb-4">
            <h2 class="text-xl font-bold text-gray-800">${t('pay_transfer')}</h2>
            <p class="text-xs text-gray-400">${t('pay_instruction')}</p>
        </div>
        
        <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4 flex flex-col items-center">
            <img src="${KBANK_INFO.qrImage}" 
                 onerror="this.src='https://via.placeholder.com/300x300?text=Please+Upload+QR'; this.classList.add('opacity-50')"
                 class="w-48 h-48 object-contain rounded-lg mb-3 shadow-sm bg-white">
            
            <div class="w-full border-t border-gray-200 my-2"></div>
            
            <div class="text-center w-full">
                <p class="text-xs text-gray-400 mb-1">Bank Account</p>
                <div class="flex items-center justify-center gap-2 mb-1">
                    <img src="https://cdn.iconscout.com/icon/free/png-256/free-kasikorn-bank-3521509-2944927.png" class="w-6 h-6 rounded-full">
                    <span class="font-bold text-green-700 text-lg tracking-wider">${KBANK_INFO.accNumber}</span>
                </div>
                <p class="text-xs text-gray-500">${KBANK_INFO.bankName}</p>
                 <p class="text-[10px] text-gray-400 mt-1">${t('total')}: <b class="text-black text-sm">${t('currency_unit')}${total}</b></p>
            </div>
        </div>
        
        <button onclick="confirmOrder('bank_transfer')" class="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-green-700 transition-all mb-3 text-sm">
            <i class="fas fa-check-circle mr-2"></i> โอนเงินเรียบร้อยแล้ว
        </button>
        <button onclick="selectPaymentMethod()" class="w-full py-3 text-gray-400 font-bold text-sm">ย้อนกลับ</button>
    `;
}

// isSubmitting is declared in state.js

async function confirmOrder(paymentMethod) {
    document.getElementById('payment-modal')?.remove();

    if (typeof isSyncing !== 'undefined' && isSyncing) return;
    if (isSubmitting) return;

    // 1. Validation
    const name = document.getElementById('user-name').value.trim();
    if (!name) {
        showToast('กรุณาใส่ชื่อผู้สั่งก่อนครับ', 'warning');
        return;
    }
    if (cart.length === 0) {
        showToast('ตะกร้าว่างเปล่า', 'warning');
        return;
    }

    // 2. Network Check
    if (!navigator.onLine) {
        showToast('ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้', 'error');
        return;
    }

    if (typeof supabaseClient === 'undefined') {
        showToast('ระบบฐานข้อมูลไม่พร้อมใช้งาน กรุณารีเฟรช', 'error');
        return;
    }

    isSubmitting = true;
    showGlobalLoader("กำลังส่งออเดอร์...");

    try {
        // --- Calculate Totals ---
        let subtotal = cart.reduce((sum, i) => sum + i.price, 0);
        let discountFromCode = 0;
        const code = document.getElementById('discount-code') ? document.getElementById('discount-code').value.trim().toUpperCase() : '';
        let promoCode = null;
        if (typeof promotions !== 'undefined') {
            const promo = promotions.find(p => p.code === code);
            if (promo && subtotal >= promo.minOrder) {
                discountFromCode = promo.value;
                promoCode = code;
            }
        }
        let discountFromPoints = 0;
        let redeemedPoints = 0;
        if (typeof isPointsActive !== 'undefined' && isPointsActive && typeof pointsRedeemed !== 'undefined') {
            redeemedPoints = pointsRedeemed;
            discountFromPoints = Math.floor(redeemedPoints / 100) * 10;
        }
        const totalDiscount = discountFromCode + discountFromPoints;
        const netTotal = Math.max(0, subtotal - totalDiscount);

        // Calculate points to earn (10 baht = 1 point)
        const pointsToEarn = typeof calculatePoints === 'function'
            ? calculatePoints(netTotal)
            : Math.floor(netTotal / 10);

        // Generate local order ID
        if (!currentOrderId) generateOrderId();
        const localOrderId = currentOrderId;

        // --- Insert into Supabase (CRITICAL STEP) ---
        let supabaseOrderId = null;

        const orderPayload = {
            status: 'placed', // Insert directly as 'placed'
            payment_method: paymentMethod,
            payment_status: paymentMethod === 'bank_transfer' ? 'paid_verify' : 'pending',
            total_price: netTotal,
            subtotal_price: subtotal,
            discount_amount: totalDiscount,
            discount_code: promoCode,
            points_redeemed: redeemedPoints,
            points_earned: pointsToEarn,
            user_id: (typeof userAvatar !== 'undefined' && userAvatar.userId) ? userAvatar.userId : null,
            line_user_id: (typeof userAvatar !== 'undefined' && userAvatar.lineUserId) ? userAvatar.lineUserId : null,
            customer_name: name,
            items: cart,
            created_at: new Date().toISOString()
        };

        // Attempt 1: Full payload
        const { data: insertedOrder, error } = await supabaseClient
            .from('orders')
            .insert(orderPayload)
            .select('id')
            .single();

        if (error) {
            console.error('Supabase Insert Error (Full):', error);

            // Attempt 2: Fallback payload (minimal fields)
            const fallbackPayload = {
                status: 'placed',
                payment_method: paymentMethod,
                payment_status: paymentMethod === 'bank_transfer' ? 'paid_verify' : 'pending',
                total_price: netTotal,
                user_id: (typeof userAvatar !== 'undefined' && userAvatar.userId) ? userAvatar.userId : null,
                customer_name: name,
                items: cart,
                created_at: new Date().toISOString()
            };
            const { data: fallbackOrder, error: fallbackError } = await supabaseClient
                .from('orders')
                .insert(fallbackPayload)
                .select('id')
                .single();

            if (fallbackError) {
                // If both fail, THROW ERROR. Do NOT proceed to clear cart.
                throw new Error('ไม่สามารถบันทึกออเดอร์ได้: ' + fallbackError.message);
            }
            if (fallbackOrder) supabaseOrderId = fallbackOrder.id;
        } else {
            if (insertedOrder) supabaseOrderId = insertedOrder.id;
        }

        // --- SUCCESS PATH ---

        // 1. Update Points Locally (Optimistic)
        if (userAvatar.userId) {
            // Deduct redeemed points
            if (redeemedPoints > 0) {
                userStats.points = Math.max(0, (userStats.points || 0) - redeemedPoints);
                userStats.history = userStats.history || [];
                userStats.history.unshift({
                    type: 'redeem',
                    amount: redeemedPoints,
                    date: new Date().toISOString(),
                    orderId: localOrderId,
                    note: 'แลกส่วนลด'
                });
            }
            // Add earned points
            if (pointsToEarn > 0) {
                userStats.points = (userStats.points || 0) + pointsToEarn;
                userStats.history = userStats.history || [];
                userStats.history.unshift({
                    type: 'earn',
                    amount: pointsToEarn,
                    date: new Date().toISOString(),
                    orderId: localOrderId,
                    note: 'สั่งอาหาร'
                });
            }
            localStorage.setItem(KEYS.STATS, JSON.stringify(userStats));
            if (typeof updatePointsDisplay === 'function') updatePointsDisplay();

            // Sync Points to Supabase (Fire & Forget)
            try {
                // Determine net change for simple update
                const netPointsDelta = pointsToEarn - redeemedPoints;

                // Try RPC first (best practice)
                supabaseClient.rpc('update_user_points', {
                    p_user_id: userAvatar.userId,
                    p_points_delta: netPointsDelta,
                    p_order_id: supabaseOrderId
                }).then(({ error }) => {
                    if (error) {
                        // Fallback to direct update if RPC fails
                        console.warn('RPC update failed, using direct update:', error.message);
                        return supabaseClient
                            .from('profiles')
                            .select('points')
                            .eq('id', userAvatar.userId)
                            .single()
                            .then(({ data: currentProfile }) => {
                                const newPoints = Math.max(0, (currentProfile?.points || 0) + netPointsDelta);
                                return supabaseClient
                                    .from('profiles')
                                    .update({ points: newPoints, updated_at: new Date().toISOString() })
                                    .eq('id', userAvatar.userId);
                            });
                    }
                }).catch(err => console.error("Points sync error:", err));
            } catch (pointsErr) {
                console.warn('Points update initiation warning:', pointsErr);
            }
        }

        // 2. Request Notification Permission (if not granted)
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        // 3. Save History & Gamification
        const lottoNumber = saveTicketToHistory(localOrderId, netTotal, supabaseOrderId);

        if (typeof gamificationData !== 'undefined') {
            gamificationData.totalOrders = (gamificationData.totalOrders || 0) + 1;
            gamificationData.totalSpent = (gamificationData.totalSpent || 0) + netTotal;
            if (typeof updateStreak === 'function') updateStreak();
            if (typeof checkAndAwardAchievements === 'function') checkAndAwardAchievements({ total: netTotal });
            if (typeof saveGamificationData === 'function') saveGamificationData();
        }

        // 4. Start Local Tracking
        if (typeof startOrderTracking === 'function') {
            startOrderTracking(localOrderId, cart);
        }

        // 5. Cleanup & UI Updates
        const finalOrderId = localOrderId;
        const finalCart = [...cart];
        const finalName = name;
        const finalNetTotal = netTotal;
        const finalSubtotal = subtotal;
        const finalDiscount = totalDiscount;
        const finalLottoNumber = lottoNumber;
        const finalDrawDate = typeof getThaiLotteryDrawDate === 'function' ? getThaiLotteryDrawDate() : '';
        const finalPointsEarned = pointsToEarn;

        cart = [];
        if (typeof discountValue !== 'undefined') discountValue = 0;
        if (typeof pointsRedeemed !== 'undefined') pointsRedeemed = 0;
        if (typeof isPointsActive !== 'undefined') isPointsActive = false;
        currentOrderId = "";
        currentSupabaseOrderId = null;

        if (typeof saveToLS === 'function') saveToLS();
        if (typeof updateMiniCart === 'function') updateMiniCart();
        if (typeof updateBottomNavBadge === 'function') updateBottomNavBadge();
        closeCheckout();
        hideGlobalLoader();

        // 6. Build & Send LINE Message
        const lineOAId = "@772ysswn";
        let msg = buildLineOrderMessage({
            orderId: finalOrderId,
            supabaseOrderId: supabaseOrderId,
            name: finalName,
            paymentMethod: paymentMethod,
            items: finalCart,
            subtotal: finalSubtotal,
            discount: finalDiscount,
            netTotal: finalNetTotal,
            lottoNumber: finalLottoNumber,
            drawDate: finalDrawDate,
            pointsEarned: finalPointsEarned,
            redeemedPoints: redeemedPoints
        });

        const encodedMsg = encodeURIComponent(msg);

        showToast('สั่งอาหารเรียบร้อย! 🚀', 'success');

        setTimeout(() => {
            window.location.href = `https://line.me/R/oaMessage/${lineOAId}/?${encodedMsg}`;
            isSubmitting = false;
        }, 800);

        // 7. Background Sync Stats
        if (userAvatar.userId) {
            setTimeout(async () => {
                if (typeof syncUserStatsFromServer === 'function') {
                    await syncUserStatsFromServer(userAvatar.userId);
                }
            }, 3000);
        }

    } catch (error) {
        hideGlobalLoader();
        console.error("Order Submission Failed:", error);
        // Do NOT clear cart here, so user can try again
        showToast("เกิดข้อผิดพลาด: " + error.message, 'error');
        isSubmitting = false;
    }
}

/**
 * Build a comprehensive LINE message for the order
 */
function buildLineOrderMessage({ orderId, supabaseOrderId, name, paymentMethod, items, subtotal, discount, netTotal, lottoNumber, drawDate, pointsEarned, redeemedPoints }) {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const dateStr = typeof getStandardDate === 'function' ? getStandardDate(now) : now.toLocaleDateString('th-TH');

    let paymentLabel = '';
    if (paymentMethod === 'bank_transfer') paymentLabel = 'โอนเงิน/สแกนจ่าย ✅';
    else if (paymentMethod === 'cod') paymentLabel = 'จ่ายทีหลัง/เงินสด 🕒';
    else paymentLabel = paymentMethod;

    let msg = `🔥 ออเดอร์ใหม่! [${orderId}]\n`;
    msg += `👤 คุณ ${name}\n`;
    msg += `🕐 ${dateStr} เวลา ${timeStr} น.\n`;
    msg += `💳 ชำระ: ${paymentLabel}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;

    items.forEach((item, index) => {
        let detail = `${index + 1}. ${item.name}`;
        if (item.meat) detail += ` [${item.meat}]`;
        if (item.addons && item.addons.length > 0) detail += ` +${item.addons.join(', ')}`;
        if (item.note) detail += ` (${item.note})`;
        msg += `${detail} — ${item.price}฿\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━\n`;

    if (discount > 0) {
        msg += `💰 ราคารวม: ${subtotal}฿\n`;
        msg += `🎁 ส่วนลด: -${discount}฿\n`;
        msg += `✅ ยอดสุทธิ: ${netTotal}฿\n`;
    } else {
        msg += `💰 ยอดรวม: ${netTotal}฿\n`;
    }

    if (redeemedPoints > 0) {
        msg += `🪙 ใช้พอยต์: ${redeemedPoints} แต้ม\n`;
    }

    if (pointsEarned > 0) {
        msg += `⭐ ได้รับพอยต์: +${pointsEarned} แต้ม\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🎟️ เลขลุ้นโชค: ${lottoNumber}\n`;
    if (drawDate) {
        const drawDateFormatted = typeof formatThaiDate === 'function' ? formatThaiDate(drawDate) : drawDate;
        msg += `📅 งวดวันที่: ${drawDateFormatted}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `ขอบคุณที่อุดหนุนร้านกะเพรา52 ครับ! 🙏`;

    return msg;
}

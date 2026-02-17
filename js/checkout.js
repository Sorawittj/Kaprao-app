// ===== CHECKOUT & ORDER SUBMISSION =====

const PROMPTPAY_NUMBER = '0928496930'; // Update with actual shop PromptPay number

let currentOrderId = "";

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

function saveTicketToHistory(orderId, totalPrice) {
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

    if (typeof lottoHistory !== 'undefined') {
        lottoHistory.unshift(ticket);
        if (lottoHistory.length > 20) lottoHistory = lottoHistory.slice(0, 20);
        localStorage.setItem(KEYS.HISTORY, JSON.stringify(lottoHistory));
        if (typeof updateTicketBadge === 'function') updateTicketBadge();
    }
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
    if (typeof currentOpenModal !== 'undefined') currentOpenModal = null; // Careful with global assignment
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

// function selectPaymentMethod() and showQRCode() updated for Kasikorn Bank

const KBANK_INFO = {
    bankName: 'ธนาคารกสิกรไทย (KBANK)',
    accNumber: '203-3-57019-0',
    accName: 'Kaprao52', // Placeholder name
    qrImage: 'images/payment_qr.jpg' // User must upload this
};

function selectPaymentMethod() {
    const name = document.getElementById('user-name').value.trim();
    if (!name) return showToast('กรุณาใส่ชื่อผู้สั่งก่อนครับ', 'warning');
    if (cart.length === 0) return showToast('ตะกร้าว่างเปล่า', 'warning');

    const modal = document.createElement('div');
    modal.className = "fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in";
    modal.id = "payment-modal";

    const total = cart.reduce((sum, i) => sum + i.price, 0);

    modal.innerHTML = `
        <div class="bg-white rounded-t-[2rem] w-full max-w-md p-6 animate-slide-up relative safe-area-pb">
            <div class="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            
            <h2 class="text-xl font-black text-gray-800 mb-2">เลือกวิธีชำระเงิน</h2>
            <p class="text-sm text-gray-500 mb-6">ยอดชำระ: <span class="text-indigo-600 font-bold text-lg">฿${total}</span></p>

            <div class="space-y-3">
                <!-- Option 1: Bank QR -->
                <button onclick="showQRCode()" class="w-full p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 flex items-center justify-between hover:shadow-md transition-all group">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-white text-green-600 flex items-center justify-center text-xl shadow-sm">
                            <i class="fas fa-qrcode"></i>
                        </div>
                        <div class="text-left">
                            <h3 class="font-bold text-gray-800">โอนเงิน / สแกนจ่าย</h3>
                            <p class="text-xs text-gray-500">${KBANK_INFO.bankName}</p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-300 group-hover:text-green-500"></i>
                </button>

                <!-- Option 2: Pay Later -->
                <button onclick="confirmOrder('cod')" class="w-full p-4 rounded-xl bg-white border border-gray-100 flex items-center justify-between hover:border-orange-200 hover:bg-orange-50 transition-all group">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xl">
                            <i class="fas fa-wallet"></i>
                        </div>
                        <div class="text-left">
                            <h3 class="font-bold text-gray-800">จ่ายทีหลัง / เงินสด</h3>
                            <p class="text-xs text-gray-500">กินก่อนจ่ายทีหลัง</p>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-300 group-hover:text-orange-500"></i>
                </button>
            </div>
            
            <button onclick="document.getElementById('payment-modal').remove()" class="mt-6 w-full py-3 text-gray-400 font-bold">ยกเลิก</button>
        </div>
    `;

    document.body.appendChild(modal);
}

function showQRCode() {
    const modalBody = document.querySelector('#payment-modal > div');
    const total = cart.reduce((sum, i) => sum + i.price, 0);

    modalBody.innerHTML = `
        <div class="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4"></div>
        <div class="text-center mb-4">
            <h2 class="text-xl font-bold text-gray-800">สแกนจ่าย / โอนเงิน</h2>
            <p class="text-xs text-gray-400">กรุณาชำระเงินและแจ้งสลิป</p>
        </div>
        
        <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4 flex flex-col items-center">
            <!-- QR Image specific to KBANK -->
            <img src="${KBANK_INFO.qrImage}" 
                 onerror="this.src='https://via.placeholder.com/300x300?text=Please+Upload+QR'; this.classList.add('opacity-50')"
                 class="w-48 h-48 object-contain rounded-lg mb-3 shadow-sm bg-white">
            
            <div class="w-full border-t border-gray-200 my-2"></div>
            
            <div class="text-center w-full">
                <p class="text-xs text-gray-400 mb-1">เลขบัญชีธนาคาร</p>
                <div class="flex items-center justify-center gap-2 mb-1">
                    <img src="https://cdn.iconscout.com/icon/free/png-256/free-kasikorn-bank-3521509-2944927.png" class="w-6 h-6 rounded-full">
                    <span class="font-bold text-green-700 text-lg tracking-wider">${KBANK_INFO.accNumber}</span>
                </div>
                <p class="text-xs text-gray-500">${KBANK_INFO.bankName}</p>
                 <p class="text-[10px] text-gray-400 mt-1">ยอดชำระ: <b class="text-black text-sm">฿${total}</b></p>
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

    const name = document.getElementById('user-name').value.trim();
    isSubmitting = true;
    showGlobalLoader("กำลังส่งออเดอร์...");

    try {
        let subtotal = cart.reduce((sum, i) => sum + i.price, 0);
        let discountFromCode = 0;
        let discountFromPoints = 0;
        let netTotal = subtotal;
        // In real app, calculate actual net total safely

        // Generate ID
        if (!currentOrderId) generateOrderId();

        // 1. Prepare Supabase Payload
        const orderPayload = {
            status: 'placed',
            payment_method: paymentMethod,
            payment_status: paymentMethod === 'promptpay' ? 'paid_verify' : 'pending',
            total_price: netTotal,
            user_id: (typeof userAvatar !== 'undefined' && userAvatar.userId) ? userAvatar.userId : null,
            customer_name: name,
            items: cart, // Supabase JSONB
            created_at: new Date()
        };

        // 2. Insert into Supabase
        if (typeof supabaseClient !== 'undefined') {
            const { error } = await supabaseClient.from('orders').insert(orderPayload);
            if (error) {
                console.error('Supabase Insert Error:', error);
                throw new Error('บันทึกข้อมูลไม่สำเร็จ: ' + error.message);
            }
        }

        // 3. Save History & Gamification
        saveTicketToHistory(currentOrderId, netTotal);

        // 4. Start Tracking (Critical Step)
        if (typeof startOrderTracking === 'function') {
            startOrderTracking(currentOrderId, cart);
        }

        // 5. Cleanup
        const finalOrderId = currentOrderId;
        const finalCart = [...cart];

        cart = [];
        if (typeof discountValue !== 'undefined') discountValue = 0;
        currentOrderId = "";
        if (typeof saveToLS === 'function') saveToLS();
        if (typeof updateMiniCart === 'function') updateMiniCart();
        if (typeof updateBottomNavBadge === 'function') updateBottomNavBadge();
        closeCheckout();
        hideGlobalLoader();

        // 6. Redirect to LINE (After cleanup and tracking)
        // Generate LINE Message
        let msg = `🔥 ออเดอร์ใหม่! [${finalOrderId}]\n👤 คุณ ${name}\n`;
        msg += `💳 ชำระ: ${paymentMethod === 'promptpay' ? 'โอนจ่าย (QR) ✅' : 'จ่ายทีหลัง/เงินสด 🕒'}\n`;
        msg += `------------------------\n`;
        finalCart.forEach((i, index) => {
            msg += `${index + 1}. ${i.name} (${i.price}.-)\n`;
        });
        msg += `------------------------\n💰 ยอดรวม: ${netTotal} บาท\n`;

        const encodedMsg = encodeURIComponent(msg);
        const lineOAId = "@772ysswn";

        // Use a short timeout to ensure UI updates before navigation
        setTimeout(() => {
            window.location.href = `https://line.me/R/oaMessage/${lineOAId}/?${encodedMsg}`;
            isSubmitting = false;
        }, 500);

    } catch (error) {
        hideGlobalLoader();
        console.error("Order Error:", error);
        showToast("เกิดข้อผิดพลาด: " + error.message, 'error');
        isSubmitting = false;
    }
}

// ===== ORDER TRACKING SYSTEM (Supabase Enhanced) =====

const ORDER_STATUS = {
    PLACED: {
        code: 'placed',
        label: 'สั่งเรียบร้อย',
        sublabel: 'ออเดอร์ถูกบันทึกแล้ว',
        icon: 'fa-check-circle',
        emoji: '✅',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200'
    },
    COOKING: {
        code: 'cooking',
        label: 'กำลังเตรียมอาหาร',
        sublabel: 'แม่ครัวกำลังปรุงสุดฝีมือ',
        icon: 'fa-fire',
        emoji: '🔥',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
    },
    ON_THE_WAY: {
        code: 'on_the_way',
        label: 'กำลังนำส่ง',
        sublabel: 'อาหารอยู่ระหว่างทาง',
        icon: 'fa-motorcycle',
        emoji: '🛵',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
    },
    DELIVERED: {
        code: 'delivered',
        label: 'ส่งถึงแล้ว!',
        sublabel: 'รับอาหารได้เลยครับ',
        icon: 'fa-box-open',
        emoji: '📦',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
    },
    COMPLETED: {
        code: 'completed',
        label: 'เสร็จสิ้น',
        sublabel: 'ขอบคุณที่อุดหนุนครับ',
        icon: 'fa-star',
        emoji: '⭐',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
    },
    CANCELLED: {
        code: 'cancelled',
        label: 'ยกเลิก',
        sublabel: 'ออเดอร์ถูกยกเลิก',
        icon: 'fa-times-circle',
        emoji: '❌',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
    }
};

let activeOrders = new Map();
let activeOrderTrackingId = null;
let trackingInterval = null;
let trackingSubscription = null;

// --- Core Functions ---

function startOrderTracking(orderId, items) {
    if (!orderId) return;

    const now = new Date();
    // Default delivery time logic (can be updated by Supabase later)
    const deliveryDate = getNextDeliveryDate(now);

    const order = {
        id: orderId,
        items: items,
        status: ORDER_STATUS.PLACED,
        orderDate: now.getTime(),
        deliveryDate: deliveryDate.getTime(),
        startTime: now.getTime(),
        updates: [
            { status: ORDER_STATUS.PLACED, time: now.getTime(), note: 'ส่งออเดอร์แล้ว' }
        ]
    };

    activeOrders.set(orderId, order);
    saveActiveOrders();

    // Open UI
    openOrderTrackingSheet(orderId);

    // Start Realtime
    setupTrackingRealtime(orderId);

    showToast('ส่งออเดอร์เรียบร้อย! 🚀', 'success');
}

function setupTrackingRealtime(orderId) {
    if (typeof supabaseClient === 'undefined') return;

    if (trackingSubscription) supabaseClient.removeChannel(trackingSubscription);

    // Initial check
    checkRemoteStatus(orderId);

    trackingSubscription = supabaseClient
        .channel(`tracking:${orderId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
            console.log('Realtime Status Update:', payload.new.status);
            handleStatusUpdate(orderId, payload.new.status);
        })
        .subscribe();
}

async function checkRemoteStatus(orderId) {
    const { data } = await supabaseClient.from('orders').select('status').eq('id', orderId).single();
    if (data) handleStatusUpdate(orderId, data.status);
}

function handleStatusUpdate(orderId, newStatusCode) {
    const order = activeOrders.get(orderId);
    if (!order) return;

    // Map DB status to ORDER_STATUS
    // DB: placed, cooking, completed, cancelled
    // ORDER_STATUS keys: PLACED, COOKING, COMPLETED, CANCELLED
    let statusKey = newStatusCode.toUpperCase();

    // Fallback mapping if needed
    if (newStatusCode === 'pending_payment') statusKey = 'PLACED';

    const newStatusObj = ORDER_STATUS[statusKey];
    if (newStatusObj && order.status.code !== newStatusObj.code) {
        order.status = newStatusObj;
        order.updates.push({
            status: newStatusObj,
            time: Date.now(),
            note: getStatusNote(newStatusCode)
        });
        saveActiveOrders();

        // Refresh UI
        if (activeOrderTrackingId === orderId) {
            renderOrderTrackingContent();
        }

        // Toast
        showToast(`สถานะออเดอร์: ${newStatusObj.label}`, 'info');
        if (newStatusCode === 'cooking') new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => { });
        triggerHaptic();
    }
}


function getNextDeliveryDate(fromDate) {
    const delivery = new Date(fromDate);
    delivery.setDate(delivery.getDate() + 1);

    // Skip weekends (Saturday=6, Sunday=0)
    while (delivery.getDay() === 0 || delivery.getDay() === 6) {
        delivery.setDate(delivery.getDate() + 1);
    }

    // Set delivery time to ~11:30 AM (typical lunch delivery)
    delivery.setHours(11, 30, 0, 0);
    return delivery;
}

function stopTracking() {
    if (trackingSubscription) supabaseClient.removeChannel(trackingSubscription);
    localStorage.removeItem('active_tracking_order');
}
function advanceOrderStatus(orderId) {
    const order = activeOrders.get(orderId);
    if (!order) return;

    const statuses = Object.values(ORDER_STATUS);
    const currentIdx = statuses.findIndex(s => s.code === order.status.code);

    if (currentIdx < statuses.length - 1) {
        const nextStatus = statuses[currentIdx + 1];
        order.status = nextStatus;
        order.updates.push({
            status: nextStatus,
            time: Date.now(),
            note: getStatusNote(nextStatus.code)
        });

        saveActiveOrders();

        // Update UI if open
        const sheet = document.getElementById('order-tracking-sheet');
        if (sheet && !sheet.classList.contains('translate-y-full')) {
            renderOrderTrackingContent();
        }

        // Notification for key statuses
        if (nextStatus.code === 'on_the_way' || nextStatus.code === 'delivered') {
            if (Notification.permission === 'granted') {
                const notifMessages = {
                    'on_the_way': { title: '🛵 อาหารกำลังมา!', body: 'เจ้าของร้านกำลังนำอาหารมาส่ง' },
                    'delivered': { title: '📦 อาหารถึงแล้ว!', body: 'รับอาหารได้เลยครับ' }
                };
                const msg = notifMessages[nextStatus.code];
                new Notification(msg.title, {
                    body: msg.body,
                    icon: 'https://cdn-icons-png.flaticon.com/512/3448/3448609.png'
                });
            }
            try { triggerHaptic('heavy'); } catch (e) { }
        }

        showToast(`${nextStatus.emoji} ${nextStatus.label}`, 'success');
    }
}

function getStatusNote(statusCode) {
    const notes = {
        'placed': 'ออเดอร์ถูกบันทึกเรียบร้อย',
        'cooking': 'เจ้าของร้านเริ่มเตรียมอาหารแล้ว',
        'on_the_way': 'อาหารอยู่ระหว่างทางไปที่ทำงาน',
        'delivered': 'ส่งอาหารถึงแล้ว!',
        'completed': 'ขอบคุณที่อุดหนุนครับ ⭐'
    };
    return notes[statusCode] || '';
}

function cancelOrder(orderId) {
    if (!confirm('ต้องการยกเลิกออเดอร์นี้หรือไม่?')) return;
    activeOrders.delete(orderId);
    saveActiveOrders();
    activeOrderTrackingId = null;
    renderOrderTrackingContent();
    showToast('ยกเลิกออเดอร์แล้ว', 'info');
}

// --- Persistence ---

function saveActiveOrders() {
    const ordersArray = Array.from(activeOrders.entries());
    localStorage.setItem('kaprao_active_orders', JSON.stringify(ordersArray));
    updateActiveOrdersButton();
}

function loadActiveOrders() {
    try {
        const saved = localStorage.getItem('kaprao_active_orders');
        if (saved) {
            const ordersArray = JSON.parse(saved);
            activeOrders = new Map(ordersArray);
            const now = Date.now();

            // Migration map: old status codes → new status
            const migrationMap = {
                'pending': ORDER_STATUS.PLACED,
                'confirmed': ORDER_STATUS.PLACED,
                'preparing': ORDER_STATUS.COOKING,
                'ready': ORDER_STATUS.ON_THE_WAY,
                'completed': ORDER_STATUS.COMPLETED
            };

            for (const [id, order] of activeOrders) {
                // Migrate old status codes
                if (order.status && migrationMap[order.status.code] && !ORDER_STATUS[order.status.code.toUpperCase()]) {
                    order.status = migrationMap[order.status.code];
                }

                // Ensure new fields exist
                if (!order.orderDate) order.orderDate = order.startTime || now;
                if (!order.deliveryDate) {
                    const delivery = new Date(order.orderDate);
                    delivery.setDate(delivery.getDate() + 1);
                    delivery.setHours(11, 30, 0, 0);
                    order.deliveryDate = delivery.getTime();
                }
                if (!order.updates) order.updates = [];

                // Auto-cleanup: remove completed orders older than 3 days
                if (order.status.code === 'completed' && (now - order.orderDate) > 259200000) {
                    activeOrders.delete(id);
                }
            }
        }
    } catch (e) {
        activeOrders = new Map();
    }
    updateActiveOrdersButton();
}

// --- Sheet UI Logic ---

function openOrderTrackingSheet(orderId = null) {
    if (orderId) activeOrderTrackingId = orderId;
    else activeOrderTrackingId = null;

    const overlay = document.getElementById('order-tracking-overlay');
    const sheet = document.getElementById('order-tracking-sheet');

    if (overlay && sheet) {
        renderOrderTrackingContent();
        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.remove('opacity-0');
            sheet.classList.remove('translate-y-full');
        }, 10);

        // Start live timer for delivery countdown
        if (trackingInterval) clearInterval(trackingInterval);
        trackingInterval = setInterval(updateTrackingTimers, 1000);
    }
}

function closeOrderTrackingSheet() {
    const overlay = document.getElementById('order-tracking-overlay');
    const sheet = document.getElementById('order-tracking-sheet');

    if (overlay && sheet) {
        overlay.classList.add('opacity-0');
        sheet.classList.add('translate-y-full');
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300);
    }
    if (trackingInterval) clearInterval(trackingInterval);
    activeOrderTrackingId = null;
    if (typeof setActiveNav === 'function') setActiveNav('home');
}

function renderOrderTrackingContent() {
    const container = document.getElementById('order-tracking-content');
    if (!container) return;

    if (activeOrderTrackingId && activeOrders.has(activeOrderTrackingId)) {
        renderOrderDetailView(container, activeOrders.get(activeOrderTrackingId));
    } else {
        renderOrderListView(container);
    }
}

// --- Detail View ---

function renderOrderDetailView(container, order) {
    const steps = Object.values(ORDER_STATUS);
    const currentStepIndex = steps.findIndex(s => s.code === order.status.code);
    const progress = ((currentStepIndex) / (steps.length - 1)) * 100;

    // Delivery date info
    const deliveryDate = new Date(order.deliveryDate || order.startTime + 86400000);
    const orderDate = new Date(order.orderDate || order.startTime);
    const now = new Date();

    // Calculate time until delivery
    const msUntilDelivery = deliveryDate.getTime() - now.getTime();
    const hoursUntil = Math.max(0, Math.floor(msUntilDelivery / 3600000));
    const minutesUntil = Math.max(0, Math.floor((msUntilDelivery % 3600000) / 60000));

    const isDelivered = order.status.code === 'delivered' || order.status.code === 'completed';
    const isCancellable = order.status.code === 'placed';

    // Determine delivery label
    let deliveryLabel = '';
    const isToday = now.toDateString() === deliveryDate.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = tomorrow.toDateString() === deliveryDate.toDateString();

    if (isDelivered) {
        deliveryLabel = 'ส่งถึงแล้ว!';
    } else if (isToday) {
        deliveryLabel = 'วันนี้';
    } else if (isTomorrow) {
        deliveryLabel = 'พรุ่งนี้';
    } else {
        deliveryLabel = formatThaiDateShort(deliveryDate);
    }

    let html = `
        <div class="mb-6">
            <!-- Back Button -->
            <button onclick="activeOrderTrackingId=null; renderOrderTrackingContent()" 
                class="text-[#B58D67] font-bold text-sm mb-4 flex items-center gap-1 hover:text-[#8D6E63] transition-colors">
                <i class="fas fa-chevron-left"></i> กลับไปหน้ารวม
            </button>

            <!-- Status Hero Card -->
            <div class="bg-white rounded-3xl border ${order.status.borderColor} p-6 mb-6 relative overflow-hidden shadow-sm">
                <div class="absolute top-0 right-0 w-40 h-40 ${order.status.bgColor} rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 blur-2xl"></div>
                <div class="relative z-10 text-center">
                    <div class="w-20 h-20 ${order.status.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-3 text-4xl shadow-sm ${order.status.borderColor} border">
                        ${order.status.emoji}
                    </div>
                    <h2 class="text-xl font-black text-gray-800 mb-1">${order.status.label}</h2>
                    <p class="text-sm text-gray-500">${order.status.sublabel}</p>
                    <p class="text-xs text-gray-400 mt-2">Order #${order.id}</p>
                </div>
            </div>

            <!-- Delivery Info Card -->
            <div class="bg-gradient-to-br from-[#4A403A] to-[#3F3733] rounded-2xl p-5 text-white mb-6 relative overflow-hidden shadow-lg">
                <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                <div class="relative z-10">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <p class="text-[#B58D67] text-xs font-bold uppercase tracking-wider mb-1">📅 กำหนดส่ง</p>
                            <p class="text-2xl font-black">${deliveryLabel}</p>
                        </div>
                        ${!isDelivered ? `
                        <div class="text-right">
                            <p class="text-gray-400 text-xs mb-1">เหลืออีก</p>
                            <div class="flex items-baseline gap-1">
                                <span class="text-3xl font-black font-mono live-timer" 
                                    data-delivery="${order.deliveryDate || order.startTime + 86400000}">${hoursUntil}</span>
                                <span class="text-sm text-gray-400">ชม.</span>
                                <span class="text-3xl font-black font-mono live-timer-min" 
                                    data-delivery="${order.deliveryDate || order.startTime + 86400000}">${minutesUntil}</span>
                                <span class="text-sm text-gray-400">นาที</span>
                            </div>
                        </div>
                        ` : `
                        <div class="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center text-2xl">
                            ✅
                        </div>
                        `}
                    </div>
                    <div class="flex gap-4 text-xs text-gray-400 border-t border-white/10 pt-3">
                        <span><i class="far fa-calendar-alt mr-1"></i> สั่งเมื่อ: ${formatDateTimeShort(orderDate)}</span>
                        <span><i class="far fa-clock mr-1"></i> ส่ง: ${formatDateTimeShort(deliveryDate)}</span>
                    </div>
                </div>
            </div>

            <!-- Progress Timeline (Vertical) -->
            <div class="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
                <h3 class="font-bold text-gray-800 text-sm mb-5 flex items-center gap-2">
                    <i class="fas fa-route text-[#B58D67]"></i> สถานะการจัดส่ง
                </h3>
                <div class="relative pl-8">
                    ${steps.map((s, idx) => {
        const isCompleted = idx <= currentStepIndex;
        const isCurrent = idx === currentStepIndex;
        const update = order.updates.find(u => u.status.code === s.code);
        const timeStr = update ? formatTimeOnly(new Date(update.time)) : '';
        const dateStr = update ? formatDateShort(new Date(update.time)) : '';
        const isLast = idx === steps.length - 1;

        return `
                            <div class="relative pb-${isLast ? '0' : '6'} group">
                                <!-- Connecting Line -->
                                ${!isLast ? `
                                <div class="absolute left-[-20px] top-5 w-0.5 h-full ${isCompleted && idx < currentStepIndex ? 'bg-emerald-400' : 'bg-gray-200'}"></div>
                                ` : ''}
                                <!-- Dot -->
                                <div class="absolute left-[-24px] top-1 w-3 h-3 rounded-full border-2 z-10
                                    ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}
                                    ${isCurrent ? 'ring-4 ring-emerald-100 scale-125' : ''} transition-all duration-300">
                                </div>
                                <!-- Content -->
                                <div class="flex items-start justify-between ${isCurrent ? '' : 'opacity-60'}">
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-base">${s.emoji}</span>
                                            <p class="font-bold text-sm ${isCurrent ? 'text-gray-800' : 'text-gray-600'}">${s.label}</p>
                                        </div>
                                        ${update ? `<p class="text-xs text-gray-400 mt-0.5 ml-7">${update.note || s.sublabel}</p>` : ''}
                                    </div>
                                    ${update ? `
                                    <div class="text-right shrink-0 ml-3">
                                        <p class="text-xs font-bold text-gray-500">${timeStr}</p>
                                        <p class="text-[10px] text-gray-400">${dateStr}</p>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
    }).join('')}
                </div>
            </div>

            <!-- Order Items -->
            <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-6">
                <div class="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
                    <h3 class="font-bold text-gray-800 flex items-center gap-2 text-sm">
                        <i class="fas fa-utensils text-[#B58D67]"></i> รายการอาหาร
                    </h3>
                    <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">${order.items.length} รายการ</span>
                </div>
                <div class="space-y-3">
                    ${order.items.map(item => `
                        <div class="flex justify-between items-start gap-3">
                            <div class="w-12 h-12 rounded-xl bg-gray-50 bg-cover bg-center shrink-0 border border-gray-100" 
                                style="background-image: url('${item.image || 'images/logo.png'}')"></div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-gray-800 truncate">${item.name}</p>
                                <p class="text-xs text-gray-500 truncate">${item.meat || ''} ${item.addons?.join(', ') || ''} ${item.note || ''}</p>
                            </div>
                            <span class="text-sm font-bold text-[#B58D67] shrink-0">${item.price}฿</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Admin Controls (visible only in admin mode) -->
            ${isAdminMode && !isDelivered ? `
            <div class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 mb-6 shadow-sm">
                <div class="flex items-center gap-2 mb-3">
                    <i class="fas fa-tools text-amber-600"></i>
                    <h3 class="font-bold text-amber-800 text-sm">🔧 เจ้าของร้าน</h3>
                </div>
                <div class="space-y-2">
                    <button onclick="advanceOrderStatus('${order.id}')" 
                        class="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98] transition-all">
                        <i class="fas fa-arrow-right"></i>
                        อัพเดทสถานะถัดไป
                        <span class="text-xs opacity-80">(→ ${steps[Math.min(currentStepIndex + 1, steps.length - 1)]?.label || ''})</span>
                    </button>
                    ${isCancellable ? `
                    <button onclick="cancelOrder('${order.id}')" 
                        class="w-full bg-white text-red-500 border border-red-200 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 transition-all text-sm">
                        <i class="fas fa-times-circle"></i> ยกเลิกออเดอร์
                    </button>
                    ` : ''}
                </div>
            </div>
            ` : ''}

            <!-- Close Button -->
            <button onclick="closeOrderTrackingSheet()" 
                class="w-full py-3 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-all">
                ปิดหน้าต่าง
            </button>
        </div>
    `;
    container.innerHTML = html;
}

// --- List View ---

function renderOrderListView(container) {
    const list = Array.from(activeOrders.values()).sort((a, b) => {
        const timeA = new Date(a.orderDate || a.startTime || 0).getTime();
        const timeB = new Date(b.orderDate || b.startTime || 0).getTime();
        return timeB - timeA; // Descending: Newest First
    });

    if (list.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-center">
                <div class="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center mb-4 border border-gray-100">
                    <span class="text-5xl">📋</span>
                </div>
                <h3 class="text-lg font-bold text-gray-800 mb-2">ยังไม่มีออเดอร์</h3>
                <p class="text-sm text-gray-400 max-w-xs mx-auto mb-6">สั่งอาหารอร่อยๆ กันเลยดีกว่า!</p>
                <button onclick="closeOrderTrackingSheet()" 
                    class="px-8 py-3 bg-[#4A403A] text-white rounded-full font-bold shadow-lg hover:shadow-xl transition-all">
                    ไปสั่งอาหาร 🌶️
                </button>
            </div>
        `;
        return;
    }

    let html = `
        <!-- Admin Mode Toggle removed from here -->
        <div class="flex items-center justify-between mb-4">
            <div>
                <p class="text-sm font-bold text-gray-700">ออเดอร์ทั้งหมด</p>
                <p class="text-xs text-gray-400">${list.filter(o => o.status.code !== 'completed').length} รายการที่กำลังดำเนินการ</p>
            </div>
            ${isAdminMode ? `
            <div class="flex gap-2 mb-2">
                <span class="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold border border-amber-200">
                    <i class="fas fa-tools mr-1"></i> โหมดร้าน
                </span>
                <button onclick="fetchOrdersFromSheet()" 
                    class="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold border border-indigo-200 hover:bg-indigo-200 transition-colors flex items-center gap-1">
                    <i class="fas fa-sync-alt"></i> ดึงออเดอร์
                </button>
            </div>
            ` : ''}
        </div>
        <div class="space-y-3">
    `;

    list.forEach(order => {
        const isCompleted = order.status.code === 'completed';
        const deliveryDate = new Date(order.deliveryDate || (order.startTime || order.orderDate) + 86400000);
        const orderDate = new Date(order.orderDate || order.startTime);
        const now = new Date();

        // Determine delivery display
        const isToday = now.toDateString() === deliveryDate.toDateString();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = tomorrow.toDateString() === deliveryDate.toDateString();

        let deliveryDisplay = '';
        if (order.status.code === 'delivered' || isCompleted) {
            deliveryDisplay = 'ส่งแล้ว ✅';
        } else if (isToday) {
            deliveryDisplay = 'ส่งวันนี้ 🔥';
        } else if (isTomorrow) {
            deliveryDisplay = 'ส่งพรุ่งนี้';
        } else {
            deliveryDisplay = `ส่ง ${formatDateShort(deliveryDate)}`;
        }

        const totalPrice = order.items ? order.items.reduce((sum, i) => sum + (i.price || 0), 0) : 0;

        html += `
            <div onclick="activeOrderTrackingId='${order.id}'; renderOrderTrackingContent()" 
                class="bg-white rounded-2xl p-4 border ${order.status.borderColor || 'border-gray-100'} shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group ${isCompleted ? 'opacity-60' : ''}">
                <!-- Status Accent -->
                <div class="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl ${order.status.bgColor}"></div>
                
                <div class="flex items-start gap-3 ml-2">
                    <!-- Status Icon -->
                    <div class="w-12 h-12 ${order.status.bgColor} rounded-xl flex items-center justify-center text-xl shrink-0 border ${order.status.borderColor}">
                        ${order.status.emoji}
                    </div>
                    
                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-1">
                            <h4 class="font-bold text-gray-800 text-sm">${order.id}</h4>
                            <span class="text-xs text-gray-400">${formatDateShort(orderDate)}</span>
                        </div>
                        <p class="text-xs font-medium ${order.status.color} mb-1">${order.status.label}</p>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-500">${order.items.length} รายการ · ${totalPrice}฿</span>
                            <span class="text-xs font-bold ${isToday && !isCompleted ? 'text-orange-600' : 'text-gray-500'}">${deliveryDisplay}</span>
                        </div>
                    </div>
                    
                    <!-- Arrow -->
                    <div class="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#F6F1EB] group-hover:text-[#B58D67] transition-colors shrink-0 self-center">
                        <i class="fas fa-chevron-right text-xs"></i>
                    </div>
                </div>

                ${isAdminMode && !isCompleted && order.status.code !== 'delivered' ? `
                <!-- Quick Admin Action -->
                <div class="mt-3 ml-2">
                    <button onclick="event.stopPropagation(); advanceOrderStatus('${order.id}')" 
                        class="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-emerald-100 active:scale-[0.98] transition-all">
                        <i class="fas fa-arrow-right"></i> อัพเดทเป็น: ${getNextStatusLabel(order.status.code)}
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

// --- Admin: Fetch Orders Function ---

async function fetchOrdersFromSheet() {
    if (!isAdminMode) return;

    showToast('กำลังดึงข้อมูลออเดอร์...', 'info');
    const updateBtn = document.querySelector('button[onclick="fetchOrdersFromSheet()"]');
    if (updateBtn) {
        const originalContent = updateBtn.innerHTML;
        updateBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Loading...';
        updateBtn.disabled = true;
    }

    try {
        // Append action=getOrders to the URL
        const scriptUrl = typeof GOOGLE_SCRIPT_URL !== 'undefined' ? GOOGLE_SCRIPT_URL : '';
        if (!scriptUrl) throw new Error("No Script URL");

        const url = new URL(scriptUrl);
        url.searchParams.append('action', 'getOrders');

        const response = await fetch(url.toString());
        const data = await response.json();

        if (Array.isArray(data)) {
            let newOrdersCount = 0;
            let updatedCount = 0;

            data.forEach(row => {
                // Map status string to object
                const statusMap = {
                    'placed': ORDER_STATUS.PLACED,
                    'cooking': ORDER_STATUS.COOKING,
                    'on_the_way': ORDER_STATUS.ON_THE_WAY,
                    'delivered': ORDER_STATUS.DELIVERED,
                    'completed': ORDER_STATUS.COMPLETED
                };

                const status = statusMap[row.status] || ORDER_STATUS.PLACED;

                // Check if we already have this order
                if (!activeOrders.has(row.id)) {
                    // Start: New Order Logic
                    // Intelligent Parsing: "Name (Meat) +Addon1,Addon2 [Note]"
                    const simulatedItems = (row.details || 'รายการอาหาร').split('\n').map(line => {
                        let name = line.trim();
                        let meat = '';
                        let addons = [];
                        let note = '';

                        // 1. Extract Note [x]
                        const noteMatch = name.match(/\[(.*?)\]/);
                        if (noteMatch) {
                            note = noteMatch[1];
                            name = name.replace(noteMatch[0], '').trim();
                        }

                        // 2. Extract Addons +x,y
                        const addonMatch = name.match(/\+(.*)/);
                        if (addonMatch) {
                            // simple split by comma
                            addons = addonMatch[1].split(',').map(s => s.trim());
                            name = name.replace(addonMatch[0], '').trim();
                        }

                        // 3. Extract Meat (x)
                        const meatMatch = name.match(/\((.*?)\)/);
                        if (meatMatch) {
                            meat = meatMatch[1];
                            name = name.replace(meatMatch[0], '').trim();
                        }

                        return {
                            name: name,
                            meat: meat,
                            addons: addons,
                            note: note,
                            price: 0,
                            image: 'images/logo.png'
                        };
                    });

                    const orderTimestamp = row.timestamp || Date.now();
                    const nextDelivery = getNextDeliveryDate(new Date(orderTimestamp)).getTime();

                    const newOrder = {
                        id: row.id,
                        items: simulatedItems,
                        status: status,
                        orderDate: orderTimestamp,
                        deliveryDate: nextDelivery,
                        startTime: orderTimestamp,
                        updates: [{ status: status, time: Date.now(), note: 'Synced from Sheet' }],
                        totalPrice: row.totalPrice || 0,
                        isRemote: true // Flag to identify remote orders
                    };

                    activeOrders.set(row.id, newOrder);
                    newOrdersCount++;
                } else {
                    // Update existing order status if different
                    const existing = activeOrders.get(row.id);
                    if (existing.status.code !== status.code) {
                        existing.status = status;
                        existing.updates.push({ status: status, time: Date.now(), note: 'Update from Sheet' });
                        updatedCount++;
                    }
                }
            });

            saveActiveOrders();
            renderOrderTrackingContent();

            if (newOrdersCount > 0 || updatedCount > 0) {
                showToast(`อัพเดทแล้ว! ใหม่ ${newOrdersCount} / เปลี่ยนสถานะ ${updatedCount}`, 'success');
            } else {
                showToast('ข้อมูลเป็นปัจจุบันแล้ว', 'info');
            }
        } else {
            console.error("Invalid data format", data);
            showToast('รูปแบบข้อมูลไม่ถูกต้อง', 'warning');
        }
    } catch (e) {
        console.error(e);
        showToast('ไม่สามารถดึงข้อมูลได้ (เช็ค URL / สิทธิ์)', 'error');
    } finally {
        if (updateBtn) {
            updateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> ดึงออเดอร์';
            updateBtn.disabled = false;
        }
    }
}

function getNextStatusLabel(currentCode) {
    const statuses = Object.values(ORDER_STATUS);
    const currentIdx = statuses.findIndex(s => s.code === currentCode);
    if (currentIdx < statuses.length - 1) {
        return statuses[currentIdx + 1].label;
    }
    return 'เสร็จสิ้น';
}

// --- Admin Login Modal ---

// --- Sync Orders from Supabase (New) ---

async function loadOrdersFromSupabase(userId) {
    if (typeof supabaseClient === 'undefined' || !userId) return;

    try {
        console.log("Syncing orders for user:", userId);
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        if (data && data.length > 0) {
            let newCount = 0;

            data.forEach(row => {
                // Use Supabase ID as key (converted to string)
                const orderId = row.id.toString();

                // Map status
                let statusKey = (row.status || 'placed').toUpperCase();
                if (statusKey === 'PENDING_PAYMENT') statusKey = 'PLACED';
                else if (statusKey === 'PAID_VERIFY') statusKey = 'PLACED';

                const statusObj = ORDER_STATUS[statusKey] || ORDER_STATUS.PLACED;
                const orderDate = new Date(row.created_at).getTime();

                // Only add if not already present (avoid overwriting local with potentially less data, 
                // though server is source of truth for status)
                // Note: Local might have "KP-xxx", Server has "123". We can't easily dedup without more info.
                // accepting that on the original device we might see duplicates or just keeping both.
                // For the "Sync to other device" case, activeOrders is empty, so this fills it.

                if (!activeOrders.has(orderId)) {
                    const deliveryDate = getNextDeliveryDate(new Date(orderDate)).getTime();

                    const order = {
                        id: orderId,
                        items: row.items || [],
                        status: statusObj,
                        orderDate: orderDate,
                        deliveryDate: deliveryDate,
                        startTime: orderDate,
                        updates: [
                            { status: statusObj, time: orderDate, note: 'Synced from server' }
                        ],
                        totalPrice: row.total_price || 0,
                        isRemote: true
                    };

                    activeOrders.set(orderId, order);
                    newCount++;
                } else {
                    // Update status of existing synced order
                    const existing = activeOrders.get(orderId);
                    if (existing.status.code !== statusObj.code) {
                        existing.status = statusObj;
                        existing.updates.push({
                            status: statusObj,
                            time: Date.now(),
                            note: 'Update from server'
                        });
                        newCount++;
                    }
                }
            });

            if (newCount > 0) {
                saveActiveOrders();
                renderOrderTrackingContent();
                // showToast(`ซิงค์ข้อมูล ${newCount} ออเดอร์`, 'success');
            }
        }
    } catch (e) {
        console.error("Error syncing orders:", e);
    }
}

// Expose to window
window.loadOrdersFromSupabase = loadOrdersFromSupabase;


function openAdminLoginModal() {
    if (isAdminMode) {
        // Already logged in -> Confirm logout
        if (confirm('คุณต้องการออกจากโหมดเจ้าของร้านใช่หรือไม่?')) {
            isAdminMode = false;
            showToast('🔒 ออกจากโหมดเจ้าของร้านแล้ว', 'info');

            // Re-render if tracking sheet is open
            const sheet = document.getElementById('order-tracking-sheet');
            if (sheet && !sheet.classList.contains('translate-y-full')) {
                renderOrderTrackingContent();
            }
        }
        return;
    }

    // Create Modal for Password Input
    const modalId = 'admin-login-modal';
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in';
    modal.innerHTML = `
        <div class="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl relative overflow-hidden" onclick="event.stopPropagation()">
            <div class="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
            
            <button onclick="document.getElementById('${modalId}').remove()" class="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200">
                <i class="fas fa-times text-sm"></i>
            </button>

            <div class="text-center mb-6 relative z-10">
                <div class="w-16 h-16 bg-gray-800 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-lg transform -rotate-3">
                    🔐
                </div>
                <h2 class="text-xl font-black text-gray-800">เข้าสู่ระบบร้านค้า</h2>
                <p class="text-xs text-gray-400 mt-1">สำหรับเจ้าของร้านเท่านั้น</p>
            </div>

            <div class="mb-6 relative z-10">
                <label class="text-xs font-bold text-gray-500 mb-2 block pl-1">รหัสผ่าน</label>
                <div class="relative">
                    <input type="password" id="admin-password-input" placeholder="กรอกรหัสผ่าน..." 
                        class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 pl-10 text-center font-bold text-gray-800 focus:border-gray-800 focus:bg-white outline-none transition-all placeholder-gray-300"
                        onkeydown="if(event.key === 'Enter') verifyAdminPassword()">
                    <i class="fas fa-key absolute left-4 top-3.5 text-gray-300"></i>
                </div>
                <p id="admin-login-error" class="text-xs text-red-500 mt-2 text-center h-4"></p>
            </div>

            <button onclick="verifyAdminPassword()" 
                class="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all text-sm relative z-10">
                เข้าสู่ระบบ
            </button>
        </div>
    `;
    document.body.appendChild(modal);

    // Focus input
    setTimeout(() => {
        const input = document.getElementById('admin-password-input');
        if (input) input.focus();
    }, 100);
}

// --- Admin Login Logic ---

window.verifyAdminPassword = function () { // Make it global for onclick
    const input = document.getElementById('admin-password-input');
    const error = document.getElementById('admin-login-error');
    if (!input) return;

    if (input.value === '909090') { // Hardcoded password as per user request
        // Remove modal
        const modal = document.getElementById('admin-login-modal');
        if (modal) modal.remove();

        // Redirect to new Admin Dashboard
        showToast('กำลังเข้าสู่ระบบหลังบ้าน...', 'success');
        triggerHaptic('success');

        setTimeout(() => {
            window.location.href = 'admin_dashboard.html';
        }, 1000);

    } else {
        // Shake animation
        input.classList.add('animate-shake');
        if (error) error.innerText = 'รหัสผ่านไม่ถูกต้อง';
        setTimeout(() => input.classList.remove('animate-shake'), 500);
        input.value = '';
    }
};

// --- Timer & Formatting ---

function updateTrackingTimers() {
    const now = Date.now();

    // Update hour timers
    document.querySelectorAll('.live-timer').forEach(el => {
        const delivery = parseInt(el.dataset.delivery);
        const msLeft = Math.max(0, delivery - now);
        const hoursLeft = Math.floor(msLeft / 3600000);
        el.textContent = hoursLeft;
    });

    // Update minute timers
    document.querySelectorAll('.live-timer-min').forEach(el => {
        const delivery = parseInt(el.dataset.delivery);
        const msLeft = Math.max(0, delivery - now);
        const minutesLeft = Math.floor((msLeft % 3600000) / 60000);
        el.textContent = minutesLeft.toString().padStart(2, '0');
    });
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimeOnly(date) {
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(date) {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
}

function formatThaiDateShort(date) {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสฯ', 'ศุกร์', 'เสาร์'];
    return `วัน${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function formatDateTimeShort(date) {
    return `${formatDateShort(date)} ${formatTimeOnly(date)}`;
}

function calculateOrderProgress(order) {
    const statuses = Object.values(ORDER_STATUS);
    const currentIndex = statuses.findIndex(s => s.code === order.status.code);
    return ((currentIndex) / (statuses.length - 1)) * 100;
}

// --- Legacy Aliases ---
function showOrderStatusModal(orderId) { openOrderTrackingSheet(orderId); }
function closeOrderStatusModal() { closeOrderTrackingSheet(); }
function showActiveOrdersList() { openOrderTrackingSheet(); }
function closeActiveOrdersList() {
    const modal = document.getElementById('active-orders-modal');
    if (modal) modal.classList.add('hidden');
    closeOrderTrackingSheet();
}

// --- Simulate for backward compat (does nothing now) ---
function simulateOrderProgress() { /* No-op: pre-order flow uses manual updates */ }

// --- Active Orders Button ---
function updateActiveOrdersButton() {
    const container = document.getElementById('active-orders-btn');
    const countEl = document.getElementById('active-orders-count');
    if (!container || !countEl) return;

    const pendingOrders = Array.from(activeOrders.values())
        .filter(o => o.status.code !== 'completed');

    // Also update nav badge
    const navBadge = document.getElementById('nav-tracking-badge');
    if (navBadge) {
        if (pendingOrders.length > 0) {
            navBadge.classList.remove('hidden');
            navBadge.textContent = pendingOrders.length;
        } else {
            navBadge.classList.add('hidden');
        }
    }

    if (pendingOrders.length > 0) {
        container.classList.remove('hidden');

        // Find the most urgent order
        const urgentOrder = pendingOrders.sort((a, b) => {
            const statusOrder = ['on_the_way', 'cooking', 'placed'];
            return statusOrder.indexOf(a.status.code) - statusOrder.indexOf(b.status.code);
        })[0];

        countEl.textContent = `${pendingOrders.length} ออเดอร์ · ${urgentOrder?.status.label || ''}`;
        container.onclick = () => openOrderTrackingSheet();
    } else {
        container.classList.add('hidden');
    }
}

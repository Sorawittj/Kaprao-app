// ===== ORDER TRACKING SYSTEM =====

const ORDER_STATUS = {
    PENDING: { code: 'pending', label: 'รอรับออเดอร์', icon: 'fa-clock', color: 'text-brand-yellow', bgColor: 'bg-stone-50' },
    CONFIRMED: { code: 'confirmed', label: 'รับออเดอร์แล้ว', icon: 'fa-check-circle', color: 'text-brand-purple', bgColor: 'bg-[#EFEBE9]' },
    PREPARING: { code: 'preparing', label: 'กำลังเตรียมอาหาร', icon: 'fa-fire', color: 'text-[#8D6E63]', bgColor: 'bg-[#F2EBE5]' },
    READY: { code: 'ready', label: 'อาหารพร้อมแล้ว', icon: 'fa-utensils', color: 'text-[#558B2F]', bgColor: 'bg-[#F1F8E9]' },
    COMPLETED: { code: 'completed', label: 'เสร็จสิ้น', icon: 'fa-star', color: 'text-gray-500', bgColor: 'bg-gray-50' }

};

let activeOrders = new Map();
let activeOrderTrackingId = null;
let trackingInterval = null;

function startOrderTracking(orderId, items) {
    const order = {
        id: orderId,
        items: items,
        status: ORDER_STATUS.PENDING,
        startTime: Date.now(),
        estimatedTime: items.length * 3 + 5,
        updates: []
    };

    activeOrders.set(orderId, order);
    saveActiveOrders();
    simulateOrderProgress(orderId);

    // Open the new tracking sheet
    openOrderTrackingSheet(orderId);
    showToast('ส่งออเดอร์เรียบร้อย! 🚀', 'success');
}

function simulateOrderProgress(orderId) {
    const order = activeOrders.get(orderId);
    if (!order) return;

    const transitions = [
        { status: ORDER_STATUS.CONFIRMED, delay: 5000 },
        { status: ORDER_STATUS.PREPARING, delay: 15000 },
        { status: ORDER_STATUS.READY, delay: order.estimatedTime * 60000 * 0.8 },
        { status: ORDER_STATUS.COMPLETED, delay: (order.estimatedTime * 60000) + 300000 }
    ];

    transitions.forEach(({ status, delay }) => {
        setTimeout(() => {
            if (activeOrders.has(orderId)) {
                const currentOrder = activeOrders.get(orderId);
                // Only update if not already past this stage
                const currentStatusIdx = Object.values(ORDER_STATUS).findIndex(s => s.code === currentOrder.status.code);
                const newStatusIdx = Object.values(ORDER_STATUS).findIndex(s => s.code === status.code);

                if (newStatusIdx > currentStatusIdx) {
                    currentOrder.status = status;
                    currentOrder.updates.push({ status: status, time: Date.now() });

                    saveActiveOrders();

                    // Update UI if open
                    const sheet = document.getElementById('order-tracking-sheet');
                    if (sheet && !sheet.classList.contains('translate-y-full')) {
                        renderOrderTrackingContent();
                    }

                    // Notification
                    if (status.code === 'ready') {
                        if (Notification.permission === 'granted') {
                            new Notification('อาหารพร้อมแล้ว! 🍽️', {
                                body: `Order ${orderId} พร้อมรับแล้วครับ`,
                                icon: 'https://cdn-icons-png.flaticon.com/512/3448/3448609.png'
                            });
                        }
                        try {
                            // Play sound or other effect
                            triggerHaptic('heavy');
                        } catch (e) { }
                    }
                }
            }
        }, delay);
    });
}

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
            for (const [id, order] of activeOrders) {
                if (order.status.code === 'completed' && (now - order.startTime) > 86400000) {
                    activeOrders.delete(id);
                }
            }
        }
    } catch (e) {
        activeOrders = new Map();
    }
    updateActiveOrdersButton();
}

// --- NEW SHEET UI LOGIC ---

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

        // Start live timer
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
}

function renderOrderTrackingContent() {
    const container = document.getElementById('order-tracking-content');
    if (!container) return;

    // If specific order is selected -> Show Detail View
    if (activeOrderTrackingId && activeOrders.has(activeOrderTrackingId)) {
        renderOrderDetailView(container, activeOrders.get(activeOrderTrackingId));
    }
    // Else -> Show List View
    else {
        renderOrderListView(container);
    }
}

function renderOrderDetailView(container, order) {
    const progress = calculateOrderProgress(order);
    const elapsed = Math.floor((Date.now() - order.startTime) / 60000);
    const estimatedTotal = order.estimatedTime;
    let remaining = Math.max(0, estimatedTotal - elapsed);

    // Status visual
    const steps = Object.values(ORDER_STATUS);
    const currentStepIndex = steps.findIndex(s => s.code === order.status.code);

    let html = `
        <div class="mb-6">
            <button onclick="activeOrderTrackingId=null; renderOrderTrackingContent()" class="text-indigo-600 font-bold text-sm mb-4 flex items-center gap-1">
                <i class="fas fa-chevron-left"></i> กลับไปหน้ารวม
            </button>
            <div class="text-center mb-6">
                <!-- Large Status Icon -->
                <div class="w-24 h-24 ${order.status.bgColor} rounded-full flex items-center justify-center mx-auto mb-4 relative">
                    <i class="fas ${order.status.icon} text-4xl ${order.status.color}"></i>
                    ${order.status.code === 'preparing' ? '<div class="absolute -right-2 -top-2 w-8 h-8 bg-brand-yellow rounded-full flex items-center justify-center animate-bounce text-white">🔥</div>' : ''}

                </div>
                <h2 class="text-2xl font-bold text-gray-800 mb-1">${order.status.label}</h2>
                <p class="text-sm text-gray-400">Order #${order.id.toString().slice(-6)}</p>
            </div>

            <!-- Progress Stepper -->
            <div class="flex justify-between items-center relative mb-8 px-2">
                <!-- Connecting Line -->
                <div class="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 -translate-y-1/2 rounded-full"></div>
                <div class="absolute top-1/2 left-0 h-1 bg-green-500 -z-10 -translate-y-1/2 rounded-full transition-all duration-1000" style="width: ${progress}%"></div>
                
                ${steps.map((s, idx) => {
        const isCompleted = idx <= currentStepIndex;
        const isCurrent = idx === currentStepIndex;

        return `
                        <div class="flex flex-col items-center gap-2 relative group w-12">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 
                                ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-gray-300'} 
                                ${isCurrent ? 'ring-4 ring-green-100 scale-110' : ''} transition-all duration-300">
                                <i class="fas ${isCompleted ? 'fa-check' : 'fa-circle text-[8px]'}"></i>
                            </div>
                            <!-- Tooltip/Label -->
                            <div class="absolute top-10 text-[10px] whitespace-nowrap font-bold ${isCurrent ? 'text-gray-800' : 'text-gray-400'}">
                                ${s.label.split(' ')[0]}
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>

            <!-- Timer Card -->
            <div class="bg-gray-800 rounded-2xl p-6 text-white text-center mb-6 relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">เวลาที่เหลือโดยประมาณ</p>
                <div class="text-5xl font-black font-mono tracking-widest live-timer mb-2" data-start="${order.startTime}" data-est="${order.estimatedTime}">
                    ${formatTime(remaining * 60)}
                </div>
                <div class="flex justify-center gap-4 text-xs text-gray-400">
                    <span><i class="fas fa-play-circle ml-1"></i> เริ่ม: ${new Date(order.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span><i class="fas fa-hourglass-half ml-1"></i> ประมาณ: ${estimatedTotal} นาที</span>
                </div>
            </div>

            <!-- Order Items -->
            <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div class="flex justify-between items-center mb-4 pb-2 border-b border-gray-50">
                    <h3 class="font-bold text-gray-800">รายการอาหาร</h3>
                    <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">${order.items.length} รายการ</span>
                </div>
                <div class="space-y-3">
                    ${order.items.map(item => `
                        <div class="flex justify-between items-start gap-4">
                            <div class="w-12 h-12 rounded-lg bg-gray-50 bg-cover bg-center shrink-0" style="background-image: url('${item.image || 'images/logo.png'}')"></div>
                            <div class="flex-1">
                                <p class="text-sm font-bold text-gray-800 line-clamp-1">${item.name}</p>
                                <p class="text-xs text-gray-500 line-clamp-1">${item.meat || ''} ${item.addons?.join(', ') || ''} ${item.note || ''}</p>
                            </div>
                            <span class="text-sm font-bold text-indigo-600">x1</span>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                    <span class="text-gray-500 text-sm">อัพเดทล่าสุด</span>
                    <span class="text-xs text-gray-400">${new Date(Math.max(...order.updates.map(u => u.time), order.startTime)).toLocaleTimeString()}</span>
                </div>
            </div>
            
            <button onclick="closeOrderTrackingSheet()" class="w-full mt-6 py-3 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-all">
                ปิดหน้าต่าง
            </button>
        </div>
    `;
    container.innerHTML = html;
}

function renderOrderListView(container) {
    const list = Array.from(activeOrders.values()).sort((a, b) => b.startTime - a.startTime);

    if (list.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-center">
                <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <i class="fas fa-clipboard-check text-3xl text-gray-300"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-800 mb-2">ไม่มีออเดอร์ที่สั่งอยู่</h3>
                <p class="text-sm text-gray-400 max-w-xs mx-auto">สั่งอาหารอร่อยๆ กันเลยดีกว่า!</p>
                <button onclick="closeOrderTrackingSheet()" class="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:bg-indigo-700 transition-all">
                    ไปสั่งอาหาร
                </button>
            </div>
        `;
        return;
    }

    let html = `<div class="space-y-4">`;
    list.forEach(order => {
        const isCompleted = order.status.code === 'completed';
        const elapsed = Math.floor((Date.now() - order.startTime) / 60000);

        html += `
            <div onclick="activeOrderTrackingId='${order.id}'; renderOrderTrackingContent()" 
                class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group">
                <div class="absolute top-0 left-0 w-1 h-full ${order.status.bgColor.replace('bg-', 'bg-')}"></div>
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 ${order.status.bgColor} rounded-full flex items-center justify-center text-lg">
                            <i class="fas ${order.status.icon} ${order.status.color}"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-sm">Order #${order.id.toString().slice(-4)}</h4>
                            <p class="text-xs font-medium ${order.status.color}">${order.status.label}</p>
                        </div>
                    </div>
                    <span class="text-xs text-gray-400 font-mono">${new Date(order.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                
                <div class="flex justify-between items-end">
                    <div class="text-xs text-gray-500">
                        ${order.items.length} รายการ ・ ${elapsed} นาทีที่แล้ว
                    </div>
                    <div class="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#EFEBE9] group-hover:text-brand-purple transition-colors">

                        <i class="fas fa-chevron-right text-xs"></i>
                    </div>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function updateTrackingTimers() {
    const timerEls = document.querySelectorAll('.live-timer');
    timerEls.forEach(el => {
        const start = parseInt(el.dataset.start);
        const estMinutes = parseInt(el.dataset.est);
        const elapsedSec = (Date.now() - start) / 1000;
        const totalSec = estMinutes * 60;
        const remainingSec = Math.max(0, totalSec - elapsedSec);

        el.textContent = formatTime(remainingSec);

        if (remainingSec < 60) el.classList.add('text-red-500', 'animate-pulse');
        else el.classList.remove('text-red-500', 'animate-pulse');
    });
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function calculateOrderProgress(order) {
    const statuses = Object.values(ORDER_STATUS);
    const currentIndex = statuses.findIndex(s => s.code === order.status.code);
    return ((currentIndex) / (statuses.length - 1)) * 100;
}

// Legacy alias & helpers
function showOrderStatusModal(orderId) { openOrderTrackingSheet(orderId); }
function closeOrderStatusModal() { closeOrderTrackingSheet(); }
function showActiveOrdersList() { openOrderTrackingSheet(); }
function closeActiveOrdersList() {
    // Legacy support for index.html calls
    const modal = document.getElementById('active-orders-modal');
    if (modal) modal.classList.add('hidden');
    closeOrderTrackingSheet();
}

function updateActiveOrdersButton() {
    const container = document.getElementById('active-orders-btn');
    const countEl = document.getElementById('active-orders-count');
    if (!container || !countEl) return;

    const nonCompletedOrders = Array.from(activeOrders.values())
        .filter(o => o.status.code !== 'completed');

    if (nonCompletedOrders.length > 0) {
        container.classList.remove('hidden');
        countEl.textContent = `${nonCompletedOrders.length} สถานะ`;
        container.onclick = () => openOrderTrackingSheet();
    } else {
        container.classList.add('hidden');
    }
}

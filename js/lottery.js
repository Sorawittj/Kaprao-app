// =============================================
// Kaprao52 App - Thai Lottery System
// =============================================

function getThaiLotteryDrawDate(date) {
    if (!date) date = new Date();
    const d = new Date(date);
    const day = d.getDate();
    // Logic: Draws on 1st and 16th.
    if (day <= 1) return formatDateForDraw(new Date(d.getFullYear(), d.getMonth(), 1));
    if (day <= 16) return formatDateForDraw(new Date(d.getFullYear(), d.getMonth(), 16));
    return formatDateForDraw(new Date(d.getFullYear(), d.getMonth() + 1, 1));
}

function formatDateForDraw(date) {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function isLotteryDrawn(drawDate) {
    const now = new Date();
    const [dd, mm, yyyy] = drawDate.split('/').map(Number);
    const draw = new Date(yyyy, mm - 1, dd, 16, 0, 0); // Draw at 16:00
    return now >= draw;
}

function getLotteryStatus(ticket) {
    if (!ticket.drawDate) return { status: 'waiting', text: 'รอผล', class: 'waiting' };
    const isDrawn = isLotteryDrawn(ticket.drawDate);
    if (!isDrawn) return { status: 'waiting', text: 'รอผล ' + ticket.drawDate, class: 'waiting' };

    // Simple mock logic for win/loss if no official result
    const win = getWinningNumberForDate(ticket.drawDate);
    if (!win) return { status: 'pending', text: 'รอตรวจ', class: 'pending' };

    if (ticket.number === win) return { status: 'won', text: 'ถูกรางวัล!', class: 'won' };
    return { status: 'lost', text: 'ไม่ถูกรางวัล', class: 'lost' };
}

function formatThaiDate(dateStr) {
    if (!dateStr) return '-';
    const [d, m, y] = dateStr.split('/');
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${(parseInt(y) + 543).toString().slice(-2)}`;
}

function updateLotteryCountdown() {
    try {
        const now = new Date();
        const nextDraw = getThaiLotteryDrawDate(now);
        const [dd, mm, yyyy] = nextDraw.split('/').map(Number);
        const drawDate = new Date(yyyy, mm - 1, dd, 16, 0, 0);
        const diff = drawDate - now;

        if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            const cdDays = document.getElementById('cd-days');
            const cdHours = document.getElementById('cd-hours');
            const cdMinutes = document.getElementById('cd-minutes');
            const nextDrawDate = document.getElementById('next-draw-date');

            if (cdDays) cdDays.textContent = days;
            if (cdHours) cdHours.textContent = hours;
            if (cdMinutes) cdMinutes.textContent = minutes;
            if (nextDrawDate) nextDrawDate.textContent = `งวดวันที่ ${formatThaiDate(nextDraw)}`;
        }

        const nextLotteryDate = document.getElementById('next-lottery-date');
        if (nextLotteryDate) nextLotteryDate.textContent = formatThaiDate(nextDraw);
    } catch (e) {
        console.error('Countdown error:', e);
    }
}

function updateTicketsLotteryStatus() {
    if (!lottoHistory) return;
    lottoHistory.forEach(ticket => {
        // refresh status
    });
}

let OFFICIAL_RESULTS = {};

async function fetchLottoResults() {
    try {
        console.log('Checking lottery results...');
        updateLotteryCountdown();

        // Try to fetch from Supabase lotto_results table
        if (typeof supabaseClient !== 'undefined') {
            const { data, error } = await supabaseClient
                .from('lotto_results')
                .select('*')
                .order('draw_date', { ascending: false })
                .limit(10);

            if (!error && data && data.length > 0) {
                data.forEach(r => {
                    const dateKey = formatDateForDraw(new Date(r.draw_date));
                    OFFICIAL_RESULTS[dateKey] = r.last2;
                });
                console.log('Lotto results loaded from Supabase:', Object.keys(OFFICIAL_RESULTS).length);
            }
        }
    } catch (e) {
        console.error('Lotto fetch error', e);
    }
}

function getWinningNumberForDate(dateStr) {
    return OFFICIAL_RESULTS[dateStr] || null;
}

async function autoCheckLottery() {
    await fetchLottoResults();
    updateTicketBadge();
}

function updateTicketBadge() {
    const badge = document.getElementById('unread-ticket-dot');
    if (badge) {
        const count = lottoHistory ? lottoHistory.filter(t => t.status === 'waiting' || t.status === 'pending').length : 0;
        if (count > 0) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// =============================================
// SUPABASE-BASED SYNC FUNCTIONS (replaces Google Script)
// =============================================

/**
 * Sync ticket history from Supabase lotto_pool table
 */
async function syncTicketHistory(userId) {
    if (isSyncing) return;
    isSyncing = true;
    try {
        if (!window.supabaseClient || !userId) return;

        const { data, error } = await window.supabaseClient
            .from('lotto_pool')
            .select('*, orders(customer_name, total_price, items, created_at)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        if (data && data.length > 0) {
            // Map Supabase lotto_pool to local lottoHistory format
            const mapped = data.map(t => {
                const drawDateStr = formatDateForDraw(new Date(t.draw_date));
                const orderDate = t.orders ? new Date(t.orders.created_at) : new Date();
                return {
                    id: `KP-${String(t.order_id).padStart(6, '0')}`,
                    supabaseOrderId: t.order_id,
                    number: t.number,
                    date: getStandardDate(orderDate),
                    drawDate: drawDateStr,
                    drawDateTimestamp: new Date(t.draw_date).getTime(),
                    timestamp: orderDate.getTime(),
                    price: t.orders ? t.orders.total_price : 0,
                    status: 'pending',
                    checkedDate: null,
                    items: t.orders ? t.orders.items : [],
                    customerName: t.orders ? t.orders.customer_name : 'ลูกค้า'
                };
            });

            lottoHistory = mapped;
            localStorage.setItem(KEYS.HISTORY, JSON.stringify(lottoHistory));
            updateTicketBadge();
            console.log('Ticket history synced from Supabase:', lottoHistory.length);
        }
    } catch (e) {
        console.error('Sync ticket history error (Supabase):', e);
    } finally {
        isSyncing = false;
        updateTicketBadge();
    }
}

/**
 * Sync user stats (points) from Supabase profiles table
 */
async function syncUserStatsFromServer(userId) {
    try {
        if (!window.supabaseClient || !userId) return;

        const { data, error } = await window.supabaseClient
            .from('profiles')
            .select('points, total_orders, tier, display_name')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            userStats.points = data.points || 0;
            userStats.totalOrders = data.total_orders || 0;
            userStats.tier = data.tier || 'MEMBER';

            // Also load point history
            const { data: logs, error: logsError } = await window.supabaseClient
                .from('point_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(30);

            if (!logsError && logs) {
                userStats.history = logs.map(log => ({
                    type: log.action === 'EARN' ? 'earn' : 'redeem',
                    amount: log.amount,
                    date: log.created_at,
                    orderId: log.order_id ? `KP-${String(log.order_id).padStart(6, '0')}` : null,
                    note: log.note
                }));
            }

            localStorage.setItem(KEYS.STATS, JSON.stringify(userStats));
            if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
            console.log('User stats synced from Supabase. Points:', userStats.points);
        }
    } catch (e) {
        console.error('Sync stats error (Supabase):', e);
    }
}

// --- UI FUNCTIONS ---

function openMyTickets() {
    try {
        pushModalState('tickets');
        triggerHaptic();
        updateTicketsLotteryStatus();
        if (!lottoHistory || !Array.isArray(lottoHistory)) {
            try { lottoHistory = JSON.parse(localStorage.getItem(KEYS.HISTORY)) || []; } catch (e) { lottoHistory = []; }
        }
        const list = document.getElementById('tickets-list');
        if (list) {
            list.innerHTML = '';
            if (lottoHistory.length === 0) {
                list.innerHTML = `<div class="text-center text-gray-400 mt-10"><div class="text-4xl mb-2 opacity-30">🎟️</div><p class="text-sm">ยังไม่มีประวัติการสั่งซื้อ</p><p class="text-xs mt-1 text-gray-300">สั่งอาหารเพื่อรับเลขลุ้นโชค!</p></div>`;
            } else {
                lottoHistory.forEach((t, index) => {
                    const status = getLotteryStatus(t);
                    const item = document.createElement('div');
                    item.className = `ticket-stub p-4 rounded-lg shadow-sm border border-gray-200 mb-3 flex justify-between items-center relative overflow-hidden cursor-pointer active:scale-95 transition-transform btn-bounce ${status.class === 'waiting' ? 'border-l-4 border-l-brand-purple bg-[#F7F5F2]' : status.class === 'drawn' ? 'border-l-4 border-l-brand-yellow bg-[#EFEBE9]' : 'border-l-4 border-l-gray-400 bg-gray-100 opacity-70'}`;
                    item.onclick = function () { reprintReceipt(index) };
                    item.innerHTML = `<div class="flex-1"><div class="flex items-center gap-2 mb-1"><span class="text-[10px] text-gray-500">Order ID: ${t.id}</span></div><div class="flex items-baseline gap-2 mt-1"><span class="text-xs text-gray-400">เลขลุ้น:</span><span class="text-2xl font-black ${status.status === 'won' ? 'text-brand-yellow' : 'text-brand-purple'} tracking-widest">${t.number}</span></div><div class="text-[10px] text-gray-500 mt-1">ซื้อ: ${t.date} · ลุ้น: ${t.drawDate}</div><div class="text-[10px] text-brand-purple font-bold mt-2"><i class="fas fa-print"></i> กดเพื่อพิมพ์ใบเสร็จ</div></div><div class="text-right flex flex-col items-end"><div class="lottery-status ${status.class} mb-2">${status.status === 'won' ? '<i class="fas fa-trophy"></i>' : status.status === 'lost' ? '<i class="fas fa-times-circle"></i>' : '<i class="fas fa-clock"></i>'}<span>${status.text}</span></div>${status.status === 'won' ? '<button class="text-[10px] bg-brand-yellow text-white font-bold px-2 py-1 rounded shadow-sm animate-pulse">แคปจอรับสิทธิ์</button>' : ''}</div>`;

                    list.appendChild(item);
                });
            }
        }
        const overlay = document.getElementById('tickets-modal-overlay');
        const sheet = document.getElementById('tickets-sheet');
        if (overlay && sheet) {
            sheet.style.transform = '';
            overlay.classList.remove('hidden');
            setTimeout(() => {
                overlay.classList.remove('opacity-0');
                sheet.classList.remove('translate-y-full');
            }, 10);
        }
    } catch (e) {
        console.error(e);
        showToast('เกิดข้อผิดพลาดในการโหลดตั๋ว', 'error');
    }
}

function closeMyTickets(isBackNav = false) {
    if (!isBackNav && currentOpenModal === 'tickets') {
        history.back();
        return;
    }
    const overlay = document.getElementById('tickets-modal-overlay');
    const sheet = document.getElementById('tickets-sheet');
    if (overlay && sheet) {
        overlay.classList.add('opacity-0');
        sheet.classList.add('translate-y-full');
        setTimeout(() => {
            overlay.classList.add('hidden');
            sheet.style.transform = '';
        }, 300);
    }
    currentOpenModal = null;
    unlockScroll();
}

// Admin Dashboard Logic - Michelin Star Edition
// Handles all admin interactions, data fetching, and real-time updates.

const ADMIN_PASSCODE = '909090'; // In production, use Supabase Auth or secure backend validation
let currentTab = 'orders';
let ordersCache = [];
let menuCache = [];
let customersCache = [];
let isSidebarOpen = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    if (isLoggedIn()) {
        initDashboard();
        fetchShopStatus(); // Load shop status
    }
});

// --- Authentication ---
function isLoggedIn() {
    return sessionStorage.getItem('admin_session') === 'true';
}

function checkAuth() {
    const overlay = document.getElementById('login-overlay');
    if (isLoggedIn()) {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => overlay.style.display = 'none', 500);
    } else {
        overlay.style.display = 'flex';
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        document.getElementById('passcode-input').value = '';
        document.getElementById('passcode-input').focus();
    }
}

function handleLogin(e) {
    e.preventDefault();
    const input = document.getElementById('passcode-input').value;
    if (input === ADMIN_PASSCODE) {
        sessionStorage.setItem('admin_session', 'true');
        checkAuth();
        initDashboard();
        showToast('ยินดีต้อนรับกลับครับเชฟ! 👨‍🍳', 'success');
    } else {
        const err = document.getElementById('login-error');
        err.classList.remove('hidden');
        document.getElementById('passcode-input').value = '';
        shakeElement(document.querySelector('#login-overlay > div'));
    }
}

function logoutAdmin() {
    if (confirm('ต้องการออกจากระบบ?')) {
        sessionStorage.removeItem('admin_session');
        location.reload();
    }
}

// --- Dashboard Initialization ---
async function initDashboard() {
    // Show skeleton loaders
    renderLoadingStates();

    // Initial fetch
    await Promise.all([
        fetchOrders(),
        fetchMenu(),
        fetchCustomers()
    ]);

    // Setup Realtime
    setupRealtime();

    // Start clock
    updateTime();
    setInterval(updateTime, 1000);
}

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('header-time').innerText = timeString;
    document.getElementById('header-date').innerText = dateString;
}

// --- Navigation ---
function switchTab(tabId) {
    currentTab = tabId;

    // Update Sidebar Active State
    document.querySelectorAll('.nav-item').forEach(el => {
        if (el.dataset.tab === tabId) {
            el.classList.add('bg-amber-400', 'text-gray-900', 'shadow-lg');
            el.classList.remove('text-gray-400', 'hover:bg-white/10', 'hover:text-white');
        } else {
            el.classList.remove('bg-amber-400', 'text-gray-900', 'shadow-lg');
            el.classList.add('text-gray-400', 'hover:bg-white/10', 'hover:text-white');
        }
    });

    // Update Mobile Nav Active State
    document.querySelectorAll('.mob-nav-item').forEach(el => {
        if (el.dataset.tab === tabId) {
            el.classList.add('text-amber-500', 'scale-110');
            el.classList.remove('text-gray-400');
        } else {
            el.classList.remove('text-amber-500', 'scale-110');
            el.classList.add('text-gray-400');
        }
    });

    // Show/Hide Sections with transition
    document.querySelectorAll('.content-section').forEach(el => {
        if (el.id === `section-${tabId}`) {
            el.classList.remove('hidden');
            el.classList.add('animate-fade-in');
        } else {
            el.classList.add('hidden');
            el.classList.remove('animate-fade-in');
        }
    });

    // Refresh data if needed
    if (tabId === 'orders') fetchOrders();
    if (tabId === 'menu') fetchMenu();
    if (tabId === 'customers') fetchCustomers();

    // Close mobile menu if open
    if (window.innerWidth < 768) {
        // Implement mobile sidebar logic here if needed
    }
}

// --- Orders ---
async function fetchOrders() {
    // Optimistic UI update or skeleton handled by init
    const { data, error } = await supabaseClient
        .from('orders')
        .select(`*, profiles:user_id (display_name, points, tier), lotto_pool (number)`)
        .neq('status', 'cart')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Fetch orders error:', error);
        showToast('ไม่สามารถโหลดข้อมูลออเดอร์ได้', 'error');
        return;
    }

    ordersCache = data || [];
    calculateDisplayStats();
    renderOrders();
}

function calculateDisplayStats() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysOrders = ordersCache.filter(o => o.created_at.startsWith(todayStr) && o.status !== 'cancelled');

    const revenue = todaysOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const pending = ordersCache.filter(o => o.status === 'placed' || o.status === 'pending_payment').length;
    const cooking = ordersCache.filter(o => o.status === 'cooking').length;
    const completed = todaysOrders.filter(o => o.status === 'completed').length;

    animateNumber('stat-revenue', revenue, '฿');
    animateNumber('stat-pending', pending);
    animateNumber('stat-cooking', cooking);
    animateNumber('stat-completed', completed);
}

function renderOrders() {
    const container = document.getElementById('orders-grid');
    if (!ordersCache.length) {
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 opacity-50">
                <i class="fas fa-clipboard-list text-6xl mb-4"></i>
                <p class="text-lg">ไม่มีออเดอร์ในขณะนี้</p>
            </div>`;
        return;
    }

    container.innerHTML = ordersCache.map(order => createOrderCardHtml(order)).join('');
}

function createOrderCardHtml(order) {
    const time = new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const customer = order.profiles?.display_name || order.customer_name || 'Guest';
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    const statusColor = getStatusColor(order.status);
    const lotto = order.lotto_pool?.[0]?.number || (order.id ? String(order.id).slice(-2).padStart(2, '0') : '--');

    const itemsHtml = items.map(i => `
        <div class="flex justify-between items-start text-sm py-1 border-b border-dashed border-gray-100 last:border-0 hover:bg-gray-50 transition-colors px-2 rounded">
            <div class="flex-1">
                <span class="font-medium text-gray-700">${i.name}</span>
                ${i.meat ? `<span class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ml-1">${i.meat}</span>` : ''}
                ${i.addons?.length ? `<div class="text-[10px] text-gray-400 mt-0.5 pl-2 border-l-2 border-amber-200">+ ${i.addons.join(', ')}</div>` : ''}
                ${i.note ? `<div class="text-[10px] text-red-400 italic mt-0.5 pl-2"><i class="fas fa-comment-dots mr-1"></i>${i.note}</div>` : ''}
            </div>
            <div class="font-bold text-gray-800 shrink-0 ml-2">x${i.quantity || 1}</div>
        </div>
    `).join('');

    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group relative">
            ${order.status === 'placed' ? '<div class="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping m-2"></div>' : ''}
            
            <div class="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gray-900 text-amber-400 flex items-center justify-center font-bold font-mono shadow-md">
                        ${order.id}
                    </div>
                    <div>
                        <div class="font-bold text-gray-800 text-sm">${customer}</div>
                        <div class="text-[10px] text-gray-400 flex items-center gap-1">
                            <i class="far fa-clock"></i> ${time} 
                            <span class="bg-indigo-50 text-indigo-600 px-1.5 rounded font-bold ml-1 border border-indigo-100">🎟️ ${lotto}</span>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}">
                        ${statusColor.label}
                    </span>
                </div>
            </div>

            <div class="p-4 space-y-2 min-h-[100px] max-h-[250px] overflow-y-auto custom-scrollbar">
                ${itemsHtml}
            </div>

            <div class="p-4 bg-gray-50 border-t border-gray-100">
                <div class="flex justify-between items-center mb-4">
                    <span class="text-xs text-gray-500 uppercase font-bold tracking-wider">Total</span>
                    <span class="text-xl font-black text-gray-900">฿${order.total_price}</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    ${getActionButtons(order)}
                </div>
            </div>
        </div>
    `;
}

function getStatusColor(status) {
    const map = {
        'placed': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'รอรับออเดอร์' },
        'pending_payment': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'รอชำระเงิน' },
        'cooking': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'กำลังปรุง' },
        'delivering': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'กำลังส่ง' },
        'completed': { bg: 'bg-green-100', text: 'text-green-800', label: 'เสร็จสิ้น' },
        'cancelled': { bg: 'bg-red-100', text: 'text-red-800', label: 'ยกเลิก' }
    };
    return map[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
}

function getActionButtons(order) {
    if (order.status === 'cancelled') return `<button class="col-span-2 py-2 rounded-xl bg-gray-200 text-gray-400 text-sm font-bold cursor-not-allowed">ยกเลิกแล้ว</button>`;
    if (order.status === 'completed') return `<button class="col-span-2 py-2 rounded-xl bg-green-100 text-green-600 text-sm font-bold cursor-default"><i class="fas fa-check-circle mr-1"></i> เรียบร้อย</button>`;

    let btns = '';

    // Left Button: Cancel
    btns += `<button onclick="updateOrderStatus(${order.id}, 'cancelled')" class="py-2 rounded-xl bg-white border border-gray-200 text-red-500 text-sm font-bold hover:bg-red-50 hover:border-red-200 transition-all">ยกเลิก</button>`;

    // Right Button: Action based on status
    if (order.status === 'placed' || order.status === 'pending_payment') {
        btns += `<button onclick="updateOrderStatus(${order.id}, 'cooking')" class="py-2 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-black shadow-lg hover:shadow-xl transition-all shadow-gray-200"><i class="fas fa-fire mr-1 text-amber-500"></i> รับ/ปรุง</button>`;
    } else if (order.status === 'cooking') {
        btns += `<button onclick="updateOrderStatus(${order.id}, 'completed')" class="py-2 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 shadow-lg hover:shadow-xl transition-all shadow-green-200"><i class="fas fa-check mr-1"></i> เสร็จสิ้น</button>`;
    } else {
        btns += `<button class="py-2 rounded-xl bg-gray-100 text-gray-500 text-sm font-bold">...</button>`;
    }

    return btns;
}

async function updateOrderStatus(id, newStatus) {
    // Optimistic Update
    const orderIndex = ordersCache.findIndex(o => o.id === id);
    if (orderIndex > -1) {
        ordersCache[orderIndex].status = newStatus;
        renderOrders();
        calculateDisplayStats();
    }

    const { error } = await supabaseClient.from('orders').update({ status: newStatus }).eq('id', id);
    if (error) {
        showToast('อัปเดตสถานะไม่สำเร็จ', 'error');
        fetchOrders(); // Revert on error
    } else {
        // showToast('อัปเดตสถานะเรียบร้อย', 'success');
        // Play sound if needed
    }
}

// --- Menu Management ---
async function fetchMenu() {
    const { data, error } = await supabaseClient
        .from('menu_items')
        .select('*')
        .neq('category', 'system') // Hide system items
        .order('category', { ascending: false }); // simple ordering

    if (error) return console.error(error);
    menuCache = data || [];
    renderMenu();
}

function renderMenu() {
    const container = document.getElementById('menu-grid');
    if (!menuCache.length) {
        container.innerHTML = '<div class="col-span-full text-center p-10">ไม่พบเมนู</div>';
        return;
    }

    // Group by category if desired, but grid is fine for now
    container.innerHTML = menuCache.map(item => `
        <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 group hover:border-amber-400 transition-all relative overflow-hidden">
            <div class="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button onclick="editMenu(${item.id})" class="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-blue-500 hover:scale-110 transition-transform"><i class="fas fa-pen text-xs"></i></button>
            </div>
            
            <div class="flex items-center gap-4 mb-3">
                <div class="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center text-3xl shadow-inner text-gray-400">
                    ${item.image_url ? `<img src="${item.image_url}" class="w-full h-full object-cover rounded-xl">` : (item.icon || '🍛')}
                </div>
                <div>
                <div>
                    <h3 class="font-bold text-gray-800 line-clamp-1">${item.name}</h3>
                    <p class="text-xs text-gray-400">${item.category}</p>
                    <div class="font-black text-lg text-amber-500 mt-1">฿${item.price}</div>
                    ${item.req_meat ? '<span class="text-[9px] bg-orange-100 text-orange-600 px-1 rounded">Meat Req.</span>' : ''}
                </div>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-gray-50">
                <label class="flex items-center gap-2 cursor-pointer">
                    <div class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="sr-only peer" ${item.is_available ? 'checked' : ''} onchange="toggleMenu(${item.id}, this.checked)">
                        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </div>
                    <span class="text-xs font-medium ${item.is_available ? 'text-green-600' : 'text-gray-400'}">${item.is_available ? 'พร้อมขาย' : 'หมด'}</span>
                </label>
            </div>
        </div>
    `).join('');
}

async function toggleMenu(id, status) {
    const { error } = await supabaseClient.from('menu_items').update({ is_available: status }).eq('id', id);
    if (error) showToast('Error updating menu', 'error');
}

// --- Menu Modal Functions (Reuse standard modal pattern) ---
// Note: In a full implementation, I'd add create/edit modal logic here similar to previous version but cleaner.
// For brevity in this Michelin update, I'll focus on the visual overhaul first, but keeping the core edit hook.
// --- Menu Modal Functions ---
let currentMenuId = null;

function openAddMenuModal() {
    currentMenuId = null;
    document.getElementById('menu-form').reset();
    document.getElementById('menu-id').value = '';
    document.getElementById('modal-title').innerText = 'Add New Item';
    document.getElementById('btn-delete').classList.add('hidden');
    updateImagePreview('');

    // Show modal
    const modal = document.getElementById('menu-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('opacity-100'), 10);
}

function closeMenuModal() {
    const modal = document.getElementById('menu-modal');
    modal.classList.remove('opacity-100');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function editMenu(id) {
    const item = menuCache.find(i => i.id === id);
    if (!item) return;

    currentMenuId = id;
    document.getElementById('menu-id').value = id;
    document.getElementById('menu-name').value = item.name;
    document.getElementById('menu-price').value = item.price;
    document.getElementById('menu-category').value = item.category;
    document.getElementById('menu-img-url').value = item.image || ''; // Map image_url to form
    document.getElementById('menu-desc').value = item.description || '';
    document.getElementById('menu-req-meat').checked = item.req_meat || false;
    document.getElementById('menu-rec').checked = item.is_new || false; // Reuse is_new as recommend/highlight

    updateImagePreview(item.image);

    document.getElementById('modal-title').innerText = 'Edit Menu';
    document.getElementById('btn-delete').classList.remove('hidden');

    const modal = document.getElementById('menu-modal');
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('opacity-100'), 10);
}

function updateImagePreview(url) {
    const img = document.getElementById('menu-img-preview');
    const ph = document.getElementById('menu-img-placeholder');
    if (url && url.length > 10) {
        img.src = url;
        img.classList.remove('hidden');
        ph.classList.add('hidden');
    } else {
        img.classList.add('hidden');
        ph.classList.remove('hidden');
    }
}

async function handleMenuSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('menu-name').value;
    const price = document.getElementById('menu-price').value;
    const category = document.getElementById('menu-category').value;
    const image = document.getElementById('menu-img-url').value;
    const desc = document.getElementById('menu-desc').value;
    const reqMeat = document.getElementById('menu-req-meat').checked;
    const isNew = document.getElementById('menu-rec').checked;

    const payload = {
        name,
        price: parseFloat(price),
        category,
        image,
        description: desc,
        req_meat: reqMeat,
        is_new: isNew,
        // Default safe values
        is_available: true,
        is_tray: false,
        kcal: 0
    };

    let error;
    if (currentMenuId) {
        // Update
        const { error: err } = await supabaseClient
            .from('menu_items')
            .update(payload)
            .eq('id', currentMenuId);
        error = err;
    } else {
        // Insert
        const { error: err } = await supabaseClient
            .from('menu_items')
            .insert([payload]); // Supabase often needs array for insert
        error = err;
    }

    if (error) {
        console.error(error);
        showToast('Error saving menu', 'error');
    } else {
        showToast('Menu saved successfully!', 'success');
        closeMenuModal();
        fetchMenu(); // Refresh list
    }
}

async function handleDelete() {
    if (!currentMenuId) return;
    if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) return;

    const { error } = await supabaseClient
        .from('menu_items')
        .delete()
        .eq('id', currentMenuId);

    if (error) {
        showToast('Error deleting item', 'error');
    } else {
        showToast('Item deleted', 'success');
        closeMenuModal();
        fetchMenu();
    }
}

// --- Shop Status (System Config) ---
// Using a special menu item with id=99999 or name '__SHOP_STATUS__'
const SHOP_STATUS_KEY = '__SHOP_STATUS__';

async function fetchShopStatus() {
    // Attempt to fetch status item
    const { data, error } = await supabaseClient
        .from('menu_items')
        .select('*')
        .eq('name', SHOP_STATUS_KEY)
        .maybeSingle();

    const toggle = document.getElementById('shop-status-toggle');
    const label = document.getElementById('shop-status-label');

    if (data) {
        // is_available = true means OPEN
        toggle.checked = data.is_available;
        updateShopStatusUI(data.is_available);
    } else {
        // Init if not exists
        await supabaseClient.from('menu_items').insert({
            name: SHOP_STATUS_KEY,
            category: 'system',
            price: 0,
            is_available: true
        });
        toggle.checked = true;
        updateShopStatusUI(true);
    }
}

async function toggleShopStatus(isOpen) {
    updateShopStatusUI(isOpen);

    // Optimistic update done, sync to DB
    const { error } = await supabaseClient
        .from('menu_items')
        .update({ is_available: isOpen })
        .eq('name', SHOP_STATUS_KEY);

    if (error) {
        showToast('Failed to update shop status', 'error');
        // Revert UI?
    } else {
        showToast(isOpen ? 'Shop is now OPEN 🟢' : 'Shop is CLOSED 🔴', isOpen ? 'success' : 'warning');
    }
}

function updateShopStatusUI(isOpen) {
    const label = document.getElementById('shop-status-label');
    if (isOpen) {
        label.innerText = 'OPEN';
        label.className = 'ml-2 text-xs font-black text-green-500 tracking-wider';
    } else {
        label.innerText = 'CLOSED';
        label.className = 'ml-2 text-xs font-black text-red-500 tracking-wider';
    }
}

// --- Customers ---
async function fetchCustomers() {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .order('points', { ascending: false })
        .limit(20);

    if (error) return;
    customersCache = data || [];
    renderCustomers();
}

function renderCustomers() {
    const tbody = document.getElementById('customers-list');
    tbody.innerHTML = customersCache.map((c, idx) => `
        <tr class="hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
            <td class="p-4 text-center text-gray-400 font-mono text-xs">${idx + 1}</td>
            <td class="p-4">
                <div class="font-bold text-gray-800">${c.display_name || 'Unknown'}</div>
                <div class="text-[10px] text-gray-400 font-mono">${c.line_user_id || 'Guest'}</div>
            </td>
            <td class="p-4 text-center">
                <span class="inline-block px-2 py-1 rounded-lg bg-amber-50 text-amber-600 font-bold text-xs">${c.tier || 'Member'}</span>
            </td>
            <td class="p-4 text-right font-bold text-indigo-600">${c.points} pt</td>
            <td class="p-4 text-right text-gray-600">${c.total_orders || 0}</td>
        </tr>
    `).join('');
}


// --- Realtime ---
function setupRealtime() {
    supabaseClient
        .channel('admin-dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
            // Re-fetch to ensure clean state and joined data (profiles)
            // Or simplistic handling:
            if (payload.eventType === 'INSERT') {
                showToast(`ออเดอร์ใหม่! #${payload.new.id}`, 'info');
                playNotificationSound();
                fetchOrders();
            } else if (payload.eventType === 'UPDATE') {
                // Determine if we should refresh (e.g. status changed)
                const index = ordersCache.findIndex(o => o.id === payload.new.id);
                if (index !== -1 && ordersCache[index].status !== payload.new.status) {
                    // Status changed by someone else?
                    if (!document.hidden) fetchOrders(); // Only fetch if user looking, else maybe just update validation
                    else fetchOrders();
                } else {
                    fetchOrders(); // Safe default
                }
            } else {
                fetchOrders();
            }
            fetchCustomers(); // Points might have changed
        })
        .subscribe();
}

// --- Utils ---
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-msg');
    const icon = toast.querySelector('i');

    msgEl.innerText = msg;

    // Reset classes
    toast.className = 'fixed top-6 right-6 z-[100] transform transition-all duration-300 translate-x-10 opacity-0';
    icon.className = 'fas text-xl mr-3';

    if (type === 'success') {
        toast.classList.add('bg-green-600', 'text-white');
        icon.classList.add('fa-check-circle');
    } else if (type === 'error') {
        toast.classList.add('bg-red-600', 'text-white');
        icon.classList.add('fa-exclamation-circle');
    } else {
        toast.classList.add('bg-gray-800', 'text-white');
        icon.classList.add('fa-info-circle', 'text-amber-400');
    }

    // Show
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-10', 'opacity-0');
        toast.classList.add('translate-x-0', 'opacity-100');
    });

    setTimeout(() => {
        toast.classList.add('translate-x-10', 'opacity-0');
    }, 4000);
}

function renderLoadingStates() {
    // Implement skeleton rendering here
    // For now, implicit
}

function animateNumber(elementId, target, prefix = '') {
    const el = document.getElementById(elementId);
    if (!el) return;
    const current = parseInt(el.innerText.replace(/[^0-9]/g, '')) || 0;
    if (current === target) return;

    el.innerText = prefix + target.toLocaleString();
    el.classList.add('scale-110', 'text-amber-500');
    setTimeout(() => el.classList.remove('scale-110', 'text-amber-500'), 200);
}

function toggleMobileSidebar() {
    const sb = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    isSidebarOpen = !isSidebarOpen;

    if (isSidebarOpen) {
        sb.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden', 'opacity-0');
        overlay.classList.add('opacity-100');
    } else {
        sb.classList.add('-translate-x-full');
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

function shakeElement(el) {
    el.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(0)' }
    ], { duration: 300 });
}

function playNotificationSound() {
    // Optional: Add sound file
    // const audio = new Audio('notification.mp3');
    // audio.play().catch(e => console.log('Audio blocked', e));
}

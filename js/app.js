// ===== MAIN APPLICATION LOGIC =====

// --- ERROR HANDLERS ---
window.addEventListener('error', function (e) { console.error('Global error caught:', e.error); e.preventDefault(); });
document.addEventListener('error', function (e) {
    if (e.target.tagName.toLowerCase() === 'img') {
        const fallback = 'images/logo.png'; // Use local fallback
        if (e.target.src.includes(fallback)) return; // Prevent loop

        e.target.src = fallback;
        e.target.alt = 'Image not found';
        e.target.classList.add('opacity-50');
    }
}, true);

// --- MICRO INTERACTIONS ---
function setupMicroInteractions() {
    const buttons = Array.from(document.querySelectorAll('.btn-bounce'));
    buttons.forEach(btn => {
        btn.classList.add('btn-press');
        let pointerDown = false;
        const onDown = () => { if (btn.disabled) return; pointerDown = true; btn.classList.remove('rebound'); btn.classList.add('squash'); };
        const onUp = () => { if (!pointerDown) return; pointerDown = false; btn.classList.remove('squash'); btn.classList.add('rebound'); btn.addEventListener('animationend', function _end() { btn.classList.remove('rebound'); btn.removeEventListener('animationend', _end); }); };
        btn.addEventListener('pointerdown', onDown, { passive: true });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => btn.addEventListener(ev, onUp));
    });
}

// --- PULL TO REFRESH ---
let pullStartY = 0;
let pullCurrentY = 0;
let isPulling = false;
let pullThreshold = 80;
let refreshIndicator = null;

function initPullToRefresh() {
    const mainContent = document.querySelector('.max-w-md.mx-auto');
    if (!mainContent) return;

    refreshIndicator = document.createElement('div');
    refreshIndicator.id = 'pull-refresh-indicator';
    refreshIndicator.className = 'fixed top-0 left-0 right-0 z-40 flex items-center justify-center pointer-events-none transition-all duration-300';
    refreshIndicator.style.height = '0px';
    refreshIndicator.style.opacity = '0';
    refreshIndicator.innerHTML = `
        <div class="bg-white/90 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-gray-200 flex items-center gap-2">
            <i class="fas fa-sync-alt text-indigo-500 transition-transform duration-300" id="refresh-icon"></i>
            <span class="text-sm font-medium text-gray-700" id="refresh-text">ปล่อยเพื่อรีเฟรช</span>
        </div>
    `;
    document.body.appendChild(refreshIndicator);

    document.addEventListener('touchstart', handlePullStart, { passive: true });
    document.addEventListener('touchmove', handlePullMove, { passive: false });
    document.addEventListener('touchend', handlePullEnd, { passive: true });
}

function handlePullStart(e) {
    if (window.scrollY > 10) return;
    if (document.body.classList.contains('scroll-locked')) return;
    pullStartY = e.touches[0].clientY;
    isPulling = true;
}

function handlePullMove(e) {
    if (!isPulling) return;
    if (window.scrollY > 10) { isPulling = false; return; }

    pullCurrentY = e.touches[0].clientY;
    const diff = pullCurrentY - pullStartY;

    if (diff > 0 && diff < pullThreshold * 2) {
        e.preventDefault();
        const progress = Math.min(diff / pullThreshold, 1);
        refreshIndicator.style.height = `${diff}px`;
        refreshIndicator.style.opacity = progress;

        const icon = document.getElementById('refresh-icon');
        const text = document.getElementById('refresh-text');
        if (icon) { icon.style.transform = `rotate(${progress * 360}deg)`; }
        if (text) { text.textContent = progress >= 1 ? 'ปล่อยเพื่อรีเฟรช' : 'ดึงลงเพื่อรีเฟรช'; }
    }
}

function handlePullEnd() {
    if (!isPulling) return;
    isPulling = false;

    const diff = pullCurrentY - pullStartY;
    if (diff >= pullThreshold) {
        refreshIndicator.style.height = '60px';
        document.getElementById('refresh-text').textContent = 'กำลังรีเฟรช...';
        document.getElementById('refresh-icon').classList.add('animate-spin');
        performRefresh();
    } else {
        refreshIndicator.style.height = '0px';
        refreshIndicator.style.opacity = '0';
    }
    pullStartY = 0;
    pullCurrentY = 0;
}

async function performRefresh() {
    try {
        if (userAvatar.userId) {
            await Promise.all([
                syncUserStatsFromServer(userAvatar.userId),
                syncTicketHistory(userAvatar.userId),
                fetchLottoResults()
            ]);
        } else {
            await fetchLottoResults();
        }
        updatePointsDisplay();
        updateTicketBadge();
        renderMenu();
        updateRecommendations();
        showToast('รีเฟรชข้อมูลเรียบร้อย! 🔄', 'success');
    } catch (error) {
        showToast('รีเฟรชไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
        refreshIndicator.style.height = '0px';
        refreshIndicator.style.opacity = '0';
        const icon = document.getElementById('refresh-icon');
        if (icon) icon.classList.remove('animate-spin');
    }
}

// --- DATA EXPORT/IMPORT ---
function exportUserData() {
    try {
        const exportData = {
            version: CURRENT_VERSION,
            exportDate: new Date().toISOString(),
            user: JSON.parse(localStorage.getItem(KEYS.USER) || '{}'),
            stats: JSON.parse(localStorage.getItem(KEYS.STATS) || '{}'),
            history: JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'),
            favorites: JSON.parse(localStorage.getItem(KEYS.FAVORITES) || '[]')
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kaprao52-backup-${getStandardDate(new Date()).replace(/\//g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('สำรองข้อมูลสำเร็จ! 💾', 'success');
    } catch (error) {
        showToast('สำรองข้อมูลไม่สำเร็จ', 'error');
        console.error('Export error:', error);
    }
}

function importUserData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.version || !data.exportDate) throw new Error('Invalid backup file');
            if (confirm(`คุณต้องการนำเข้าข้อมูลจาก ${data.exportDate} ใช่หรือไม่?\nข้อมูลปัจจุบันจะถูกแทนที่`)) {
                if (data.user) localStorage.setItem(KEYS.USER, JSON.stringify(data.user));
                if (data.stats) localStorage.setItem(KEYS.STATS, JSON.stringify(data.stats));
                if (data.history) localStorage.setItem(KEYS.HISTORY, JSON.stringify(data.history));
                if (data.favorites) localStorage.setItem(KEYS.FAVORITES, JSON.stringify(data.favorites));
                showToast('นำเข้าข้อมูลสำเร็จ! กำลังโหลด...', 'success');
                setTimeout(() => location.reload(), 1500);
            }
        } catch (error) {
            showToast('ไฟล์สำรองไม่ถูกต้อง', 'error');
        }
    };
    reader.readAsText(file);
}

// --- ACCESSIBILITY ---
function initAccessibility() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-white focus:text-gray-800 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg';
    skipLink.textContent = 'ข้ามไปยังเนื้อหาหลัก';
    document.body.insertBefore(skipLink, document.body.firstChild);

    const liveRegion = document.createElement('div');
    liveRegion.id = 'aria-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);

    document.querySelectorAll('button, a, input, textarea, [tabindex]:not([tabindex="-1"])').forEach(el => {
        if (!el.hasAttribute('aria-label') && !el.textContent.trim()) {
            const icon = el.querySelector('i');
            if (icon) {
                const iconClass = Array.from(icon.classList).find(c => c.startsWith('fa-') && c !== 'fas' && c !== 'far' && c !== 'fab');
                if (iconClass) {
                    el.setAttribute('aria-label', iconClass.replace('fa-', '').replace(/-/g, ' '));
                }
            }
        }
    });

    const menuGrid = document.getElementById('menu-grid');
    if (menuGrid) {
        menuGrid.setAttribute('role', 'list');
        menuGrid.setAttribute('aria-label', 'รายการเมนูอาหาร');
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            showKeyboardShortcuts();
        }
        if (e.key === '/' && !document.body.classList.contains('scroll-locked')) {
            e.preventDefault();
            const searchContainer = document.getElementById('search-container');
            if (searchContainer.classList.contains('hidden')) {
                toggleSearch();
            }
            document.getElementById('search-input')?.focus();
        }
        if (e.key === 'Escape') {
            const modals = ['food-sheet', 'checkout-sheet', 'tickets-sheet', 'avatar-modal', 'points-history-modal'];
            const anyOpen = modals.some(id => {
                const el = document.getElementById(id);
                return el && !el.classList.contains('hidden') && !el.classList.contains('translate-y-full');
            });
            if (anyOpen) {
                e.preventDefault();
                if (currentOpenModal) {
                    if (currentOpenModal === 'food-modal') closeModal();
                    else if (currentOpenModal === 'checkout') closeCheckout();
                    else if (currentOpenModal === 'tickets') closeMyTickets();
                    else if (currentOpenModal === 'avatar') closeAvatarModal();
                    else if (currentOpenModal === 'points-history') closePointsHistory();
                }
            }
        }
    });
}

function showKeyboardShortcuts() {
    const shortcuts = [
        { key: '?', action: 'แสดงคีย์ลัด' },
        { key: '/', action: 'เปิดช่องค้นหา' },
        { key: 'ESC', action: 'ปิดหน้าต่าง' },
        { key: '↑/↓', action: 'เพิ่ม/ลดจำนวน (ในเมนู)' },
        { key: 'Enter', action: 'ยืนยัน/สั่งซื้อ' }
    ];

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6';
    modal.innerHTML = `
        <div class="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold text-gray-800">⌨️ คีย์ลัด</h2>
                <button onclick="this.closest('.fixed').remove()" class="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200">
                    <i class="fas fa-times text-sm"></i>
                </button>
            </div>
            <div class="space-y-2">
                ${shortcuts.map(s => `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <span class="text-sm text-gray-600">${s.action}</span>
                        <kbd class="px-3 py-1 bg-white rounded-lg text-sm font-bold text-gray-800 border border-gray-200 shadow-sm">${s.key}</kbd>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Override showToast to announce to screen readers
const originalShowToast = showToast;
showToast = function (message, type = 'info') {
    originalShowToast(message, type);
    const liveRegion = document.getElementById('aria-live-region');
    if (liveRegion) {
        liveRegion.textContent = message;
        setTimeout(() => { liveRegion.textContent = ''; }, 1000);
    }
};

// --- BOTTOM NAVIGATION ---
let currentPage = 'home';

function setActiveNav(page) {
    currentPage = page;
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
}

function navigateTo(page) {
    setActiveNav(page);
    switch (page) {
        case 'home':
            window.scrollTo({ top: 0, behavior: 'smooth' });
            closeAllModals();
            break;
        case 'cart':
            // Always open checkout to show cart status (even if empty)
            openCheckout();
            break;
        case 'tracking':
            openOrderTrackingSheet();
            break;
        case 'more':
            openMoreModal();
            break;
    }
}

function updateBottomNavBadge() {
    // Cart Badge
    const cartBadge = document.getElementById('nav-cart-badge');
    if (cartBadge) {
        if (cart.length > 0) {
            cartBadge.textContent = cart.length > 99 ? '99+' : cart.length;
            cartBadge.classList.remove('hidden');
            cartBadge.style.display = 'flex'; // Force display
        } else {
            cartBadge.classList.add('hidden');
            cartBadge.style.display = 'none';
        }
    }

    // Tracking Badge (Active Orders)
    const trackingBadge = document.getElementById('nav-tracking-badge');
    if (trackingBadge && typeof activeOrders !== 'undefined') {
        // Filter only incomplete orders
        const count = Array.from(activeOrders.values()).filter(o => o.status.code !== 'completed').length;
        if (count > 0) {
            trackingBadge.textContent = count > 9 ? '9+' : count;
            trackingBadge.classList.remove('hidden');
            trackingBadge.classList.add('bg-red-500', 'text-white'); // Ensure visibility
        } else {
            trackingBadge.classList.add('hidden');
        }
    }
}

function closeAllModals() {
    try { closeModal(true); } catch (e) { }
    try { closeCheckout(true); } catch (e) { }
    try { closeMyTickets(true); } catch (e) { }
    try { closeAvatarModal(true); } catch (e) { }
    try { closePointsHistory(true); } catch (e) { }
    try { closeQuickOrderModal(true); } catch (e) { }
}

// --- Modal Actions ---
function openMoreModal() {
    // Update LINE button based on login state
    const isGuest = userAvatar.isGuest || !userAvatar.userId;
    const lineBtn = document.querySelector('#more-menu-sheet .modern-line-btn');
    
    if (lineBtn) {
        if (!isGuest) {
            // Change to profile button when logged in
            lineBtn.innerHTML = `
                <span class="btn-content">
                    <span class="line-icon" style="background: rgba(99, 102, 241, 0.2);">
                        ${userAvatar.image ? `<img src="${userAvatar.image}" class="w-full h-full rounded-full object-cover">` : '<i class="fas fa-user" style="color: #6366F1;"></i>'}
                    </span>
                    <span class="btn-text">
                        <span class="btn-title">${userAvatar.name || 'ลูกค้าทั่วไป'}</span>
                        <span class="btn-subtitle">แก้ไขข้อมูลส่วนตัว</span>
                    </span>
                </span>
                <i class="fas fa-chevron-right text-lg opacity-80"></i>
            `;
            lineBtn.onclick = () => { openAvatarModal(); closeMoreMenu(); };
            lineBtn.style.background = 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)';
        } else {
            // Reset to LINE login button
            lineBtn.innerHTML = `
                <span class="btn-content">
                    <span class="line-icon">
                        <i class="fab fa-line"></i>
                    </span>
                    <span class="btn-text">
                        <span class="btn-title">เข้าสู่ระบบด้วย LINE</span>
                        <span class="btn-subtitle">สะสมแต้มและดูประวัติการสั่ง</span>
                    </span>
                </span>
                <i class="fas fa-chevron-right text-lg opacity-80"></i>
            `;
            lineBtn.onclick = () => { loginWithLine(); closeMoreMenu(); };
            lineBtn.style.background = 'var(--line-green)';
        }
    }

    // Show modal
    const overlay = document.getElementById('more-menu-overlay');
    const sheet = document.getElementById('more-menu-sheet');
    if (overlay && sheet) {
        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.remove('opacity-0');
            sheet.classList.remove('translate-y-full');
        }, 10);
    }
}

function closeMoreMenu() {
    const overlay = document.getElementById('more-menu-overlay');
    const sheet = document.getElementById('more-menu-sheet');
    if (overlay && sheet) {
        overlay.classList.add('opacity-0');
        sheet.classList.add('translate-y-full');
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300);
    }
}

// Alias for backward compatibility
function closeMoreModal() {
    closeMoreMenu();
    if (typeof setActiveNav === 'function') setActiveNav('home');
}

// --- SWIPE TO CLOSE ---
function enableSwipeToClose(el, scrollEl, closeCallback) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    el.addEventListener('touchstart', (e) => {
        if (scrollEl.scrollTop <= 0) {
            startY = e.touches[0].clientY;
            isDragging = true;
            el.style.transition = 'none';
        }
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const diff = e.touches[0].clientY - startY;
        if (diff > 0) {
            if (scrollEl.scrollTop > 0) return;
            e.preventDefault();
            el.style.transform = `translateY(${diff}px)`;
            currentY = diff;
        }
    }, { passive: false });
    el.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        el.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        if (currentY > 150) closeCallback();
        else el.style.transform = '';
        currentY = 0;
    });
}

// --- KEYBOARD SHORTCUTS ---
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        triggerHaptic();
        if (currentOpenModal === 'food-modal') closeModal(true);
        else if (currentOpenModal === 'checkout') closeCheckout(true);
        else if (currentOpenModal === 'tickets') closeMyTickets(true);
        else if (currentOpenModal === 'avatar') closeAvatarModal(true);
        else if (currentOpenModal === 'points-history') closePointsHistory(true);
        else if (currentOpenModal === 'quick-order') closeQuickOrderModal(true);
        else {
            const welcomeModal = document.getElementById('welcome-modal');
            if (welcomeModal && !welcomeModal.classList.contains('hidden')) closeWelcome();
        }
    }
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        triggerHaptic();
        if (activeElement && activeElement.id === 'user-name') {
            const submitBtn = document.getElementById('btn-submit-order');
            if (submitBtn && !submitBtn.disabled) selectPaymentMethod();
        }
        if (currentOpenModal === 'food-modal' && currentItem) addToCartFromModal();
        if (activeElement && activeElement.id === 'discount-code') applyDiscount();
    }
    if (currentOpenModal === 'food-modal' && currentItem) {
        if (e.key === 'ArrowUp') { e.preventDefault(); triggerHaptic(); adjustModalQty(1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); triggerHaptic(); adjustModalQty(-1); }
    }
});

// --- MAIN DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', function () {
    // Addon listeners are now dynamic (created in openModal), no static initialization needed

    // Points input listener
    const pointsInput = document.getElementById('points-input');
    if (pointsInput) {
        pointsInput.addEventListener('input', function () { updatePointsFromUI(this.value); });
        pointsInput.addEventListener('change', function () { updatePointsFromUI(this.value); });
    }

    // Points range listener (NEW)
    const pointsRange = document.getElementById('points-range');
    if (pointsRange) {
        pointsRange.addEventListener('input', function () { updatePointsFromUI(this.value); });
        pointsRange.addEventListener('change', function () { updatePointsFromUI(this.value); });
    }

    // User name input save
    const userNameInput = document.getElementById('user-name');
    if (userNameInput) userNameInput.addEventListener('input', saveToLS);

    // Load saved data
    loadUserDataSafe();
    updateBottomNavBadge(); // Update badge immediately after loading user data
    loadActiveOrders();

    // Initialize services
    initLIFF();
    initCanvasBackground();
    fetchLottoResults();
    initPullToRefresh();
    initAccessibility();
    setupMicroInteractions();

    // Render initial menu
    renderMenu();
    updateMiniCart();
    updatePointsDisplay();
    updateActiveOrdersButton();
    updateRecommendations();

    // Swipe to close
    setTimeout(() => {
        const _foodSheet = document.getElementById('food-sheet');
        const _foodScroll = _foodSheet ? _foodSheet.querySelector('.overflow-y-auto') : null;
        if (_foodSheet && _foodScroll) enableSwipeToClose(_foodSheet, _foodScroll, closeModal);
        const _checkoutSheet = document.getElementById('checkout-sheet');
        const _cartList = document.getElementById('checkout-scrollable');
        if (_checkoutSheet && _cartList) enableSwipeToClose(_checkoutSheet, _cartList, closeCheckout);
        const _ticketsSheet = document.getElementById('tickets-sheet');
        const _ticketsList = document.getElementById('tickets-list');
        if (_ticketsSheet && _ticketsList) enableSwipeToClose(_ticketsSheet, _ticketsList, closeMyTickets);
    }, 500);
});

// --- COSMIC EFFECTS INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadGamificationData();
    // initFoodParticles(); // Removed in minimal theme

    // --- SUPABASE MENU REALTIME (fetch is handled by dynamicMenu.js) ---
    if (typeof supabaseClient !== 'undefined') {
        setupMenuRealtime();
        fetchShopStatus(); // Sync shop status
    }

    checkSeasonalTheme();
    scheduleSmartNotifications();
    initTiltEffect();
    initMagneticButtons();
    initParallax();
    // initFloatingElements();

    initBreathingAnimation();
    updateBottomNavBadge();

    const welcomeModal = document.getElementById('welcome-modal');
    const bottomNav = document.getElementById('bottom-nav');
    if (welcomeModal && welcomeModal.classList.contains('hidden') && bottomNav) {
        bottomNav.classList.remove('hidden');
        bottomNav.classList.add('show');
    }

    // Hide Loader
    setTimeout(hideLoader, 800); // Small delay for smooth transition
});

function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.classList.add('loader-hidden');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
}

// --- SUPABASE MENU LOGIC ---
// fetchMenuFromSupabase is defined in js/dynamicMenu.js (merged with local data)

function setupMenuRealtime() {
    if (typeof supabaseClient === 'undefined') return;
    supabaseClient
        .channel('public-menu')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
            console.log('Realtime Menu Update');
            if (typeof fetchMenuFromSupabase === 'function') fetchMenuFromSupabase();
            showToast('เมนูมีการอัพเดท 🔄', 'info');
        })
        .subscribe();
}

// --- Shop Status Logic ---
window.isShopOpen = true; // Default

async function fetchShopStatus() {
    if (!window.supabaseClient) return;
    const { data } = await supabaseClient
        .from('menu_items')
        .select('is_available')
        .eq('name', '__SHOP_STATUS__')
        .maybeSingle();

    if (data) {
        window.isShopOpen = data.is_available;
        updateShopStatusUI();
    }
}

function updateShopStatusUI() {
    const banner = document.getElementById('shop-closed-banner');
    if (!window.isShopOpen) {
        if (!banner) {
            const div = document.createElement('div');
            div.id = 'shop-closed-banner';
            div.className = 'fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-[60] font-bold text-sm shadow-lg animate-slide-up';
            div.innerHTML = '<i class="fas fa-store-slash mr-2"></i> ขณะนี้ร้านปิดให้บริการชั่วคราวครับ';
            document.body.appendChild(div);
            document.body.style.paddingTop = '30px';
        }
    } else {
        if (banner) {
            banner.remove();
            document.body.style.paddingTop = '';
        }
    }
}

// --- SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js?v=26').then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
            // Force update checks
            registration.update();
        }, err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

// =============================================
// Food Detail Modal Logic




// --- REFACTORED MODAL LOGIC ---

function openModal(item) {
    if (!item) return;
    currentItem = item;
    modalQty = 1;

    // Populate
    const img = document.getElementById('modal-img');
    if (img) {
        img.src = item.image;
        img.onerror = function () { this.src = 'https://placehold.co/400x300?text=No+Image'; };
    }
    const titleEl = document.getElementById('modal-title');
    if (titleEl) titleEl.innerText = item.name;
    const descEl = document.getElementById('modal-desc');
    if (descEl) descEl.innerText = item.description || 'อร่อยต้องลอง!';
    const qtyEl = document.getElementById('modal-qty');
    if (qtyEl) qtyEl.innerText = modalQty;
    const noteEl = document.getElementById('modal-note');
    if (noteEl) noteEl.value = '';

    // Options Container
    const optionsContainer = document.getElementById('modal-options');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';

        // TRAY LOGIC (Rich UI)
        if (item.isTray) {
            // Create a specific container for tray options if needed, or just use optionsContainer
            // renderTrayOptions from menu.js expects 'tray-options-container' ID.
            // We'll create it inside modal-options.
            const trayContainer = document.createElement('div');
            trayContainer.id = 'tray-options-container';
            optionsContainer.appendChild(trayContainer);

            if (typeof renderTrayOptions === 'function') {
                renderTrayOptions(item.trayType || 1);
            } else {
                // Fallback if menu.js function missing
                trayContainer.innerHTML = '<p class="text-red-500">Error loading tray options</p>';
            }

            // STANDARD LOGIC (Normal Items)
        } else if (item.reqMeat) {
            const meats = [
                { id: 'pork', name: t('meat_pork'), price: 0 },
                { id: 'chicken', name: t('meat_chicken'), price: 0 },
                { id: 'crispy', name: t('meat_crispy'), price: 15 },
                { id: 'beef', name: t('meat_beef'), price: 20 }
            ];

            const meatDiv = document.createElement('div');
            meatDiv.className = 'mb-4';
            meats.forEach((m, idx) => {
                const isChecked = idx === 0 ? 'checked' : '';
                const label = document.createElement('label');
                label.className = 'modern-option';
                if (isChecked) label.classList.add('selected');
                label.innerHTML = `
                    <input type="radio" name="meat-opt" value="${m.id}" data-price="${m.price}" ${isChecked} onchange="updateModalPrice(); document.querySelectorAll('input[name=\"meat-opt\"]').forEach(r => r.closest('.modern-option').classList.toggle('selected', r.checked));">
                    <span class="option-label">${m.name}</span>
                    ${m.price > 0 ? `<span class="option-price">+${m.price}</span>` : '<span class="option-price"></span>'}
                `;
                meatDiv.appendChild(label);
            });
            optionsContainer.appendChild(meatDiv);
        }

        // 3. Generic addons (For everyone)
        const generalAddons = [
            { id: 'special', name: t('special'), price: 10 },
            { id: 'kaidao', name: t('egg_fried'), price: 10 },
            { id: 'kaikhon', name: t('egg_scrambled'), price: 10 },
            { id: 'kaijiao', name: t('egg_omelet'), price: 10 },
            { id: 'kaiyiewma', name: t('egg_century'), price: 10 },
            { id: 'kaitom', name: t('egg_boiled'), price: 10 },
            { id: 'rice', name: t('rice_extra'), price: 10 }
        ];

        const addonDiv = document.createElement('div');
        addonDiv.className = 'mt-2';
        generalAddons.forEach(a => {
            const label = document.createElement('label');
            label.className = 'modern-option';
            label.innerHTML = `
                <input type="checkbox" class="addon-checkbox" value="${a.id}" data-price="${a.price}" data-name="${a.name}" onchange="updateModalPrice(); this.closest('.modern-option').classList.toggle('selected', this.checked);">
                <span class="option-label">${a.name}</span>
                <span class="option-price">+${a.price}</span>
            `;
            addonDiv.appendChild(label);
        });
        optionsContainer.appendChild(addonDiv);
    }

    updateModalPrice();
    pushModalState('food-modal');

    const overlay = document.getElementById('food-modal');
    const sheet = document.getElementById('food-sheet');
    if (overlay && sheet) {
        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.remove('opacity-0');
            sheet.classList.remove('translate-y-full');
        }, 10);
    }
}

function closeModal(isBackNav = false) {
    if (!isBackNav && currentOpenModal === 'food-modal') {
        history.back();
        return;
    }
    const overlay = document.getElementById('food-modal');
    const sheet = document.getElementById('food-sheet');
    if (overlay && sheet) {
        overlay.classList.add('opacity-0');
        sheet.classList.add('translate-y-full');
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300);
    }
    currentOpenModal = null;
    if (typeof unlockScroll === 'function') unlockScroll();
}

function updateModalPrice() {
    if (!window.isShopOpen) {
        showToast('ขออภัย ร้านปิดให้บริการชั่วคราวครับ', 'error');
        closeModal();
        return;
    }
    if (!currentItem) return;
    let price = currentItem.price;

    // Handle Standard Meat
    const meat = document.querySelector('input[name="meat-opt"]:checked');
    if (meat) price += parseFloat(meat.dataset.price || 0);

    // Handle Tray Meat (if different name)
    const trayMeat = document.querySelector('input[name="tray-meat"]:checked');
    if (trayMeat) price += parseFloat(trayMeat.dataset.price || 0);

    // Handle Standard Egg
    const egg = document.querySelector('input[name="egg-opt"]:checked');
    if (egg) price += parseFloat(egg.dataset.price || 0);

    // Handle Tray Egg
    const trayEgg = document.querySelector('input[name="tray-egg"]:checked');
    if (trayEgg) price += parseFloat(trayEgg.dataset.price || 0);

    // Addons
    document.querySelectorAll('.addon-checkbox:checked').forEach(cb => {
        price += parseFloat(cb.dataset.price || 0);
    });

    const total = price * modalQty;
    const priceDisplay = document.getElementById('modal-price-display');
    if (priceDisplay) priceDisplay.innerText = price;
    const btnTotal = document.getElementById('modal-total-btn');
    if (btnTotal) btnTotal.innerText = `${total} ฿`;

    // Also update tray summary text if function exists
    if (typeof updateTraySummary === 'function' && currentItem.isTray) updateTraySummary();
}

function adjustModalQty(delta) {
    let newQty = modalQty + delta;
    if (newQty < 1) newQty = 1;
    if (newQty > 99) newQty = 99;
    modalQty = newQty;
    const qtyEl = document.getElementById('modal-qty');
    if (qtyEl) qtyEl.innerText = modalQty;
    if (typeof triggerHaptic === 'function') triggerHaptic();
    updateModalPrice();
}

function addToCartFromModal() {
    if (!currentItem) return;
    const noteEl = document.getElementById('modal-note');
    let note = noteEl ? escapeHtml(noteEl.value.trim()) : '';
    const addonNames = [];
    let addonPriceTotal = 0;
    document.querySelectorAll('.addon-checkbox:checked').forEach(cb => {
        addonNames.push(cb.dataset.name);
        addonPriceTotal += parseFloat(cb.dataset.price || 0);
    });

    // --- VALIDATION: Check real-time status ---
    if (window.menuItems) {
        const latestItem = window.menuItems.find(i => i.id === currentItem.id);
        if (latestItem && (latestItem.soldOut === true || latestItem.is_available === false)) {
            showToast('ขออภัย เมนูนี้เพิ่งหมดครับ 😢', 'error');
            closeModal();
            triggerHaptic('heavy');
            return;
        }
    }

    // --- MEAT SELECTION ---
    let meatInfo = '';
    let meatPrice = 0;

    // Try Standard Meat
    const meat = document.querySelector('input[name="meat-opt"]:checked');
    if (meat) {
        const label = meat.closest('label');
        meatInfo = label ? label.querySelector('span.text-sm').innerText : meat.value;
        meatPrice = parseFloat(meat.dataset.price || 0);
    }

    // Try Tray Meat (Priority if exists)
    const trayMeat = document.querySelector('input[name="tray-meat"]:checked');
    if (trayMeat) {
        meatInfo = trayMeat.value; // Tray meat value is usually the name e.g. "กะเพราหมูสับ"
        meatPrice = parseFloat(trayMeat.dataset.price || 0);
    }

    // --- EGG SELECTION ---
    let eggInfo = '';
    let eggPrice = 0;

    // Try Standard Egg
    const egg = document.querySelector('input[name="egg-opt"]:checked');
    if (egg) {
        const label = egg.closest('label');
        eggInfo = label ? label.querySelector('span.text-sm').innerText : egg.value;
        eggPrice = parseFloat(egg.dataset.price || 0);
        if (eggInfo) note = (note ? note + ' ' : '') + `[${eggInfo}]`;
    }

    // Try Tray Egg
    const trayEgg = document.querySelector('input[name="tray-egg"]:checked');
    if (trayEgg) {
        eggInfo = trayEgg.value;
        eggPrice = parseFloat(trayEgg.dataset.price || 0);
        // For tray, egg is part of the set, clearly label it
        if (eggInfo) note = (note ? note + ' ' : '') + `+${eggInfo}`;
    }

    // Required meat validation
    if ((currentItem.reqMeat || (currentItem.isTray)) && !meatInfo) {
        showToast('กรุณาเลือกเนื้อสัตว์', 'warning');
        triggerHaptic('heavy');
        return;
    }

    const unitPrice = currentItem.price + meatPrice + eggPrice + addonPriceTotal;

    for (let i = 0; i < modalQty; i++) {
        cart.push({
            id: Date.now() + i,
            menuItemId: currentItem.id, // Store ID for robust validation
            name: currentItem.name,
            price: unitPrice,
            meat: meatInfo,
            addons: addonNames,
            note: note,
            image: currentItem.image
        });
    }

    // Show fly-to-cart animation
    try {
        const modalImg = document.getElementById('modal-img');
        animateFlyToCart(modalImg, currentItem.icon || '🍱');
    } catch (e) { /* ignore animation errors */ }

    // DISABLED: Mini cart bar
    /*
    const cartBtn = document.getElementById('mini-cart-bar');
    if (cartBtn) {
        cartBtn.classList.remove('hidden');
        cartBtn.style.animation = 'bounce 0.5s ease-out';
        setTimeout(() => cartBtn.style.animation = '', 500);
    }
    */

    closeModal();
    updateMiniCart();
    updateBottomNavBadge();
    saveToLS();
    triggerHaptic();
    showToast(`เพิ่ม ${modalQty} รายการแล้ว! 🛒`, 'success');

    // Animate Bottom Nav Cart Icon
    setTimeout(animateCartIcon, 300); // Slight delay for fly animation to finish
}

function animateCartIcon() {
    const cartIcon = document.querySelector('.bottom-nav-item[data-page="cart"] i');
    if (cartIcon) {
        // Reset animation to re-trigger
        cartIcon.classList.remove('animate-cart-bump');
        void cartIcon.offsetWidth; // Trigger reflow
        cartIcon.classList.add('animate-cart-bump');

        // Also animate the badge if visible
        const badge = document.getElementById('nav-cart-badge');
        if (badge && !badge.classList.contains('hidden')) {
            badge.classList.remove('animate-pop');
            void badge.offsetWidth;
            badge.classList.add('animate-pop');
        }
    }
}

// ----------------------------------------------------
// SUPABASE SYNC FUNCTIONS
// ----------------------------------------------------

window.syncCartToSupabase = async function () {
    if (!window.supabaseClient || !userAvatar.userId) return;
    if (typeof isSyncing !== 'undefined' && isSyncing) return;

    isSyncing = true;
    try {
        const total = cart.reduce((sum, item) => sum + (item.price || 0), 0);

        const { data: existing, error: fetchError } = await window.supabaseClient
            .from('orders')
            .select('id')
            .eq('user_id', userAvatar.userId)
            .eq('status', 'cart')
            .maybeSingle();

        if (existing) {
            await window.supabaseClient
                .from('orders')
                .update({ items: cart, total_price: total, updated_at: new Date() })
                .eq('id', existing.id);
        } else {
            if (cart.length > 0) {
                await window.supabaseClient
                    .from('orders')
                    .insert({ user_id: userAvatar.userId, items: cart, total_price: total, status: 'cart' });
            }
        }

    } catch (err) {
        console.error('Sync Cart Error:', err);
    } finally {
        isSyncing = false;
    }
};

window.loadUserHistory = async function () {
    if (!window.supabaseClient || !userAvatar.userId) return;
    try {
        const { data, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('user_id', userAvatar.userId)
            .neq('status', 'cart')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
            userStats.history = data; // Assuming userStats.history matches structure
            // Update LS
            localStorage.setItem(KEYS.HISTORY, JSON.stringify(data));
            localStorage.setItem(KEYS.STATS, JSON.stringify(userStats));
            // Trigger re-render of history if possible? 
            // History is usually rendered when opening modal.
        }
    } catch (err) {
        console.error('Load History Error:', err);
    }
};

window.loadActiveCart = async function () {
    if (!window.supabaseClient || !userAvatar.userId) return;
    try {
        const { data, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('user_id', userAvatar.userId)
            .eq('status', 'cart')
            .maybeSingle();

        if (data && data.items && Array.isArray(data.items)) {
            console.log("Found cloud cart", data.items.length);
            if (cart.length === 0) {
                cart = data.items;
                updateMiniCart();
                updateBottomNavBadge();
                saveToLS();
                showToast('โหลดตะกร้าเดิมเรียบร้อย! 🛒', 'success');
            }
        }
    } catch (err) {
        console.error('Load Cart Error:', err);
    }
};

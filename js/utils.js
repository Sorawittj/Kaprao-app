// =============================================
// Kaprao52 App - Utility Functions
// =============================================

function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- ENHANCED SECURITY UTILITIES ---
function sanitizeInput(input, options = {}) {
    const {
        maxLength = 200,
        allowHTML = false,
        allowedTags = [],
        trim = true
    } = options;

    if (typeof input !== 'string') return '';

    let sanitized = input;

    // Trim whitespace
    if (trim) {
        sanitized = sanitized.trim();
    }

    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    // Remove or escape HTML
    if (!allowHTML) {
        sanitized = sanitized
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

        // If no allowed tags, escape all HTML
        if (allowedTags.length === 0) {
            sanitized = escapeHtml(sanitized);
        }
    }

    // Remove potential SQL injection patterns
    const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)|(--)|(\/\*)|(\*\/)/gi;
    sanitized = sanitized.replace(sqlPattern, '');

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    return sanitized;
}

function validateOrderId(orderId) {
    // Order ID format: KP-XXXXXX (must match pattern)
    const pattern = /^KP-[A-Z0-9]{6}$/;
    return pattern.test(orderId);
}

function validatePrice(price) {
    // Price must be a positive number, max 10,000
    const num = parseFloat(price);
    return !isNaN(num) && num >= 0 && num <= 10000;
}

function sanitizeJSON(data) {
    try {
        // Parse and stringify to remove any non-serializable data
        return JSON.parse(JSON.stringify(data));
    } catch (e) {
        console.error('JSON sanitization failed:', e);
        return null;
    }
}

function getStandardDate(dateObj) {
    if (!dateObj) dateObj = new Date();
    const d = dateObj.getDate().toString().padStart(2, '0');
    const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const y = dateObj.getFullYear();
    return `${d}/${m}/${y}`;
}

function formatTime(dateObj) {
    if (!dateObj) dateObj = new Date();
    const h = dateObj.getHours().toString().padStart(2, '0');
    const m = dateObj.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function playSound(type) { /* Sound disabled */ }

function triggerHaptic(intensity = 'light') {
    if (navigator.vibrate) navigator.vibrate(intensity === 'heavy' ? [80, 40, 80] : 15);
}

function showGlobalLoader(text = "กำลังโหลด...") {
    document.getElementById('loader-text').innerText = text;
    document.getElementById('global-loader').classList.remove('loader-hidden');
}

function hideGlobalLoader() {
    document.getElementById('global-loader').classList.add('loader-hidden');
}

function requestNotifPermission() {
    if (!("Notification" in window)) { showToast("Browser นี้ไม่รองรับการแจ้งเตือน", 'warning'); return; }
    Notification.requestPermission().then(permission => {
        if (permission === "granted") showToast("เปิดแจ้งเตือนแล้ว! 🔔", 'success');
    });
}

let toastTimeout;
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-msg');
    const icon = document.getElementById('toast-icon');
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.className = '';
    switch (type) {
        case 'success': icon.className = 'fas fa-check-circle'; toast.classList.add('toast-success'); break;
        case 'error': icon.className = 'fas fa-exclamation-circle'; toast.classList.add('toast-error'); break;
        case 'warning': icon.className = 'fas fa-exclamation-triangle'; toast.classList.add('toast-warning'); break;
        default: icon.className = 'fas fa-info-circle'; toast.classList.add('toast-info');
    }
    msg.innerText = message;
    toast.classList.add('show');
    triggerHaptic(type === 'error' ? 'heavy' : 'light');
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

setTimeout(() => hideGlobalLoader(), 3000);

function updateGreeting() {
    const hour = new Date().getHours();
    let text = "สวัสดีครับ, วันนี้กินอะไรดี?";
    if (hour >= 5 && hour < 12) text = "☀️ อรุณสวัสดิ์! รับมื้อเช้าหน่อยไหมครับ?";
    else if (hour >= 12 && hour < 16) text = "🌤️ สวัสดียามบ่าย! เติมพลังกันหน่อย";
    else if (hour >= 16 && hour < 21) text = "🌆 เย็นแล้วนะ! หาอะไรอร่อยๆ กินกันเถอะ";
    else if (hour >= 21 || hour < 5) text = "🌙 หิวดึกๆ ใช่ไหมครับ? เราพร้อมเสิร์ฟ!";
    document.getElementById('greeting-text').innerText = text;
}

function calculateItemUnitPrice(item, options = {}) {
    let total = item.price;
    if (item.isTray) { total += (options.meatPrice || 0); total += (options.eggPrice || 0); }
    if (options.addons && options.addons.length > 0) { total += options.addons.length * 10; }
    return total;
}

function pushModalState(modalId) {
    currentOpenModal = modalId;
    window.history.pushState({ modal: modalId }, null, "");
    lockScroll();
}
function lockScroll() { document.body.classList.add('scroll-locked'); }
function unlockScroll() { document.body.classList.remove('scroll-locked'); }

// Handle browser back button to close modals
window.addEventListener('popstate', function (e) {
    if (currentOpenModal) {
        const modalToClose = currentOpenModal;
        try {
            if (modalToClose === 'food-modal') closeModal(true);
            else if (modalToClose === 'checkout') closeCheckout(true);
            else if (modalToClose === 'tickets') closeMyTickets(true);
            else if (modalToClose === 'avatar') closeAvatarModal(true);
            else if (modalToClose === 'points-history') closePointsHistory(true);
            else if (modalToClose === 'quick-order') closeQuickOrderModal(true);
        } catch (err) {
            console.error('Error closing modal on back:', err);
            currentOpenModal = null;
            unlockScroll();
        }
    }
});

function loadUserDataSafe() {
    try {
        const savedUser = localStorage.getItem(KEYS.USER);
        if (savedUser) {
            const u = JSON.parse(savedUser);
            cart = u.cart || [];
            userAvatar = u.avatar || { image: avatarOptions[0], hat: false, name: 'น้องฝึกหัด' };
            if (u.name) document.getElementById('user-name').value = u.name;
            if (u.userId) userAvatar.userId = u.userId;
        }
        const savedHistory = localStorage.getItem(KEYS.HISTORY);
        if (savedHistory) lottoHistory = JSON.parse(savedHistory) || [];
        if (!Array.isArray(lottoHistory)) lottoHistory = [];
        const savedStats = localStorage.getItem(KEYS.STATS);
        if (savedStats) {
            const parsed = JSON.parse(savedStats) || { points: 0 };
            userStats = { ...userStats, ...parsed };
        }
        const savedFav = localStorage.getItem(KEYS.FAVORITES);
        if (savedFav) favoriteItems = new Set(JSON.parse(savedFav));
    } catch (error) {
        userStats = { points: 0, history: [], orderHistory: [] };
        lottoHistory = [];
    }
}

const saveToLS = debounce(function () {
    let safeNameElement = document.getElementById('user-name');
    let safeName = safeNameElement ? escapeHtml(safeNameElement.value) : '';
    let oldData = {};
    try { oldData = JSON.parse(localStorage.getItem(KEYS.USER)) || {}; } catch (e) { }
    const userState = { ...oldData, cart: cart, name: safeName, avatar: userAvatar };
    localStorage.setItem(KEYS.USER, JSON.stringify(userState));
    localStorage.setItem(KEYS.FAVORITES, JSON.stringify([...favoriteItems]));
    localStorage.setItem(KEYS.STATS, JSON.stringify(userStats));

    // Sync to Supabase
    if (typeof syncCartToSupabase === 'function') syncCartToSupabase();
}, 500);

async function checkForUpdate() {
    try {
        const response = await fetch(window.location.href + '?t=' + new Date().getTime());
        const text = await response.text();
        const serverVerMatch = text.match(/const CURRENT_VERSION = '([\d.]+)'/);
        if (serverVerMatch && serverVerMatch[1]) {
            const serverVer = serverVerMatch[1];
            if (serverVer !== CURRENT_VERSION) window.location.reload();
        }
    } catch (err) { }
}

// NOTE: exportUserData, importUserData, enableSwipeToClose are defined in app.js

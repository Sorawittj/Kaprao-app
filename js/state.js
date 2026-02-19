// =============================================
// Kaprao52 App - Global State (Legacy with New System Bridge)
// =============================================

// Always define legacy globals first
// These are used by old code throughout the app

window.cart = [];
window.currentItem = null;
window.activeCategory = 'kaprao';
window.discountValue = 0;
window.modalQty = 1;
window.userStats = { points: 0, history: [], orderHistory: [] };
window.lottoHistory = [];
window.isSubmitting = false;
window.pointsRedeemed = 0;
window.isPointsActive = false;
window.searchQuery = "";
window.favoriteItems = new Set();
window.isSyncing = false;
window.currentOpenModal = null;
window.isAdminMode = false;

// Wheel of Fortune state
window.wheelSpinning = false;
window.wheelAngle = 0;
window.wheelSpinsToday = 0;
window.MAX_WHEEL_SPINS = 3;

window.avatarOptions = [
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Dog%20face/3D/dog_face_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Cat%20face/3D/cat_face_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Tiger%20face/3D/tiger_face_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Lion/3D/lion_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Monkey%20face/3D/monkey_face_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Elephant/3D/elephant_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Pig%20face/3D/pig_face_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Chicken/3D/chicken_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Panda/3D/panda_3d.png',
    'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/Frog/3D/frog_3d.png'
];
window.userAvatar = { image: window.avatarOptions[0], hat: false, name: 'น้องฝึกหัด', userId: null };

// Sync function - bridges legacy globals with new StateManager
window.syncLegacyState = function() {
    if (!window.appState) {
        console.log('[State] New StateManager not available, using legacy state');
        return;
    }
    
    console.log('[State] Syncing with new StateManager...');
    
    // Two-way sync: When new state changes, update legacy globals
    window.appState.cart.subscribe('items', (newItems) => {
        window.cart = newItems;
        if (typeof updateMiniCart === 'function') updateMiniCart();
        if (typeof updateBottomNavBadge === 'function') updateBottomNavBadge();
    });
    
    window.appState.cart.subscribe('pointsRedeemed', (val) => {
        window.pointsRedeemed = val;
    });
    
    window.appState.cart.subscribe('isPointsActive', (val) => {
        window.isPointsActive = val;
    });
    
    window.appState.user.subscribe('points', (newPoints) => {
        window.userStats.points = newPoints;
        if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
    });
    
    window.appState.user.subscribe('name', (name) => {
        window.userAvatar.name = name;
    });
    
    window.appState.user.subscribe('avatar', (avatar) => {
        window.userAvatar.image = avatar;
    });
    
    window.appState.user.subscribe('id', (id) => {
        window.userAvatar.userId = id;
    });
    
    // Also sync from legacy to new (for functions that modify legacy globals)
    // We do this by keeping them in sync bidirectionally
    
    // Override legacy cart modification functions to also update new state
    const originalCartPush = window.cart.push;
    window.cart.push = function(...args) {
        const result = Array.prototype.push.apply(this, args);
        if (window.appState?.cart) {
            window.appState.cart.replaceState({ items: window.cart });
        }
        return result;
    };
    
    const originalCartSplice = window.cart.splice;
    window.cart.splice = function(...args) {
        const result = Array.prototype.splice.apply(this, args);
        if (window.appState?.cart) {
            window.appState.cart.replaceState({ items: window.cart });
        }
        return result;
    };
    
    console.log('[State] Legacy state synced with StateManager');
};

// Auto-sync when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Delay to ensure all scripts loaded
    setTimeout(window.syncLegacyState, 50);
});

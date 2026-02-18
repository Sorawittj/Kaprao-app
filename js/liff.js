
// =============================================
// Kaprao52 App - Auth & LIFF Integration (Native LIFF + Supabase Guest)
// =============================================

async function initLIFF() {
    console.log("Initializing App Auth...");

    try {
        // 1. Initialize LIFF first (Primary Auth Source)
        if (typeof liff !== 'undefined') {
            try {
                await liff.init({ liffId: MY_LIFF_ID });

                if (liff.isLoggedIn()) {
                    console.log("LIFF Logged In!");
                    const profile = await liff.getProfile();
                    await handleLiffSession(profile);
                    return; // Stop here if LIFF is logged in
                }
            } catch (e) {
                console.warn('LIFF init warning:', e);
            }
        }

        // 2. If LIFF not logged in, check Guest Session
        console.log("LIFF Not Logged In. Checking Guest Session...");
        await checkGuestSession();

    } catch (err) {
        console.error("Auth Init Error:", err);
        checkGuestSession(); // Fallback
    }
}

// 2. Fallback / Guest Session Check
async function checkGuestSession() {
    // Check if we have a saved guest session in Supabase
    const { data: { session } } = await window.supabaseClient.auth.getSession();

    if (session) {
        console.log("Guest Session found:", session.user.id);
        await handleUserSession(session.user);
    } else {
        // Show Login Buttons & Welcome Modal
        const welcomeModal = document.getElementById('welcome-modal');
        const loginBtn = document.getElementById('line-login-btn');
        const moreLoginBtn = document.getElementById('more-login-btn');

        if (loginBtn) loginBtn.classList.remove('hidden');
        if (moreLoginBtn) moreLoginBtn.classList.remove('hidden');
        if (welcomeModal) welcomeModal.classList.remove('hidden');
    }
}

// Global Login Function: LINE (Native)
window.loginWithLine = function () {
    if (typeof liff !== 'undefined' && !liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
    } else {
        alert("LIFF SDK not ready");
    }
};

// Global Login Function: Guest (Supabase)
window.loginGuest = async function () {
    try {
        const { data, error } = await window.supabaseClient.auth.signInAnonymously();
        if (error) throw error;

        if (data?.user) {
            await handleUserSession(data.user);
            showToast('เข้าสู่ระบบ Guest สำเร็จ', 'success');
        }
    } catch (error) {
        console.error("Guest Login Error:", error);
        showToast("ไม่สามารถเข้าสู่ระบบ Guest ได้", 'error');
    }
};

// Handle LINE Profile (Native)
async function handleLiffSession(profile) {
    // FIXED: Check if LINE user ID already exists in profiles first
    // This ensures the same LINE user gets the same Supabase profile for points accumulation
    let supabaseUserId = null;
    let isExistingUser = false;

    try {
        // 1. First, check if this LINE user ID already exists in profiles
        const { data: existingProfile, error: findError } = await window.supabaseClient
            .from('profiles')
            .select('id')
            .eq('line_user_id', profile.userId)
            .maybeSingle();

        if (existingProfile && existingProfile.id) {
            // Found existing profile - use it!
            supabaseUserId = existingProfile.id;
            isExistingUser = true;
            console.log("Found existing profile for LINE user:", profile.userId);
        } else {
            // 2. No existing profile - create new anonymous user
            const { data, error } = await window.supabaseClient.auth.signInAnonymously();
            if (error) throw error;
            supabaseUserId = data.user.id;
            isExistingUser = false;
            console.log("Created new profile for LINE user:", profile.userId);
        }
    } catch (e) {
        console.error("Supabase Auth Error during LIFF init:", e);
        // Fallback: Try to create anonymous user
        try {
            const { data, error } = await window.supabaseClient.auth.signInAnonymously();
            if (error) throw error;
            supabaseUserId = data.user.id;
        } catch (e2) {
            console.error("Failed to create user:", e2);
            return;
        }
    }

    // 2. Set Global State
    // IMPORTANT: We use the Supabase UUID for database operations, but keep LINE info for display
    userAvatar.userId = supabaseUserId; // This must be the UUID for orders table FK
    userAvatar.name = profile.displayName;
    userAvatar.image = profile.pictureUrl;
    userAvatar.isGuest = false;
    userAvatar.lineUserId = profile.userId; // Store LINE ID separately

    // Save to LocalStorage
    localStorage.setItem('kaprao_user_data', JSON.stringify({
        userId: supabaseUserId,
        lineUserId: profile.userId,
        name: profile.displayName,
        image: profile.pictureUrl
    }));

    console.log("LIFF Session Active for:", profile.displayName, "LINE ID:", profile.userId);

    // Update UI
    if (typeof updateAvatarDisplay === 'function') updateAvatarDisplay();

    // Hide Login Buttons
    const loginBtn = document.getElementById('line-login-btn');
    const moreLoginBtn = document.getElementById('more-login-btn');
    if (loginBtn) loginBtn.classList.add('hidden');
    if (moreLoginBtn) moreLoginBtn.classList.add('hidden');

    if (typeof closeWelcome === 'function') closeWelcome(true);

    // Show welcome message based on user status
    if (isExistingUser) {
        showToast(`ยินดีต้อนรับกลับ, ${profile.displayName}! 🎉`, 'success');
    } else {
        showToast(`สวัสดี, ${profile.displayName}! ยินดีต้อนรับสมาชิกใหม่ 👋`, 'success');
    }

    // 3. Sync Profile to Supabase (with line_user_id)
    if (supabaseUserId) {
        try {
            const profileData = {
                id: supabaseUserId, // UUID matching auth.users
                display_name: profile.displayName,
                avatar_url: profile.pictureUrl,
                line_user_id: profile.userId, // Store LINE User ID for mapping
                updated_at: new Date().toISOString()
            };

            const { error } = await window.supabaseClient
                .from('profiles')
                .upsert(profileData, { onConflict: 'id' });

            if (error) {
                // If line_user_id column doesn't exist yet, try without it
                if (error.message && error.message.includes('line_user_id')) {
                    console.warn('line_user_id column not found, syncing without it. Run migration SQL.');
                    await window.supabaseClient
                        .from('profiles')
                        .upsert({
                            id: supabaseUserId,
                            display_name: profile.displayName,
                            avatar_url: profile.pictureUrl,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'id' });
                } else {
                    console.warn("Profile Sync: RLS policy requires SQL migration. Run supabase_full_migration.sql in Supabase SQL Editor.");
                }
            }
        } catch (e) { console.error("Sync Error", e); }

        // 4. Load user stats (points) from Supabase
        try {
            if (typeof syncUserStatsFromServer === 'function') {
                await syncUserStatsFromServer(supabaseUserId);
            }
        } catch (e) { console.warn("Stats sync warning:", e); }

        // 5. Load ticket history from Supabase
        try {
            if (typeof syncTicketHistory === 'function') {
                await syncTicketHistory(supabaseUserId);
            }
        } catch (e) { console.warn("Ticket history sync warning:", e); }

        // 6. Load active cart from Supabase
        try {
            if (typeof window.loadActiveCart === 'function') {
                await window.loadActiveCart();
            }
        } catch (e) { console.warn("Cart load warning:", e); }

        // 7. Load order history from Supabase (New)
        try {
            if (typeof window.loadOrdersFromSupabase === 'function') {
                await window.loadOrdersFromSupabase(supabaseUserId);
            }
        } catch (e) { console.warn("Order history sync warning:", e); }

        // 8. Setup Realtime Sync for new orders (New)
        try {
            if (typeof window.setupUserOrderRealtime === 'function') {
                window.setupUserOrderRealtime(supabaseUserId);
            }
        } catch (e) { console.warn("Realtime sync warning:", e); }
    }
}

// Handle Guest Session (Supabase User Object)
async function handleUserSession(user) {
    // 1. Set Global User State
    userAvatar.userId = user.id; // UUID
    userAvatar.isGuest = user.is_anonymous;

    // If we have saved user_metadata, use it (though rare for anon)
    if (user.user_metadata) {
        const meta = user.user_metadata;
        userAvatar.name = meta.full_name || userAvatar.name;
    }

    if (typeof updateAvatarDisplay === 'function') updateAvatarDisplay();

    const loginBtn = document.getElementById('line-login-btn');
    const moreLoginBtn = document.getElementById('more-login-btn');
    // Guest MUST see login buttons to upgrade
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (moreLoginBtn) moreLoginBtn.classList.remove('hidden');

    if (typeof closeWelcome === 'function') closeWelcome(true);

    // Sync Guest Profile to Supabase (Upsert)
    // REQUIRED for foreign key constraints in 'orders' table
    try {
        const { error } = await window.supabaseClient
            .from('profiles')
            .upsert({
                id: user.id, // Supabase UUID
                display_name: userAvatar.name || 'Guest',
                avatar_url: userAvatar.image,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (error) console.error("Guest Profile Sync Warning:", error.message);
    } catch (e) { console.error("Guest Sync Error", e); }

    // Load user stats from Supabase
    try {
        if (typeof syncUserStatsFromServer === 'function') {
            await syncUserStatsFromServer(user.id);
        }
    } catch (e) { console.warn("Guest stats sync warning:", e); }

    // Load active cart
    try {
        if (typeof window.loadActiveCart === 'function') {
            await window.loadActiveCart();
        }
    } catch (e) { console.warn("Guest cart load warning:", e); }

    // Load order history
    try {
        if (typeof window.loadOrdersFromSupabase === 'function') {
            await window.loadOrdersFromSupabase(user.id);
        }
    } catch (e) { console.warn("Guest order history sync warning:", e); }

    // Setup Realtime Sync
    try {
        if (typeof window.setupUserOrderRealtime === 'function') {
            window.setupUserOrderRealtime(user.id);
        }
    } catch (e) { console.warn("Guest realtime sync warning:", e); }
}

// Init on Load
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure Supabase/LIFF scripts loaded
    setTimeout(initLIFF, 500);
});


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
// Handle LINE Profile (Native)
async function handleLiffSession(profile) {
    // 1. First, ensure we have a valid Supabase Session to perform the write
    // This is critical: The 'profiles.id' MUST be the Supabase Auth UUID, not the LINE ID,
    // because 'orders.user_id' acts as a foreign key to 'auth.users.id'.
    let supabaseUserId = null;

    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            supabaseUserId = session.user.id;
        } else {
            // Sign in anonymously to get a valid UUID
            const { data, error } = await window.supabaseClient.auth.signInAnonymously();
            if (error) throw error;
            supabaseUserId = data.user.id;
        }
    } catch (e) {
        console.error("Supabase Auth Error during LIFF init:", e);
        // Fallback: If auth fails, we can't save legally to DB with RLS but we continue for UI
    }

    // 2. Set Global State
    // IMPORTANT: We use the Supabase UUID for database operations, but keep LINE info for display
    userAvatar.userId = supabaseUserId; // This must be the UUID for orders table FK
    userAvatar.name = profile.displayName;
    userAvatar.image = profile.pictureUrl;
    userAvatar.isGuest = false;
    userAvatar.lineUserId = profile.userId; // Store LINE ID separately if needed

    // Save to LocalStorage
    localStorage.setItem('kaprao_user_data', JSON.stringify({
        userId: supabaseUserId,
        lineUserId: profile.userId,
        name: profile.displayName,
        image: profile.pictureUrl
    }));

    console.log("LIFF Session Active for:", profile.displayName);

    // Update UI
    if (typeof updateAvatarDisplay === 'function') updateAvatarDisplay();

    // Hide Login Buttons
    const loginBtn = document.getElementById('line-login-btn');
    const moreLoginBtn = document.getElementById('more-login-btn');
    if (loginBtn) loginBtn.classList.add('hidden');
    if (moreLoginBtn) moreLoginBtn.classList.add('hidden');

    if (typeof closeWelcome === 'function') closeWelcome(true);

    // 3. Sync Profile to Supabase
    // We bind the LINE profile info to the Supabase User ID (UUID)
    if (supabaseUserId) {
        try {
            const { error } = await window.supabaseClient
                .from('profiles')
                .upsert({
                    id: supabaseUserId, // UUID matching auth.users
                    display_name: profile.displayName,
                    avatar_url: profile.pictureUrl,
                    // You might want to save line_user_id here if you add a column for it
                    updated_at: new Date()
                }, { onConflict: 'id' });

            if (error) console.error("Profile Sync Warning:", error.message);
        } catch (e) { console.error("Sync Error", e); }
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
                updated_at: new Date()
            }, { onConflict: 'id' });

        if (error) console.error("Guest Profile Sync Warning:", error.message);
    } catch (e) { console.error("Guest Sync Error", e); }
}

// Init on Load
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure Supabase/LIFF scripts loaded
    setTimeout(initLIFF, 500);
});


// =============================================
// Kaprao52 App - Auth & LIFF Integration (Supabase)
// =============================================

async function initLIFF() {
    console.log("Initializing App Auth...");

    // 1. Check if Supabase is initialized
    if (typeof window.supabaseClient === 'undefined') {
        console.error("Supabase client not initialized. Check supabase-client.js");
        return;
    }

    try {
        // 2. Check current Supabase session
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();

        if (session) {
            console.log("Session found:", session.user.id);
            await handleUserSession(session.user);
        } else {
            console.log("No session. Prompting login...");
            const welcomeModal = document.getElementById('welcome-modal');
            const loginBtn = document.getElementById('line-login-btn');
            const moreLoginBtn = document.getElementById('more-login-btn');

            // Show login buttons if not logged in
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (moreLoginBtn) moreLoginBtn.classList.remove('hidden');

            // Show welcome modal if not explicitly closed before (optional logic)
            if (welcomeModal) welcomeModal.classList.remove('hidden');

            // Allow LIFF init for window control but NO Auto-Login
            if (typeof liff !== 'undefined') {
                try {
                    await liff.init({ liffId: MY_LIFF_ID });
                } catch (e) { console.log('LIFF init warning:', e); }
            }
        }
    } catch (err) {
        console.error("Auth Init Error:", err);
    }
}

// Global Login Function: LINE
window.loginWithLine = async function () {
    try {
        const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
            provider: 'line',
            options: {
                redirectTo: window.location.href, // Redirect back to this page
                skipBrowserRedirect: false
            }
        });
        if (error) throw error;
    } catch (error) {
        console.error("LINE Login Error:", error);
        alert("Login failed: " + error.message);
    }
};

// Global Login Function: Guest
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

async function handleUserSession(user) {
    // 1. Set Global User State
    userAvatar.userId = user.id;
    userAvatar.isGuest = user.is_anonymous;

    // 2. Get Profile Info (for LINE users)
    if (user.app_metadata.provider === 'line' || user.user_metadata) {
        const meta = user.user_metadata;
        // Construct display name and image
        userAvatar.name = meta.full_name || meta.name || meta.displayName || userAvatar.name;
        userAvatar.image = meta.avatar_url || meta.picture || meta.pictureUrl || userAvatar.image;

        // Update profile in Supabase 'profiles' table asynchronously
        updateProfile(user);
    }

    // 3. Update UI
    const loginBtn = document.getElementById('line-login-btn');
    const moreLoginBtn = document.getElementById('more-login-btn');

    // Hide login buttons if logged in (except maybe for Guests who want to upgrade?)
    // For now, let's hide them if it's a full LINE user.
    // If Guest, we might want to KEEP the login button visible to allow upgrade.

    if (!user.is_anonymous) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (moreLoginBtn) moreLoginBtn.classList.add('hidden');
    } else {
        // If Guest, allow upgrading to LINE
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (moreLoginBtn) moreLoginBtn.classList.remove('hidden');
    }

    // Close welcome modal
    if (typeof closeWelcome === 'function') closeWelcome();

    if (typeof updateAvatarDisplay === 'function') updateAvatarDisplay();
    if (typeof saveToLS === 'function') saveToLS();

    // 4. Sync Data
    if (typeof loadUserHistory === 'function') loadUserHistory(); // Defined in app.js
    if (typeof loadActiveCart === 'function') loadActiveCart();   // Defined in app.js

    // 5. Check Legacy Migration
    if (typeof checkAndMigrateLegacyData === 'function') {
        checkAndMigrateLegacyData(user);
    }
}

async function updateProfile(user) {
    try {
        const updates = {
            id: user.id,
            username: userAvatar.name, // using username col for display name mapping based on schema
            display_name: userAvatar.name,
            avatar_url: userAvatar.image,
            updated_at: new Date(),
        };

        const { error } = await window.supabaseClient.from('profiles').upsert(updates);
        if (error) throw error;
    } catch (error) {
        console.log("Profile update error:", error.message);
    }
}

function handleLogin() {
    loginWithLine();
}

// =============================================
// Kaprao52 App - LIFF Integration
// =============================================

async function initLIFF() {
    if (typeof liff !== 'undefined') {
        try {
            await liff.init({ liffId: MY_LIFF_ID });
            const loginBtn = document.getElementById('line-login-btn');

            if (liff.isLoggedIn()) {
                if (loginBtn) loginBtn.classList.add('hidden');

                const profile = await liff.getProfile();
                userAvatar.userId = profile.userId;
                userAvatar.displayName = profile.displayName;
                userAvatar.pictureUrl = profile.pictureUrl;

                // Sync data from server
                if (typeof syncUserStatsFromServer === 'function') syncUserStatsFromServer(profile.userId);
                if (typeof syncTicketHistory === 'function') syncTicketHistory(profile.userId);
            } else {
                if (loginBtn) loginBtn.classList.remove('hidden');
            }
        } catch (error) {
            console.error("LIFF Init Error:", error);
        }
    }
}

function handleLogin() {
    if (typeof liff !== 'undefined' && !liff.isLoggedIn()) {
        liff.login();
    }
}

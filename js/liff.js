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

                // LINE Profile integration
                if (profile.pictureUrl) {
                    userAvatar.image = profile.pictureUrl;
                }
                if (profile.displayName) {
                    userAvatar.name = profile.displayName;
                    // Also update the name input in checkout if it exists
                    const nameInput = document.getElementById('user-name');
                    if (nameInput) nameInput.value = profile.displayName;
                }

                // Update UI and Save
                if (typeof updateAvatarDisplay === 'function') updateAvatarDisplay();
                if (typeof saveToLS === 'function') saveToLS();

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

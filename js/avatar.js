// =============================================
// Kaprao52 App - Avatar System
// =============================================

function openAvatarModal() {
    pushModalState('avatar');
    const grid = document.getElementById('avatar-grid'); grid.innerHTML = '';
    avatarOptions.forEach(imgSrc => {
        const el = document.createElement('div'); el.className = `avatar-option ${userAvatar.image === imgSrc ? 'avatar-selected' : ''}`;
        el.innerHTML = `<img src="${imgSrc}" alt="avatar">`; el.onclick = () => selectAvatar(imgSrc); grid.appendChild(el);
    });
    document.getElementById('pet-name-input').value = userAvatar.name || '';
    const modal = document.getElementById('avatar-modal'); modal.classList.remove('hidden'); setTimeout(() => modal.classList.remove('opacity-0'), 10);
}

function closeAvatarModal(isBackNav = false) {
    if (!isBackNav && currentOpenModal === 'avatar') { history.back(); return; }
    const modal = document.getElementById('avatar-modal'); modal.classList.add('opacity-0'); setTimeout(() => modal.classList.add('hidden'), 300);
    const nameInput = document.getElementById('pet-name-input').value.trim();
    if (nameInput) { userAvatar.name = escapeHtml(nameInput); const orderNameInput = document.getElementById('user-name'); if (orderNameInput) orderNameInput.value = userAvatar.name; }
    saveToLS(); updateAvatarDisplay(); currentOpenModal = null; unlockScroll();
}

function selectAvatar(imgSrc) {
    userAvatar.image = imgSrc;
    document.querySelectorAll('.avatar-option').forEach(opt => { const img = opt.querySelector('img'); if (img && img.src === imgSrc) opt.classList.add('avatar-selected'); else opt.classList.remove('avatar-selected'); });
    triggerHaptic();
}

function updateAvatarDisplay() {
    document.getElementById('avatar-img').src = userAvatar.image;
    document.getElementById('avatar-name-display').innerText = userAvatar.name || 'ลูกค้า';
}

function closeWelcome() {
    const modal = document.getElementById('welcome-modal'); modal.style.opacity = '0'; modal.style.transition = 'opacity 0.5s ease';
    setTimeout(() => modal.classList.add('hidden'), 500); triggerHaptic();

    // Show bottom nav after welcome modal closes
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) {
        bottomNav.classList.remove('hidden');
        bottomNav.classList.add('show');
    }
}

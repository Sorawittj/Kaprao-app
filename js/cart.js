// ===== CART MANAGEMENT =====

function addToCart(itemToAdd) {
    // This function now expects a pre-built item object from addToCartFromModal()
    // If called with an item, push it to cart directly
    if (itemToAdd && typeof itemToAdd === 'object') {
        // If it has qty, push multiple times
        const qty = itemToAdd.qty || 1;
        for (let i = 0; i < qty; i++) {
            cart.push({
                id: Date.now() + i,
                name: itemToAdd.name,
                price: itemToAdd.price || itemToAdd.totalPrice || 0,
                meat: itemToAdd.meat || null,
                addons: itemToAdd.selectedAddons ? itemToAdd.selectedAddons.map(a => a.name || a) : [],
                note: itemToAdd.note || '',
                image: itemToAdd.image || ''
            });
        }
        triggerHaptic();
        updateMiniCart();
        updateBottomNavBadge();
        saveToLS();
        return;
    }
    // Fallback: no item provided, do nothing
    console.warn('addToCart called without item argument');
}

function updateMiniCart() {
    // Disabled mini cart bar as per UI update
    const miniBar = document.getElementById('mini-cart-bar');
    if (miniBar) miniBar.classList.add('hidden');
    /*
    if (cart.length > 0) {
        miniBar.classList.remove('hidden');
        let total = cart.reduce((sum, i) => sum + i.price, 0);
        document.getElementById('mini-count').innerText = cart.length;
        document.getElementById('mini-total').innerText = total + " ฿";
    } else {
        miniBar.classList.add('hidden');
        document.getElementById('mini-count').innerText = '0';
        document.getElementById('mini-total').innerText = '0 ฿';
    }
    */
}

function removeFromCart(id) {
    const index = cart.findIndex(item => item.id === id);
    if (index !== -1) {
        cart.splice(index, 1);
        saveToLS();
        if (cart.length === 0) { removeDiscount(); resetPointsDiscount(); }
        else if (discountValue > 0) applyDiscount();
        renderCheckoutList();
        updateMiniCart();
        updateBottomNavBadge(); // Update badge on remove
        // if (cart.length === 0) closeCheckout();
        showToast('ลบรายการเรียบร้อย', 'success');
        triggerHaptic();
    }
}

function renderCheckoutList() {
    const container = document.getElementById('cart-list-container');
    const emptyState = document.getElementById('cart-empty-state');
    container.innerHTML = '';

    if (cart.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        updateTotalSummary();
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    cart.forEach(item => {
        const el = document.createElement('div');
        el.className = "flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors";
        let detail = item.meat ? `<span class="text-orange-600 text-xs bg-orange-50 px-2 py-0.5 rounded-full font-medium">${item.meat}</span> ` : '';
        if (item.addons.length) detail += `<span class="text-gray-400 text-xs">+${item.addons.join(', ')}</span>`;
        el.innerHTML = `
            <img src="${item.image || ''}" alt="${item.name}"
                 class="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-gray-100"
                 onerror="this.style.display='none'">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-900 text-sm mb-1">${item.name}</h4>
                <div class="flex flex-wrap items-center gap-1 mb-1">${detail}</div>
                ${item.note ? `<div class="text-[11px] text-gray-400">Note: ${item.note}</div>` : ''}
            </div>
            <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="font-bold text-gray-900">${item.price}.-</span>
                <button onclick="removeFromCart(${item.id})" class="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
        `;
        container.appendChild(el);
    });
    updateTotalSummary();
}

function updateTotalSummary() {
    let subtotal = cart.reduce((sum, i) => sum + i.price, 0);
    let discountFromCode = 0;
    let discountFromPoints = 0;
    const code = document.getElementById('discount-code').value.trim().toUpperCase();
    const promo = promotions.find(p => p.code === code);
    if (promo && subtotal >= promo.minOrder) discountFromCode = promo.value;
    if (pointsRedeemed > 0) discountFromPoints = Math.floor(pointsRedeemed / 100) * 10;
    const netTotal = Math.max(0, subtotal - discountFromCode - discountFromPoints);
    document.getElementById('summary-subtotal').textContent = `${subtotal}.-`;
    document.getElementById('summary-grand-total').textContent = `${netTotal}.-`;
    const discountSummary = document.getElementById('discount-summary');
    const pointsSummary = document.getElementById('points-summary');
    if (discountFromCode > 0) {
        discountSummary.classList.remove('hidden');
        discountSummary.querySelector('span:last-child').textContent = `-${discountFromCode}.-`;
    } else discountSummary.classList.add('hidden');
    if (discountFromPoints > 0) {
        pointsSummary.classList.remove('hidden');
        pointsSummary.querySelector('span:last-child').textContent = `-${discountFromPoints}.-`;
    } else pointsSummary.classList.add('hidden');
    updateCheckoutPointsInfo();
}

function applyDiscount() {
    const code = document.getElementById('discount-code').value.trim().toUpperCase();
    let total = cart.reduce((sum, i) => sum + i.price, 0);
    const msg = document.getElementById('discount-msg');
    const btn = document.getElementById('btn-apply-code');
    discountValue = 0;
    if (code === '') {
        msg.innerText = '';
        btn.innerHTML = 'ใช้';
        btn.className = 'btn-bounce bg-gray-800 text-white font-bold px-4 rounded-xl text-xs shadow-lg hover:bg-gray-700 transition-all';
        btn.onclick = applyDiscount;
        updateTotalSummary();
        return;
    }
    const promo = promotions.find(p => p.code === code);
    if (promo && total >= promo.minOrder) {
        discountValue = promo.value;
        msg.innerHTML = `<span class="text-green-600"><i class="fas fa-check-circle"></i> ใช้โค้ดลด ${promo.value} บาท</span>`;
        btn.innerHTML = '<i class="fas fa-times"></i> ยกเลิก';
        btn.className = 'btn-bounce bg-red-500 hover:bg-red-600 text-white font-bold px-4 rounded-xl text-xs shadow-lg transition-all';
        btn.onclick = removeDiscount;
    } else {
        msg.innerHTML = `<span class="text-red-500">${promo ? 'ต้องสั่งครบ ' + promo.minOrder : 'ไม่พบโค้ด'}</span>`;
        btn.innerHTML = 'ใช้';
        btn.className = 'btn-bounce bg-gray-500 hover:bg-gray-600 text-white font-bold px-4 rounded-xl text-xs shadow-lg transition-all';
        btn.onclick = applyDiscount;
    }
    updateTotalSummary();
}

function removeDiscount() {
    document.getElementById('discount-code').value = '';
    document.getElementById('discount-msg').innerText = '';
    discountValue = 0;
    applyDiscount();
}

function animateFlyToCart(sourceEl, emoji = '🍱') {
    try {
        // Target the bottom nav cart badge or icon
        const target = document.getElementById('nav-cart-badge') || document.querySelector('.bottom-nav-item[data-page="cart"]');
        if (!sourceEl || !target) return Promise.resolve();

        const srcRect = sourceEl.getBoundingClientRect();
        const tgtRect = target.getBoundingClientRect();

        // If target is hidden (e.g. badge hidden initially), target parent
        if (tgtRect.width === 0 && tgtRect.height === 0) {
            const parent = document.querySelector('.bottom-nav-item[data-page="cart"]');
            if (parent) return animateFlyToCart(sourceEl, emoji); // Retry with parent
            return Promise.resolve();
        }

        const fly = document.createElement('div');
        fly.className = 'fly-item';
        fly.innerText = emoji;
        document.body.appendChild(fly);

        const startX = srcRect.left + srcRect.width / 2;
        const startY = srcRect.top + srcRect.height / 2;
        const endX = tgtRect.left + tgtRect.width / 2;
        const endY = tgtRect.top + tgtRect.height / 2;

        const midX = (startX + endX) / 2 + (Math.random() * 80 - 40);
        const midY = Math.min(startY, endY) - 150; // Arc higher

        const keyframes = [
            { transform: `translate(0px, 0px) scale(1)`, opacity: 1 },
            { transform: `translate(${midX - startX}px, ${midY - startY}px) scale(1.2) rotate(${(Math.random() * 20) - 10}deg)`, opacity: 1, offset: 0.5 },
            { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.2) rotate(20deg)`, opacity: 0 }
        ];

        const anim = fly.animate(keyframes, { duration: 800, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
        return new Promise(resolve => { anim.onfinish = () => { fly.remove(); resolve(); }; });
    } catch (e) { return Promise.resolve(); }
}

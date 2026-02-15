// ===== MENU RENDERING & INTERACTIONS =====

// --- SEARCH ---
let searchTimeout = null;
let searchAbortController = null;
const searchDebounceMs = 150;

function toggleSearch() {
    const container = document.getElementById('search-container');
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        document.getElementById('search-input').focus();
    } else {
        container.classList.add('hidden');
        searchQuery = "";
        document.getElementById('search-input').value = "";
        renderMenu();
    }
    triggerHaptic();
}

function handleSearch(val) {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
    }
    if (searchAbortController) {
        searchAbortController.abort();
    }

    const query = val.toLowerCase().trim();

    if (query === '') {
        searchQuery = '';
        renderMenu();
        return;
    }

    searchAbortController = new AbortController();
    searchTimeout = setTimeout(() => {
        if (!searchAbortController.signal.aborted) {
            searchQuery = query;
            renderMenu();

            if (typeof gtag !== 'undefined') {
                gtag('event', 'search', {
                    search_term: query,
                    category: activeCategory
                });
            }
        }
    }, searchDebounceMs);
}

function scrollTabs(amount) { document.getElementById('tabs-container').scrollBy({ left: amount, behavior: 'smooth' }); }

function renderSkeletonLoader() {
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const el = document.createElement('div');
        el.className = "fast-card p-4 flex flex-col shadow-sm";
        el.innerHTML = `<div class="flex flex-col items-center mb-3"><div class="w-20 h-20 rounded-2xl skeleton mb-3"></div><div class="h-4 w-full skeleton rounded mb-2"></div><div class="h-3 w-2/3 skeleton rounded"></div></div><div class="mt-auto pt-3 border-t border-slate-700/50"><div class="h-4 w-1/2 skeleton rounded mb-2"></div><div class="h-10 w-full skeleton rounded"></div></div>`;
        grid.appendChild(el);
    }
}

// --- LAZY LOADING ---
let menuObserver = null;
let lazyImageObserver = null;

function initLazyLoading() {
    const grid = document.getElementById('menu-grid');
    if (!grid) return;

    if (menuObserver) menuObserver.disconnect();

    menuObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                menuObserver.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
    });

    const cards = grid.querySelectorAll('.fast-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `opacity 0.4s ease ${index * 0.03}s, transform 0.4s ease ${index * 0.03}s`;
        menuObserver.observe(card);
    });
}

function initImageLazyLoading() {
    if (lazyImageObserver) lazyImageObserver.disconnect();

    lazyImageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                img.classList.add('loaded');
                lazyImageObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: '100px'
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        lazyImageObserver.observe(img);
    });
}

// --- VIRTUAL SCROLLING ---
let virtualScrollState = {
    itemHeight: 120,
    visibleCount: 10,
    startIndex: 0,
    endIndex: 10
};

// --- RENDER MENU ---
function renderMenu() {
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = '';

    let filteredItems = [];
    if (searchQuery.length > 0) {
        filteredItems = menuItems.filter(i => i.name.toLowerCase().includes(searchQuery));
        document.getElementById('section-title').innerText = `ค้นหา: "${searchQuery}" (${filteredItems.length})`;
    }
    else if (activeCategory === 'favorites') {
        filteredItems = menuItems.filter(i => favoriteItems.has(i.id));
        if (filteredItems.length === 0) {
            grid.innerHTML = `<div class="col-span-2 text-center text-gray-400 mt-10"><div class="text-6xl mb-4 opacity-50">💔</div><p class="font-medium">ยังไม่มีเมนูโปรด</p><p class="text-xs mt-2">กดหัวใจที่เมนูอาหารได้เลยครับ</p></div>`;
            return;
        }
    }
    else { filteredItems = menuItems.filter(i => i.category === activeCategory); }

    if (filteredItems.length === 0 && searchQuery.length > 0) {
        grid.innerHTML = `<div class="col-span-2 text-center text-gray-400 mt-10"><div class="text-6xl mb-4 opacity-50">🔍</div><p>ไม่พบเมนูที่ค้นหาครับ</p></div>`;
        return;
    }

    // Grid Layout Tweaks
    grid.className = "grid grid-cols-2 gap-3 pb-8"; // Ensure grid

    filteredItems.forEach((item, index) => {
        const isDessert = item.category === 'dessert';
        const isSoldOut = item.soldOut || false;
        const isTrayWait = (item.id === 201 || item.id === 202);

        const card = document.createElement('div');
        // Stagger animation
        card.style.animationDelay = `${index * 0.04}s`;

        let cardStateClass = '';
        if (isSoldOut || isTrayWait) cardStateClass = 'grayscale opacity-80';

        card.className = `fast-card stagger-item group bg-white rounded-2xl p-2.5 shadow-sm border border-gray-100 relative overflow-hidden flex flex-col h-full active:scale-95 transition-all duration-200 ${cardStateClass}`;

        // Click handler
        card.onclick = () => {
            if (isTrayWait) { showToast('⚠️ เมนูนี้พร้อมขายหลังปีใหม่ครับ', 'warning'); triggerHaptic('medium'); return; }
            if (isSoldOut) { showToast('⛔ เมนูนี้หมดชั่วคราวครับ', 'error'); triggerHaptic('heavy'); }
            else if (isDessert) { showToast('⏳ เมนูนี้จะพร้อมขายเร็วๆ นี้ครับ', 'info'); triggerHaptic(); }
            else openModal(item);
        };

        // --- Badges ---
        let statusBadge = '';
        if (isTrayWait) statusBadge = `<div class="absolute top-3 right-3 bg-indigo-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md z-20 backdrop-blur-sm">หลังปีใหม่</div>`;
        else if (isSoldOut) statusBadge = `<div class="absolute top-3 right-3 bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md z-20 backdrop-blur-sm">หมด</div>`;
        else if (isDessert) statusBadge = `<div class="absolute top-3 right-3 bg-gray-800/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md z-20 backdrop-blur-sm">เร็วๆ นี้</div>`;

        const newBadge = (item.isNew && !isSoldOut) ? `<div class="absolute top-3 left-3 bg-gradient-to-r from-orange-400 to-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg z-20 animate-pulse border border-white/20 tracking-wider">NEW</div>` : '';

        // --- Favorite Button ---
        const isFav = favoriteItems.has(item.id);
        const heartBtn = (!isSoldOut && !isTrayWait) ? `
            <button onclick="toggleFavorite(event, ${item.id})" 
                class="absolute top-3 right-3 z-30 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm transition-transform active:scale-75 ${isFav ? 'text-red-500' : 'text-gray-300'}">
                <i class="fas fa-heart text-base ${isFav ? 'filter drop-shadow-sm' : ''}"></i>
            </button>` : '';

        // --- Image Area ---
        const imgHTML = `
            <div class="relative w-full aspect-square rounded-xl bg-gray-50 mb-3 overflow-hidden">
                <img src="${item.image}" alt="${item.name}" 
                     class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                     loading="lazy" 
                     onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-5xl\\'>${item.icon || '🍱'}</div>';">
                <div class="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
        `;

        // --- Content Area ---
        const metaHTML = `
            <div class="flex flex-wrap gap-1 mb-2">
                <span class="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">${item.kcal} kcal</span>
                ${item.reqMeat ? '<span class="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">เลือกเนื้อ</span>' : ''}
            </div>
        `;

        const titleHTML = `
            <h3 class="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2 min-h-[2.5rem] group-hover:text-indigo-600 transition-colors">
                ${item.name}
            </h3>
        `;

        // --- Footer Area ---
        const priceValue = (isDessert || isSoldOut || isTrayWait)
            ? `<span class="text-sm font-bold text-gray-300 line-through">${item.price}</span>`
            : `<div class="flex items-baseline gap-0.5"><span class="text-lg font-black text-indigo-600">${item.price}</span><span class="text-xs font-bold text-gray-400">฿</span></div>`;

        const actionBtn = (!isDessert && !isSoldOut && !isTrayWait)
            ? `<button onclick="event.stopPropagation(); const item = menuItems.find(i => i.id === ${item.id}); if(item) openModal(item);" 
                class="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-lg hover:bg-black hover:scale-110 active:scale-90 transition-all">
                <i class="fas fa-plus text-xs"></i>
               </button>`
            : '';

        const footerHTML = `
            <div class="mt-auto pt-2 flex items-center justify-between border-t border-gray-50">
                ${priceValue}
                ${actionBtn}
            </div>
        `;

        card.innerHTML = `
            ${statusBadge || heartBtn}
            ${newBadge}
            ${imgHTML}
            <div class="flex-1 flex flex-col px-1">
                ${titleHTML}
                ${metaHTML}
                ${footerHTML}
            </div>
        `;

        grid.appendChild(card);
    });

    requestAnimationFrame(() => {
        initLazyLoading();
    });
}

function renderPromotions() {
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = '';
    promotions.filter(p => !p.isHidden).forEach((promo, index) => {
        const el = document.createElement('div');
        el.style.animationDelay = `${index * 0.1}s`;
        el.className = "fast-card p-4 flex flex-col cursor-pointer shadow-sm btn-bounce stagger-item col-span-2";
        el.onclick = () => {
            const input = document.getElementById('discount-code');
            if (input) { input.value = promo.code; applyDiscount(); }
            if (navigator.clipboard) navigator.clipboard.writeText(promo.code);
            showToast(`ใช้โค้ด ${promo.code} เรียบร้อย!`, 'success');
            triggerHaptic();
        };
        el.innerHTML = `<div class="flex items-center gap-4"><div class="w-16 h-16 ${promo.color} rounded-2xl flex items-center justify-center text-3xl shadow-lg">${promo.icon}</div><div class="flex-1"><h3 class="font-bold text-gray-800 text-base mb-1">${promo.title}</h3><p class="text-xs text-gray-500 mb-2">${promo.desc}</p><div class="bg-gray-100 inline-block px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 tracking-wider border border-gray-200 shadow-sm">${promo.code}</div></div><div class="text-gray-400 text-xs">แตะเพื่อใช้</div></div>`;
        grid.appendChild(el);
    });
    const wheelDiv = document.createElement('div');
    wheelDiv.className = "w-full fast-card p-6 mt-4 mb-6 shadow-sm flex flex-col items-center stagger-item col-span-2";
    wheelDiv.style.animationDelay = "0.3s";
    wheelDiv.innerHTML = `<h3 class="font-bold text-gray-800 text-lg mb-1">วงล้อลุ้นกินฟรี! 🎡</h3><p class="text-xs text-gray-500 mb-4">ลุ้นรับเมนูราคา 40 บาท ฟรีทันที (3 ครั้ง/วัน)</p><div id="wheel-container"><div class="wheel-pointer"></div><canvas id="wheel-canvas" width="300" height="300"></canvas><div class="wheel-center text-2xl">😋</div></div><button onclick="spinWheel()" class="btn-bounce btn-gradient-purple text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all hover:scale-105">หมุนเลย!</button>`;
    grid.appendChild(wheelDiv);
    setTimeout(drawWheel, 100);
}

function toggleFavorite(e, id) {
    e.stopPropagation();
    if (favoriteItems.has(id)) {
        favoriteItems.delete(id);
        showToast('ลบจากรายการโปรดแล้ว');
    } else {
        favoriteItems.add(id);
        showToast('เพิ่มในรายการโปรดแล้ว ❤️', 'success');
    }
    saveToLS();
    const btn = e.currentTarget;
    btn.classList.add('active');
    setTimeout(() => btn.classList.remove('active'), 500);
    renderMenu();
    triggerHaptic();
}

function switchCategory(cat) {
    if (activeCategory === cat) return;
    activeCategory = cat;
    triggerHaptic();
    const grid = document.getElementById('menu-grid');
    const msg = document.getElementById('dessert-msg');
    grid.classList.add('page-out');
    if (!msg.classList.contains('hidden')) msg.classList.add('page-out');

    const categories = ['favorites', 'kaprao', 'tray', 'garlic', 'curry', 'noodle', 'soup', 'others', 'dessert', 'promotion'];
    categories.forEach(c => {
        const btn = document.getElementById(`tab-${c}`);
        let extraClass = '';
        if (c === 'promotion') extraClass = 'category-pill-promotion';
        else if (c === 'tray') extraClass = 'category-pill-tray';
        else if (c === 'favorites') extraClass = 'category-pill-favorites';

        if (c === cat) btn.className = `category-pill snap-start category-pill-active ${extraClass}`;
        else {
            if (extraClass) extraClass += ' opacity-60';
            btn.className = `category-pill snap-start category-pill-inactive ${extraClass}`;
        }
    });

    setTimeout(() => {
        const title = document.getElementById('section-title');
        msg.classList.add('hidden');
        msg.classList.remove('page-out');
        grid.classList.remove('page-out');
        renderSkeletonLoader();
        setTimeout(() => {
            if (cat === 'promotion') { title.innerText = "คูปอง & โปรโมชั่น"; renderPromotions(); }
            else if (cat === 'dessert') { title.innerText = "เมนูของหวาน"; msg.classList.remove('hidden'); renderMenu(); }
            else if (cat === 'soup') { title.innerText = "เมนูแกง/ต้ม"; renderMenu(); }
            else if (cat === 'tray') { title.innerText = "ชุดถาดสุดคุ้ม"; renderMenu(); }
            else if (cat === 'favorites') { title.innerText = "เมนูที่ชอบ ❤️"; renderMenu(); }
            else if (cat === 'curry') { title.innerText = "เมนูพริกแกง"; renderMenu(); }
            else { title.innerText = "รายการแนะนำ"; renderMenu(); }
            document.getElementById('section-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
            grid.classList.add('page-in');
            setTimeout(() => grid.classList.remove('page-in'), 300);
        }, 50);
    }, 150);
}

// --- TRAY OPTIONS ---
function renderTrayOptions(type) {
    const container = document.getElementById('tray-options-container');
    let html = '';
    if (type === 1) {
        html += `<h4 class="font-bold text-gray-700 mb-2 text-sm">1. เลือกเนื้อสัตว์หลัก</h4><div class="grid grid-cols-2 gap-3 mb-4">`;
        const meats = [{ n: 'กะเพราหมูสับ', p: 0, i: '🐷' }, { n: 'กะเพราไก่ชิ้น', p: 0, i: '🐔' }, { n: 'กะเพราหน่อไม้-หมูสับ', p: 0, i: '🎍' }, { n: 'กะเพราหมูเด้ง', p: 10, i: '🥓' }, { n: 'กะเพราสันคอ', p: 10, i: '🥩' }, { n: 'กะเพราทะเล (กุ้ง/หมึก)', p: 20, i: '🦐' }];
        meats.forEach((m, i) => { html += `<label class="cursor-pointer group relative"><input type="radio" name="tray-meat" value="${m.n}" data-price="${m.p}" aria-label="${m.n}" ${i === 0 ? 'checked' : ''} onchange="updateModalPrice()" class="peer sr-only"><div class="h-full meat-option peer-checked:selected rounded-2xl p-3 flex flex-col items-center justify-center gap-2 transition-all" tabindex="0" role="radio" aria-checked="${i === 0 ? 'true' : 'false'}"><div class="text-3xl filter group-hover:scale-110 transition-transform">${m.i}</div><div class="text-xs font-bold text-center leading-tight">${m.n}</div>${m.p > 0 ? `<div class="text-[10px] text-white bg-orange-500 px-2 py-0.5 rounded-full font-bold">+${m.p}</div>` : ''}<div class="absolute top-2 right-2 opacity-0 peer-checked:opacity-100 text-yellow-400 transition-opacity"><i class="fas fa-check-circle"></i></div></div></label>`; });
        html += `</div><h4 class="font-bold text-gray-700 mb-2 text-sm">2. เลือกไข่คู่ใจ</h4><div class="grid grid-cols-3 gap-2 mb-4">`;
        const eggs = [{ n: 'ไข่ดาว', p: 0, i: '🍳' }, { n: 'ไข่เจียว', p: 5, i: '🥞' }, { n: 'ไข่ข้น', p: 10, i: '🥘' }];
        eggs.forEach((e, i) => { html += `<label class="cursor-pointer group relative"><input type="radio" name="tray-egg" value="${e.n}" data-price="${e.p}" aria-label="${e.n}" ${i === 0 ? 'checked' : ''} onchange="updateModalPrice()" class="peer sr-only"><div class="h-full meat-option peer-checked:selected rounded-2xl p-2 flex flex-col items-center justify-center gap-1 transition-all" tabindex="0" role="radio" aria-checked="${i === 0 ? 'true' : 'false'}"><div class="text-2xl">${e.i}</div><div class="text-xs font-bold text-center">${e.n}</div>${e.p > 0 ? `<div class="text-[9px] text-orange-400 font-bold">+${e.p}</div>` : ''}</div></label>`; });
        html += `</div>`;
    } else if (type === 2) {
        html += `<h4 class="font-bold text-gray-700 mb-2 text-sm">1. เลือกเนื้อสัตว์หลัก (จานยักษ์)</h4><div class="grid grid-cols-2 gap-3 mb-4">`;
        const meats = [{ n: 'กะเพราหมูสับ', p: 0, i: '🐷' }, { n: 'กะเพราไก่ชิ้น', p: 0, i: '🐔' }, { n: 'กะเพราหน่อไม้-หมูสับ', p: 0, i: '🎍' }, { n: 'กะเพราหมูเด้ง', p: 20, i: '🥓' }, { n: 'กะเพราสันคอ', p: 20, i: '🥩' }, { n: 'กะเพราทะเล', p: 30, i: '🦐' }, { n: 'ทูโทน (หมูสับ+ไก่)', p: 10, i: '✨' }];
        meats.forEach((m, i) => { html += `<label class="cursor-pointer group relative"><input type="radio" name="tray-meat" value="${m.n}" data-price="${m.p}" ${i === 0 ? 'checked' : ''} onchange="updateModalPrice()" class="peer sr-only"><div class="h-full meat-option peer-checked:selected rounded-2xl p-3 flex flex-col items-center justify-center gap-2 transition-all"><div class="text-3xl filter group-hover:scale-110 transition-transform">${m.i}</div><div class="text-xs font-bold text-center leading-tight">${m.n}</div>${m.p > 0 ? `<div class="text-[10px] text-white bg-orange-500 px-2 py-0.5 rounded-full font-bold">+${m.p}</div>` : ''}<div class="absolute top-2 right-2 opacity-0 peer-checked:opacity-100 text-yellow-400 transition-opacity"><i class="fas fa-check-circle"></i></div></div></label>`; });
        html += `</div><h4 class="font-bold text-gray-700 mb-2 text-sm">2. เลือกไข่คู่ใจ (ได้ 2 ฟอง)</h4><div class="grid grid-cols-3 gap-2 mb-4">`;
        const eggs = [{ n: 'ไข่ดาวคู่', p: 0, i: '🍳🍳' }, { n: 'ไข่เจียวแผ่นยักษ์', p: 0, i: '🥞' }, { n: 'ไข่ข้นราดข้าว', p: 15, i: '🥘' }];
        eggs.forEach((e, i) => { html += `<label class="cursor-pointer group relative"><input type="radio" name="tray-egg" value="${e.n}" data-price="${e.p}" ${i === 0 ? 'checked' : ''} onchange="updateModalPrice()" class="peer sr-only"><div class="h-full meat-option peer-checked:selected rounded-2xl p-2 flex flex-col items-center justify-center gap-1 transition-all"><div class="text-2xl">${e.i}</div><div class="text-xs font-bold text-center">${e.n}</div>${e.p > 0 ? `<div class="text-[9px] text-orange-400 font-bold">+${e.p}</div>` : ''}</div></label>`; });
        html += `</div>`;
    }
    html += `<div class="mt-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100"><div class="flex items-center gap-2 mb-2"><span class="text-lg">🍱</span><h4 class="text-sm font-bold text-indigo-400">สรุปความอร่อยในถาด:</h4></div><p id="tray-summary-text" class="text-sm text-gray-600 leading-relaxed pl-1"></p><div class="mt-3 pt-2 border-t border-indigo-500/30 flex items-center gap-2 text-[10px] text-indigo-400"><i class="fas fa-utensils"></i><span>เสิร์ฟพร้อมแตงกวาและน้ำซุปฟรี!</span></div></div>`;
    container.innerHTML = html;
    setTimeout(() => document.querySelectorAll('.meat-option')[0]?.classList.add('selected'), 50);
}

function updateTraySummary() {
    if (!currentItem || !currentItem.isTray) return;
    const meat = document.querySelector('input[name="tray-meat"]:checked');
    const egg = document.querySelector('input[name="tray-egg"]:checked');
    const txt = document.getElementById('tray-summary-text');
    if (meat && egg && txt) {
        txt.innerHTML = `<div class="flex justify-between items-center mb-1"><span class="text-gray-500">1. เมนูหลัก:</span><span class="font-bold text-gray-800">${meat.value}</span></div><div class="flex justify-between items-center"><span class="text-gray-500">2. ไข่คู่ใจ:</span><span class="font-bold text-gray-800">${egg.value}</span></div>`;
    }
}

// --- QUICK ORDER & RECOMMENDATIONS ---
function openQuickOrderModal() {
    pushModalState('quick-order');
    const modal = document.getElementById('quick-order-modal');
    const list = document.getElementById('quick-order-list');
    list.innerHTML = '';

    const orderHistory = userStats.orderHistory || [];
    if (orderHistory.length === 0) {
        list.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <i class="fas fa-history text-3xl mb-2 opacity-30"></i>
                <p class="text-sm">ยังไม่มีประวัติการสั่งซื้อ</p>
            </div>
        `;
    } else {
        const uniqueOrders = [];
        const seen = new Set();
        for (const order of orderHistory) {
            const key = order.items.map(i => i.name).join(',');
            if (!seen.has(key)) {
                seen.add(key);
                uniqueOrders.push(order);
                if (uniqueOrders.length >= 5) break;
            }
        }

        uniqueOrders.forEach((order, index) => {
            const el = document.createElement('div');
            el.className = 'bg-white border border-gray-200 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:border-yellow-400 transition-all';
            const itemNames = order.items.slice(0, 2).map(i => i.name).join(', ');
            const moreItems = order.items.length > 2 ? ` +${order.items.length - 2}` : '';
            el.innerHTML = `
                <div class="flex-1">
                    <p class="text-sm font-bold text-gray-800 truncate">${itemNames}${moreItems}</p>
                    <p class="text-xs text-gray-400">${order.date} · ${order.total} ฿</p>
                </div>
                <button onclick="quickReorder(${index})" class="ml-3 w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <i class="fas fa-plus"></i>
                </button>
            `;
            list.appendChild(el);
        });
    }

    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
}

function closeQuickOrderModal(isBackNav = false) {
    if (!isBackNav && currentOpenModal === 'quick-order') { history.back(); return; }
    const modal = document.getElementById('quick-order-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
    currentOpenModal = null;
    unlockScroll();
}

function quickReorder(index) {
    const orderHistory = userStats.orderHistory || [];
    const order = orderHistory[index];
    if (order && order.items) {
        order.items.forEach(item => {
            cart.push({
                id: Date.now() + Math.random(),
                name: item.name,
                price: item.price,
                meat: item.meat || null,
                addons: item.addons || [],
                note: item.note || '',
                image: item.image
            });
        });
        saveToLS();
        updateMiniCart();
        closeQuickOrderModal();
        showToast(`เพิ่ม ${order.items.length} รายการจากประวัติแล้ว!`, 'success');
        triggerHaptic('heavy');
    }
}

function updateRecommendations() {
    const orderHistory = userStats.orderHistory || [];
    const section = document.getElementById('recommended-section');
    const container = document.getElementById('recommended-items');

    if (orderHistory.length < 2) {
        section.classList.add('hidden');
        return;
    }

    const itemCounts = {};
    orderHistory.forEach(order => {
        order.items.forEach(item => {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
        });
    });

    const topItems = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => menuItems.find(m => m.name === name))
        .filter(Boolean);

    if (topItems.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    container.innerHTML = '';

    topItems.forEach(item => {
        const el = document.createElement('div');
        el.className = 'flex-shrink-0 bg-white rounded-xl p-3 border border-gray-200 cursor-pointer hover:border-yellow-400 hover:shadow-md transition-all';
        el.style.width = '140px';
        el.onclick = () => openModal(item);
        el.innerHTML = `
            <div class="text-3xl text-center mb-2">${item.icon}</div>
            <p class="text-xs font-bold text-gray-800 text-center line-clamp-2">${item.name}</p>
            <p class="text-xs text-indigo-500 text-center font-bold mt-1">${item.price} ฿</p>
        `;
        container.appendChild(el);
    });
}

function openRandomizer() {
    const mainDishes = menuItems.filter(i => i.category !== 'dessert' && i.category !== 'promotion' && !i.soldOut && !i.isTray);
    if (mainDishes.length === 0) return showToast("ไม่มีเมนูให้สุ่มจ้า", "error");
    showGlobalLoader("กำลังเสี่ยงทายความอร่อย...");
    setTimeout(() => {
        hideGlobalLoader();
        const randomIndex = Math.floor(Math.random() * mainDishes.length);
        const selectedItem = mainDishes[randomIndex];
        openModal(selectedItem);
        showToast(`🎉 ดวงของคุณวันนี้คือ... ${selectedItem.name}!`, "success");
        triggerHaptic('heavy');
    }, 1500);
}

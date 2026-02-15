// ===== COSMIC EFFECTS & UI ENHANCEMENTS =====

// --- Food Particles Animation System ---
const foodEmojis = ['🍳', '🌶️', '🧄', '🥓', '🍚', '🥘', '🍜', '🍤', '🥩'];
let particlesEnabled = true;
let activeParticles = 0;
const maxParticles = 3;

function createFoodParticle(x, y) {
    if (!particlesEnabled || activeParticles >= maxParticles) return;

    activeParticles++;
    const particle = document.createElement('div');
    particle.textContent = foodEmojis[Math.floor(Math.random() * foodEmojis.length)];
    particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        font-size: 16px; 
        pointer-events: none;
        z-index: 9998;
        opacity: 0.6;
        animation: floatUp 2s ease-out forwards;
    `;
    document.body.appendChild(particle);

    setTimeout(() => {
        particle.remove();
        activeParticles--;
    }, 2000);
}

function initFoodParticles() {
    // Reduced frequency to minimize visual noise
    setInterval(() => {
        if (!particlesEnabled) return;
        if (Math.random() > 0.3) return; // 30% chance only

        const btn = document.querySelector('.add-to-cart-btn');
        if (btn) {
            const rect = btn.getBoundingClientRect();
            createFoodParticle(rect.left + rect.width / 2, rect.top);
        }
    }, 4000);
}

// --- Particle Burst Effect ---
function createParticleBurst(x, y, colors = ['#FCD34D', '#F59E0B', '#FBBF24']) {
    const burst = document.createElement('div');
    burst.className = 'particle-burst';
    burst.style.left = x + 'px';
    burst.style.top = y + 'px';
    document.body.appendChild(burst);

    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        particle.className = 'burst-particle';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        const angle = (i / 12) * Math.PI * 2;
        const distance = 50 + Math.random() * 50;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');

        burst.appendChild(particle);
    }

    setTimeout(() => burst.remove(), 1000);
}

// --- Voice Ordering Simulation ---
let voiceRecognitionActive = false;

function toggleVoiceOrder() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast('เบราว์เซอร์นี้ไม่รองรับการสั่งด้วยเสียง', 'warning');
        return;
    }

    if (voiceRecognitionActive) {
        stopVoiceRecognition();
    } else {
        startVoiceRecognition();
    }
}

function startVoiceRecognition() {
    voiceRecognitionActive = true;
    showVoiceModal();
    setTimeout(() => {
        processVoiceCommand('กะเพราหมูสับไข่ดาวพิเศษ');
    }, 3000);
}

function stopVoiceRecognition() {
    voiceRecognitionActive = false;
    const modal = document.getElementById('voice-modal');
    if (modal) modal.remove();
}

function showVoiceModal() {
    const modal = document.createElement('div');
    modal.id = 'voice-modal';
    modal.className = 'fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center';
    modal.innerHTML = `
        <div class="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center">
            <div class="voice-wave justify-center mb-6">
                ${Array(8).fill(0).map((_, i) => `
                    <div class="voice-wave-bar" style="height: 100%; animation-delay: ${i * 0.1}s"></div>
                `).join('')}
            </div>
            <p class="text-xl font-bold text-gray-800 mb-2">🎤 กำลังฟัง...</p>
            <p class="text-gray-500 text-sm">พูดเมนูที่ต้องการ เช่น "กะเพราหมูสับไข่ดาว"</p>
            <button onclick="stopVoiceRecognition()" class="mt-6 w-full py-3 bg-gray-100 rounded-xl text-gray-600 font-bold">
                ยกเลิก
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

function processVoiceCommand(command) {
    stopVoiceRecognition();

    const match = menuItems.find(item =>
        command.toLowerCase().includes(item.name.toLowerCase()) ||
        command.toLowerCase().includes(item.name.replace('กะเพรา', '').toLowerCase())
    );

    if (match) {
        showToast(`🎤 พบเมนู: ${match.name}`, 'success');
        openModal(match);

        if (command.includes('ไข่ดาว')) {
            setTimeout(() => {
                const eggCheckbox = document.getElementById('modal-opt-kaidao');
                if (eggCheckbox) eggCheckbox.checked = true;
            }, 500);
        }
        if (command.includes('พิเศษ')) {
            setTimeout(() => {
                const specialCheckbox = document.getElementById('modal-opt-special');
                if (specialCheckbox) specialCheckbox.checked = true;
            }, 500);
        }
    } else {
        showToast('ไม่พบเมนูที่ตรงกับเสียง กรุณาลองใหม่', 'warning');
    }
}

// --- AR Preview Feature ---
function showARPreview(item) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-6';
    modal.innerHTML = `
        <div class="ar-preview relative">
            <div class="ar-card bg-white rounded-[2rem] p-6 w-80 text-center relative overflow-hidden">
                <button onclick="this.closest('.fixed').remove()" class="absolute top-4 right-4 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center z-10">
                    <i class="fas fa-times"></i>
                </button>
                
                <div class="text-8xl mb-4 animate-bounce-slow">${item.icon}</div>
                <h3 class="text-2xl font-bold text-gray-800 mb-2">${item.name}</h3>
                <p class="text-3xl font-black text-yellow-500 mb-4">${item.price} ฿</p>
                
                <div class="space-y-2 mb-4">
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                        <i class="fas fa-fire text-orange-500"></i>
                        <span>${item.kcal} kcal</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                        <i class="fas fa-clock text-blue-500"></i>
                        <span>พร้อมใน 5-10 นาที</span>
                    </div>
                </div>
                
                <button onclick="this.closest('.fixed').remove(); openModal(menuItems.find(i => i.id === ${item.id}));" 
                        class="w-full btn-gradient text-white font-bold py-3 rounded-xl">
                    สั่งเลย!
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// --- Social Share Features ---
function shareOrder(orderData) {
    const shareText = `🍳 เพิ่งสั่ง ${orderData.items.length} เมนูจาก Kaprao52!\n💰 ยอดรวม ${orderData.total} บาท\n🔥 สะสมแล้ว ${gamificationData.totalOrders} ครั้ง!\n\nมากินด้วยกัน! 👇`;

    if (navigator.share) {
        navigator.share({
            title: 'Kaprao52 Order',
            text: shareText,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showToast('คัดลอกข้อความแชร์แล้ว!', 'success');
        });
    }
}

// --- Seasonal Themes ---
const SEASONAL_THEMES = {
    SONGKRAN: { month: 3, colors: ['#60A5FA', '#93C5FD'], emoji: '💦' },
    LOYKRATHONG: { month: 10, colors: ['#F472B6', '#FBBF24'], emoji: '🕯️' },
    CHRISTMAS: { month: 11, colors: ['#EF4444', '#10B981'], emoji: '🎄' },
    NEWYEAR: { month: 0, colors: ['#FCD34D', '#F59E0B'], emoji: '🎉' }
};

function checkSeasonalTheme() {
    const month = new Date().getMonth();
    for (const [name, theme] of Object.entries(SEASONAL_THEMES)) {
        if (theme.month === month) {
            applySeasonalTheme(theme);
            return;
        }
    }
}

function applySeasonalTheme(theme) {
    const blob1 = document.querySelector('#blob-container .blob:nth-child(1)');
    const blob2 = document.querySelector('#blob-container .blob:nth-child(2)');
    if (blob1) blob1.style.background = theme.colors[0];
    if (blob2) blob2.style.background = theme.colors[1];

    setTimeout(() => {
        showToast(`🎊 ${theme.emoji} เทศกาลพิเศษ! ธีมเฉพาะกาลถูกเปิดใช้แล้ว`);
    }, 2000);
}

// --- Smart Notifications ---
function scheduleSmartNotifications() {
    const today = new Date().toDateString();
    if (gamificationData.lastOrderDate !== today) {
        console.log('Smart notifications scheduled');
    }
}

// --- 3D Tilt Effect ---
function initTiltEffect() {
    const tiltCards = document.querySelectorAll('.tilt-card');

    tiltCards.forEach(card => {
        let ticking = false;
        card.addEventListener('mousemove', (e) => {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                ticking = false;
            });
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        });
    });
}

// --- Magnetic Button Effect ---
function initMagneticButtons() {
    const magneticBtns = document.querySelectorAll('.magnetic-btn');

    magneticBtns.forEach(btn => {
        let ticking = false;
        btn.addEventListener('mousemove', (e) => {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
                ticking = false;
            });
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        });
    });
}

// --- Text Scramble Effect ---
class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#________';
        this.update = this.update.bind(this);
    }

    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise(resolve => this.resolve = resolve);
        this.queue = [];

        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40);
            this.queue.push({ from, to, start, end });
        }

        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }

    update() {
        let output = '';
        let complete = 0;

        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];

            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="opacity-50">${char}</span>`;
            } else {
                output += from;
            }
        }

        this.el.innerHTML = output;

        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }

    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

// --- Parallax Effect on Scroll ---
function initParallax() {
    const parallaxElements = document.querySelectorAll('.parallax');
    if (!parallaxElements.length) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrolled = window.pageYOffset;
                parallaxElements.forEach(el => {
                    const speed = el.dataset.speed || 0.5;
                    el.style.transform = `translateY(${scrolled * speed}px)`;
                });
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// --- Disabled effects (performance) ---
function initMouseTrail() { return; }
function initSpotlight() { return; }

// --- Floating Elements Randomizer ---
function initFloatingElements() {
    const floats = document.querySelectorAll('.float-random');
    floats.forEach((el, i) => {
        el.style.animationDelay = `${Math.random() * 5}s`;
        el.style.animationDuration = `${3 + Math.random() * 4}s`;
    });
}

// --- Enhanced Confetti with Shapes ---
function enhancedConfetti(options = {}) {
    const shapes = ['square', 'circle', 'triangle'];
    const colors = options.colors || ['#FCD34D', '#F59E0B', '#FBBF24', '#8B5CF6', '#EC4899'];

    for (let i = 0; i < (options.count || 50); i++) {
        const particle = document.createElement('div');
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];

        particle.style.cssText = `
            position: fixed;
            width: ${8 + Math.random() * 8}px;
            height: ${8 + Math.random() * 8}px;
            background: ${color};
            left: ${options.origin ? options.origin.x * 100 : 50}%;
            top: ${options.origin ? options.origin.y * 100 : 50}%;
            pointer-events: none;
            z-index: 9999;
            border-radius: ${shape === 'circle' ? '50%' : shape === 'triangle' ? '0' : '2px'};
        `;

        if (shape === 'triangle') {
            particle.style.background = 'transparent';
            particle.style.borderLeft = '6px solid transparent';
            particle.style.borderRight = '6px solid transparent';
            particle.style.borderBottom = `10px solid ${color}`;
            particle.style.width = '0';
            particle.style.height = '0';
        }

        document.body.appendChild(particle);

        const angle = Math.random() * Math.PI * 2;
        const velocity = 200 + Math.random() * 300;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity - 200;

        particle.animate([
            { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${vx}px, ${window.innerHeight}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
        ], {
            duration: 1500 + Math.random() * 1000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            fill: 'forwards'
        }).onfinish = () => particle.remove();
    }
}

// --- Typewriter Effect ---
function typewriterEffect(element, text, speed = 50) {
    let i = 0;
    element.innerHTML = '';
    element.classList.add('border-r-2', 'border-yellow-500', 'animate-pulse');

    return new Promise(resolve => {
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else {
                element.classList.remove('border-r-2', 'border-yellow-500', 'animate-pulse');
                resolve();
            }
        }
        type();
    });
}

// --- Breathing Animation for Cards ---
function initBreathingAnimation() {
    const cards = document.querySelectorAll('.breathing-card');
    cards.forEach((card, index) => {
        card.style.animation = `breathe 4s ease-in-out ${index * 0.5}s infinite`;
    });
}

// --- Wheel of Fortune ---
function openWheelOfFortune() {
    const prizes = [
        { label: 'ลด 5 บาท', code: 'WHEEL5', value: 5, color: '#EF4444' },
        { label: 'ลด 10 บาท', code: 'WHEEL10', value: 10, color: '#F59E0B' },
        { label: 'ลด 20 บาท', code: 'WHEEL20', value: 20, color: '#10B981' },
        { label: 'ลองใหม่', code: null, value: 0, color: '#6B7280' },
        { label: 'ลด 15 บาท', code: 'WHEEL15', value: 15, color: '#8B5CF6' },
        { label: 'ลองใหม่', code: null, value: 0, color: '#3B82F6' },
        { label: 'ลด 30 บาท', code: 'WHEEL30', value: 30, color: '#EC4899' },
        { label: 'ลองใหม่', code: null, value: 0, color: '#14B8A6' }
    ];

    const today = new Date().toDateString();
    const wheelKey = 'kaprao_wheel_' + today;
    const spinsUsed = parseInt(localStorage.getItem(wheelKey) || '0');

    const modal = document.createElement('div');
    modal.id = 'wheel-modal';
    modal.className = 'fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6';
    modal.innerHTML = `
        <div class="bg-white rounded-[2rem] p-6 max-w-sm w-full text-center relative overflow-hidden">
            <button onclick="document.getElementById('wheel-modal').remove()" class="absolute top-4 right-4 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center z-10">
                <i class="fas fa-times"></i>
            </button>
            <h2 class="text-2xl font-black text-gray-800 mb-2">🎡 วงล้อเสี่ยงโชค</h2>
            <p class="text-sm text-gray-500 mb-4">หมุนเพื่อลุ้นส่วนลด! (${MAX_WHEEL_SPINS - spinsUsed} ครั้ง/วัน)</p>
            
            <div class="relative mx-auto mb-6" style="width: 280px; height: 280px;">
                <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 text-3xl">▼</div>
                <canvas id="wheel-canvas" width="280" height="280" class="transition-transform" style="border-radius: 50%;"></canvas>
            </div>
            
            <button id="spin-btn" onclick="spinWheel()" 
                class="w-full btn-bounce bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-xl ${spinsUsed >= MAX_WHEEL_SPINS ? 'opacity-50 cursor-not-allowed' : ''}"
                ${spinsUsed >= MAX_WHEEL_SPINS ? 'disabled' : ''}>
                ${spinsUsed >= MAX_WHEEL_SPINS ? 'หมดสิทธิ์วันนี้' : '🎰 หมุนเลย!'}
            </button>
        </div>
    `;
    document.body.appendChild(modal);

    // Draw wheel
    drawWheel(prizes);
}

function drawWheel(prizes) {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 5;
    const sliceAngle = (2 * Math.PI) / prizes.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    prizes.forEach((prize, i) => {
        const startAngle = i * sliceAngle + wheelAngle;
        const endAngle = startAngle + sliceAngle;

        // Draw slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = prize.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Kanit, sans-serif';
        ctx.fillText(prize.label, radius - 15, 5);
        ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function spinWheel() {
    if (wheelSpinning) return;

    const today = new Date().toDateString();
    const wheelKey = 'kaprao_wheel_' + today;
    const spinsUsed = parseInt(localStorage.getItem(wheelKey) || '0');

    if (spinsUsed >= MAX_WHEEL_SPINS) {
        showToast('หมดสิทธิ์หมุนวันนี้แล้ว กลับมาใหม่พรุ่งนี้!', 'info');
        return;
    }

    wheelSpinning = true;
    triggerHaptic();

    const prizes = [
        { label: 'ลด 5 บาท', code: 'WHEEL5', value: 5 },
        { label: 'ลด 10 บาท', code: 'WHEEL10', value: 10 },
        { label: 'ลด 20 บาท', code: 'WHEEL20', value: 20 },
        { label: 'ลองใหม่', code: null, value: 0 },
        { label: 'ลด 15 บาท', code: 'WHEEL15', value: 15 },
        { label: 'ลองใหม่', code: null, value: 0 },
        { label: 'ลด 30 บาท', code: 'WHEEL30', value: 30 },
        { label: 'ลองใหม่', code: null, value: 0 }
    ];

    const fullPrizes = [
        { label: 'ลด 5 บาท', code: 'WHEEL5', value: 5, color: '#EF4444' },
        { label: 'ลด 10 บาท', code: 'WHEEL10', value: 10, color: '#F59E0B' },
        { label: 'ลด 20 บาท', code: 'WHEEL20', value: 20, color: '#10B981' },
        { label: 'ลองใหม่', code: null, value: 0, color: '#6B7280' },
        { label: 'ลด 15 บาท', code: 'WHEEL15', value: 15, color: '#8B5CF6' },
        { label: 'ลองใหม่', code: null, value: 0, color: '#3B82F6' },
        { label: 'ลด 30 บาท', code: 'WHEEL30', value: 30, color: '#EC4899' },
        { label: 'ลองใหม่', code: null, value: 0, color: '#14B8A6' }
    ];

    // Weighted random - "ลองใหม่" is more likely
    const weights = [10, 15, 5, 30, 8, 25, 3, 30];
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;
    let winIndex = 0;
    for (let i = 0; i < weights.length; i++) {
        rand -= weights[i];
        if (rand <= 0) { winIndex = i; break; }
    }

    const sliceAngle = (2 * Math.PI) / prizes.length;
    const targetAngle = -(winIndex * sliceAngle + sliceAngle / 2);
    const spinAmount = Math.PI * 2 * (5 + Math.random() * 3); // 5-8 full rotations
    const finalAngle = spinAmount + targetAngle;

    const btn = document.getElementById('spin-btn');
    if (btn) { btn.disabled = true; btn.textContent = '🎡 กำลังหมุน...'; }

    const duration = 4000;
    const startTime = performance.now();
    const startAngle = wheelAngle;

    function animate(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        wheelAngle = startAngle + finalAngle * eased;
        drawWheel(fullPrizes);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            wheelSpinning = false;
            localStorage.setItem(wheelKey, (spinsUsed + 1).toString());

            const prize = prizes[winIndex];
            if (prize.code) {
                confetti();
                showToast(`🎉 ยินดีด้วย! คุณได้ ${prize.label}! ใช้โค้ด: ${prize.code}`, 'success');
            } else {
                showToast('😅 เสียใจด้วย ลองใหม่อีกครั้ง!', 'info');
            }

            const remaining = MAX_WHEEL_SPINS - spinsUsed - 1;
            if (btn) {
                if (remaining <= 0) {
                    btn.textContent = 'หมดสิทธิ์วันนี้';
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    btn.disabled = false;
                    btn.textContent = `🎰 หมุนอีก! (เหลือ ${remaining} ครั้ง)`;
                }
            }
        }
    }
    requestAnimationFrame(animate);
}

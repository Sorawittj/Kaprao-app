// =============================================
// Kaprao52 App - Canvas Background & Confetti
// =============================================

function initCanvasBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    const bubbles = [];
    const icons = ['🍃', '🌶️', '🍳', '🧄', '🥓'];
    let isTabActive = true;
    document.addEventListener('visibilitychange', () => { isTabActive = !document.hidden; });
    function resize() { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; }
    window.addEventListener('resize', resize); resize();
    class Bubble {
        constructor() { this.init(); }
        init() { this.icon = icons[Math.floor(Math.random() * icons.length)]; this.size = Math.random() * 20 + 20; this.x = Math.random() * width; this.y = height + this.size + (Math.random() * 100); this.speed = Math.random() * 0.5 + 0.2; this.opacity = Math.random() * 0.3 + 0.1; this.swingCounter = Math.random() * 10; this.rotation = Math.random() * 360; this.rotationSpeed = (Math.random() - 0.5) * 0.02; }
        draw() { ctx.save(); ctx.globalAlpha = this.opacity; ctx.font = `${this.size}px sans-serif`; ctx.translate(this.x, this.y); ctx.rotate(this.rotation); ctx.fillText(this.icon, -this.size / 2, this.size / 2); ctx.restore(); }
        update() { this.y -= this.speed; this.swingCounter += 0.02; this.x += Math.sin(this.swingCounter) * 0.5; this.rotation += this.rotationSpeed; if (this.y < -this.size) this.init(); this.draw(); }
    }
    for (let i = 0; i < 5; i++) bubbles.push(new Bubble());
    let frameCount = 0;
    function animate() {
        if (!isTabActive) {
            requestAnimationFrame(animate);
            return;
        }
        // Skip every other frame for 30fps instead of 60fps
        frameCount++;
        if (frameCount % 2 === 0) {
            ctx.clearRect(0, 0, width, height);
            bubbles.forEach(b => b.update());
        }
        requestAnimationFrame(animate);
    }
    animate();
}

function confetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const pieces = [];
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];
    for (let i = 0; i < 150; i++) {
        pieces.push({
            x: window.innerWidth / 2, y: window.innerHeight / 2,
            w: Math.random() * 10 + 5, h: Math.random() * 10 + 5,
            vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20 - 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            rot: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 10
        });
    }
    let animId;
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;
        pieces.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.5; p.rot += p.rotSpeed;
            if (p.y < canvas.height) active = true;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
            ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
        });
        if (active) animId = requestAnimationFrame(loop);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    loop();
}

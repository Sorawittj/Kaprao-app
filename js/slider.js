
// --- HERO SLIDER LOGIC ---
let currentHeroSlide = 0;
let heroSliderInterval;
const HERO_SLIDE_DURATION = 5000; // 5 seconds

function initHeroSlider() {
    const wrapper = document.getElementById('hero-wrapper');
    const dots = document.querySelectorAll('.slider-dot');

    if (!wrapper || dots.length === 0) return;

    // Auto play
    startHeroSliderTimer();

    // Touch support (simple swipe)
    let touchStartX = 0;
    let touchEndX = 0;

    wrapper.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        stopHeroSliderTimer(); // Pause on interaction
    }, { passive: true });

    wrapper.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleHeroSwipe();
        startHeroSliderTimer(); // Resume
    }, { passive: true });

    function handleHeroSwipe() {
        if (touchEndX < touchStartX - 50) {
            // Swipe Left -> Next
            goToSlide(currentHeroSlide + 1);
        }
        if (touchEndX > touchStartX + 50) {
            // Swipe Right -> Prev
            goToSlide(currentHeroSlide - 1);
        }
    }
}

function startHeroSliderTimer() {
    stopHeroSliderTimer();
    heroSliderInterval = setInterval(() => {
        goToSlide(currentHeroSlide + 1);
    }, HERO_SLIDE_DURATION);
}

function stopHeroSliderTimer() {
    if (heroSliderInterval) clearInterval(heroSliderInterval);
}

window.goToSlide = function (index) {
    const wrapper = document.getElementById('hero-wrapper');
    const dots = document.querySelectorAll('.slider-dot');
    const slides = document.querySelectorAll('.hero-slide');

    if (!wrapper || !slides.length) return;

    // Loop
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;

    currentHeroSlide = index;

    // Update Transform
    wrapper.style.transform = `translateX(-${index * 100}%)`;

    // Update Dots
    dots.forEach((dot, idx) => {
        if (idx === index) dot.classList.add('active');
        else dot.classList.remove('active');
    });
}

window.scrollToCategory = function (categoryId) {
    // 1. Switch Tab
    if (typeof switchCategory === 'function') {
        switchCategory(categoryId);
    } else {
        console.warn('switchCategory function not found');
    }

    // 2. Scroll to Menu
    const menuGrid = document.getElementById('menu-grid');
    if (menuGrid) {
        // Offset for sticky header/tabs
        const yOffset = -220; // Adjusted for header + tabs
        const y = menuGrid.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    initHeroSlider();
});

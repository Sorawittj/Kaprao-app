// =============================================
// I18N Engine
// =============================================

class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('app_lang') || 'th';
        this.translations = typeof translations !== 'undefined' ? translations : {};
    }

    t(key) {
        if (!this.translations[this.currentLang]) return key;

        // Handle nested keys e.g. "menu.category.kaprao"
        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            value = value[k];
            if (!value) return key; // Fallback to key if not found
        }

        return value;
    }

    setLanguage(lang) {
        if (!this.translations[lang]) {
            console.error('Language not supported:', lang);
            return;
        }
        this.currentLang = lang;
        localStorage.setItem('app_lang', lang);

        // Update language button display
        const langDisplay = document.getElementById('lang-display');
        if (langDisplay) {
            langDisplay.textContent = lang.toUpperCase();
        }

        // Trigger generic page update
        this.updatePage();

        // Notify other components if needed
        if (typeof renderMenu === 'function') renderMenu();
        if (typeof updateBottomNavBadge === 'function') updateBottomNavBadge();
    }

    updatePage() {
        // Find all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);

            if (el.tagName === 'INPUT' && el.type === 'placeholder') {
                el.placeholder = translation;
            } else {
                el.innerText = translation;
            }
        });

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLang;
    }

    getCurrency() {
        // Can be expanded to convert currency
        return this.t('currency_unit');
    }
}

const i18n = new I18n();

// Helper for global access
function t(key) {
    return i18n.t(key);
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
    i18n.updatePage();
});

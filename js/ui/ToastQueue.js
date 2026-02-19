/**
 * =============================================
 * Toast Notification Queue System
 * =============================================
 * Advanced toast system with queue management,
 * priorities, and smooth animations.
 */

class ToastQueue {
    constructor(options = {}) {
        this.container = null;
        this.queue = [];
        this.active = [];
        this.config = {
            maxVisible: 3,
            defaultDuration: 3500,
            position: 'top-right',
            stackDirection: 'down',
            ...options
        };
        
        this.init();
    }

    init() {
        this.createContainer();
        this.injectStyles();
    }

    createContainer() {
        const existing = document.getElementById('toast-queue-container');
        if (existing) existing.remove();

        this.container = document.createElement('div');
        this.container.id = 'toast-queue-container';
        this.container.className = `toast-queue toast-queue-${this.config.position}`;
        document.body.appendChild(this.container);
    }

    injectStyles() {
        if (document.getElementById('toast-queue-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'toast-queue-styles';
        styles.textContent = `
        .toast-queue {
            position: fixed;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 8px;
            pointer-events: none;
            padding: 16px;
        }

        .toast-queue-top-left { top: 0; left: 0; }
        .toast-queue-top-center { top: 0; left: 50%; transform: translateX(-50%); }
        .toast-queue-top-right { top: 0; right: 0; }
        .toast-queue-bottom-left { bottom: 0; left: 0; flex-direction: column-reverse; }
        .toast-queue-bottom-center { bottom: 0; left: 50%; transform: translateX(-50%); flex-direction: column-reverse; }
        .toast-queue-bottom-right { bottom: 0; right: 0; flex-direction: column-reverse; }

        .toast-item {
            pointer-events: auto;
            min-width: 300px;
            max-width: 400px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
            animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
        }

        .toast-item.toast-exit {
            animation: toastSlideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .toast-item.toast-success { border-left: 4px solid #22C55E; }
        .toast-item.toast-error { border-left: 4px solid #EF4444; }
        .toast-item.toast-warning { border-left: 4px solid #F59E0B; }
        .toast-item.toast-info { border-left: 4px solid #3B82F6; }

        .toast-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 14px;
        }

        .toast-success .toast-icon { background: #DCFCE7; color: #166534; }
        .toast-error .toast-icon { background: #FEE2E2; color: #991B1B; }
        .toast-warning .toast-icon { background: #FEF3C7; color: #92400E; }
        .toast-info .toast-icon { background: #DBEAFE; color: #1E40AF; }

        .toast-content {
            flex: 1;
            min-width: 0;
        }

        .toast-message {
            font-size: 14px;
            font-weight: 500;
            color: #1F2937;
            line-height: 1.5;
        }

        .toast-close {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: none;
            background: #F3F4F6;
            color: #6B7280;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            transition: all 0.2s;
            flex-shrink: 0;
        }

        .toast-close:hover {
            background: #E5E7EB;
            color: #374151;
        }

        .toast-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: currentColor;
            opacity: 0.2;
            animation: toastProgress linear forwards;
        }

        .toast-success .toast-progress { background: #22C55E; }
        .toast-error .toast-progress { background: #EF4444; }
        .toast-warning .toast-progress { background: #F59E0B; }
        .toast-info .toast-progress { background: #3B82F6; }

        @keyframes toastSlideIn {
            from { opacity: 0; transform: translateX(100%); }
            to { opacity: 1; transform: translateX(0); }
        }

        @keyframes toastSlideOut {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(100%); }
        }

        @keyframes toastProgress {
            from { width: 100%; }
            to { width: 0%; }
        }

        @media (max-width: 640px) {
            .toast-queue {
                left: 16px !important;
                right: 16px !important;
                padding: 8px;
            }
            .toast-item {
                min-width: auto;
                max-width: none;
                width: 100%;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .toast-item { animation: none; }
            .toast-progress { animation: none; display: none; }
        }
        `;
        
        document.head.appendChild(styles);
    }

    add(message, type = 'info', options = {}) {
        const toast = {
            id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message,
            type,
            duration: options.duration || this.config.defaultDuration,
            priority: options.priority || 0,
            dismissible: options.dismissible !== false,
            createdAt: Date.now()
        };

        this.queue.push(toast);
        this.queue.sort((a, b) => b.priority - a.priority);

        this.processQueue();
        return toast.id;
    }

    processQueue() {
        while (this.active.length < this.config.maxVisible && this.queue.length > 0) {
            const toast = this.queue.shift();
            this.showToast(toast);
        }
    }

    showToast(toast) {
        this.active.push(toast);

        const el = document.createElement('div');
        el.className = `toast-item toast-${toast.type}`;
        el.id = toast.id;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '!',
            info: 'i'
        };

        el.innerHTML = `
            <div class="toast-icon">${icons[toast.type]}</div>
            <div class="toast-content">
                <div class="toast-message">${this.escapeHtml(toast.message)}</div>
            </div>
            ${toast.dismissible ? `<button class="toast-close">✕</button>` : ''}
            <div class="toast-progress" style="animation-duration: ${toast.duration}ms"></div>
        `;

        if (toast.dismissible) {
            el.querySelector('.toast-close').addEventListener('click', () => {
                this.dismiss(toast.id);
            });
        }

        el.addEventListener('click', (e) => {
            if (e.target === el || e.target.closest('.toast-content')) {
                this.dismiss(toast.id);
            }
        });

        this.container.appendChild(el);

        toast.timeout = setTimeout(() => {
            this.dismiss(toast.id);
        }, toast.duration);

        if (window.triggerHaptic) {
            window.triggerHaptic(toast.type === 'error' ? 'heavy' : 'light');
        }
    }

    dismiss(id) {
        const index = this.active.findIndex(t => t.id === id);
        if (index === -1) return;

        const toast = this.active[index];
        
        if (toast.timeout) {
            clearTimeout(toast.timeout);
        }

        const el = document.getElementById(id);
        if (el) {
            el.classList.add('toast-exit');
            
            setTimeout(() => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            }, 300);
        }

        this.active.splice(index, 1);
        setTimeout(() => this.processQueue(), 100);
    }

    dismissAll() {
        [...this.active].forEach(toast => this.dismiss(toast.id));
        this.queue = [];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    success(message, options = {}) {
        return this.add(message, 'success', options);
    }

    error(message, options = {}) {
        return this.add(message, 'error', { duration: 5000, ...options });
    }

    warning(message, options = {}) {
        return this.add(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.add(message, 'info', options);
    }
}

const toastQueue = new ToastQueue({
    position: 'top-right',
    maxVisible: 3
});

window.showToast = (message, type = 'info', duration = 3500) => {
    toastQueue.add(message, type, { duration });
};

window.toastQueue = toastQueue;
window.ToastQueue = ToastQueue;

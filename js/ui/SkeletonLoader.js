/**
 * =============================================
 * Skeleton Loader Component
 * =============================================
 * Beautiful loading placeholders for better perceived performance
 */

class SkeletonLoader {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        this.options = {
            type: 'card',
            count: 6,
            animate: true,
            ...options
        };
        this.skeleton = null;
    }

    static getTemplates() {
        return {
            menu: `
                <div class="skeleton-menu-grid">
                    {[cards]}
                </div>
            `,
            menuCard: `
                <div class="skeleton-card">
                    <div class="skeleton-image shimmer"></div>
                    <div class="skeleton-content">
                        <div class="skeleton-title shimmer"></div>
                        <div class="skeleton-meta shimmer"></div>
                        <div class="skeleton-price shimmer"></div>
                    </div>
                </div>
            `,
            list: `
                <div class="skeleton-list">
                    {[items]}
                </div>
            `,
            listItem: `
                <div class="skeleton-list-item">
                    <div class="skeleton-avatar shimmer"></div>
                    <div class="skeleton-lines">
                        <div class="skeleton-line shimmer"></div>
                        <div class="skeleton-line short shimmer"></div>
                    </div>
                </div>
            `,
            text: `
                <div class="skeleton-text">
                    <div class="skeleton-line shimmer"></div>
                    <div class="skeleton-line shimmer"></div>
                    <div class="skeleton-line short shimmer"></div>
                </div>
            `,
            checkout: `
                <div class="skeleton-checkout">
                    <div class="skeleton-header shimmer"></div>
                    {[items]}
                    <div class="skeleton-footer shimmer"></div>
                </div>
            `,
            checkoutItem: `
                <div class="skeleton-checkout-item">
                    <div class="skeleton-thumb shimmer"></div>
                    <div class="skeleton-details">
                        <div class="skeleton-line shimmer"></div>
                        <div class="skeleton-line short shimmer"></div>
                    </div>
                    <div class="skeleton-price shimmer"></div>
                </div>
            `
        };
    }

    show() {
        if (!this.container) return;
        
        this.hide();
        
        const html = this.generateHTML();
        this.skeleton = document.createElement('div');
        this.skeleton.className = 'skeleton-container';
        this.skeleton.innerHTML = html;
        
        this.container.appendChild(this.skeleton);
        
        requestAnimationFrame(() => {
            this.skeleton.classList.add('skeleton-visible');
        });
        
        return this;
    }

    hide() {
        if (this.skeleton && this.skeleton.parentNode) {
            this.skeleton.classList.remove('skeleton-visible');
            this.skeleton.classList.add('skeleton-hidden');
            
            setTimeout(() => {
                if (this.skeleton && this.skeleton.parentNode) {
                    this.skeleton.parentNode.removeChild(this.skeleton);
                }
                this.skeleton = null;
            }, 300);
        }
        return this;
    }

    generateHTML() {
        const { type, count } = this.options;
        const templates = SkeletonLoader.getTemplates();
        
        switch (type) {
            case 'menu':
                const cards = Array(count).fill(templates.menuCard).join('');
                return templates.menu.replace('{[cards]}', cards);
                
            case 'list':
                const items = Array(count).fill(templates.listItem).join('');
                return templates.list.replace('{[items]}', items);
                
            case 'checkout':
                const checkoutItems = Array(3).fill(templates.checkoutItem).join('');
                return templates.checkout.replace('{[items]}', checkoutItems);
                
            case 'text':
                return templates.text;
                
            default:
                return templates.menuCard;
        }
    }

    static showIn(container, type = 'menu', count = 6) {
        const loader = new SkeletonLoader(container, { type, count });
        loader.show();
        return loader;
    }

    static showMenuGrid(container) {
        return SkeletonLoader.showIn(container, 'menu', 6);
    }

    static showList(container, count = 5) {
        return SkeletonLoader.showIn(container, 'list', count);
    }

    static showCheckout(container) {
        return SkeletonLoader.showIn(container, 'checkout', 3);
    }
}

// CSS for skeleton loaders
const skeletonStyles = document.createElement('style');
skeletonStyles.id = 'skeleton-styles';
skeletonStyles.textContent = `
.skeleton-container {
    opacity: 0;
    transition: opacity 0.3s ease;
}

.skeleton-visible {
    opacity: 1;
}

.skeleton-hidden {
    opacity: 0;
}

.shimmer {
    background: linear-gradient(
        90deg,
        #f0f0f0 25%,
        #e8e8e8 50%,
        #f0f0f0 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

.skeleton-menu-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 16px;
}

.skeleton-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.skeleton-image {
    width: 100%;
    aspect-ratio: 1;
    background: #f0f0f0;
}

.skeleton-content {
    padding: 12px;
}

.skeleton-title {
    height: 16px;
    width: 80%;
    border-radius: 4px;
    margin-bottom: 8px;
}

.skeleton-meta {
    height: 12px;
    width: 50%;
    border-radius: 4px;
    margin-bottom: 12px;
}

.skeleton-price {
    height: 20px;
    width: 40%;
    border-radius: 4px;
}

.skeleton-list {
    padding: 16px;
}

.skeleton-list-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
}

.skeleton-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    flex-shrink: 0;
}

.skeleton-lines {
    flex: 1;
}

.skeleton-line {
    height: 12px;
    border-radius: 4px;
    margin-bottom: 8px;
}

.skeleton-line.short {
    width: 60%;
}

.skeleton-checkout {
    padding: 16px;
}

.skeleton-header {
    height: 24px;
    width: 40%;
    border-radius: 4px;
    margin-bottom: 16px;
}

.skeleton-checkout-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
}

.skeleton-thumb {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    flex-shrink: 0;
}

.skeleton-details {
    flex: 1;
}

.skeleton-footer {
    height: 48px;
    border-radius: 12px;
    margin-top: 16px;
}

.skeleton-card:nth-child(1) .shimmer { animation-delay: 0s; }
.skeleton-card:nth-child(2) .shimmer { animation-delay: 0.1s; }
.skeleton-card:nth-child(3) .shimmer { animation-delay: 0.2s; }
.skeleton-card:nth-child(4) .shimmer { animation-delay: 0.3s; }
.skeleton-card:nth-child(5) .shimmer { animation-delay: 0.4s; }
.skeleton-card:nth-child(6) .shimmer { animation-delay: 0.5s; }

@media (prefers-reduced-motion: reduce) {
    .shimmer {
        animation: none;
        background: #f0f0f0;
    }
}
`;

document.head.appendChild(skeletonStyles);

window.SkeletonLoader = SkeletonLoader;

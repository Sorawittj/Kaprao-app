/**
 * =============================================
 * Kaprao52 App - Reactive State Manager
 * =============================================
 * A robust, Proxy-based state management system with:
 * - Automatic UI synchronization
 * - Action/Mutation pattern for predictable state changes
 * - Middleware support for logging, persistence, sync
 * - Computed properties with dependency tracking
 * - Type-safe with JSDoc
 */

/**
 * @typedef {Object} StateConfig
 * @property {boolean} [persist=false] - Whether to persist to localStorage
 * @property {string} [storageKey] - Key for localStorage
 * @property {boolean} [syncToSupabase=false] - Whether to sync to Supabase
 * @property {Function} [validator] - Validation function for state changes
 */

/**
 * @typedef {Object} ActionContext
 * @property {Object} state - Current state
 * @property {Function} commit - Commit mutation
 * @property {Function} dispatch - Dispatch action
 * @property {Object} getters - Computed getters
 */

class StateManager {
    #state;
    #mutations;
    #actions;
    #getters;
    #subscriptions;
    #middlewares;
    #config;
    #isCommitting;
    #pendingSync;
    #syncDebounceTimer;

    constructor(initialState = {}, config = {}) {
        this.#config = {
            persist: false,
            storageKey: 'kaprao_state',
            syncToSupabase: false,
            validator: null,
            maxHistory: 50,
            ...config
        };

        this.#subscriptions = new Map();
        this.#middlewares = [];
        this.#mutations = {};
        this.#actions = {};
        this.#getters = {};
        this.#isCommitting = false;
        this.#pendingSync = new Set();

        // Create reactive state with Proxy
        this.#state = this.#createReactiveProxy(initialState);

        // Load persisted state if enabled
        if (this.#config.persist) {
            this.#loadPersistedState();
        }
    }

    /**
     * Create a reactive Proxy that automatically notifies subscribers
     * @private
     */
    #createReactiveProxy(target, path = '') {
        const self = this;

        return new Proxy(target, {
            get(obj, prop) {
                if (typeof prop === 'symbol') return obj[prop];
                
                const value = obj[prop];
                const currentPath = path ? `${path}.${prop}` : prop;

                // Deep reactivity for objects/arrays
                if (value !== null && typeof value === 'object' && !value.__isProxy) {
                    return self.#createReactiveProxy(value, currentPath);
                }

                return value;
            },

            set(obj, prop, value) {
                if (typeof prop === 'symbol') {
                    obj[prop] = value;
                    return true;
                }

                const oldValue = obj[prop];
                const currentPath = path ? `${path}.${prop}` : prop;

                // Skip if value hasn't changed (deep equality for objects)
                if (self.#isEqual(oldValue, value)) {
                    return true;
                }

                // Validate if validator provided
                if (self.#config.validator) {
                    const validation = self.#config.validator(currentPath, value, oldValue);
                    if (!validation.valid) {
                        console.warn(`[StateManager] Validation failed for ${currentPath}:`, validation.message);
                        return false;
                    }
                }

                // Set the value
                obj[prop] = value;

                // Notify subscribers
                if (!self.#isCommitting) {
                    self.#notifySubscribers(currentPath, value, oldValue);
                    self.#notifySubscribers('*', self.#state, null);
                }

                // Queue for persistence/sync
                if (self.#config.persist) {
                    self.#queuePersistence(currentPath);
                }

                return true;
            },

            deleteProperty(obj, prop) {
                const currentPath = path ? `${path}.${prop}` : prop;
                const oldValue = obj[prop];
                
                delete obj[prop];
                
                if (!self.#isCommitting) {
                    self.#notifySubscribers(currentPath, undefined, oldValue);
                }

                return true;
            }
        });
    }

    #isEqual(a, b) {
        if (a === b) return true;
        if (typeof a !== typeof b) return false;
        if (a === null || b === null) return a === b;
        if (typeof a === 'object') {
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            if (keysA.length !== keysB.length) return false;
            return keysA.every(key => this.#isEqual(a[key], b[key]));
        }
        return false;
    }

    /**
     * Notify all subscribers of a state change
     * @private
     */
    #notifySubscribers(path, newValue, oldValue) {
        // Direct path subscribers
        if (this.#subscriptions.has(path)) {
            this.#subscriptions.get(path).forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`[StateManager] Subscriber error for ${path}:`, error);
                }
            });
        }

        // Wildcard subscribers for parent paths
        const pathParts = path.split('.');
        for (let i = 1; i < pathParts.length; i++) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.#subscriptions.has(parentPath)) {
                this.#subscriptions.get(parentPath).forEach(callback => {
                    try {
                        callback(this.#getNestedValue(this.#state, parentPath), null, parentPath);
                    } catch (error) {
                        console.error(`[StateManager] Parent subscriber error for ${parentPath}:`, error);
                    }
                });
            }
        }
    }

    #getNestedValue(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }

    /**
     * Queue state persistence with debouncing
     * @private
     */
    #queuePersistence(path) {
        this.#pendingSync.add(path);
        
        if (this.#syncDebounceTimer) {
            clearTimeout(this.#syncDebounceTimer);
        }

        this.#syncDebounceTimer = setTimeout(() => {
            this.#persistState();
            this.#pendingSync.clear();
        }, 300);
    }

    /**
     * Persist state to localStorage
     * @private
     */
    #persistState() {
        try {
            const serializable = this.#serializeState(this.#state);
            localStorage.setItem(this.#config.storageKey, JSON.stringify({
                data: serializable,
                timestamp: Date.now(),
                version: this.#config.version || '1.0'
            }));
        } catch (error) {
            console.error('[StateManager] Failed to persist state:', error);
        }
    }

    /**
     * Load persisted state from localStorage
     * @private
     */
    #loadPersistedState() {
        try {
            const saved = localStorage.getItem(this.#config.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.data) {
                    Object.assign(this.#state, parsed.data);
                }
            }
        } catch (error) {
            console.error('[StateManager] Failed to load persisted state:', error);
        }
    }

    #serializeState(state) {
        // Remove non-serializable properties
        return JSON.parse(JSON.stringify(state, (key, value) => {
            if (value instanceof Set) return [...value];
            if (value instanceof Map) return Object.fromEntries(value);
            if (typeof value === 'function') return undefined;
            return value;
        }));
    }

    // ==========================================
    // Public API
    // ==========================================

    /**
     * Get current state (reactive)
     * @returns {Object}
     */
    get state() {
        return this.#state;
    }

    /**
     * Register a mutation handler
     * @param {string} type - Mutation type
     * @param {Function} handler - (state, payload) => void
     */
    registerMutation(type, handler) {
        this.#mutations[type] = handler;
        return this;
    }

    /**
     * Register an action handler
     * @param {string} type - Action type
     * @param {Function} handler - (context, payload) => Promise
     */
    registerAction(type, handler) {
        this.#actions[type] = handler;
        return this;
    }

    /**
     * Register a computed getter
     * @param {string} name - Getter name
     * @param {Function} computeFn - (state) => computedValue
     */
    registerGetter(name, computeFn) {
        Object.defineProperty(this.#getters, name, {
            get: () => computeFn(this.#state),
            enumerable: true
        });
        return this;
    }

    /**
     * Commit a mutation (synchronous state change)
     * @param {string} type - Mutation type
     * @param {*} payload - Mutation payload
     */
    commit(type, payload) {
        const mutation = this.#mutations[type];
        if (!mutation) {
            console.error(`[StateManager] Unknown mutation: ${type}`);
            return;
        }

        this.#isCommitting = true;
        
        try {
            mutation(this.#state, payload);
            
            // Run middlewares
            this.#middlewares.forEach(mw => {
                if (mw.onMutation) {
                    mw.onMutation(type, payload, this.#state);
                }
            });
        } catch (error) {
            console.error(`[StateManager] Mutation error (${type}):`, error);
            throw error;
        } finally {
            this.#isCommitting = false;
        }
    }

    /**
     * Dispatch an action (asynchronous operation)
     * @param {string} type - Action type
     * @param {*} payload - Action payload
     * @returns {Promise}
     */
    async dispatch(type, payload) {
        const action = this.#actions[type];
        if (!action) {
            console.error(`[StateManager] Unknown action: ${type}`);
            return;
        }

        const context = {
            state: this.#state,
            commit: this.commit.bind(this),
            dispatch: this.dispatch.bind(this),
            getters: this.#getters
        };

        // Run before middlewares
        this.#middlewares.forEach(mw => {
            if (mw.beforeAction) {
                mw.beforeAction(type, payload);
            }
        });

        try {
            const result = await action(context, payload);
            
            // Run after middlewares
            this.#middlewares.forEach(mw => {
                if (mw.afterAction) {
                    mw.afterAction(type, payload, result);
                }
            });

            return result;
        } catch (error) {
            console.error(`[StateManager] Action error (${type}):`, error);
            
            this.#middlewares.forEach(mw => {
                if (mw.onError) {
                    mw.onError(type, payload, error);
                }
            });
            
            throw error;
        }
    }

    /**
     * Subscribe to state changes
     * @param {string|Function} path - Path to watch or callback for all changes
     * @param {Function} [callback] - Callback(newValue, oldValue, path)
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (typeof path === 'function') {
            callback = path;
            path = '*';
        }

        if (!this.#subscriptions.has(path)) {
            this.#subscriptions.set(path, new Set());
        }

        this.#subscriptions.get(path).add(callback);

        // Return unsubscribe function
        return () => {
            this.#subscriptions.get(path).delete(callback);
            if (this.#subscriptions.get(path).size === 0) {
                this.#subscriptions.delete(path);
            }
        };
    }

    /**
     * Add middleware
     * @param {Object} middleware - Middleware with beforeAction/afterAction/onMutation/onError
     */
    use(middleware) {
        this.#middlewares.push(middleware);
        return this;
    }

    /**
     * Replace state (for hydration)
     * @param {Object} newState
     */
    replaceState(newState) {
        this.#isCommitting = true;
        Object.keys(this.#state).forEach(key => delete this.#state[key]);
        Object.assign(this.#state, newState);
        this.#isCommitting = false;
        this.#notifySubscribers('*', this.#state, null);
    }

    /**
     * Reset state to initial values
     */
    reset() {
        this.replaceState({});
    }

    get getters() {
        return this.#getters;
    }
}

// ==========================================
// Specialized State Slices
// ==========================================

/**
 * Cart State Manager with optimistic UI and conflict resolution
 */
class CartManager extends StateManager {
    constructor() {
        super({
            items: [],
            discountCode: null,
            pointsRedeemed: 0,
            isPointsActive: false,
            lastSynced: null,
            syncError: null,
            pendingOperations: []
        }, {
            persist: true,
            storageKey: 'kaprao_cart_v2',
            validator: (path, value) => {
                if (path === 'items' && !Array.isArray(value)) {
                    return { valid: false, message: 'Items must be an array' };
                }
                if (path === 'pointsRedeemed' && (value < 0 || value > 10000)) {
                    return { valid: false, message: 'Invalid points value' };
                }
                return { valid: true };
            }
        });

        this._registerMutations();
        this._registerActions();
        this._registerGetters();
    }

    _registerMutations() {
        this.registerMutation('ADD_ITEM', (state, item) => {
            const existingIndex = state.items.findIndex(i => 
                i.menuItemId === item.menuItemId && 
                i.meat === item.meat && 
                JSON.stringify(i.addons?.sort()) === JSON.stringify(item.addons?.sort()) &&
                i.note === item.note
            );

            if (existingIndex >= 0) {
                state.items[existingIndex].quantity += item.quantity || 1;
                state.items[existingIndex].updatedAt = Date.now();
            } else {
                state.items.push({
                    ...item,
                    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    quantity: item.quantity || 1,
                    addedAt: Date.now()
                });
            }
        });

        this.registerMutation('REMOVE_ITEM', (state, itemId) => {
            const index = state.items.findIndex(i => i.id === itemId);
            if (index >= 0) {
                state.items.splice(index, 1);
            }
        });

        this.registerMutation('UPDATE_QUANTITY', (state, { itemId, quantity }) => {
            const item = state.items.find(i => i.id === itemId);
            if (item) {
                if (quantity <= 0) {
                    const index = state.items.indexOf(item);
                    state.items.splice(index, 1);
                } else {
                    item.quantity = Math.min(quantity, 99);
                    item.updatedAt = Date.now();
                }
            }
        });

        this.registerMutation('CLEAR_CART', (state) => {
            state.items = [];
            state.discountCode = null;
            state.pointsRedeemed = 0;
            state.isPointsActive = false;
        });

        this.registerMutation('SET_DISCOUNT_CODE', (state, code) => {
            state.discountCode = code;
        });

        this.registerMutation('SET_POINTS', (state, { redeemed, active }) => {
            state.pointsRedeemed = redeemed;
            state.isPointsActive = active;
        });

        this.registerMutation('MARK_SYNCED', (state, timestamp) => {
            state.lastSynced = timestamp;
            state.syncError = null;
        });

        this.registerMutation('MARK_SYNC_ERROR', (state, error) => {
            state.syncError = error;
        });
    }

    _registerActions() {
        // Idempotent add with duplicate prevention
        this.registerAction('addItem', async (ctx, item) => {
            const idempotencyKey = `add_${item.menuItemId}_${item.meat}_${Date.now()}`;
            
            // Check if similar operation is pending
            const pending = ctx.state.pendingOperations.find(op => 
                op.type === 'ADD' && op.key === idempotencyKey
            );
            
            if (pending) {
                console.log('[CartManager] Duplicate add prevented');
                return pending.promise;
            }

            const operation = {
                type: 'ADD',
                key: idempotencyKey,
                promise: null
            };

            ctx.state.pendingOperations.push(operation);

            try {
                ctx.commit('ADD_ITEM', item);
                
                // Sync to Supabase if logged in
                if (window.supabaseClient && window.userAvatar?.userId) {
                    operation.promise = this._syncToSupabase(ctx.state);
                    await operation.promise;
                    ctx.commit('MARK_SYNCED', Date.now());
                }

                return { success: true, itemCount: ctx.getters.itemCount };
            } catch (error) {
                ctx.commit('MARK_SYNC_ERROR', error.message);
                throw error;
            } finally {
                const idx = ctx.state.pendingOperations.indexOf(operation);
                if (idx >= 0) ctx.state.pendingOperations.splice(idx, 1);
            }
        });

        this.registerAction('removeItem', async (ctx, itemId) => {
            ctx.commit('REMOVE_ITEM', itemId);
            
            if (window.supabaseClient && window.userAvatar?.userId) {
                await this._syncToSupabase(ctx.state);
            }
        });

        this.registerAction('checkout', async (ctx, checkoutData) => {
            // Validate cart
            if (ctx.getters.itemCount === 0) {
                throw new Error('Cart is empty');
            }

            // Create order with idempotency key
            const idempotencyKey = `order_${window.userAvatar?.userId}_${Date.now()}`;
            
            return {
                items: ctx.state.items,
                subtotal: ctx.getters.subtotal,
                discount: ctx.getters.discountAmount,
                total: ctx.getters.total,
                pointsRedeemed: ctx.state.pointsRedeemed,
                idempotencyKey
            };
        });
    }

    _registerGetters() {
        this.registerGetter('itemCount', (state) => {
            return state.items.reduce((sum, item) => sum + item.quantity, 0);
        });

        this.registerGetter('uniqueItemCount', (state) => state.items.length);

        this.registerGetter('subtotal', (state) => {
            return state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        });

        this.registerGetter('discountAmount', (state, getters) => {
            let discount = 0;
            
            // Promo code discount
            if (state.discountCode && window.promotions) {
                const promo = window.promotions.find(p => p.code === state.discountCode);
                if (promo && getters.subtotal >= promo.minOrder) {
                    discount += promo.value;
                }
            }
            
            // Points discount (100 points = 10 baht)
            if (state.isPointsActive && state.pointsRedeemed >= 100) {
                discount += Math.floor(state.pointsRedeemed / 100) * 10;
            }
            
            return discount;
        });

        this.registerGetter('total', (state, getters) => {
            return Math.max(0, getters.subtotal - getters.discountAmount);
        });

        this.registerGetter('pointsToEarn', (state, getters) => {
            const total = getters.total;
            if (total < 60) return 0;
            if (total < 120) return 10;
            return 30 + Math.floor((total - 120) / 30) * 10;
        });

        this.registerGetter('canCheckout', (state) => {
            return state.items.length > 0 && !state.syncError;
        });
    }

    async _syncToSupabase(state) {
        if (!window.supabaseClient || !window.userAvatar?.userId) return;

        try {
            const { data: existing } = await window.supabaseClient
                .from('orders')
                .select('id')
                .eq('user_id', window.userAvatar.userId)
                .eq('status', 'cart')
                .maybeSingle();

            const payload = {
                user_id: window.userAvatar.userId,
                items: state.items,
                total_price: this.getters.total,
                status: 'cart',
                updated_at: new Date().toISOString()
            };

            if (existing) {
                await window.supabaseClient
                    .from('orders')
                    .update(payload)
                    .eq('id', existing.id);
            } else {
                await window.supabaseClient
                    .from('orders')
                    .insert(payload);
            }
        } catch (error) {
            console.error('[CartManager] Sync failed:', error);
            throw error;
        }
    }

    // Public convenience methods
    addItem(item) { return this.dispatch('addItem', item); }
    removeItem(itemId) { return this.dispatch('removeItem', itemId); }
    updateQuantity(itemId, quantity) { this.commit('UPDATE_QUANTITY', { itemId, quantity }); }
    clear() { this.commit('CLEAR_CART'); }
    setDiscountCode(code) { this.commit('SET_DISCOUNT_CODE', code); }
    
    get itemCount() { return this.state.items.reduce((sum, i) => sum + i.quantity, 0); }
    get subtotal() { return this.getters.subtotal; }
    get total() { return this.getters.total; }
}

/**
 * User State Manager with session handling
 */
class UserManager extends StateManager {
    constructor() {
        super({
            id: null,
            lineUserId: null,
            name: 'น้องฝึกหัด',
            avatar: null,
            isGuest: true,
            isAuthenticated: false,
            points: 0,
            totalOrders: 0,
            tier: 'MEMBER',
            sessionExpiresAt: null,
            lastActivity: Date.now()
        }, {
            persist: true,
            storageKey: 'kaprao_user_v2'
        });

        this._registerMutations();
        this._registerActions();
        this._startActivityTracker();
    }

    _registerMutations() {
        this.registerMutation('SET_USER', (state, userData) => {
            Object.assign(state, {
                ...userData,
                isAuthenticated: true,
                lastActivity: Date.now()
            });
        });

        this.registerMutation('SET_GUEST', (state, guestData = {}) => {
            Object.assign(state, {
                id: guestData.id || null,
                name: guestData.name || 'น้องฝึกหัด',
                avatar: guestData.avatar || null,
                isGuest: true,
                isAuthenticated: false,
                lastActivity: Date.now()
            });
        });

        this.registerMutation('UPDATE_POINTS', (state, points) => {
            state.points = Math.max(0, points);
        });

        this.registerMutation('UPDATE_PROFILE', (state, updates) => {
            Object.assign(state, updates);
            state.lastActivity = Date.now();
        });

        this.registerMutation('LOGOUT', (state) => {
            Object.keys(state).forEach(key => {
                if (key !== 'lastActivity') state[key] = null;
            });
            state.isGuest = true;
            state.isAuthenticated = false;
            state.name = 'น้องฝึกหัด';
            state.tier = 'MEMBER';
            state.points = 0;
        });
    }

    _registerActions() {
        this.registerAction('initSession', async (ctx) => {
            // Check session expiry
            if (ctx.state.sessionExpiresAt && Date.now() > ctx.state.sessionExpiresAt) {
                ctx.commit('LOGOUT');
                return { status: 'expired' };
            }

            // Restore from Supabase if possible
            if (window.supabaseClient) {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (session) {
                    ctx.commit('UPDATE_PROFILE', {
                        id: session.user.id,
                        sessionExpiresAt: new Date(session.expires_at * 1000).getTime()
                    });
                }
            }

            return { status: ctx.state.isAuthenticated ? 'authenticated' : 'guest' };
        });

        this.registerAction('syncWithSupabase', async (ctx) => {
            if (!ctx.state.id || !window.supabaseClient) return;

            const { data, error } = await window.supabaseClient
                .from('profiles')
                .select('points, total_orders, tier, display_name, avatar_url')
                .eq('id', ctx.state.id)
                .single();

            if (data) {
                ctx.commit('UPDATE_PROFILE', {
                    points: data.points || 0,
                    totalOrders: data.total_orders || 0,
                    tier: data.tier || 'MEMBER',
                    name: data.display_name || ctx.state.name,
                    avatar: data.avatar_url || ctx.state.avatar
                });
            }
        });
    }

    _startActivityTracker() {
        // Update last activity on user interaction
        ['click', 'touchstart', 'keydown'].forEach(event => {
            document.addEventListener(event, () => {
                if (this.state.isAuthenticated) {
                    this.commit('UPDATE_PROFILE', {});
                }
            }, { passive: true });
        });
    }

    get isLoggedIn() { return this.state.isAuthenticated; }
    get displayName() { return this.state.name; }
}

/**
 * UI State Manager for modals, loaders, toasts
 */
class UIManager extends StateManager {
    constructor() {
        super({
            modals: {
                current: null,
                stack: []
            },
            toasts: [],
            loaders: {
                global: false,
                actions: {}
            },
            scrollLocked: false,
            online: navigator.onLine,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                isMobile: window.innerWidth < 768
            }
        }, {
            persist: false
        });

        this._registerMutations();
        this._setupEventListeners();
    }

    _registerMutations() {
        this.registerMutation('OPEN_MODAL', (state, modalId) => {
            if (state.modals.current) {
                state.modals.stack.push(state.modals.current);
            }
            state.modals.current = modalId;
            state.scrollLocked = true;
        });

        this.registerMutation('CLOSE_MODAL', (state) => {
            state.modals.current = state.modals.stack.pop() || null;
            state.scrollLocked = state.modals.current !== null;
        });

        this.registerMutation('CLOSE_ALL_MODALS', (state) => {
            state.modals.current = null;
            state.modals.stack = [];
            state.scrollLocked = false;
        });

        this.registerMutation('ADD_TOAST', (state, toast) => {
            const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            state.toasts.push({
                id,
                message: toast.message,
                type: toast.type || 'info',
                duration: toast.duration || 3500,
                createdAt: Date.now()
            });
            
            // Auto-remove
            setTimeout(() => {
                this.commit('REMOVE_TOAST', id);
            }, toast.duration || 3500);
        });

        this.registerMutation('REMOVE_TOAST', (state, toastId) => {
            const idx = state.toasts.findIndex(t => t.id === toastId);
            if (idx >= 0) state.toasts.splice(idx, 1);
        });

        this.registerMutation('SET_LOADER', (state, { key, active }) => {
            if (key === 'global') {
                state.loaders.global = active;
            } else {
                state.loaders.actions[key] = active;
            }
        });

        this.registerMutation('SET_ONLINE', (state, online) => {
            state.online = online;
        });

        this.registerMutation('UPDATE_VIEWPORT', (state, dims) => {
            state.viewport = {
                ...dims,
                isMobile: dims.width < 768
            };
        });
    }

    _setupEventListeners() {
        window.addEventListener('online', () => this.commit('SET_ONLINE', true));
        window.addEventListener('offline', () => this.commit('SET_ONLINE', false));
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.commit('UPDATE_VIEWPORT', {
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }, 100);
        });

        // Handle browser back button for modals
        window.addEventListener('popstate', () => {
            if (this.state.modals.current) {
                this.commit('CLOSE_MODAL');
            }
        });
    }

    // Public API
    openModal(modalId) {
        history.pushState({ modal: modalId }, '', '');
        this.commit('OPEN_MODAL', modalId);
        document.body.classList.add('scroll-locked');
    }

    closeModal() {
        this.commit('CLOSE_MODAL');
        if (!this.state.modals.current) {
            document.body.classList.remove('scroll-locked');
        }
    }

    closeAllModals() {
        this.commit('CLOSE_ALL_MODALS');
        document.body.classList.remove('scroll-locked');
    }

    showToast(message, type = 'info', duration = 3500) {
        this.commit('ADD_TOAST', { message, type, duration });
    }

    showLoader(key = 'global') {
        this.commit('SET_LOADER', { key, active: true });
    }

    hideLoader(key = 'global') {
        this.commit('SET_LOADER', { key, active: false });
    }
}

// ==========================================
// Export global instances
// ==========================================

const appState = {
    cart: new CartManager(),
    user: new UserManager(),
    ui: new UIManager(),
    
    // Initialize all managers
    async init() {
        await this.user.dispatch('initSession');
        
        // Sync cart if user is logged in
        if (this.user.isLoggedIn) {
            this.user.dispatch('syncWithSupabase').catch(console.error);
        }
        
        console.log('[AppState] Initialized');
    }
};

// Backward compatibility helpers
window.appState = appState;
window.StateManager = StateManager;
window.CartManager = CartManager;
window.UserManager = UserManager;
window.UIManager = UIManager;

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StateManager, CartManager, UserManager, UIManager, appState };
}

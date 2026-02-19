/**
 * =============================================
 * Kaprao52 App - Authentication Manager (Phase 3)
 * =============================================
 * Secure, foolproof LIFF + Supabase authentication flow
 */

class AuthManager {
    constructor() {
        this.state = {
            initialized: false,
            initializing: false,
            authenticated: false,
            user: null,
            session: null,
            error: null,
            mode: 'unknown'
        };
        
        this.callbacks = {
            onAuthStateChange: [],
            onError: [],
            onReady: []
        };
        
        this.initPromise = null;
        this.refreshTimer = null;
        
        this.init = this.init.bind(this);
        this.loginWithLine = this.loginWithLine.bind(this);
        this.loginAsGuest = this.loginAsGuest.bind(this);
        this.logout = this.logout.bind(this);
    }

    async init() {
        if (this.initPromise) return this.initPromise;
        if (this.state.initialized) return this.state;
        
        this.initPromise = this._doInit();
        
        try {
            return await this.initPromise;
        } finally {
            this.initPromise = null;
        }
    }

    async _doInit() {
        this.state.initializing = true;
        
        try {
            console.log('[AuthManager] Starting initialization...');
            
            const supabaseSession = await this._checkSupabaseSession();
            const liffResult = await this._initLIFF();
            
            if (liffResult.success && liffResult.profile) {
                await this._handleLIFFLogin(liffResult.profile);
            } else if (supabaseSession) {
                await this._handleSupabaseSession(supabaseSession);
            } else {
                this._setState({
                    initialized: true,
                    initializing: false,
                    authenticated: false,
                    mode: 'guest'
                });
            }
            
            this._startSessionRefresh();
            this._emit('onReady', this.state);
            
            return this.state;
            
        } catch (error) {
            console.error('[AuthManager] Initialization failed:', error);
            this._setState({
                initialized: true,
                initializing: false,
                error: error.message,
                mode: 'guest'
            });
            this._emit('onError', error);
            throw error;
        }
    }

    async _checkSupabaseSession() {
        if (!window.supabaseClient) return null;
        
        try {
            const { data: { session }, error } = await window.supabaseClient.auth.getSession();
            if (error) throw error;
            
            if (session) {
                const expiresAt = new Date(session.expires_at * 1000);
                const timeUntilExpiry = expiresAt - new Date();
                
                if (timeUntilExpiry < 5 * 60 * 1000) {
                    return await this._refreshSession();
                }
                
                return session;
            }
            
            return null;
        } catch (error) {
            console.warn('[AuthManager] Session check failed:', error);
            return null;
        }
    }

    async _initLIFF() {
        if (typeof liff === 'undefined') {
            return { success: false, reason: 'LIFF SDK not loaded' };
        }
        
        try {
            await liff.init({ 
                liffId: window.MY_LIFF_ID || '2008781875-6whmY1cf'
            });
            
            if (!liff.isLoggedIn()) {
                return { success: false, reason: 'Not logged in to LINE' };
            }
            
            const profile = await liff.getProfile();
            const isInLineApp = liff.isInClient();
            
            return { 
                success: true, 
                profile,
                isInLineApp,
                accessToken: liff.getAccessToken()
            };
            
        } catch (error) {
            console.warn('[AuthManager] LIFF init failed:', error);
            return { success: false, reason: error.message };
        }
    }

    async _handleLIFFLogin(profile) {
        console.log('[AuthManager] Handling LIFF login for:', profile.displayName);
        
        if (!window.supabaseClient) {
            throw new Error('Supabase client not available');
        }
        
        const { data: existingProfile } = await window.supabaseClient
            .from('profiles')
            .select('id')
            .eq('line_user_id', profile.userId)
            .maybeSingle();
        
        let supabaseUserId;
        
        if (existingProfile?.id) {
            supabaseUserId = existingProfile.id;
            console.log('[AuthManager] Found existing profile:', supabaseUserId);
        } else {
            console.log('[AuthManager] Creating new user account');
            
            const { data: authData, error: authError } = await window.supabaseClient.auth.signInAnonymously();
            if (authError) throw authError;
            
            supabaseUserId = authData.user.id;
            
            await window.supabaseClient
                .from('profiles')
                .upsert({
                    id: supabaseUserId,
                    line_user_id: profile.userId,
                    display_name: profile.displayName,
                    avatar_url: profile.pictureUrl,
                    updated_at: new Date().toISOString()
                });
        }
        
        this._setState({
            initialized: true,
            initializing: false,
            authenticated: true,
            mode: 'liff',
            user: {
                id: supabaseUserId,
                lineUserId: profile.userId,
                name: profile.displayName,
                avatar: profile.pictureUrl,
                isGuest: false
            }
        });
        
        this._syncToGlobalState();
        this._syncUserData(supabaseUserId);
    }

    async _handleSupabaseSession(session) {
        const userId = session.user.id;
        
        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
        
        this._setState({
            initialized: true,
            initializing: false,
            authenticated: true,
            mode: profile?.line_user_id ? 'liff' : 'supabase',
            session,
            user: {
                id: userId,
                lineUserId: profile?.line_user_id || null,
                name: profile?.display_name || session.user.email || 'User',
                avatar: profile?.avatar_url || null,
                isGuest: session.user.is_anonymous || false
            }
        });
        
        this._syncToGlobalState();
    }

    async loginWithLine() {
        if (typeof liff === 'undefined') {
            throw new Error('LIFF SDK not available');
        }
        
        if (liff.isLoggedIn()) {
            return this.init();
        }
        
        liff.login({ redirectUri: window.location.href });
    }

    async loginAsGuest() {
        if (!window.supabaseClient) {
            throw new Error('Supabase client not available');
        }
        
        const { data, error } = await window.supabaseClient.auth.signInAnonymously();
        if (error) throw error;
        
        const userId = data.user.id;
        
        await window.supabaseClient
            .from('profiles')
            .upsert({
                id: userId,
                display_name: 'Guest User',
                updated_at: new Date().toISOString()
            });
        
        this._setState({
            initialized: true,
            authenticated: true,
            mode: 'guest',
            user: {
                id: userId,
                name: 'Guest User',
                isGuest: true
            }
        });
        
        this._syncToGlobalState();
        return this.state;
    }

    async logout() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
        
        if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
            liff.logout();
        }
        
        this._setState({
            initialized: true,
            authenticated: false,
            user: null,
            session: null,
            mode: 'guest'
        });
        
        if (window.userAvatar) {
            window.userAvatar = {
                name: 'น้องฝึกหัด',
                image: null,
                userId: null,
                isGuest: true
            };
        }
        
        if (window.appState?.cart) {
            window.appState.cart.clear();
        }
    }

    async _refreshSession() {
        if (!window.supabaseClient) return null;
        
        try {
            const { data } = await window.supabaseClient.auth.refreshSession();
            return data.session;
        } catch (error) {
            console.warn('[AuthManager] Session refresh failed:', error);
            return null;
        }
    }

    _startSessionRefresh() {
        this.refreshTimer = setInterval(() => {
            this._refreshSession();
        }, 50 * 60 * 1000);
    }

    async _syncUserData(userId) {
        if (!window.supabaseClient || !userId) return;
        
        try {
            const { data: profile } = await window.supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (profile && window.appState?.user) {
                window.appState.user.commit('UPDATE_PROFILE', {
                    points: profile.points || 0,
                    totalOrders: profile.total_orders || 0,
                    tier: profile.tier || 'MEMBER',
                    name: profile.display_name || this.state.user?.name,
                    avatar: profile.avatar_url || this.state.user?.avatar
                });
            }
            
            if (window.loadOrdersFromSupabase) {
                window.loadOrdersFromSupabase(userId);
            }
            
            this._setupRealtimeSubscriptions(userId);
            
        } catch (error) {
            console.warn('[AuthManager] User data sync failed:', error);
        }
    }

    _setupRealtimeSubscriptions(userId) {
        if (!window.supabaseClient || !userId) return;
        
        window.supabaseClient
            .channel(`profile:${userId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${userId}`
            }, (payload) => {
                if (window.appState?.user) {
                    window.appState.user.commit('UPDATE_PROFILE', {
                        points: payload.new.points,
                        totalOrders: payload.new.total_orders,
                        tier: payload.new.tier
                    });
                }
                
                if (payload.old.points !== payload.new.points && window.toastQueue) {
                    const diff = payload.new.points - payload.old.points;
                    if (diff > 0) {
                        window.toastQueue.success(`ได้รับ ${diff} พอยต์! 🎉`);
                    }
                }
            })
            .subscribe();
    }

    _syncToGlobalState() {
        if (this.state.user) {
            window.userAvatar = {
                userId: this.state.user.id,
                lineUserId: this.state.user.lineUserId,
                name: this.state.user.name,
                image: this.state.user.avatar,
                isGuest: this.state.user.isGuest,
                isAuthenticated: this.state.authenticated
            };
        }
    }

    _setState(newState) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...newState };
        this._emit('onAuthStateChange', { prev: prevState, current: this.state });
    }

    _emit(eventName, data) {
        if (this.callbacks[eventName]) {
            this.callbacks[eventName].forEach(cb => {
                try { cb(data); } catch (error) {}
            });
        }
    }

    onAuthStateChange(callback) {
        this.callbacks.onAuthStateChange.push(callback);
        return () => {
            const idx = this.callbacks.onAuthStateChange.indexOf(callback);
            if (idx >= 0) this.callbacks.onAuthStateChange.splice(idx, 1);
        };
    }

    get isAuthenticated() { return this.state.authenticated; }
    get isGuest() { return this.state.user?.isGuest || false; }
    get userId() { return this.state.user?.id || null; }
    get currentUser() { return this.state.user; }
}

const authManager = new AuthManager();

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => authManager.init().catch(console.error), 100);
});

window.AuthManager = AuthManager;
window.authManager = authManager;

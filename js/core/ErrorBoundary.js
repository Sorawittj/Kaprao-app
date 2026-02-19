/**
 * =============================================
 * Error Boundary & Recovery System
 * =============================================
 * Centralized error handling with graceful degradation,
 * automatic retry, and user-friendly error messages.
 */

class AppError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'AppError';
        this.code = options.code || 'UNKNOWN_ERROR';
        this.severity = options.severity || 'error'; // 'warning', 'error', 'critical'
        this.recoverable = options.recoverable !== false;
        this.userMessage = options.userMessage || this.getDefaultUserMessage(options.code);
        this.context = options.context || {};
        this.timestamp = Date.now();
    }

    getDefaultUserMessage(code) {
        const messages = {
            'NETWORK_ERROR': 'ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้ กรุณาตรวจสอบการเชื่อมต่อ',
            'AUTH_ERROR': 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
            'VALIDATION_ERROR': 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
            'SERVER_ERROR': 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่ในอีกสักครู่',
            'TIMEOUT_ERROR': 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่',
            'CART_EMPTY': 'ตะกร้าสินค้าว่างเปล่า',
            'ITEM_UNAVAILABLE': 'รายการอาหารหมดชั่วคราว',
            'PAYMENT_ERROR': 'การชำระเงินไม่สำเร็จ กรุณาลองใหม่',
            'QUOTA_EXCEEDED': 'คุณสั่งอาหารเกินจำนวนที่กำหนด'
        };
        return messages[code] || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
    }
}

class ErrorBoundary {
    constructor() {
        this.handlers = new Map();
        this.fallbacks = new Map();
        this.errorLog = [];
        this.maxLogSize = 50;

        this.setupGlobalHandlers();
    }

    setupGlobalHandlers() {
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, {
                type: 'unhandledrejection',
                recoverable: false
            });
        });

        // Catch global errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error, {
                type: 'global',
                filename: event.filename,
                lineno: event.lineno,
                recoverable: false
            });
            event.preventDefault();
        });

        // Monitor online/offline
        window.addEventListener('online', () => {
            this.recoverFromError('NETWORK_ERROR');
        });
    }

    /**
     * Register an error handler for a specific error code
     */
    registerHandler(errorCode, handler) {
        if (!this.handlers.has(errorCode)) {
            this.handlers.set(errorCode, []);
        }
        this.handlers.get(errorCode).push(handler);
        return this;
    }

    /**
     * Register a fallback action for a component/operation
     */
    registerFallback(componentId, fallbackFn) {
        this.fallbacks.set(componentId, fallbackFn);
        return this;
    }

    /**
     * Main error handling entry point
     */
    handleError(error, context = {}) {
        const appError = error instanceof AppError ? error : this.normalizeError(error, context);
        
        // Log error
        this.logError(appError);

        // Execute specific handlers
        const handlers = this.handlers.get(appError.code) || [];
        handlers.forEach(handler => {
            try {
                handler(appError);
            } catch (e) {
                console.error('Error handler failed:', e);
            }
        });

        // Show user feedback
        this.showUserFeedback(appError);

        // Attempt recovery if recoverable
        if (appError.recoverable && context.attemptRecovery !== false) {
            this.attemptRecovery(appError, context);
        }

        return appError;
    }

    normalizeError(error, context) {
        let code = 'UNKNOWN_ERROR';
        let severity = 'error';
        let recoverable = true;

        // Detect error type
        if (!navigator.onLine || (error && error.message && error.message.includes('network'))) {
            code = 'NETWORK_ERROR';
            severity = 'warning';
        } else if ((error && error.status === 401) || (error && error.message && error.message.includes('auth'))) {
            code = 'AUTH_ERROR';
            recoverable = false;
        } else if (error && error.status >= 500) {
            code = 'SERVER_ERROR';
        } else if ((error && error.name === 'TimeoutError') || (error && error.message && error.message.includes('timeout'))) {
            code = 'TIMEOUT_ERROR';
            severity = 'warning';
        } else if (error && error.code) {
            code = error.code;
        }

        return new AppError((error && error.message) || 'Unknown error', {
            code,
            severity,
            recoverable,
            context
        });
    }

    logError(error) {
        const entry = {
            code: error.code,
            message: error.message,
            severity: error.severity,
            stack: error.stack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };

        this.errorLog.unshift(entry);
        
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.pop();
        }

        // Send to analytics in production
        if (window.gtag && error.severity === 'critical') {
            window.gtag('event', 'exception', {
                description: `${error.code}: ${error.message}`,
                fatal: true
            });
        }

        console.error('[ErrorBoundary]', error.code, error.message, error);
    }

    showUserFeedback(error) {
        // Use the new toast system
        if (window.appState && window.appState.ui) {
            const toastType = error.severity === 'warning' ? 'warning' : 
                             error.severity === 'critical' ? 'error' : 'error';
            window.appState.ui.showToast(error.userMessage, toastType, 5000);
        } else if (window.showToast) {
            window.showToast(error.userMessage, error.severity === 'warning' ? 'warning' : 'error');
        }
    }

    async attemptRecovery(error, context) {
        switch (error.code) {
            case 'NETWORK_ERROR':
                // Wait for network to come back
                await this.waitForNetwork();
                if (context.retryFn) {
                    context.retryFn();
                }
                break;
                
            case 'AUTH_ERROR':
                // Redirect to login
                if (window.appState && window.appState.user) {
                    window.appState.user.commit('LOGOUT');
                }
                break;
                
            case 'SERVER_ERROR':
                // Exponential backoff retry
                if (context.retryFn && context.retryCount < 3) {
                    const delay = Math.pow(2, context.retryCount) * 1000;
                    setTimeout(() => context.retryFn(), delay);
                }
                break;
                
            default:
                // Execute component fallback
                if (context.componentId && this.fallbacks.has(context.componentId)) {
                    this.fallbacks.get(context.componentId)(error);
                }
        }
    }

    waitForNetwork() {
        return new Promise((resolve) => {
            if (navigator.onLine) {
                resolve();
                return;
            }
            
            const handler = () => {
                window.removeEventListener('online', handler);
                resolve();
            };
            window.addEventListener('online', handler);
        });
    }

    recoverFromError(errorCode) {
        // Remove related error toasts
        if (window.appState && window.appState.ui) {
            // Could implement specific recovery UI here
        }
    }

    getErrorLog() {
        return [...this.errorLog];
    }

    clearErrorLog() {
        this.errorLog = [];
    }
}

// Convenience wrapper for async functions
function withErrorHandling(fn, options = {}) {
    return async function(...args) {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            if (window.errorBoundary) {
                window.errorBoundary.handleError(error, {
                    ...options,
                    args
                });
            }
            throw error;
        }
    };
}

// Create global instance
const errorBoundary = new ErrorBoundary();
window.ErrorBoundary = ErrorBoundary;
window.AppError = AppError;
window.errorBoundary = errorBoundary;
window.withErrorHandling = withErrorHandling;

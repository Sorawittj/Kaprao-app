/**
 * =============================================
 * Idempotent Request Handler
 * =============================================
 * Prevents duplicate requests, handles retries with exponential backoff,
 * and ensures idempotency for critical operations like order submission.
 */

class IdempotentRequestManager {
    constructor(options = {}) {
        this.pendingRequests = new Map();
        this.completedRequests = new Map();
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000;
    }

    /**
     * Generate idempotency key from request data
     */
    generateKey(operation, payload) {
        const data = JSON.stringify({ operation, payload });
        return `${operation}_${this.hashCode(data)}_${Date.now().toString(36)}`;
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Execute a request with idempotency guarantees
     * @param {string} operation - Operation identifier
     * @param {Function} requestFn - Async function to execute
     * @param {Object} options - Options
     * @param {string} options.idempotencyKey - Custom key (auto-generated if not provided)
     * @param {number} options.ttl - Time to live for deduplication (ms)
     * @param {boolean} options.retryOnFailure - Whether to retry on failure
     * @param {Function} options.onRetry - Callback on retry
     */
    async execute(operation, requestFn, options = {}) {
        const key = options.idempotencyKey || this.generateKey(operation, requestFn.toString());
        const ttl = options.ttl || 30000; // 30 seconds default

        // Check if identical request is in flight
        if (this.pendingRequests.has(key)) {
            console.log(`[IdempotentRequest] Reusing in-flight request: ${operation}`);
            return this.pendingRequests.get(key);
        }

        // Check if completed recently (idempotency)
        if (this.completedRequests.has(key)) {
            const completed = this.completedRequests.get(key);
            if (Date.now() - completed.timestamp < ttl) {
                console.log(`[IdempotentRequest] Returning cached result: ${operation}`);
                return completed.result;
            }
        }

        // Execute with retry logic
        const executeWithRetry = async (attempt = 1) => {
            try {
                const result = await requestFn();
                
                // Cache successful result
                this.completedRequests.set(key, {
                    result,
                    timestamp: Date.now()
                });
                
                // Cleanup old entries periodically
                if (this.completedRequests.size > 100) {
                    this.cleanupOldEntries();
                }
                
                return result;
            } catch (error) {
                // Check if retryable
                const isRetryable = this.isRetryableError(error) && 
                                   attempt < this.maxRetries && 
                                   options.retryOnFailure !== false;

                if (isRetryable) {
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    console.log(`[IdempotentRequest] Retry ${attempt}/${this.maxRetries} for ${operation} in ${delay}ms`);
                    
                    if (options.onRetry) {
                        options.onRetry(attempt, error);
                    }
                    
                    await this.sleep(delay);
                    return executeWithRetry(attempt + 1);
                }

                throw error;
            }
        };

        // Create promise and track it
        const promise = executeWithRetry().finally(() => {
            this.pendingRequests.delete(key);
        });

        this.pendingRequests.set(key, promise);
        return promise;
    }

    /**
     * Debounce a function - ensure it only runs once within the wait period
     */
    debounce(fn, wait, options = {}) {
        let timeout;
        let lastCallTime = 0;
        
        return function executedFunction(...args) {
            const now = Date.now();
            const context = this;
            
            // Check if called too recently (manual debounce)
            if (now - lastCallTime < wait && options.leading !== true) {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    lastCallTime = Date.now();
                    fn.apply(context, args);
                }, wait);
                return;
            }
            
            lastCallTime = now;
            
            if (options.leading) {
                fn.apply(context, args);
            } else {
                timeout = setTimeout(() => fn.apply(context, args), wait);
            }
        };
    }

    /**
     * Throttle a function - ensure it runs at most once per period
     */
    throttle(fn, limit, options = {}) {
        let inThrottle;
        let lastResult;
        
        return function executedFunction(...args) {
            const context = this;
            
            if (!inThrottle) {
                lastResult = fn.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            } else if (options.trailing) {
                // Queue the last call
                setTimeout(() => {
                    lastResult = fn.apply(context, args);
                }, limit);
            }
            
            return lastResult;
        };
    }

    isRetryableError(error) {
        // Network errors are retryable
        if (!navigator.onLine) return true;
        
        // HTTP status codes that indicate retry might succeed
        const retryableStatuses = [408, 429, 500, 502, 503, 504];
        if (error.status && retryableStatuses.includes(error.status)) return true;
        
        // Specific error messages
        const retryableMessages = [
            'network',
            'timeout',
            'abort',
            'unavailable',
            'retry'
        ];
        
        const errorMsg = (error.message || '').toLowerCase();
        return retryableMessages.some(msg => errorMsg.includes(msg));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    cleanupOldEntries() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        for (const [key, value] of this.completedRequests.entries()) {
            if (now - value.timestamp > maxAge) {
                this.completedRequests.delete(key);
            }
        }
    }

    /**
     * Clear all pending and completed requests
     */
    clear() {
        this.pendingRequests.clear();
        this.completedRequests.clear();
    }
}

// Rate Limiter for API calls
class RateLimiter {
    constructor(options = {}) {
        this.queue = [];
        this.running = 0;
        this.maxConcurrent = options.maxConcurrent || 3;
        this.minInterval = options.minInterval || 100;
        this.lastRequestTime = 0;
    }

    async execute(fn, priority = 0) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                fn,
                priority,
                resolve,
                reject
            });
            
            // Sort by priority (higher first)
            this.queue.sort((a, b) => b.priority - a.priority);
            
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.running >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.minInterval) {
            setTimeout(() => this.processQueue(), this.minInterval - timeSinceLastRequest);
            return;
        }

        const { fn, resolve, reject } = this.queue.shift();
        this.running++;
        this.lastRequestTime = Date.now();

        try {
            const result = await fn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.running--;
            // Process next
            setTimeout(() => this.processQueue(), 0);
        }
    }
}

// Global instances
const requestManager = new IdempotentRequestManager({
    maxRetries: 3,
    retryDelay: 1000
});

const apiRateLimiter = new RateLimiter({
    maxConcurrent: 3,
    minInterval: 100
});

// Export
window.IdempotentRequestManager = IdempotentRequestManager;
window.RateLimiter = RateLimiter;
window.requestManager = requestManager;
window.apiRateLimiter = apiRateLimiter;

// Utility functions
window.debounce = (fn, wait, options) => requestManager.debounce(fn, wait, options);
window.throttle = (fn, limit, options) => requestManager.throttle(fn, limit, options);

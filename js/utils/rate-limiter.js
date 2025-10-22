/**
 * Rate Limiter Utility
 * Prevents excessive requests from the same user/endpoint
 */

/**
 * Rate limiter object to manage request throttling
 * @type {Object}
 */
export const rateLimiter = {
    attempts: new Map(),
    
    /**
     * Check if a request should be allowed
     * @param {string} key - Identifier for the rate limit (user ID, IP, etc)
     * @param {number} maxAttempts - Maximum attempts allowed in window
     * @param {number} windowMs - Time window in milliseconds
     * @returns {boolean} True if request should be allowed, false if rate limited
     */
    check(key, maxAttempts = 5, windowMs = 60000) {
        const now = Date.now();
        const attempts = this.attempts.get(key) || [];
        
        // Filter out attempts outside the time window
        const recentAttempts = attempts.filter(time => now - time < windowMs);
        
        if (recentAttempts.length < maxAttempts) {
            // Request allowed, record the attempt
            recentAttempts.push(now);
            this.attempts.set(key, recentAttempts);
            return true;
        }
        
        // Rate limited
        return false;
    },
    
    /**
     * Get remaining attempts for a key
     * @param {string} key - Identifier
     * @param {number} maxAttempts - Maximum attempts
     * @param {number} windowMs - Time window
     * @returns {number} Number of remaining attempts
     */
    getRemainingAttempts(key, maxAttempts = 5, windowMs = 60000) {
        const now = Date.now();
        const attempts = this.attempts.get(key) || [];
        const recentAttempts = attempts.filter(time => now - time < windowMs);
        return Math.max(0, maxAttempts - recentAttempts.length);
    },
    
    /**
     * Reset rate limit for a key
     * @param {string} key - Identifier to reset
     */
    reset(key) {
        this.attempts.delete(key);
    },
    
    /**
     * Clear all rate limits
     */
    clearAll() {
        this.attempts.clear();
    }
};

export default rateLimiter;

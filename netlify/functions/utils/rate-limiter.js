/**
 * Server-side rate limiting utility for Netlify Functions
 * Uses in-memory storage with automatic cleanup
 * Tracks by IP address to prevent abuse
 */

class RateLimiter {
    constructor() {
        // Store attempts by IP: { ip: { attempts: [], firstAttempt: timestamp } }
        this.attemptStore = new Map();
        
        // Cleanup old entries every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Get client IP from Netlify event
     * Checks X-Forwarded-For first (behind proxy), then falls back to sourceIP
     */
    getClientIP(event) {
        // Netlify provides client IP in headers
        const forwardedFor = event.headers['x-forwarded-for'];
        if (forwardedFor) {
            // X-Forwarded-For can contain multiple IPs, take the first one
            return forwardedFor.split(',')[0].trim();
        }
        
        // Fallback to Netlify's sourceIP
        return event.headers['client-ip'] || event.headers['x-nf-client-connection-ip'] || 'unknown';
    }

    /**
     * Check if request should be rate limited
     * @param {string} ip - Client IP address
     * @param {Object} options - Rate limit options
     * @param {number} options.maxAttempts - Maximum attempts allowed
     * @param {number} options.windowMs - Time window in milliseconds
     * @param {string} options.action - Action being rate limited (for logging)
     * @returns {Object} - { allowed: boolean, remainingAttempts: number, resetTime: timestamp }
     */
    check(ip, options = {}) {
        const {
            maxAttempts = 5,
            windowMs = 60 * 1000, // 1 minute default
            action = 'request'
        } = options;

        const now = Date.now();
        const record = this.attemptStore.get(ip);

        if (!record) {
            // First attempt from this IP
            this.attemptStore.set(ip, {
                attempts: [now],
                firstAttempt: now
            });
            
            return {
                allowed: true,
                remainingAttempts: maxAttempts - 1,
                resetTime: now + windowMs,
                action
            };
        }

        // Filter out attempts outside the time window
        const windowStart = now - windowMs;
        const recentAttempts = record.attempts.filter(time => time > windowStart);

        if (recentAttempts.length < maxAttempts) {
            // Under the limit
            recentAttempts.push(now);
            this.attemptStore.set(ip, {
                attempts: recentAttempts,
                firstAttempt: record.firstAttempt
            });

            return {
                allowed: true,
                remainingAttempts: maxAttempts - recentAttempts.length,
                resetTime: recentAttempts[0] + windowMs,
                action
            };
        }

        // Rate limit exceeded
        const oldestAttemptInWindow = recentAttempts[0];
        return {
            allowed: false,
            remainingAttempts: 0,
            resetTime: oldestAttemptInWindow + windowMs,
            retryAfter: Math.ceil((oldestAttemptInWindow + windowMs - now) / 1000),
            action
        };
    }

    /**
     * Reset rate limit for a specific IP (useful for successful auth)
     */
    reset(ip) {
        this.attemptStore.delete(ip);
    }

    /**
     * Cleanup old entries to prevent memory leaks
     * Removes entries older than 1 hour
     */
    cleanup() {
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1 hour

        for (const [ip, record] of this.attemptStore.entries()) {
            if (now - record.firstAttempt > maxAge) {
                this.attemptStore.delete(ip);
            }
        }
    }

    /**
     * Middleware helper to create rate limit response
     */
    createRateLimitResponse(checkResult) {
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'X-RateLimit-Limit': checkResult.maxAttempts || 'N/A',
            'X-RateLimit-Remaining': checkResult.remainingAttempts.toString(),
            'X-RateLimit-Reset': checkResult.resetTime.toString(),
        };

        if (!checkResult.allowed && checkResult.retryAfter) {
            headers['Retry-After'] = checkResult.retryAfter.toString();
        }

        return {
            statusCode: 429,
            headers,
            body: JSON.stringify({
                error: 'Too many requests',
                message: `Rate limit exceeded for ${checkResult.action}. Please try again in ${checkResult.retryAfter} seconds.`,
                retryAfter: checkResult.retryAfter,
                resetTime: checkResult.resetTime
            })
        };
    }

    /**
     * Destroy the rate limiter (cleanup interval)
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

// Singleton instance shared across function invocations
const rateLimiter = new RateLimiter();

module.exports = rateLimiter;

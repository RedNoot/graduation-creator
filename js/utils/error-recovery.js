/**
 * Error Recovery Utilities
 * Retry logic, fallback strategies, and resilience patterns
 */

import { logger } from '../services/logger.js';

/**
 * Retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
    maxAttempts: 3,
    initialDelay: 1000,        // 1 second
    maxDelay: 10000,            // 10 seconds
    backoffMultiplier: 2,       // Exponential backoff
    jitter: true,               // Add random jitter to prevent thundering herd
    retryableErrors: [
        'NETWORK_ERROR',
        'TIMEOUT',
        'RATE_LIMIT',
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT'
    ]
};

/**
 * Retry async operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {Object} config - Retry configuration
 * @returns {Promise} Result of successful operation
 * @throws {Error} If all retries fail
 */
export const withRetry = async (operation, config = {}) => {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    const { maxAttempts, initialDelay, maxDelay, backoffMultiplier, jitter, retryableErrors, context } = finalConfig;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            logger.debug(`Attempt ${attempt}/${maxAttempts} for operation`, { context });
            return await operation();
        } catch (error) {
            lastError = error;
            
            // Check if error is retryable
            const isRetryable = retryableErrors.some(code => 
                error.code === code || 
                error.message?.includes(code) ||
                error.message?.includes('timeout') ||
                error.message?.includes('network')
            );
            
            if (!isRetryable || attempt === maxAttempts) {
                logger.error(`Operation failed after ${attempt} attempts`, {
                    context,
                    error: error.message,
                    code: error.code
                });
                throw error;
            }
            
            // Calculate delay with exponential backoff
            let delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
            delay = Math.min(delay, maxDelay);
            
            // Add jitter to prevent synchronized retries
            if (jitter) {
                delay += Math.random() * delay * 0.1;
            }
            
            logger.warn(`Retrying after ${Math.round(delay)}ms`, {
                context,
                attempt,
                error: error.message
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
};

/**
 * Retry operation with timeout
 * @param {Function} operation - Async function to retry
 * @param {number} timeoutMs - Timeout per attempt in milliseconds
 * @param {Object} config - Retry configuration
 * @returns {Promise} Result of successful operation
 */
export const withRetryAndTimeout = async (operation, timeoutMs = 30000, config = {}) => {
    const timeoutOperation = async () => {
        return Promise.race([
            operation(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
            )
        ]);
    };
    
    return withRetry(timeoutOperation, {
        ...config,
        retryableErrors: [...DEFAULT_RETRY_CONFIG.retryableErrors, 'TIMEOUT']
    });
};

/**
 * Fallback to alternative implementation if primary fails
 * @param {Function} primary - Primary operation
 * @param {Function} fallback - Fallback operation
 * @param {Object} options - Options
 * @returns {Promise} Result from primary or fallback
 */
export const withFallback = async (primary, fallback, options = {}) => {
    const { context = 'operation', logFallback = true } = options;
    
    try {
        logger.debug(`Attempting primary operation`, { context });
        return await primary();
    } catch (primaryError) {
        logger.warn(`Primary operation failed, attempting fallback`, {
            context,
            primaryError: primaryError.message
        });
        
        try {
            if (logFallback) {
                logger.info(`Executing fallback operation`, { context });
            }
            return await fallback();
        } catch (fallbackError) {
            logger.error(`Both primary and fallback operations failed`, {
                context,
                primaryError: primaryError.message,
                fallbackError: fallbackError.message
            });
            throw new Error(`All operations failed: ${fallbackError.message}`);
        }
    }
};

/**
 * Race multiple operations with fallback if all fail
 * @param {Array<Function>} operations - Array of async operations to race
 * @param {Object} options - Options
 * @returns {Promise} First successful result
 */
export const raceWithFallback = async (operations, options = {}) => {
    const { context = 'race', fallback = null, timeout = 30000 } = options;
    
    logger.debug(`Racing ${operations.length} operations`, { context });
    
    // Add timeout to each operation
    const racedOperations = operations.map(op =>
        Promise.race([
            op(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT')), timeout)
            )
        ]).catch(err => {
            logger.warn(`Operation in race failed`, { context, error: err.message });
            throw err;
        })
    );
    
    try {
        return await Promise.race(racedOperations);
    } catch (error) {
        if (fallback) {
            logger.warn(`All operations failed in race, executing fallback`, { context });
            return await fallback();
        }
        throw error;
    }
};

/**
 * Circuit breaker pattern for handling cascading failures
 * @param {Function} operation - Async operation
 * @param {Object} config - Circuit breaker configuration
 * @returns {Function} Wrapped operation with circuit breaker
 */
export const createCircuitBreaker = (operation, config = {}) => {
    const {
        failureThreshold = 5,
        resetTimeout = 60000,
        context = 'circuit-breaker'
    } = config;
    
    let state = 'CLOSED';
    let failureCount = 0;
    let nextResetTime = null;
    
    return async (...args) => {
        // Check if circuit should reset
        if (state === 'OPEN' && Date.now() >= nextResetTime) {
            state = 'HALF_OPEN';
            logger.info(`Circuit breaker entering HALF_OPEN state`, { context });
        }
        
        // Fail fast if circuit is open
        if (state === 'OPEN') {
            const error = new Error('Circuit breaker is OPEN');
            error.code = 'CIRCUIT_BREAKER_OPEN';
            logger.warn(`Circuit breaker OPEN - failing fast`, { context });
            throw error;
        }
        
        try {
            const result = await operation(...args);
            
            // Success - reset if in half-open state
            if (state === 'HALF_OPEN') {
                state = 'CLOSED';
                failureCount = 0;
                logger.info(`Circuit breaker reset to CLOSED`, { context });
            }
            
            return result;
        } catch (error) {
            failureCount++;
            logger.warn(`Circuit breaker failure count: ${failureCount}/${failureThreshold}`, {
                context,
                error: error.message
            });
            
            // Open circuit if threshold exceeded
            if (failureCount >= failureThreshold) {
                state = 'OPEN';
                nextResetTime = Date.now() + resetTimeout;
                logger.error(`Circuit breaker OPEN - threshold exceeded`, { context });
            }
            
            throw error;
        }
    };
};

/**
 * Deduplicate simultaneous requests
 * @param {Function} operation - Async operation
 * @param {Function} keyGenerator - Function to generate dedup key
 * @returns {Function} Wrapped operation with deduplication
 */
export const createDeduplicator = (operation, keyGenerator) => {
    const inflight = new Map();
    
    return async (...args) => {
        const key = keyGenerator(...args);
        
        // Return existing promise if already in flight
        if (inflight.has(key)) {
            logger.debug(`Returning cached promise for deduplicated request`, { key });
            return inflight.get(key);
        }
        
        // Create new promise
        const promise = operation(...args)
            .then(result => {
                inflight.delete(key);
                return result;
            })
            .catch(error => {
                inflight.delete(key);
                throw error;
            });
        
        inflight.set(key, promise);
        return promise;
    };
};

/**
 * Timeout wrapper for operations
 * @param {Function} operation - Async operation
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} Result or timeout error
 */
export const withTimeout = (operation, timeoutMs = 30000) => {
    return Promise.race([
        operation(),
        new Promise((_, reject) =>
            setTimeout(
                () => reject(new Error(`Operation timeout after ${timeoutMs}ms`)),
                timeoutMs
            )
        )
    ]);
};

/**
 * Batch operations with rate limiting
 * @param {Array<Function>} operations - Array of async operations
 * @param {number} batchSize - Number of concurrent operations
 * @param {number} delayMs - Delay between batches
 * @returns {Promise<Array>} Results from all operations
 */
export const batchWithRateLimit = async (operations, batchSize = 5, delayMs = 100) => {
    const results = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        
        try {
            const batchResults = await Promise.all(batch.map(op => op()));
            results.push(...batchResults);
            
            // Delay between batches (except for last batch)
            if (i + batchSize < operations.length) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        } catch (error) {
            logger.error(`Batch operation failed`, {
                batchNumber: Math.floor(i / batchSize) + 1,
                error: error.message
            });
            throw error;
        }
    }
    
    return results;
};

export default {
    withRetry,
    withRetryAndTimeout,
    withFallback,
    raceWithFallback,
    createCircuitBreaker,
    createDeduplicator,
    withTimeout,
    batchWithRateLimit,
    DEFAULT_RETRY_CONFIG
};

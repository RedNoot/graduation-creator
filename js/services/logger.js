/**
 * Logger Service
 * Structured logging system with levels, timestamps, and context
 */

/**
 * Log levels with priorities
 */
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4
};

/**
 * Logger class for structured logging
 */
class Logger {
    constructor(config = {}) {
        this.level = LOG_LEVELS[config.level] || LOG_LEVELS.INFO;
        this.context = config.context || 'app';
        this.enableConsole = config.enableConsole !== false;
        this.enableStorage = config.enableStorage || false;
        this.storageKey = 'graduation_app_logs';
        this.maxStoredLogs = config.maxStoredLogs || 100;
        this.logs = [];
    }

    /**
     * Format log entry
     * @private
     */
    formatEntry(level, message, data = {}) {
        return {
            timestamp: new Date().toISOString(),
            level,
            context: this.context,
            message,
            data,
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100)
        };
    }

    /**
     * Store log entry
     * @private
     */
    storeLog(entry) {
        this.logs.push(entry);

        // Keep only recent logs in memory
        if (this.logs.length > this.maxStoredLogs) {
            this.logs = this.logs.slice(-this.maxStoredLogs);
        }

        // Store in localStorage if enabled
        if (this.enableStorage) {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
            } catch (e) {
                // localStorage might be full or disabled
                console.warn('Could not store logs in localStorage', e);
            }
        }
    }

    /**
     * Output log entry to console
     * @private
     */
    outputLog(entry, consoleMethod = 'log') {
        if (!this.enableConsole) return;

        const prefix = `[${entry.timestamp}] [${entry.level}]`;
        const style = this.getConsoleStyle(entry.level);

        if (consoleMethod === 'table' && Object.keys(entry.data).length > 0) {
            console[consoleMethod](prefix, entry.message);
            console.table(entry.data);
        } else {
            console[consoleMethod](`%c${prefix} ${entry.message}`, style, entry.data);
        }
    }

    /**
     * Get console style for level
     * @private
     */
    getConsoleStyle(level) {
        const styles = {
            DEBUG: 'color: #666; font-weight: normal;',
            INFO: 'color: #0066cc; font-weight: bold;',
            WARN: 'color: #ff9900; font-weight: bold;',
            ERROR: 'color: #cc0000; font-weight: bold;',
            CRITICAL: 'color: #cc0000; background: #ffcccc; font-weight: bold;'
        };
        return styles[level] || styles.INFO;
    }

    /**
     * Log debug message
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    debug(message, data = {}) {
        if (this.level <= LOG_LEVELS.DEBUG) {
            const entry = this.formatEntry('DEBUG', message, data);
            this.storeLog(entry);
            this.outputLog(entry, 'debug');
        }
    }

    /**
     * Log info message
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    info(message, data = {}) {
        if (this.level <= LOG_LEVELS.INFO) {
            const entry = this.formatEntry('INFO', message, data);
            this.storeLog(entry);
            this.outputLog(entry, 'info');
        }
    }

    /**
     * Log warning message
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    warn(message, data = {}) {
        if (this.level <= LOG_LEVELS.WARN) {
            const entry = this.formatEntry('WARN', message, data);
            this.storeLog(entry);
            this.outputLog(entry, 'warn');
        }
    }

    /**
     * Log error message
     * @param {string} message - Log message
     * @param {Object} data - Additional data (should include error details)
     */
    error(message, data = {}) {
        if (this.level <= LOG_LEVELS.ERROR) {
            const entry = this.formatEntry('ERROR', message, data);
            this.storeLog(entry);
            this.outputLog(entry, 'error');

            // Send critical errors to monitoring service if configured
            if (window.errorMonitoring?.reportError) {
                window.errorMonitoring.reportError(entry);
            }
        }
    }

    /**
     * Log critical error
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    critical(message, data = {}) {
        if (this.level <= LOG_LEVELS.CRITICAL) {
            const entry = this.formatEntry('CRITICAL', message, data);
            this.storeLog(entry);
            this.outputLog(entry, 'error');

            // Always report critical errors
            if (window.errorMonitoring?.reportError) {
                window.errorMonitoring.reportError(entry);
            }
        }
    }

    /**
     * Track user action for analytics
     * @param {string} action - Action name (e.g., 'login', 'create_graduation')
     * @param {Object} metadata - Action metadata
     */
    trackAction(action, metadata = {}) {
        const entry = this.formatEntry('INFO', `Action: ${action}`, metadata);
        this.storeLog(entry);

        if (window.analytics?.track) {
            window.analytics.track(action, metadata);
        }
    }

    /**
     * Get all stored logs
     * @returns {Array} Array of log entries
     */
    getLogs() {
        return [...this.logs];
    }

    /**
     * Get logs filtered by level
     * @param {string} level - Log level to filter by
     * @returns {Array} Filtered log entries
     */
    getLogsByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }

    /**
     * Get logs filtered by time range
     * @param {number} minutes - Minutes back to retrieve (default 60)
     * @returns {Array} Filtered log entries
     */
    getRecentLogs(minutes = 60) {
        const cutoff = new Date(Date.now() - minutes * 60000);
        return this.logs.filter(log => new Date(log.timestamp) > cutoff);
    }

    /**
     * Export logs as JSON
     * @returns {string} JSON string of logs
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Clear all stored logs
     */
    clearLogs() {
        this.logs = [];
        if (this.enableStorage) {
            try {
                localStorage.removeItem(this.storageKey);
            } catch (e) {
                console.warn('Could not clear logs from localStorage', e);
            }
        }
    }

    /**
     * Set log level
     * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR, CRITICAL)
     */
    setLevel(level) {
        this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    }

    /**
     * Create child logger with additional context
     * @param {string} context - Additional context
     * @returns {Logger} New logger with combined context
     */
    createChild(context) {
        const childLogger = new Logger({
            level: Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === this.level),
            context: `${this.context}:${context}`,
            enableConsole: this.enableConsole,
            enableStorage: this.enableStorage,
            maxStoredLogs: this.maxStoredLogs
        });
        // Share the logs array so child logs appear in parent
        childLogger.logs = this.logs;
        return childLogger;
    }
}

// Create global logger instance
const logger = new Logger({
    level: process.env.NODE_ENV === 'production' ? 'WARN' : 'DEBUG',
    context: 'graduation-creator',
    enableConsole: true,
    enableStorage: false
});

// Make logger available globally for debugging
window.logger = logger;

export { logger, Logger, LOG_LEVELS };

export default logger;

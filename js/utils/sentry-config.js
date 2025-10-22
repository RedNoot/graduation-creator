/**
 * Sentry Configuration Module
 * Initializes and configures Sentry for error tracking and monitoring
 *
 * Usage:
 *   import { initSentry, captureError, setUserContext } from './sentry-config.js';
 *   initSentry('YOUR_SENTRY_DSN');
 *   setUserContext(userId, email);
 */

let sentryInitialized = false;
let Sentry = null;

/**
 * Initialize Sentry with DSN
 * @param {string} dsn - Sentry Data Source Name
 * @param {Object} options - Additional Sentry options
 * @returns {Promise<void>}
 */
export async function initSentry(dsn, options = {}) {
  if (!dsn || dsn === 'YOUR_SENTRY_DSN' || dsn.includes('your-sentry')) {
    console.warn('[Sentry] DSN not configured - error tracking disabled');
    sentryInitialized = false;
    return;
  }

  try {
    // Dynamically import Sentry from CDN
    const sentryModule = await import('https://cdn.jsdelivr.net/npm/@sentry/browser@7/+esm');
    Sentry = sentryModule;

    // Initialize Sentry
    Sentry.init({
      dsn: dsn,
      environment: getEnvironment(),
      tracesSampleRate: getEnvironment() === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      beforeSend(event, hint) {
        // Filter out test errors in development
        if (getEnvironment() === 'development' && hint.originalException?.message?.includes('test')) {
          return null;
        }
        return event;
      },
      ...options,
    });

    sentryInitialized = true;
    console.log('[Sentry] ✅ Initialized successfully');

    // Setup global error handlers
    setupGlobalErrorHandlers();
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
    sentryInitialized = false;
  }
}

/**
 * Get current environment (development, staging, production)
 * @returns {string} Environment name
 */
function getEnvironment() {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  }
  if (hostname.includes('staging') || hostname.includes('preview')) {
    return 'staging';
  }
  return 'production';
}

/**
 * Setup global error handlers
 */
function setupGlobalErrorHandlers() {
  if (!Sentry) return;

  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    captureError(event.error, {
      context: 'uncaughtError',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, {
      context: 'unhandledRejection',
    });
  });
}

/**
 * Capture exception in Sentry
 * @param {Error|Object} error - Error object or message
 * @param {Object} context - Additional context data
 */
export function captureError(error, context = {}) {
  if (!Sentry || !sentryInitialized) {
    console.error('[Sentry] Not initialized. Error:', error);
    return;
  }

  try {
    // Set tags for filtering in Sentry dashboard
    if (context.gradId) Sentry.setTag('graduationId', context.gradId);
    if (context.studentId) Sentry.setTag('studentId', context.studentId);
    if (context.userId) Sentry.setTag('userId', context.userId);
    if (context.action) Sentry.setTag('action', context.action);
    if (context.severity) Sentry.setTag('severity', context.severity);

    // Set context data for detailed debugging
    if (Object.keys(context).length > 0) {
      Sentry.setContext('errorContext', {
        gradId: context.gradId,
        studentId: context.studentId,
        userId: context.userId,
        action: context.action,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    }

    // Capture the error
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      // If it's not an Error object, create one with the message
      const errorObj = new Error(String(error));
      Sentry.captureException(errorObj);
    }
  } catch (sentryError) {
    console.error('[Sentry] Failed to capture error:', sentryError);
  }
}

/**
 * Capture message in Sentry
 * @param {string} message - Message to capture
 * @param {string} level - Severity level ('fatal', 'error', 'warning', 'info', 'debug')
 * @param {Object} context - Additional context
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (!Sentry || !sentryInitialized) {
    console.log(`[Sentry] ${level.toUpperCase()} - ${message}`);
    return;
  }

  try {
    // Set tags
    if (context.gradId) Sentry.setTag('graduationId', context.gradId);
    if (context.action) Sentry.setTag('action', context.action);

    // Capture message
    Sentry.captureMessage(message, level);
  } catch (error) {
    console.error('[Sentry] Failed to capture message:', error);
  }
}

/**
 * Add breadcrumb for tracking user actions
 * @param {string} message - Breadcrumb message
 * @param {string} category - Category (e.g., 'auth', 'upload', 'database')
 * @param {string} level - Level ('fatal', 'error', 'warning', 'info', 'debug')
 * @param {Object} data - Additional data
 */
export function addBreadcrumb(message, category = 'user-action', level = 'info', data = {}) {
  if (!Sentry || !sentryInitialized) return;

  try {
    Sentry.addBreadcrumb({
      message: message,
      category: category,
      level: level,
      data: data,
      timestamp: Date.now() / 1000,
    });
  } catch (error) {
    console.error('[Sentry] Failed to add breadcrumb:', error);
  }
}

/**
 * Set user context for error tracking
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {Object} additionalData - Additional user data
 */
export function setUserContext(userId, email, additionalData = {}) {
  if (!Sentry || !sentryInitialized) return;

  try {
    Sentry.setUser({
      id: userId,
      email: email,
      ...additionalData,
    });

    addBreadcrumb(`User context set: ${email}`, 'auth', 'info');
  } catch (error) {
    console.error('[Sentry] Failed to set user context:', error);
  }
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  if (!Sentry || !sentryInitialized) return;

  try {
    Sentry.setUser(null);
    addBreadcrumb('User context cleared', 'auth', 'info');
  } catch (error) {
    console.error('[Sentry] Failed to clear user context:', error);
  }
}

/**
 * Set graduation context for tracking project-specific errors
 * @param {string} gradId - Graduation/project ID
 * @param {string} schoolName - School name
 * @param {Object} additionalData - Additional project data
 */
export function setGraduationContext(gradId, schoolName, additionalData = {}) {
  if (!Sentry || !sentryInitialized) return;

  try {
    Sentry.setContext('graduation', {
      id: gradId,
      schoolName: schoolName,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });

    Sentry.setTag('graduationId', gradId);
    addBreadcrumb(`Graduation context: ${schoolName}`, 'graduation', 'info');
  } catch (error) {
    console.error('[Sentry] Failed to set graduation context:', error);
  }
}

/**
 * Set custom context data
 * @param {string} key - Context key
 * @param {Object} value - Context value
 */
export function setContext(key, value) {
  if (!Sentry || !sentryInitialized) return;

  try {
    Sentry.setContext(key, value);
  } catch (error) {
    console.error('[Sentry] Failed to set context:', error);
  }
}

/**
 * Set custom key-value pair
 * @param {string} key - Key name
 * @param {any} value - Value (will be converted to string)
 */
export function setTag(key, value) {
  if (!Sentry || !sentryInitialized) return;

  try {
    Sentry.setTag(key, String(value).substring(0, 100));
  } catch (error) {
    console.error('[Sentry] Failed to set tag:', error);
  }
}

/**
 * Check if Sentry is initialized
 * @returns {boolean} True if Sentry is initialized
 */
export function isSentryInitialized() {
  return sentryInitialized;
}

/**
 * Get Sentry instance (if needed for advanced usage)
 * @returns {Object|null} Sentry instance or null
 */
export function getSentry() {
  return Sentry;
}

export default {
  initSentry,
  captureError,
  captureMessage,
  addBreadcrumb,
  setUserContext,
  clearUserContext,
  setGraduationContext,
  setContext,
  setTag,
  isSentryInitialized,
  getSentry,
};

/**
 * Logger Utility Module with Sentry Integration
 * Provides structured logging with automatic error capture in Sentry
 *
 * Usage:
 *   import { logger } from './logger.js';
 *   logger.info('Message', { data });
 *   logger.error('Error', error, { gradId, studentId, action });
 */

import {
  captureError,
  captureMessage,
  addBreadcrumb,
  setUserContext,
  clearUserContext,
  setGraduationContext,
} from './sentry-config.js';

/**
 * Get current context from URL and window state
 * @returns {Object} Current context
 */
function getCurrentContext() {
  const url = new URL(window.location.href);
  const hash = url.hash;

  // Extract gradId from URL hash if present
  const gradIdMatch = hash.match(/#\/(?:edit|view|upload)\/([^/?]+)/);
  const gradId = gradIdMatch ? gradIdMatch[1] : null;

  return {
    url: window.location.href,
    gradId: gradId,
    currentUser: window.currentUser?.uid || null,
    userEmail: window.currentUser?.email || null,
    timestamp: new Date().toISOString(),
    isDevelopment: window.location.hostname === 'localhost',
  };
}

/**
 * Logger object with structured logging methods
 */
export const logger = {
  /**
   * Log informational message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  info(message, data = {}) {
    const context = getCurrentContext();
    console.log(`[INFO] ${message}`, data);

    // Send to Sentry as breadcrumb
    addBreadcrumb(message, 'info', 'info', {
      ...data,
      gradId: context.gradId,
    });
  },

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  warn(message, data = {}) {
    const context = getCurrentContext();
    console.warn(`[WARN] ${message}`, data);

    // Send to Sentry as breadcrumb
    addBreadcrumb(message, 'warning', 'warning', {
      ...data,
      gradId: context.gradId,
    });

    // Capture as message if important
    captureMessage(message, 'warning', {
      gradId: context.gradId,
      data: data,
    });
  },

  /**
   * Log error message and send to Sentry
   * @param {string} message - Error message
   * @param {Error|Object} error - Error object or details
   * @param {Object} context - Additional context (gradId, studentId, userId, action, email)
   */
  error(message, error, context = {}) {
    const ctx = getCurrentContext();
    const fullContext = {
      ...ctx,
      ...context,
      severity: context.severity || 'error',
    };

    console.error(`[ERROR] ${message}`, error, context);

    // Add breadcrumb for error sequence tracking
    addBreadcrumb(message, 'error', 'error', {
      errorMessage: error?.message || String(error),
      action: context.action,
      gradId: fullContext.gradId,
      studentId: context.studentId,
    });

    // Send to Sentry
    captureError(error, fullContext);
  },

  /**
   * Log critical error and send to Sentry
   * @param {string} message - Critical error message
   * @param {Error|Object} error - Error object or details
   * @param {Object} context - Additional context (gradId, studentId, userId, action)
   */
  critical(message, error, context = {}) {
    const ctx = getCurrentContext();
    const fullContext = {
      ...ctx,
      ...context,
      severity: 'critical',
    };

    console.error(`[CRITICAL] ${message}`, error, context);

    // Add breadcrumb for error sequence tracking
    addBreadcrumb(`CRITICAL: ${message}`, 'critical', 'fatal', {
      errorMessage: error?.message || String(error),
      action: context.action,
      gradId: fullContext.gradId,
      studentId: context.studentId,
    });

    // Send to Sentry with high priority
    captureError(error, fullContext);
  },

  /**
   * Debug log (development only)
   * @param {string} message - Debug message
   * @param {Object} data - Debug data
   */
  debug(message, data = {}) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.debug(`[DEBUG] ${message}`, data);
    }
  },

  /**
   * Log user authentication action
   * @param {string} action - Auth action (login, signup, logout, passwordReset, etc)
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {Object} details - Additional details
   */
  authAction(action, userId, email, details = {}) {
    const message = `Authentication: ${action}`;
    console.log(`[AUTH] ${message}`, { userId, email, ...details });

    // Set user context in Sentry
    if (action === 'login' || action === 'signup') {
      setUserContext(userId, email, { action: action });
    } else if (action === 'logout') {
      clearUserContext();
    }

    // Add breadcrumb
    addBreadcrumb(message, 'auth', 'info', {
      userId: userId,
      email: email,
      action: action,
      ...details,
    });

    // Capture success messages for context
    if (['login', 'signup', 'logout'].includes(action)) {
      captureMessage(message, 'info', { userId, action });
    }
  },

  /**
   * Log graduation project action
   * @param {string} action - Action (create, update, delete, view, etc)
   * @param {string} gradId - Graduation ID
   * @param {string} schoolName - School name
   * @param {Object} details - Additional details
   */
  graduationAction(action, gradId, schoolName, details = {}) {
    const message = `Graduation ${action}: ${schoolName}`;
    console.log(`[GRADUATION] ${message}`, { gradId, ...details });

    // Set graduation context in Sentry
    setGraduationContext(gradId, schoolName, { action: action });

    // Add breadcrumb
    addBreadcrumb(message, 'graduation', 'info', {
      gradId: gradId,
      schoolName: schoolName,
      action: action,
      ...details,
    });

    // Capture message for tracking
    if (['create', 'update', 'delete'].includes(action)) {
      captureMessage(message, 'info', { gradId, action });
    }
  },

  /**
   * Log student-related action
   * @param {string} action - Action (add, update, delete, upload, etc)
   * @param {string} gradId - Graduation ID
   * @param {string} studentId - Student ID
   * @param {string} studentName - Student name
   * @param {Object} details - Additional details
   */
  studentAction(action, gradId, studentId, studentName, details = {}) {
    const message = `Student ${action}: ${studentName}`;
    console.log(`[STUDENT] ${message}`, { gradId, studentId, ...details });

    // Add breadcrumb
    addBreadcrumb(message, 'student', 'info', {
      gradId: gradId,
      studentId: studentId,
      studentName: studentName,
      action: action,
      ...details,
    });
  },

  /**
   * Log file upload action
   * @param {string} action - Action (start, success, failure)
   * @param {string} fileName - File name
   * @param {number} fileSize - File size in bytes
   * @param {string} fileType - File MIME type
   * @param {Object} details - Additional details
   */
  uploadAction(action, fileName, fileSize, fileType, details = {}) {
    const message = `Upload ${action}: ${fileName}`;
    console.log(`[UPLOAD] ${message}`, { fileSize, fileType, ...details });

    // Add breadcrumb
    addBreadcrumb(message, 'upload', 'info', {
      fileName: fileName,
      fileSize: fileSize,
      fileType: fileType,
      action: action,
      ...details,
    });

    // Capture failures
    if (action === 'failure' && details.error) {
      captureError(details.error, {
        action: 'fileUpload',
        fileName: fileName,
        fileSize: fileSize,
        gradId: details.gradId,
      });
    }
  },

  /**
   * Log PDF generation action
   * @param {string} action - Action (start, success, failure)
   * @param {string} gradId - Graduation ID
   * @param {Object} details - Additional details (pageCount, studentCount, etc)
   */
  pdfAction(action, gradId, details = {}) {
    const message = `PDF generation ${action}`;
    console.log(`[PDF] ${message}`, { gradId, ...details });

    // Add breadcrumb
    addBreadcrumb(message, 'pdf', 'info', {
      gradId: gradId,
      action: action,
      ...details,
    });

    // Capture failures
    if (action === 'failure' && details.error) {
      captureError(details.error, {
        action: 'pdfGeneration',
        gradId: gradId,
      });
    }
  },

  /**
   * Log database operation
   * @param {string} operation - Operation (create, read, update, delete, query)
   * @param {string} collection - Firestore collection name
   * @param {string} docId - Document ID
   * @param {Object} details - Additional details
   */
  databaseAction(operation, collection, docId, details = {}) {
    const message = `Database ${operation}: ${collection}/${docId}`;
    console.log(`[DB] ${message}`, details);

    // Add breadcrumb
    addBreadcrumb(message, 'database', 'info', {
      operation: operation,
      collection: collection,
      docId: docId,
      ...details,
    });
  },

  /**
   * Track user action for analytics
   * @param {string} category - Action category
   * @param {string} action - Action name
   * @param {Object} data - Action data
   */
  trackAction(category, action, data = {}) {
    console.log(`[TRACK] ${category}: ${action}`, data);

    // Add breadcrumb
    addBreadcrumb(`${category} - ${action}`, 'tracking', 'info', data);
  },
};

export default logger;

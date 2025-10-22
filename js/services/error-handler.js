/**
 * Error Handler Service
 * Centralized error handling with user-friendly messages and logging
 */

import { logger } from './logger.js';

/**
 * Parse error and return user-friendly message
 * @param {Error|Object} error - The error object
 * @param {string} context - Context where error occurred (e.g., 'authentication', 'pdf_upload')
 * @returns {Object} Parsed error with code, message, details
 */
export const parseError = (error, context = 'general') => {
    const errorObj = {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        userMessage: 'Something went wrong. Please refresh and try again.',
        details: error?.message || 'Unknown error',
        context,
        timestamp: new Date().toISOString()
    };

    // Firebase Authentication Errors
    if (error?.code?.startsWith('auth/')) {
        errorObj.code = error.code;
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorObj.userMessage = 'No account found with this email. Please sign up.';
                break;
            case 'auth/wrong-password':
                errorObj.userMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorObj.userMessage = 'Invalid email address. Please check and try again.';
                break;
            case 'auth/weak-password':
                errorObj.userMessage = 'Password must be at least 6 characters.';
                break;
            case 'auth/email-already-in-use':
                errorObj.userMessage = 'This email is already registered. Please sign in or use a different email.';
                break;
            case 'auth/too-many-requests':
                errorObj.userMessage = 'Too many failed login attempts. Please try again later.';
                break;
            case 'auth/operation-not-allowed':
                errorObj.userMessage = 'This operation is not allowed. Please contact support.';
                break;
            case 'auth/invalid-api-key':
                errorObj.userMessage = 'Authentication service is unavailable. Please try again later.';
                break;
            case 'auth/network-request-failed':
                errorObj.userMessage = 'Network error. Please check your connection.';
                break;
            case 'auth/popup-closed-by-user':
                errorObj.userMessage = 'Sign in cancelled. Please try again.';
                break;
            default:
                errorObj.userMessage = `Authentication error: ${error.message}`;
        }
    }
    // Firestore Errors
    else if (error?.code?.startsWith('firestore/')) {
        errorObj.code = error.code;
        
        switch (error.code) {
            case 'firestore/permission-denied':
                errorObj.userMessage = 'Permission denied. You may not have access to this resource.';
                break;
            case 'firestore/not-found':
                errorObj.userMessage = 'The requested resource was not found.';
                break;
            case 'firestore/already-exists':
                errorObj.userMessage = 'This resource already exists.';
                break;
            case 'firestore/invalid-argument':
                errorObj.userMessage = 'Invalid request. Please check your input.';
                break;
            case 'firestore/deadline-exceeded':
                errorObj.userMessage = 'Request took too long. Please try again.';
                break;
            case 'firestore/unavailable':
                errorObj.userMessage = 'Database service is temporarily unavailable. Please try again later.';
                break;
            case 'firestore/internal':
                errorObj.userMessage = 'Server error. Please try again later.';
                break;
            default:
                errorObj.userMessage = 'Database error. Please try again.';
        }
    }
    // File Upload Errors
    else if (context.includes('upload') || context.includes('file')) {
        if (error?.message?.includes('size')) {
            errorObj.userMessage = 'File size too large. Please keep files under 10MB.';
            errorObj.code = 'FILE_TOO_LARGE';
        } else if (error?.message?.includes('type') || error?.message?.includes('format')) {
            errorObj.userMessage = 'Invalid file type. Please upload PDF, JPEG, or PNG files only.';
            errorObj.code = 'INVALID_FILE_TYPE';
        } else if (error?.message?.includes('CORS')) {
            errorObj.userMessage = 'File upload service temporarily unavailable. Please try again later.';
            errorObj.code = 'CORS_ERROR';
        } else if (error?.status === 413) {
            errorObj.userMessage = 'File is too large for upload. Maximum size is 10MB.';
            errorObj.code = 'FILE_TOO_LARGE';
        } else if (error?.status === 415) {
            errorObj.userMessage = 'File format not supported. Please use PDF, JPEG, or PNG.';
            errorObj.code = 'INVALID_FILE_TYPE';
        } else {
            errorObj.userMessage = 'File upload failed. Please try again.';
            errorObj.code = 'UPLOAD_FAILED';
        }
    }
    // PDF Generation Errors
    else if (context.includes('booklet') || context.includes('pdf')) {
        if (error?.message?.includes('No student PDFs')) {
            errorObj.userMessage = 'No student PDFs found. Make sure students have uploaded their profiles first.';
            errorObj.code = 'NO_STUDENT_PDFS';
        } else if (error?.message?.includes('timeout')) {
            errorObj.userMessage = 'PDF generation took too long. Please try again with fewer students or wait a few minutes.';
            errorObj.code = 'PDF_TIMEOUT';
        } else if (error?.message?.includes('memory')) {
            errorObj.userMessage = 'PDF is too large to generate. Please reduce the number of students or try again later.';
            errorObj.code = 'PDF_MEMORY_ERROR';
        } else if (error?.message?.includes('Server error: 5')) {
            errorObj.userMessage = 'Server is experiencing issues. Please try again in a few minutes.';
            errorObj.code = 'SERVER_ERROR';
        } else {
            errorObj.userMessage = 'PDF generation failed. Please try again.';
            errorObj.code = 'PDF_GENERATION_FAILED';
        }
    }
    // Network Errors
    else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorObj.userMessage = 'Network error. Please check your internet connection.';
        errorObj.code = 'NETWORK_ERROR';
    }
    // Rate Limiting
    else if (error?.message?.includes('rate') || error?.code === 'RESOURCE_EXHAUSTED') {
        errorObj.userMessage = 'Too many requests. Please wait a moment and try again.';
        errorObj.code = 'RATE_LIMIT';
    }
    // Validation Errors
    else if (context.includes('validation') || error?.code === 'INVALID_ARGUMENT') {
        errorObj.userMessage = `Invalid input: ${error.message || 'Please check your data and try again.'}`;
        errorObj.code = 'VALIDATION_ERROR';
    }

    return errorObj;
};

/**
 * Log error with context for debugging
 * @param {Error|Object} error - The error object
 * @param {string} context - Context where error occurred
 * @param {Object} additionalData - Additional context data
 */
export const logError = (error, context = 'general', additionalData = {}) => {
    const parsed = parseError(error, context);
    
    const logData = {
        ...parsed,
        additionalData,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
    };

    logger.error(`Error in ${context}`, logData);

    // Also log to browser console in development
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[${context}]`, {
            error,
            parsed,
            additionalData
        });
    }

    return parsed;
};

/**
 * Show user-friendly error message
 * @param {Error|Object} error - The error object
 * @param {string} context - Context where error occurred
 * @param {Function} showModal - Modal display function
 * @param {Object} additionalData - Additional context data
 */
export const showUserError = (error, context, showModal, additionalData = {}) => {
    const parsed = logError(error, context, additionalData);
    
    // Show modal with user-friendly message
    if (showModal) {
        showModal('Error', parsed.userMessage);
    } else {
        // Fallback to alert if showModal not available
        alert(`Error: ${parsed.userMessage}`);
    }

    return parsed;
};

/**
 * Handle and display multiple errors
 * @param {Array<Error>} errors - Array of errors
 * @param {string} context - Context where errors occurred
 * @param {Function} showModal - Modal display function
 */
export const handleMultipleErrors = (errors, context, showModal) => {
    const parsed = errors.map(err => parseError(err, context));
    
    const summary = parsed
        .map((p, i) => `${i + 1}. ${p.userMessage}`)
        .join('\n');

    logError(
        new Error(`Multiple errors in ${context}`),
        context,
        { errors: parsed }
    );

    if (showModal) {
        showModal('Multiple Errors', `Please fix the following issues:\n\n${summary}`);
    }

    return parsed;
};

/**
 * Wrap async function with error handling
 * @param {Function} asyncFn - Async function to wrap
 * @param {string} context - Error context
 * @param {Function} showModal - Modal display function (optional)
 * @returns {Function} Wrapped async function
 */
export const withErrorHandling = (asyncFn, context, showModal = null) => {
    return async (...args) => {
        try {
            return await asyncFn(...args);
        } catch (error) {
            showUserError(error, context, showModal, {
                args: args.length > 0 ? `[${args.length} args]` : 'no args'
            });
            throw error;
        }
    };
};

export default {
    parseError,
    logError,
    showUserError,
    handleMultipleErrors,
    withErrorHandling
};

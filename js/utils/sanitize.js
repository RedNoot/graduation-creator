/**
 * Input Sanitization Utility
 * Provides functions to sanitize different types of user input
 */

/**
 * Sanitize user input based on type
 * @param {string} input - The input to sanitize
 * @param {string} type - Type of input (text, email, url, etc)
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input, type = 'text') => {
    if (!input) return '';
    
    const trimmed = input.trim();
    
    switch(type) {
        case 'email':
            // Basic email validation
            return trimmed.toLowerCase().replace(/[^a-z0-9@._-]/g, '');
        
        case 'name':
            // Allow letters, spaces, hyphens, apostrophes
            return trimmed.replace(/[^a-zA-Z\s\-']/g, '');
        
        case 'url':
            // Basic URL validation - remove dangerous characters
            return trimmed.replace(/[^a-zA-Z0-9:/.?&=_-]/g, '');
        
        case 'password':
            // Don't modify passwords, just trim
            return trimmed;
        
        case 'text':
        default:
            // Remove potentially dangerous HTML characters
            return trimmed
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;');
    }
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with score and feedback
 */
export const validatePassword = (password) => {
    const result = {
        isValid: false,
        score: 0,
        feedback: []
    };
    
    if (password.length < 6) {
        result.feedback.push('Password must be at least 6 characters');
    } else {
        result.score += 1;
    }
    
    if (password.length >= 12) {
        result.score += 1;
    }
    
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
        result.score += 1;
    } else {
        result.feedback.push('Use both uppercase and lowercase letters');
    }
    
    if (/[0-9]/.test(password)) {
        result.score += 1;
    } else {
        result.feedback.push('Include at least one number');
    }
    
    result.isValid = password.length >= 6 && result.score >= 2;
    
    return result;
};

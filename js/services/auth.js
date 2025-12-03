/**
 * Authentication Service Module
 * Handles all authentication operations with Firebase
 */

import { auth, db } from '../firebase-init.js';
import { logger } from '../utils/logger.js';
import { setUserContext, clearUserContext } from '../utils/sentry-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

/**
 * Verify student password against graduation-specific password
 * Calls serverless function for secure password verification
 * @param {string} graduationId - The graduation ID
 * @param {string} studentId - The student ID
 * @param {string} password - Password to verify
 * @returns {Promise<boolean>} True if password is valid
 */
export const verifyStudentPassword = async (graduationId, studentId, password) => {
    try {
        logger.debug('Verifying student password', { graduationId, studentId });
        const response = await fetch('/.netlify/functions/secure-operations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'verifyPassword',
                graduationId,
                studentId,
                passwordToVerify: password,
            }),
        });

        if (!response.ok) {
            logger.warn('Password verification failed', { 
                statusCode: response.status,
                gradId: graduationId,
                studentId: studentId,
                action: 'verifyPassword'
            });
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        if (!result.isValid) {
            logger.warn('Invalid password attempt', {
                gradId: graduationId,
                studentId: studentId,
                action: 'verifyPassword'
            });
        }
        logger.debug('Password verification result', { isValid: result.isValid });
        return result.isValid;
    } catch (error) {
        logger.error('Password verification error', error, {
            gradId: graduationId,
            studentId: studentId,
            action: 'verifyPassword'
        });
        throw new Error('Failed to verify password. Please try again.');
    }
};

/**
 * Sign up a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Firebase user credential
 */
export const signUp = async (email, password) => {
    try {
        logger.debug('Attempting user sign up', { email });
        const result = await createUserWithEmailAndPassword(auth, email, password);
        
        // Set user context in Sentry for tracking
        setUserContext(result.user.uid, email);
        
        // Log success with Sentry context
        logger.authAction('signup', result.user.uid, email, {
            method: 'email/password'
        });
        
        return result;
    } catch (error) {
        logger.error('Sign up error', error, {
            email: email,
            action: 'signup',
            errorCode: error.code
        });
        throw new Error(`Sign up failed: ${error.message}`);
    }
};

/**
 * Sign in a user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Firebase user credential
 */
export const signIn = async (email, password) => {
    try {
        logger.debug('Attempting user sign in', { email });
        const result = await signInWithEmailAndPassword(auth, email, password);
        
        // Set user context in Sentry for tracking
        setUserContext(result.user.uid, email);
        
        // Log success with Sentry context
        logger.authAction('login', result.user.uid, email, {
            method: 'email/password'
        });
        
        return result;
    } catch (error) {
        logger.error('Sign in error', error, {
            email: email,
            action: 'signin',
            errorCode: error.code
        });
        throw new Error(`Sign in failed: ${error.message}`);
    }
};

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export const signOut = async () => {
    try {
        logger.debug('Attempting user sign out');
        const result = await firebaseSignOut(auth);
        
        // Clear user context in Sentry
        clearUserContext();
        
        // Log success with Sentry context
        logger.authAction('logout', 'anonymous', null, {
            method: 'manual'
        });
        
        return result;
    } catch (error) {
        logger.error('Sign out error', error, {
            action: 'signout',
            errorCode: error.code
        });
        throw new Error(`Sign out failed: ${error.message}`);
    }
};

/**
 * Set up auth state listener
 * @param {Function} callback - Function to call when auth state changes
 * @returns {Function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Send password reset email to user
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export const resetPassword = async (email) => {
    try {
        logger.debug('Attempting to send password reset email', { email });
        
        // Firebase sends reset email - no error means it was queued successfully
        await sendPasswordResetEmail(auth, email);
        
        logger.authAction('password_reset_request', 'anonymous', email, {
            method: 'email'
        });
        
        logger.debug('Password reset email sent successfully', { email });
        
        // Note: Firebase will send the email even if the account doesn't exist (security measure)
        // This prevents email enumeration attacks
        console.log('Password reset email request processed for:', email);
    } catch (error) {
        logger.error('Password reset error', error, {
            email: email,
            action: 'password_reset',
            errorCode: error.code,
            errorMessage: error.message
        });
        
        console.error('Firebase password reset error:', error.code, error.message);
        
        // Provide user-friendly error messages
        let errorMessage = 'Failed to send password reset email. ';
        if (error.code === 'auth/user-not-found') {
            errorMessage += 'No account found with this email address.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage += 'Please enter a valid email address.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage += 'Too many reset attempts. Please try again later.';
        } else if (error.code === 'auth/missing-continue-uri') {
            errorMessage += 'Email configuration error. Please contact support.';
        } else if (error.code === 'auth/invalid-continue-uri') {
            errorMessage += 'Email configuration error. Please contact support.';
        } else if (error.code === 'auth/unauthorized-continue-uri') {
            errorMessage += 'Email configuration error. Please contact support.';
        } else {
            errorMessage += error.message;
        }
        
        throw new Error(errorMessage);
    }
};

export default {
    verifyStudentPassword,
    signUp,
    signIn,
    signOut,
    onAuthStateChange,
    resetPassword
};

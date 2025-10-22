/**
 * Authentication Service Module
 * Handles all authentication operations with Firebase
 */

import { auth, db } from '../firebase-init.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut,
    onAuthStateChanged
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
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        return result.isValid;
    } catch (error) {
        console.error('Password verification error:', error);
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
        return await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error('Sign up error:', error);
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
        return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error('Sign in error:', error);
        throw new Error(`Sign in failed: ${error.message}`);
    }
};

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export const signOut = async () => {
    try {
        return await firebaseSignOut(auth);
    } catch (error) {
        console.error('Sign out error:', error);
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

export default {
    verifyStudentPassword,
    signUp,
    signIn,
    signOut,
    onAuthStateChange
};

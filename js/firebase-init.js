/**
 * Firebase Initialization Module
 * Sets up Firebase app, authentication, Firestore, and Sentry error tracking
 */

import { firebaseConfig, sentryDsn } from '../config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initSentry } from './utils/sentry-config.js';

/**
 * Initialize Sentry for error tracking
 * This should be done before initializing Firebase
 */
await initSentry(sentryDsn);

/**
 * Initialize Firebase application
 * @type {Object} Firebase app instance
 */
export const app = initializeApp(firebaseConfig);

/**
 * Get authentication instance
 * @type {Object} Firebase auth object
 */
export const auth = getAuth(app);

/**
 * Get Firestore database instance
 * @type {Object} Firestore database object
 */
export const db = getFirestore(app);

export default { app, auth, db };

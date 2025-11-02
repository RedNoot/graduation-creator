/**
 * Field Lock Manager
 * Handles real-time field-level locking for collaborative editing
 * Prevents conflicts by locking form fields when an editor is actively typing
 */

import { db } from '../firebase-init.js';
import { doc, updateDoc, serverTimestamp, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { logger } from './logger.js';

class FieldLockManager {
    constructor() {
        this.lockedFields = new Map(); // graduationId -> Map<fieldPath, {editorUid, email, timestamp}>
        this.listeners = new Map(); // graduationId -> unsubscribe function
        this.myLocks = new Map(); // graduationId -> Set<fieldPath> (fields locked by current user)
        this.lockCallbacks = new Map(); // graduationId -> Map<fieldPath, callback>
        this.staleCleanupInterval = null;
        this.STALE_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Initialize field locking for a graduation
     * @param {string} graduationId - Graduation ID
     * @param {string} currentUserUid - Current user's UID
     * @param {string} currentUserEmail - Current user's email
     */
    initialize(graduationId, currentUserUid, currentUserEmail) {
        this.graduationId = graduationId;
        this.currentUserUid = currentUserUid;
        this.currentUserEmail = currentUserEmail;

        // Listen for lock changes
        this.startListening(graduationId);

        // Start stale lock cleanup
        this.startStaleCleanup(graduationId);

        logger.info('Field lock manager initialized', { graduationId, userUid: currentUserUid });
    }

    /**
     * Start listening for field lock changes
     * @param {string} graduationId - Graduation ID
     */
    startListening(graduationId) {
        const gradRef = doc(db, 'graduations', graduationId);
        
        const unsubscribe = onSnapshot(gradRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const lockedFields = data.lockedFields || {};
                
                // Convert to Map for easier lookup
                const lockMap = new Map();
                for (const [fieldPath, lockData] of Object.entries(lockedFields)) {
                    // Skip if lock is stale
                    const timestamp = lockData.timestamp?.toMillis ? lockData.timestamp.toMillis() : lockData.timestamp;
                    if (Date.now() - timestamp < this.STALE_LOCK_TIMEOUT) {
                        lockMap.set(fieldPath, lockData);
                    }
                }
                
                this.lockedFields.set(graduationId, lockMap);
                
                // Notify callbacks of lock changes
                this.notifyLockChanges(graduationId);
            }
        }, (error) => {
            logger.error('Error listening to field locks', error, { graduationId });
        });

        this.listeners.set(graduationId, unsubscribe);
    }

    /**
     * Stop listening and cleanup
     * @param {string} graduationId - Graduation ID
     */
    cleanup(graduationId) {
        // Unlock all fields held by current user
        const myLocks = this.myLocks.get(graduationId) || new Set();
        for (const fieldPath of myLocks) {
            this.unlockField(graduationId, fieldPath).catch(err => {
                logger.warn('Error unlocking field during cleanup', err, { fieldPath });
            });
        }

        // Unsubscribe from listener
        const unsubscribe = this.listeners.get(graduationId);
        if (unsubscribe) {
            unsubscribe();
            this.listeners.delete(graduationId);
        }

        // Stop stale cleanup
        if (this.staleCleanupInterval) {
            clearInterval(this.staleCleanupInterval);
            this.staleCleanupInterval = null;
        }

        // Clear maps
        this.lockedFields.delete(graduationId);
        this.myLocks.delete(graduationId);
        this.lockCallbacks.delete(graduationId);

        logger.info('Field lock manager cleaned up', { graduationId });
    }

    /**
     * Lock a field for editing
     * @param {string} graduationId - Graduation ID
     * @param {string} fieldPath - Field path (e.g., "graduation.schoolName", "student.{id}.graduationSpeech")
     * @returns {Promise<boolean>} True if lock acquired, false if already locked by someone else
     */
    async lockField(graduationId, fieldPath) {
        try {
            // Check if already locked by someone else
            if (this.isFieldLocked(graduationId, fieldPath)) {
                const lockOwner = this.getFieldLockOwner(graduationId, fieldPath);
                if (lockOwner.editorUid !== this.currentUserUid) {
                    logger.info('Field already locked by another editor', { fieldPath, lockOwner: lockOwner.email });
                    return false;
                }
            }

            // Acquire lock
            const gradRef = doc(db, 'graduations', graduationId);
            await updateDoc(gradRef, {
                [`lockedFields.${this.sanitizeFieldPath(fieldPath)}`]: {
                    editorUid: this.currentUserUid,
                    email: this.currentUserEmail,
                    timestamp: serverTimestamp()
                }
            });

            // Track that we own this lock
            if (!this.myLocks.has(graduationId)) {
                this.myLocks.set(graduationId, new Set());
            }
            this.myLocks.get(graduationId).add(fieldPath);

            logger.info('Field locked', { fieldPath, graduationId });
            return true;

        } catch (error) {
            logger.error('Error locking field', error, { fieldPath, graduationId });
            return false;
        }
    }

    /**
     * Unlock a field
     * @param {string} graduationId - Graduation ID
     * @param {string} fieldPath - Field path
     * @returns {Promise<boolean>} True if successfully unlocked
     */
    async unlockField(graduationId, fieldPath) {
        try {
            // Only unlock if we own the lock
            const myLocks = this.myLocks.get(graduationId) || new Set();
            if (!myLocks.has(fieldPath)) {
                logger.warn('Attempted to unlock field not owned by current user', { fieldPath });
                return false;
            }

            // Remove lock from Firestore
            const gradRef = doc(db, 'graduations', graduationId);
            const docSnap = await getDoc(gradRef);
            
            if (docSnap.exists()) {
                const lockedFields = { ...(docSnap.data().lockedFields || {}) };
                const sanitizedPath = this.sanitizeFieldPath(fieldPath);
                delete lockedFields[sanitizedPath];
                
                await updateDoc(gradRef, { lockedFields });
            }

            // Remove from our tracking
            myLocks.delete(fieldPath);

            logger.info('Field unlocked', { fieldPath, graduationId });
            return true;

        } catch (error) {
            logger.error('Error unlocking field', error, { fieldPath, graduationId });
            return false;
        }
    }

    /**
     * Check if a field is locked
     * @param {string} graduationId - Graduation ID
     * @param {string} fieldPath - Field path
     * @returns {boolean} True if locked
     */
    isFieldLocked(graduationId, fieldPath) {
        const locks = this.lockedFields.get(graduationId);
        if (!locks) return false;

        const lockData = locks.get(fieldPath);
        if (!lockData) return false;

        // Check if lock is stale
        const timestamp = lockData.timestamp?.toMillis ? lockData.timestamp.toMillis() : lockData.timestamp;
        if (Date.now() - timestamp >= this.STALE_LOCK_TIMEOUT) {
            return false;
        }

        return true;
    }

    /**
     * Check if a field is locked by the current user
     * @param {string} graduationId - Graduation ID
     * @param {string} fieldPath - Field path
     * @returns {boolean} True if locked by current user
     */
    isFieldLockedByMe(graduationId, fieldPath) {
        if (!this.isFieldLocked(graduationId, fieldPath)) return false;
        
        const lockOwner = this.getFieldLockOwner(graduationId, fieldPath);
        return lockOwner && lockOwner.editorUid === this.currentUserUid;
    }

    /**
     * Get the owner of a field lock
     * @param {string} graduationId - Graduation ID
     * @param {string} fieldPath - Field path
     * @returns {Object|null} Lock owner info {editorUid, email, timestamp} or null
     */
    getFieldLockOwner(graduationId, fieldPath) {
        const locks = this.lockedFields.get(graduationId);
        if (!locks) return null;

        const lockData = locks.get(fieldPath);
        if (!lockData) return null;

        return {
            editorUid: lockData.editorUid,
            email: lockData.email,
            timestamp: lockData.timestamp?.toMillis ? lockData.timestamp.toMillis() : lockData.timestamp
        };
    }

    /**
     * Register callback for lock changes on a specific field
     * @param {string} graduationId - Graduation ID
     * @param {string} fieldPath - Field path
     * @param {Function} callback - Callback(isLocked, lockOwner)
     */
    onLockChange(graduationId, fieldPath, callback) {
        if (!this.lockCallbacks.has(graduationId)) {
            this.lockCallbacks.set(graduationId, new Map());
        }
        this.lockCallbacks.get(graduationId).set(fieldPath, callback);
    }

    /**
     * Unregister lock change callback
     * @param {string} graduationId - Graduation ID
     * @param {string} fieldPath - Field path
     */
    offLockChange(graduationId, fieldPath) {
        const callbacks = this.lockCallbacks.get(graduationId);
        if (callbacks) {
            callbacks.delete(fieldPath);
        }
    }

    /**
     * Notify registered callbacks of lock changes
     * @param {string} graduationId - Graduation ID
     */
    notifyLockChanges(graduationId) {
        const callbacks = this.lockCallbacks.get(graduationId);
        if (!callbacks) return;

        for (const [fieldPath, callback] of callbacks.entries()) {
            const isLocked = this.isFieldLocked(graduationId, fieldPath);
            const lockOwner = isLocked ? this.getFieldLockOwner(graduationId, fieldPath) : null;
            callback(isLocked, lockOwner);
        }
    }

    /**
     * Start periodic cleanup of stale locks
     * @param {string} graduationId - Graduation ID
     */
    startStaleCleanup(graduationId) {
        // Run cleanup every 2 minutes
        this.staleCleanupInterval = setInterval(async () => {
            try {
                const gradRef = doc(db, 'graduations', graduationId);
                const docSnap = await getDoc(gradRef);
                
                if (!docSnap.exists()) return;

                const lockedFields = docSnap.data().lockedFields || {};
                const now = Date.now();
                let hasStale = false;
                const cleanedLocks = {};

                for (const [fieldPath, lockData] of Object.entries(lockedFields)) {
                    const timestamp = lockData.timestamp?.toMillis ? lockData.timestamp.toMillis() : lockData.timestamp;
                    
                    // Keep lock if not stale
                    if (now - timestamp < this.STALE_LOCK_TIMEOUT) {
                        cleanedLocks[fieldPath] = lockData;
                    } else {
                        hasStale = true;
                        logger.info('Removing stale lock', { fieldPath, age: now - timestamp });
                    }
                }

                // Update Firestore if we found stale locks
                if (hasStale) {
                    await updateDoc(gradRef, { lockedFields: cleanedLocks });
                    logger.info('Stale locks cleaned up', { graduationId, removedCount: Object.keys(lockedFields).length - Object.keys(cleanedLocks).length });
                }

            } catch (error) {
                logger.warn('Error during stale lock cleanup', error, { graduationId });
            }
        }, 2 * 60 * 1000); // Every 2 minutes
    }

    /**
     * Force unlock a field (admin override)
     * @param {string} graduationId - Graduation ID
     * @param {string} fieldPath - Field path
     * @returns {Promise<boolean>} True if successfully unlocked
     */
    async forceUnlockField(graduationId, fieldPath) {
        try {
            const gradRef = doc(db, 'graduations', graduationId);
            const docSnap = await getDoc(gradRef);
            
            if (docSnap.exists()) {
                const lockedFields = { ...(docSnap.data().lockedFields || {}) };
                const sanitizedPath = this.sanitizeFieldPath(fieldPath);
                delete lockedFields[sanitizedPath];
                
                await updateDoc(gradRef, { lockedFields });
                
                logger.info('Field force unlocked', { fieldPath, graduationId });
                return true;
            }
            return false;

        } catch (error) {
            logger.error('Error force unlocking field', error, { fieldPath, graduationId });
            return false;
        }
    }

    /**
     * Sanitize field path for use as Firestore map key
     * Replace dots with underscores to avoid nested object creation
     * @param {string} fieldPath - Field path
     * @returns {string} Sanitized path
     */
    sanitizeFieldPath(fieldPath) {
        return fieldPath.replace(/\./g, '_');
    }

    /**
     * Get all currently locked fields
     * @param {string} graduationId - Graduation ID
     * @returns {Array<Object>} Array of {fieldPath, editorUid, email, timestamp}
     */
    getAllLockedFields(graduationId) {
        const locks = this.lockedFields.get(graduationId);
        if (!locks) return [];

        const result = [];
        for (const [fieldPath, lockData] of locks.entries()) {
            // Skip stale locks
            const timestamp = lockData.timestamp?.toMillis ? lockData.timestamp.toMillis() : lockData.timestamp;
            if (Date.now() - timestamp < this.STALE_LOCK_TIMEOUT) {
                result.push({
                    fieldPath,
                    editorUid: lockData.editorUid,
                    email: lockData.email,
                    timestamp
                });
            }
        }

        return result;
    }
}

// Singleton instance
const fieldLockManager = new FieldLockManager();

export default fieldLockManager;

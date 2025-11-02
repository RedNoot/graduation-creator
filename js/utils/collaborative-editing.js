/**
 * Collaborative Editing Manager
 * Handles concurrent editing conflicts and provides awareness of other editors
 */

import { db } from '../firebase-init.js';
import { doc, updateDoc, serverTimestamp, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

class CollaborativeEditingManager {
    constructor() {
        this.activeEditors = new Map(); // graduationId -> Set of editor UIDs
        this.listeners = new Map(); // graduationId -> unsubscribe function
        this.lastSaveTimestamp = new Map(); // graduationId -> timestamp
        this.pendingChanges = new Map(); // graduationId -> bool
        this.conflictCallbacks = new Map(); // graduationId -> callback function
    }

    /**
     * Start tracking active editors for a graduation
     * @param {string} graduationId - Graduation ID
     * @param {string} currentUserUid - Current user's UID
     * @param {Function} onEditorsChange - Callback when editors list changes
     */
    startTracking(graduationId, currentUserUid, onEditorsChange) {
        // Update presence in Firestore
        this.updatePresence(graduationId, currentUserUid, true);

        // Listen for other editors' presence
        const presenceRef = doc(db, 'graduations', graduationId);
        const unsubscribe = onSnapshot(presenceRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const activeEditors = data.activeEditors || {};
                
                // Clean up stale presence (older than 5 minutes)
                const now = Date.now();
                const activeUids = Object.entries(activeEditors)
                    .filter(([uid, timestamp]) => {
                        const lastSeen = timestamp?.toMillis ? timestamp.toMillis() : timestamp;
                        return now - lastSeen < 5 * 60 * 1000; // 5 minutes
                    })
                    .map(([uid]) => uid);

                this.activeEditors.set(graduationId, new Set(activeUids));
                
                if (onEditorsChange) {
                    onEditorsChange(activeUids.filter(uid => uid !== currentUserUid));
                }
            }
        });

        this.listeners.set(graduationId, unsubscribe);

        // Update presence every 60 seconds
        this.presenceInterval = setInterval(() => {
            this.updatePresence(graduationId, currentUserUid, true);
        }, 60 * 1000);
    }

    /**
     * Stop tracking and clear presence
     * @param {string} graduationId - Graduation ID
     * @param {string} currentUserUid - Current user's UID
     */
    stopTracking(graduationId, currentUserUid) {
        // Clear presence
        this.updatePresence(graduationId, currentUserUid, false);

        // Unsubscribe from listener
        const unsubscribe = this.listeners.get(graduationId);
        if (unsubscribe) {
            unsubscribe();
            this.listeners.delete(graduationId);
        }

        // Clear interval
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
        }

        // Clean up maps
        this.activeEditors.delete(graduationId);
        this.lastSaveTimestamp.delete(graduationId);
        this.pendingChanges.delete(graduationId);
        this.conflictCallbacks.delete(graduationId);
    }

    /**
     * Update user's presence in Firestore
     * @param {string} graduationId - Graduation ID
     * @param {string} userUid - User's UID
     * @param {boolean} isActive - Whether user is active
     */
    async updatePresence(graduationId, userUid, isActive) {
        try {
            const presenceRef = doc(db, 'graduations', graduationId);
            
            if (isActive) {
                await updateDoc(presenceRef, {
                    [`activeEditors.${userUid}`]: serverTimestamp()
                });
            } else {
                // Remove presence when leaving
                const gradDoc = await getDoc(presenceRef);
                if (gradDoc.exists()) {
                    const activeEditors = { ...(gradDoc.data().activeEditors || {}) };
                    delete activeEditors[userUid];
                    await updateDoc(presenceRef, { activeEditors });
                }
            }
        } catch (error) {
            console.error('Error updating presence:', error);
        }
    }

    /**
     * Check if other editors have made changes since last save
     * @param {string} graduationId - Graduation ID
     * @returns {Promise<boolean>} True if conflicts detected
     */
    async checkForConflicts(graduationId) {
        const lastSave = this.lastSaveTimestamp.get(graduationId);
        if (!lastSave) return false;

        try {
            const gradDoc = await getDoc(doc(db, 'graduations', graduationId));
            if (gradDoc.exists()) {
                const data = gradDoc.data();
                const lastUpdate = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : 0;
                
                // Check if document was updated after our last save
                return lastUpdate > lastSave;
            }
        } catch (error) {
            console.error('Error checking conflicts:', error);
        }
        return false;
    }

    /**
     * Mark that user has pending unsaved changes
     * @param {string} graduationId - Graduation ID
     * @param {boolean} hasPendingChanges - Whether user has unsaved changes
     */
    setPendingChanges(graduationId, hasPendingChanges) {
        this.pendingChanges.set(graduationId, hasPendingChanges);
    }

    /**
     * Get whether user has pending unsaved changes
     * @param {string} graduationId - Graduation ID
     * @returns {boolean} Whether user has unsaved changes
     */
    hasPendingChanges(graduationId) {
        return this.pendingChanges.get(graduationId) || false;
    }

    /**
     * Record successful save timestamp
     * @param {string} graduationId - Graduation ID
     */
    recordSave(graduationId) {
        this.lastSaveTimestamp.set(graduationId, Date.now());
        this.pendingChanges.set(graduationId, false);
    }

    /**
     * Get list of other active editors
     * @param {string} graduationId - Graduation ID
     * @param {string} currentUserUid - Current user's UID
     * @returns {Array<string>} Array of editor UIDs (excluding current user)
     */
    getOtherActiveEditors(graduationId, currentUserUid) {
        const editors = this.activeEditors.get(graduationId) || new Set();
        return Array.from(editors).filter(uid => uid !== currentUserUid);
    }

    /**
     * Register callback for conflict detection
     * @param {string} graduationId - Graduation ID
     * @param {Function} callback - Function to call when conflict detected
     */
    onConflictDetected(graduationId, callback) {
        this.conflictCallbacks.set(graduationId, callback);
    }

    /**
     * Safely update graduation with conflict detection
     * @param {string} graduationId - Graduation ID
     * @param {Object} updates - Updates to apply
     * @param {Function} updateFn - Repository update function
     * @returns {Promise<Object>} Result with success flag and any conflicts
     */
    async safeUpdate(graduationId, updates, updateFn) {
        const hasConflict = await this.checkForConflicts(graduationId);
        
        if (hasConflict) {
            const callback = this.conflictCallbacks.get(graduationId);
            if (callback) {
                const shouldContinue = await callback();
                if (!shouldContinue) {
                    return { success: false, conflict: true };
                }
            }
        }

        try {
            await updateFn(graduationId, updates);
            this.recordSave(graduationId);
            return { success: true, conflict: false };
        } catch (error) {
            console.error('Update error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Singleton instance
const collaborativeEditingManager = new CollaborativeEditingManager();

export default collaborativeEditingManager;

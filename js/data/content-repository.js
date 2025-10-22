/**
 * Content Repository
 * Data access layer for content page operations
 * Provides abstraction over Firestore for easy backend switching
 */

import * as firestoreService from '../services/firestore.js';
import { db } from '../firebase-init.js';
import { collection } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Content Repository
 * Provides all content-related database operations
 */
export const ContentRepository = {
    /**
     * Add a new content page
     * @param {string} graduationId - The graduation ID
     * @param {Object} contentData - Content info
     * @returns {Promise<Object>} Created content with ID
     */
    async create(graduationId, contentData) {
        const id = await firestoreService.addContentPage(graduationId, contentData);
        return { id, ...contentData };
    },

    /**
     * Get all content pages for a graduation
     * @param {string} graduationId - The graduation ID
     * @returns {Promise<Array>} Array of content pages
     */
    async getAll(graduationId) {
        return firestoreService.getContentPages(graduationId);
    },

    /**
     * Update a content page
     * @param {string} graduationId - The graduation ID
     * @param {string} contentId - The content page ID
     * @param {Object} updates - Data to update
     * @returns {Promise<void>}
     */
    async update(graduationId, contentId, updates) {
        return firestoreService.updateContentPage(graduationId, contentId, updates);
    },

    /**
     * Delete a content page
     * @param {string} graduationId - The graduation ID
     * @param {string} contentId - The content page ID
     * @returns {Promise<void>}
     */
    async delete(graduationId, contentId) {
        return firestoreService.deleteContentPage(graduationId, contentId);
    },

    /**
     * Set up real-time listener for content pages
     * @param {string} graduationId - The graduation ID
     * @param {Function} callback - Called with array of content pages
     * @returns {Function} Unsubscribe function
     */
    onUpdate(graduationId, callback) {
        return firestoreService.onContentPagesUpdate(graduationId, callback);
    },

    /**
     * Get content pages collection reference
     * Used when you need direct Firestore reference for onSnapshot
     * @param {string} graduationId - The graduation ID
     * @returns {CollectionReference} Firestore collection reference
     */
    getCollectionRef(graduationId) {
        return collection(db, "graduations", graduationId, "contentPages");
    }
};

export default ContentRepository;

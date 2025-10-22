/**
 * Graduation Repository
 * Data access layer for graduation operations
 * Provides abstraction over Firestore for easy backend switching
 */

import * as firestoreService from '../services/firestore.js';
import { db } from '../firebase-init.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Graduation Repository
 * Provides all graduation-related database operations
 */
export const GraduationRepository = {
    /**
     * Create a new graduation project
     * @param {Object} data - Graduation data
     * @returns {Promise<Object>} Created graduation with ID
     */
    async create(data) {
        const id = await firestoreService.createGraduation(data);
        return { id, ...data };
    },

    /**
     * Get a graduation by ID
     * @param {string} graduationId - The graduation ID
     * @returns {Promise<Object>} Graduation data
     */
    async getById(graduationId) {
        return firestoreService.getGraduation(graduationId);
    },

    /**
     * Update a graduation
     * @param {string} graduationId - The graduation ID
     * @param {Object} updates - Data to update
     * @returns {Promise<void>}
     */
    async update(graduationId, updates) {
        return firestoreService.updateGraduation(graduationId, updates);
    },

    /**
     * Set up real-time listener for a graduation
     * @param {string} graduationId - The graduation ID
     * @param {Function} callback - Called with graduation data
     * @returns {Function} Unsubscribe function
     */
    onUpdate(graduationId, callback) {
        return firestoreService.onGraduationUpdate(graduationId, callback);
    },

    /**
     * Query graduations where user is an editor
     * @param {string} userUid - User ID
     * @returns {Promise<Array>} Array of graduations where user has edit access
     */
    async getByOwner(userUid) {
        console.log('[GraduationRepo] Querying graduations for user:', userUid);
        
        // Query for graduations where user is in editors array (new multi-editor system)
        const editorsResults = await firestoreService.queryGraduations('editors', 'array-contains', userUid);
        console.log('[GraduationRepo] Found via editors array:', editorsResults.length);
        
        // Also query for old graduations with ownerUid field (backward compatibility)
        const ownerResults = await firestoreService.queryGraduations('ownerUid', '==', userUid);
        console.log('[GraduationRepo] Found via ownerUid:', ownerResults.length);
        
        // Merge results, removing duplicates by ID
        const allResults = [...editorsResults];
        const existingIds = new Set(editorsResults.map(g => g.id));
        
        for (const grad of ownerResults) {
            if (!existingIds.has(grad.id)) {
                allResults.push(grad);
            }
        }
        
        console.log('[GraduationRepo] Total graduations after merge:', allResults.length);
        return allResults;
    },

    /**
     * Get graduation config settings
     * @param {string} graduationId - The graduation ID
     * @returns {Promise<Object>} Config object
     */
    async getConfig(graduationId) {
        try {
            const grad = await this.getById(graduationId);
            return grad.config || {};
        } catch (error) {
            console.error('Error getting graduation config:', error);
            throw error;
        }
    },

    /**
     * Update graduation config settings
     * @param {string} graduationId - The graduation ID
     * @param {Object} config - Config object to save
     * @returns {Promise<void>}
     */
    async updateConfig(graduationId, config) {
        try {
            // Save config directly in the main graduation document
            await this.update(graduationId, { config });
        } catch (error) {
            console.error('Error updating graduation config:', error);
            throw error;
        }
    },

    /**
     * Update graduation with booklet URL
     * @param {string} graduationId - The graduation ID
     * @param {string} bookletUrl - The booklet URL
     * @returns {Promise<void>}
     */
    async updateBookletUrl(graduationId, bookletUrl) {
        return this.update(graduationId, {
            generatedBookletUrl: bookletUrl,
            bookletGeneratedAt: new Date()
        });
    },

    /**
     * Add an editor to a graduation project
     * @param {string} graduationId - The graduation ID
     * @param {string} editorUid - User ID to add as editor
     * @returns {Promise<void>}
     */
    async addEditor(graduationId, editorUid) {
        return firestoreService.addEditorToGraduation(graduationId, editorUid);
    },

    /**
     * Remove an editor from a graduation project
     * @param {string} graduationId - The graduation ID
     * @param {string} editorUid - User ID to remove
     * @returns {Promise<void>}
     */
    async removeEditor(graduationId, editorUid) {
        return firestoreService.removeEditorFromGraduation(graduationId, editorUid);
    },

    /**
     * Get list of editors for a graduation (returns UIDs)
     * @param {string} graduationId - The graduation ID
     * @returns {Promise<Array<string>>} Array of editor UIDs
     */
    async getEditors(graduationId) {
        const grad = await this.getById(graduationId);
        return grad.editors || (grad.ownerUid ? [grad.ownerUid] : []); // Handle migration
    }
};

export default GraduationRepository;

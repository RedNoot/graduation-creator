/**
 * Content Repository
 * Data access layer for content page operations
 * Provides abstraction over Firestore for easy backend switching
 */

import * as firestoreService from '../services/firestore.js';
import { db } from '../firebase-init.js';
import { collection, getDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { replaceAsset, replaceAssetArray, markAssetForDeletion } from '../utils/asset-cleanup.js';

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
        // Track old assets for cleanup if URLs are being replaced
        if (updates.authorPhotoUrl !== undefined || updates.bodyImageUrls !== undefined) {
            try {
                const contentRef = doc(db, "graduations", graduationId, "contentPages", contentId);
                const contentSnap = await getDoc(contentRef);
                
                if (contentSnap.exists()) {
                    const currentContent = contentSnap.data();
                    
                    if (updates.authorPhotoUrl !== undefined && currentContent.authorPhotoUrl) {
                        await replaceAsset(currentContent.authorPhotoUrl, updates.authorPhotoUrl, 'content-author-photo');
                    }
                    
                    if (updates.bodyImageUrls !== undefined && currentContent.bodyImageUrls) {
                        await replaceAssetArray(currentContent.bodyImageUrls, updates.bodyImageUrls, 'content-body-image');
                    }
                }
            } catch (error) {
                console.warn('[Asset Cleanup] Error tracking old content assets:', error);
                // Continue with update even if cleanup tracking fails
            }
        }
        
        return firestoreService.updateContentPage(graduationId, contentId, updates);
    },

    /**
     * Delete a content page
     * @param {string} graduationId - The graduation ID
     * @param {string} contentId - The content page ID
     * @returns {Promise<void>}
     */
    async delete(graduationId, contentId) {
        // Mark content assets for deletion
        try {
            const contentRef = doc(db, "graduations", graduationId, "contentPages", contentId);
            const contentSnap = await getDoc(contentRef);
            
            if (contentSnap.exists()) {
                const content = contentSnap.data();
                const assetsToDelete = [
                    content.authorPhotoUrl,
                    ...(content.bodyImageUrls || [])
                ].filter(Boolean);
                
                if (assetsToDelete.length > 0) {
                    await markAssetForDeletion(assetsToDelete, 'content-deleted');
                }
            }
        } catch (error) {
            console.warn('[Asset Cleanup] Error marking content assets:', error);
            // Continue with deletion even if cleanup tracking fails
        }
        
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

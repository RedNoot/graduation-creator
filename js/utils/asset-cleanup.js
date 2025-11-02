/**
 * Asset Cleanup Utility
 * Tracks assets (Cloudinary URLs) pending deletion
 */

import { db } from '../firebase-init.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Extract Cloudinary public ID from URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Public ID or null if not a Cloudinary URL
 */
function extractCloudinaryPublicId(url) {
    if (!url || typeof url !== 'string') return null;
    
    try {
        // Match Cloudinary URL pattern and extract public_id
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
        return match ? match[1] : null;
    } catch (error) {
        console.error('Error extracting public ID:', error);
        return null;
    }
}

/**
 * Mark a Cloudinary asset for deletion
 * @param {string|string[]} urls - URL(s) to mark for deletion
 * @param {string} context - Context description (e.g., "student-profile-photo", "content-body-image")
 * @returns {Promise<void>}
 */
export async function markAssetForDeletion(urls, context = 'unknown') {
    if (!urls) return;
    
    const urlArray = Array.isArray(urls) ? urls : [urls];
    
    for (const url of urlArray) {
        if (!url) continue;
        
        const publicId = extractCloudinaryPublicId(url);
        if (!publicId) {
            console.warn('Could not extract public ID from URL:', url);
            continue;
        }
        
        try {
            await addDoc(collection(db, 'assetsPendingDeletion'), {
                url,
                publicId,
                context,
                markedAt: serverTimestamp(),
                status: 'pending'
            });
            
            console.log('[Asset Cleanup] Marked for deletion:', { publicId, context });
        } catch (error) {
            console.error('[Asset Cleanup] Error marking asset:', error);
        }
    }
}

/**
 * Mark old asset for deletion when replacing with new one
 * @param {string} oldUrl - Old URL being replaced
 * @param {string} newUrl - New URL (will not be marked for deletion)
 * @param {string} context - Context description
 * @returns {Promise<void>}
 */
export async function replaceAsset(oldUrl, newUrl, context = 'unknown') {
    if (!oldUrl || oldUrl === newUrl) return;
    await markAssetForDeletion(oldUrl, context);
}

/**
 * Mark multiple old assets for deletion when updating array
 * @param {string[]} oldUrls - Old URLs being replaced
 * @param {string[]} newUrls - New URLs (will not be marked for deletion)
 * @param {string} context - Context description
 * @returns {Promise<void>}
 */
export async function replaceAssetArray(oldUrls, newUrls, context = 'unknown') {
    if (!oldUrls || !Array.isArray(oldUrls)) return;
    
    const newUrlSet = new Set(newUrls || []);
    const orphanedUrls = oldUrls.filter(url => url && !newUrlSet.has(url));
    
    if (orphanedUrls.length > 0) {
        await markAssetForDeletion(orphanedUrls, context);
    }
}

export default {
    markAssetForDeletion,
    replaceAsset,
    replaceAssetArray
};

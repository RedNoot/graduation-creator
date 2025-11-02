/**
 * Migration Script: ownerUid to editors Array + createdBy
 * 
 * This script migrates graduation documents from the old single-owner model
 * (ownerUid field) to the new multi-editor model (editors array + createdBy field).
 * 
 * WHAT IT DOES:
 * 1. Finds all graduation documents with ownerUid field
 * 2. Creates editors array with ownerUid as the only editor
 * 3. Sets createdBy field to ownerUid (immutable)
 * 4. Optionally removes ownerUid field after migration
 * 
 * USAGE:
 * 1. Open browser console on your deployed application
 * 2. Copy and paste this entire script
 * 3. Run: await migrateAllGraduations(false) // Dry run (no changes)
 * 4. Review the output
 * 5. Run: await migrateAllGraduations(true)  // Actually migrate
 * 
 * NOTE: This script requires you to be logged in as an admin/teacher
 */

import { db } from './firebase-init.js';
import { collection, getDocs, doc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Migrate a single graduation document
 * @param {string} gradId - Graduation document ID
 * @param {Object} gradData - Graduation document data
 * @param {boolean} dryRun - If true, only log changes without making them
 * @returns {Promise<Object>} Migration result
 */
export async function migrateGraduation(gradId, gradData, dryRun = true) {
    const result = {
        gradId,
        schoolName: gradData.schoolName || 'Unknown',
        needsMigration: false,
        changes: [],
        errors: []
    };
    
    // Check if migration is needed
    const hasOwnerUid = gradData.ownerUid !== undefined;
    const hasEditors = gradData.editors !== undefined && Array.isArray(gradData.editors);
    const hasCreatedBy = gradData.createdBy !== undefined;
    
    // Determine if migration is needed
    if (!hasOwnerUid && hasEditors && hasCreatedBy) {
        console.log(`[${gradId}] Already migrated (has editors and createdBy)`);
        return result;
    }
    
    if (!hasOwnerUid && !hasEditors) {
        result.errors.push('No ownerUid or editors field found - cannot migrate');
        console.error(`[${gradId}] ${result.errors[0]}`);
        return result;
    }
    
    result.needsMigration = true;
    const updates = {};
    
    // Migrate ownerUid to editors array
    if (hasOwnerUid && !hasEditors) {
        updates.editors = [gradData.ownerUid];
        result.changes.push(`Create editors array: [${gradData.ownerUid}]`);
    } else if (hasOwnerUid && hasEditors && !gradData.editors.includes(gradData.ownerUid)) {
        // Edge case: editors array exists but doesn't include ownerUid
        updates.editors = [...gradData.editors, gradData.ownerUid];
        result.changes.push(`Add ownerUid to existing editors array`);
    }
    
    // Set createdBy field
    if (!hasCreatedBy) {
        const creatorUid = gradData.ownerUid || (hasEditors ? gradData.editors[0] : null);
        if (creatorUid) {
            updates.createdBy = creatorUid;
            result.changes.push(`Set createdBy: ${creatorUid}`);
        } else {
            result.errors.push('Cannot determine creator UID');
        }
    }
    
    // Remove ownerUid field (optional - can be kept for backward compatibility)
    // Uncomment the next two lines to remove ownerUid after migration
    // updates.ownerUid = deleteField();
    // result.changes.push('Remove ownerUid field');
    
    // Apply updates
    if (Object.keys(updates).length > 0) {
        if (dryRun) {
            console.log(`[${gradId}] DRY RUN - Would apply:`, updates);
        } else {
            try {
                const gradRef = doc(db, 'graduations', gradId);
                await updateDoc(gradRef, updates);
                console.log(`[${gradId}] ✅ Migrated successfully`);
            } catch (error) {
                result.errors.push(`Update failed: ${error.message}`);
                console.error(`[${gradId}] ❌ Migration failed:`, error);
            }
        }
    }
    
    return result;
}

/**
 * Migrate all graduation documents in the database
 * @param {boolean} dryRun - If true, only log changes without making them
 * @returns {Promise<Object>} Summary of migration results
 */
export async function migrateAllGraduations(dryRun = true) {
    console.log('='.repeat(60));
    console.log(`MIGRATION: ownerUid → editors + createdBy`);
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (making changes)'}`);
    console.log('='.repeat(60));
    
    const summary = {
        total: 0,
        alreadyMigrated: 0,
        needsMigration: 0,
        successful: 0,
        failed: 0,
        errors: [],
        results: []
    };
    
    try {
        // Fetch all graduation documents
        const graduationsRef = collection(db, 'graduations');
        const snapshot = await getDocs(graduationsRef);
        
        summary.total = snapshot.size;
        console.log(`\nFound ${summary.total} graduation documents\n`);
        
        // Process each graduation
        for (const docSnapshot of snapshot.docs) {
            const gradId = docSnapshot.id;
            const gradData = docSnapshot.data();
            
            const result = await migrateGraduation(gradId, gradData, dryRun);
            summary.results.push(result);
            
            if (result.needsMigration) {
                summary.needsMigration++;
                if (result.errors.length === 0) {
                    summary.successful++;
                } else {
                    summary.failed++;
                    summary.errors.push({
                        gradId,
                        errors: result.errors
                    });
                }
            } else {
                summary.alreadyMigrated++;
            }
        }
        
        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total graduations: ${summary.total}`);
        console.log(`Already migrated: ${summary.alreadyMigrated}`);
        console.log(`Needed migration: ${summary.needsMigration}`);
        
        if (!dryRun) {
            console.log(`  ✅ Successful: ${summary.successful}`);
            console.log(`  ❌ Failed: ${summary.failed}`);
        }
        
        if (summary.errors.length > 0) {
            console.log('\n⚠️  ERRORS:');
            summary.errors.forEach(({ gradId, errors }) => {
                console.log(`  ${gradId}: ${errors.join(', ')}`);
            });
        }
        
        if (dryRun) {
            console.log('\n⚠️  This was a DRY RUN - no changes were made');
            console.log('To apply changes, run: await migrateAllGraduations(false)');
        } else {
            console.log('\n✅ Migration complete!');
        }
        
        console.log('='.repeat(60));
        
        return summary;
        
    } catch (error) {
        console.error('❌ Fatal migration error:', error);
        throw error;
    }
}

/**
 * Check if a specific graduation needs migration
 * @param {string} gradId - Graduation document ID
 * @returns {Promise<Object>} Migration status
 */
export async function checkGraduationNeedsMigration(gradId) {
    try {
        const gradRef = doc(db, 'graduations', gradId);
        const gradSnap = await getDoc(gradRef);
        
        if (!gradSnap.exists()) {
            console.error(`Graduation ${gradId} not found`);
            return { exists: false };
        }
        
        const gradData = gradSnap.data();
        const hasOwnerUid = gradData.ownerUid !== undefined;
        const hasEditors = gradData.editors !== undefined && Array.isArray(gradData.editors);
        const hasCreatedBy = gradData.createdBy !== undefined;
        
        return {
            exists: true,
            hasOwnerUid,
            hasEditors,
            hasCreatedBy,
            needsMigration: hasOwnerUid && (!hasEditors || !hasCreatedBy)
        };
    } catch (error) {
        console.error('Error checking graduation:', error);
        throw error;
    }
}

// Make functions available globally for browser console
if (typeof window !== 'undefined') {
    window.migrateGraduation = migrateGraduation;
    window.migrateAllGraduations = migrateAllGraduations;
    window.checkGraduationNeedsMigration = checkGraduationNeedsMigration;
}

export default {
    migrateGraduation,
    migrateAllGraduations,
    checkGraduationNeedsMigration
};

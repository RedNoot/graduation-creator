/**
 * Student Order Migration Utility
 * 
 * This script adds the 'order' field to existing students that don't have it.
 * Run this from the browser console on any authenticated page:
 * 
 * import('./js/utils/migrate-student-order.js').then(m => m.migrateAllGraduations());
 */

import { db } from '../firebase-init.js';
import { collection, getDocs, writeBatch, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * Migrate students in a single graduation to add order field
 * @param {string} graduationId - The graduation ID
 * @returns {Promise<Object>} Migration results
 */
export const migrateGraduationStudents = async (graduationId) => {
    console.log(`[Migration] Starting migration for graduation: ${graduationId}`);
    
    try {
        // Get all students
        const studentsRef = collection(db, 'graduations', graduationId, 'students');
        const snapshot = await getDocs(studentsRef);
        
        if (snapshot.empty) {
            console.log(`[Migration] No students found in graduation ${graduationId}`);
            return { success: true, migrated: 0, skipped: 0, total: 0 };
        }
        
        const students = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`[Migration] Found ${students.length} students`);
        
        // Separate students with and without order field
        const needsMigration = students.filter(s => typeof s.order !== 'number');
        const alreadyMigrated = students.filter(s => typeof s.order === 'number');
        
        if (needsMigration.length === 0) {
            console.log(`[Migration] All students already have order field`);
            return { 
                success: true, 
                migrated: 0, 
                skipped: alreadyMigrated.length, 
                total: students.length 
            };
        }
        
        console.log(`[Migration] ${needsMigration.length} students need migration`);
        
        // Sort students that need migration by creation date or name
        needsMigration.sort((a, b) => {
            const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
            const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
            
            if (dateA !== dateB) {
                return dateA - dateB;
            }
            
            return (a.name || '').localeCompare(b.name || '');
        });
        
        // Find the highest existing order value to continue from
        const maxExistingOrder = alreadyMigrated.length > 0 
            ? Math.max(...alreadyMigrated.map(s => s.order))
            : -1;
        
        // Use batch write for efficiency (max 500 operations per batch)
        const batchSize = 500;
        let migratedCount = 0;
        
        for (let i = 0; i < needsMigration.length; i += batchSize) {
            const batch = writeBatch(db);
            const batchStudents = needsMigration.slice(i, i + batchSize);
            
            batchStudents.forEach((student, index) => {
                const studentRef = doc(db, 'graduations', graduationId, 'students', student.id);
                const newOrder = maxExistingOrder + 1 + i + index;
                
                batch.update(studentRef, {
                    order: newOrder,
                    updatedAt: new Date()
                });
                
                console.log(`[Migration] Setting order ${newOrder} for student: ${student.name} (${student.id})`);
            });
            
            await batch.commit();
            migratedCount += batchStudents.length;
            console.log(`[Migration] Committed batch ${Math.floor(i / batchSize) + 1}, migrated ${migratedCount}/${needsMigration.length}`);
        }
        
        console.log(`[Migration] ✅ Successfully migrated ${migratedCount} students`);
        
        return {
            success: true,
            migrated: migratedCount,
            skipped: alreadyMigrated.length,
            total: students.length
        };
        
    } catch (error) {
        console.error(`[Migration] ❌ Error migrating graduation ${graduationId}:`, error);
        return {
            success: false,
            error: error.message,
            graduationId
        };
    }
};

/**
 * Migrate all graduations that the current user has access to
 * @returns {Promise<Object>} Overall migration results
 */
export const migrateAllGraduations = async () => {
    console.log('[Migration] Starting migration for all accessible graduations');
    
    try {
        // Get all graduations (note: this will only work if user has read access)
        const graduationsRef = collection(db, 'graduations');
        const snapshot = await getDocs(graduationsRef);
        
        if (snapshot.empty) {
            console.log('[Migration] No graduations found');
            return { success: true, graduations: [] };
        }
        
        const graduationIds = snapshot.docs.map(doc => doc.id);
        console.log(`[Migration] Found ${graduationIds.length} graduations to check`);
        
        const results = [];
        
        for (const gradId of graduationIds) {
            const result = await migrateGraduationStudents(gradId);
            results.push({
                graduationId: gradId,
                ...result
            });
        }
        
        // Summary
        const totalMigrated = results.reduce((sum, r) => sum + (r.migrated || 0), 0);
        const totalSkipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0);
        const totalStudents = results.reduce((sum, r) => sum + (r.total || 0), 0);
        const failures = results.filter(r => !r.success);
        
        console.log('\n[Migration] ==================== SUMMARY ====================');
        console.log(`[Migration] Total graduations processed: ${results.length}`);
        console.log(`[Migration] Total students migrated: ${totalMigrated}`);
        console.log(`[Migration] Total students skipped (already had order): ${totalSkipped}`);
        console.log(`[Migration] Total students: ${totalStudents}`);
        console.log(`[Migration] Failures: ${failures.length}`);
        
        if (failures.length > 0) {
            console.log('\n[Migration] Failed graduations:');
            failures.forEach(f => {
                console.log(`  - ${f.graduationId}: ${f.error}`);
            });
        }
        
        console.log('[Migration] =================================================\n');
        
        return {
            success: failures.length === 0,
            totalGraduations: results.length,
            totalMigrated,
            totalSkipped,
            totalStudents,
            failures: failures.length,
            details: results
        };
        
    } catch (error) {
        console.error('[Migration] ❌ Fatal error during migration:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Check if a graduation needs migration
 * @param {string} graduationId - The graduation ID
 * @returns {Promise<Object>} Check results
 */
export const checkGraduationNeedsMigration = async (graduationId) => {
    try {
        const studentsRef = collection(db, 'graduations', graduationId, 'students');
        const snapshot = await getDocs(studentsRef);
        
        if (snapshot.empty) {
            return { needsMigration: false, totalStudents: 0, studentsWithoutOrder: 0 };
        }
        
        const students = snapshot.docs.map(doc => doc.data());
        const studentsWithoutOrder = students.filter(s => typeof s.order !== 'number');
        
        return {
            needsMigration: studentsWithoutOrder.length > 0,
            totalStudents: students.length,
            studentsWithoutOrder: studentsWithoutOrder.length
        };
    } catch (error) {
        console.error('Error checking migration status:', error);
        return { error: error.message };
    }
};

export default {
    migrateGraduationStudents,
    migrateAllGraduations,
    checkGraduationNeedsMigration
};

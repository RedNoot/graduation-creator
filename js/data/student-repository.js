/**
 * Student Repository
 * Data access layer for student operations
 * Provides abstraction over Firestore for easy backend switching
 */

import * as firestoreService from '../services/firestore.js';
import { db } from '../firebase-init.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { replaceAsset, markAssetForDeletion } from '../utils/asset-cleanup.js';

/**
 * Student Repository
 * Provides all student-related database operations
 */
export const StudentRepository = {
    /**
     * Add a new student to a graduation
     * @param {string} graduationId - The graduation ID
     * @param {Object} studentData - Student info
     * @returns {Promise<Object>} Created student with ID
     */
    async create(graduationId, studentData) {
        const id = await firestoreService.createStudent(graduationId, studentData);
        return { id, ...studentData };
    },

    /**
     * Get a specific student
     * @param {string} graduationId - The graduation ID
     * @param {string} studentId - The student ID
     * @returns {Promise<Object>} Student data
     */
    async getById(graduationId, studentId) {
        return firestoreService.getStudent(graduationId, studentId);
    },

    /**
     * Get all students for a graduation
     * @param {string} graduationId - The graduation ID
     * @returns {Promise<Array>} Array of students ordered by custom order field
     */
    async getAll(graduationId) {
        const students = await firestoreService.getAllStudents(graduationId);
        // Students are already sorted by 'order' field from Firestore query
        return students;
    },

    /**
     * Update a student
     * @param {string} graduationId - The graduation ID
     * @param {string} studentId - The student ID
     * @param {Object} updates - Data to update
     * @returns {Promise<void>}
     */
    async update(graduationId, studentId, updates) {
        // Track old assets for cleanup if URLs are being replaced
        if (updates.profilePhotoUrl !== undefined || 
            updates.coverPhotoBeforeUrl !== undefined || 
            updates.coverPhotoAfterUrl !== undefined ||
            updates.profilePdfUrl !== undefined) {
            
            try {
                const currentStudent = await this.getById(graduationId, studentId);
                
                if (updates.profilePhotoUrl !== undefined && currentStudent.profilePhotoUrl) {
                    await replaceAsset(currentStudent.profilePhotoUrl, updates.profilePhotoUrl, 'student-profile-photo');
                }
                if (updates.coverPhotoBeforeUrl !== undefined && currentStudent.coverPhotoBeforeUrl) {
                    await replaceAsset(currentStudent.coverPhotoBeforeUrl, updates.coverPhotoBeforeUrl, 'student-cover-before');
                }
                if (updates.coverPhotoAfterUrl !== undefined && currentStudent.coverPhotoAfterUrl) {
                    await replaceAsset(currentStudent.coverPhotoAfterUrl, updates.coverPhotoAfterUrl, 'student-cover-after');
                }
                if (updates.profilePdfUrl !== undefined && currentStudent.profilePdfUrl) {
                    await replaceAsset(currentStudent.profilePdfUrl, updates.profilePdfUrl, 'student-profile-pdf');
                }
            } catch (error) {
                console.warn('[Asset Cleanup] Error tracking old assets:', error);
                // Continue with update even if cleanup tracking fails
            }
        }
        
        return firestoreService.updateStudent(graduationId, studentId, updates);
    },

    /**
     * Delete a student
     * @param {string} graduationId - The graduation ID
     * @param {string} studentId - The student ID
     * @returns {Promise<void>}
     */
    async delete(graduationId, studentId) {
        // Mark student's assets for deletion
        try {
            const student = await this.getById(graduationId, studentId);
            const assetsToDelete = [
                student.profilePhotoUrl,
                student.coverPhotoBeforeUrl,
                student.coverPhotoAfterUrl,
                student.profilePdfUrl
            ].filter(Boolean);
            
            if (assetsToDelete.length > 0) {
                await markAssetForDeletion(assetsToDelete, 'student-deleted');
            }
        } catch (error) {
            console.warn('[Asset Cleanup] Error marking student assets:', error);
            // Continue with deletion even if cleanup tracking fails
        }
        
        return firestoreService.deleteStudent(graduationId, studentId);
    },

    /**
     * Update student order after drag-and-drop reordering
     * @param {string} graduationId - The graduation ID
     * @param {Array<Object>} updates - Array of {id, newOrder} objects
     * @returns {Promise<void>}
     */
    async updateOrder(graduationId, updates) {
        return firestoreService.updateStudentOrder(graduationId, updates);
    },

    /**
     * Set up real-time listener for students
     * @param {string} graduationId - The graduation ID
     * @param {Function} callback - Called with array of students
     * @returns {Function} Unsubscribe function
     */
    onUpdate(graduationId, callback) {
        return firestoreService.onStudentsUpdate(graduationId, callback);
    },

    /**
     * Update student's profile PDF URL
     * @param {string} graduationId - The graduation ID
     * @param {string} studentId - The student ID
     * @param {string} pdfUrl - URL of the PDF
     * @returns {Promise<void>}
     */
    async updateProfilePdf(graduationId, studentId, pdfUrl) {
        return this.update(graduationId, studentId, {
            profilePdfUrl: pdfUrl
        });
    },

    /**
     * Get students collection reference for manual onSnapshot
     * Used when you need direct Firestore reference
     * @param {string} graduationId - The graduation ID
     * @returns {CollectionReference} Firestore collection reference
     */
    getCollectionRef(graduationId) {
        return collection(db, "graduations", graduationId, "students");
    },

    /**
     * Get dashboard statistics for a graduation's students
     * Efficiently calculates progress metrics for Project Home dashboard
     * @param {string} graduationId - The graduation ID
     * @returns {Promise<Object>} Stats object with counts and progress
     * @example
     * const stats = await StudentRepository.getDashboardStats(gradId);
     * // Returns: {
     * //   totalStudents: 30,
     * //   pdfCount: 25,
     * //   photoCount: 20,
     * //   coverPhotoCount: 18,
     * //   speechCount: 15,
     * //   pdfProgress: 83,
     * //   photoProgress: 67,
     * //   coverPhotoProgress: 60,
     * //   speechProgress: 50
     * // }
     */
    async getDashboardStats(graduationId) {
        try {
            const students = await this.getAll(graduationId);
            const totalStudents = students.length;
            
            if (totalStudents === 0) {
                return {
                    totalStudents: 0,
                    pdfCount: 0,
                    photoCount: 0,
                    coverPhotoCount: 0,
                    speechCount: 0,
                    pdfProgress: 0,
                    photoProgress: 0,
                    coverPhotoProgress: 0,
                    speechProgress: 0
                };
            }
            
            // Count students with each type of asset
            const pdfCount = students.filter(s => s.profilePdfUrl && s.profilePdfUrl.trim() !== '').length;
            const photoCount = students.filter(s => s.profilePhotoUrl && s.profilePhotoUrl.trim() !== '').length;
            
            // Count students with at least one cover photo
            const coverPhotoCount = students.filter(s => 
                (s.coverPhotoBeforeUrl && s.coverPhotoBeforeUrl.trim() !== '') || 
                (s.coverPhotoAfterUrl && s.coverPhotoAfterUrl.trim() !== '')
            ).length;
            
            // Count students with graduation speech/message
            const speechCount = students.filter(s => s.graduationSpeech && s.graduationSpeech.trim() !== '').length;
            
            // Calculate progress percentages
            const pdfProgress = Math.round((pdfCount / totalStudents) * 100);
            const photoProgress = Math.round((photoCount / totalStudents) * 100);
            const coverPhotoProgress = Math.round((coverPhotoCount / totalStudents) * 100);
            const speechProgress = Math.round((speechCount / totalStudents) * 100);
            
            return {
                totalStudents,
                pdfCount,
                photoCount,
                coverPhotoCount,
                speechCount,
                pdfProgress,
                photoProgress,
                coverPhotoProgress,
                speechProgress
            };
        } catch (error) {
            console.error('[StudentRepository] Error getting dashboard stats:', error);
            return {
                totalStudents: 0,
                pdfCount: 0,
                photoCount: 0,
                coverPhotoCount: 0,
                speechCount: 0,
                pdfProgress: 0,
                photoProgress: 0,
                coverPhotoProgress: 0,
                speechProgress: 0
            };
        }
    }
};

export default StudentRepository;

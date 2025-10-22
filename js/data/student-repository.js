/**
 * Student Repository
 * Data access layer for student operations
 * Provides abstraction over Firestore for easy backend switching
 */

import * as firestoreService from '../services/firestore.js';
import { db } from '../firebase-init.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
     * @returns {Promise<Array>} Array of students
     */
    async getAll(graduationId) {
        return firestoreService.getAllStudents(graduationId);
    },

    /**
     * Update a student
     * @param {string} graduationId - The graduation ID
     * @param {string} studentId - The student ID
     * @param {Object} updates - Data to update
     * @returns {Promise<void>}
     */
    async update(graduationId, studentId, updates) {
        return firestoreService.updateStudent(graduationId, studentId, updates);
    },

    /**
     * Delete a student
     * @param {string} graduationId - The graduation ID
     * @param {string} studentId - The student ID
     * @returns {Promise<void>}
     */
    async delete(graduationId, studentId) {
        return firestoreService.deleteStudent(graduationId, studentId);
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
    }
};

export default StudentRepository;

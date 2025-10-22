/**
 * Firestore Service Module
 * Handles all Firestore database operations (CRUD)
 */

import { db } from '../firebase-init.js';
import { logger } from '../utils/logger.js';
import { setGraduationContext } from '../utils/sentry-config.js';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ===== GRADUATION OPERATIONS =====

/**
 * Create a new graduation project
 * @param {Object} data - Graduation data (name, year, etc.)
 * @returns {Promise<string>} New graduation ID
 */
export const createGraduation = async (data) => {
    try {
        logger.graduationAction('create', null, data.schoolName, {
            year: data.year,
            theme: data.theme
        });
        
        const docRef = await addDoc(collection(db, 'graduations'), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        // Set graduation context in Sentry
        setGraduationContext(docRef.id, data.schoolName, {
            year: data.year,
            theme: data.theme
        });
        
        logger.graduationAction('created', docRef.id, data.schoolName, {
            year: data.year,
            theme: data.theme
        });
        
        return docRef.id;
    } catch (error) {
        logger.error('Error creating graduation', error, {
            schoolName: data.schoolName,
            action: 'createGraduation'
        });
        throw new Error(`Failed to create graduation: ${error.message}`);
    }
};

/**
 * Get a graduation by ID
 * @param {string} graduationId - The graduation ID
 * @returns {Promise<Object>} Graduation data with ID
 */
export const getGraduation = async (graduationId) => {
    try {
        logger.databaseAction('read', 'graduations', graduationId);
        const docSnap = await getDoc(doc(db, 'graduations', graduationId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            setGraduationContext(graduationId, data.schoolName);
            return {
                id: docSnap.id,
                ...data
            };
        } else {
            logger.warn('Graduation not found', { gradId: graduationId });
            throw new Error('Graduation not found');
        }
    } catch (error) {
        logger.error('Error getting graduation', error, {
            gradId: graduationId,
            action: 'getGraduation'
        });
        throw new Error(`Failed to fetch graduation: ${error.message}`);
    }
};

/**
 * Update a graduation
 * @param {string} graduationId - The graduation ID
 * @param {Object} updates - Data to update
 * @returns {Promise<void>}
 */
export const updateGraduation = async (graduationId, updates) => {
    try {
        logger.databaseAction('update', 'graduations', graduationId, { updateKeys: Object.keys(updates) });
        await updateDoc(doc(db, 'graduations', graduationId), {
            ...updates,
            updatedAt: serverTimestamp()
        });
        logger.info('Graduation updated', { gradId: graduationId, updatedFields: Object.keys(updates).length });
    } catch (error) {
        logger.error('Error updating graduation', error, {
            gradId: graduationId,
            action: 'updateGraduation'
        });
        throw new Error(`Failed to update graduation: ${error.message}`);
    }
};

/**
 * Set up real-time listener for graduation updates
 * @param {string} graduationId - The graduation ID
 * @param {Function} callback - Called with graduation data when it changes
 * @returns {Function} Unsubscribe function
 */
export const onGraduationUpdate = (graduationId, callback) => {
    return onSnapshot(doc(db, 'graduations', graduationId), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            setGraduationContext(graduationId, data.schoolName);
            callback({
                id: doc.id,
                ...data
            });
        }
    }, (error) => {
        logger.error('Error listening to graduation', error, {
            gradId: graduationId,
            action: 'onGraduationUpdate'
        });
    });
};

// ===== STUDENT OPERATIONS =====

/**
 * Add a new student to a graduation
 * @param {string} graduationId - The graduation ID
 * @param {Object} studentData - Student info (name, email, etc.)
 * @returns {Promise<string>} New student ID
 */
export const createStudent = async (graduationId, studentData) => {
    try {
        logger.studentAction('add', graduationId, null, studentData.name);
        const docRef = await addDoc(collection(db, 'graduations', graduationId, 'students'), {
            ...studentData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        logger.studentAction('added', graduationId, docRef.id, studentData.name);
        return docRef.id;
    } catch (error) {
        logger.error('Error creating student', error, {
            gradId: graduationId,
            studentName: studentData.name,
            action: 'createStudent'
        });
        throw new Error(`Failed to add student: ${error.message}`);
    }
};

/**
 * Get a specific student
 * @param {string} graduationId - The graduation ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Object>} Student data with ID
 */
export const getStudent = async (graduationId, studentId) => {
    try {
        const docSnap = await getDoc(doc(db, 'graduations', graduationId, 'students', studentId));
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        } else {
            throw new Error('Student not found');
        }
    } catch (error) {
        console.error('Error getting student:', error);
        throw new Error(`Failed to fetch student: ${error.message}`);
    }
};

/**
 * Get all students for a graduation
 * @param {string} graduationId - The graduation ID
 * @returns {Promise<Array>} Array of student objects with IDs
 */
export const getAllStudents = async (graduationId) => {
    try {
        const snapshot = await getDocs(collection(db, 'graduations', graduationId, 'students'));
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting students:', error);
        throw new Error(`Failed to fetch students: ${error.message}`);
    }
};

/**
 * Update a student
 * @param {string} graduationId - The graduation ID
 * @param {string} studentId - The student ID
 * @param {Object} updates - Data to update
 * @returns {Promise<void>}
 */
export const updateStudent = async (graduationId, studentId, updates) => {
    try {
        await updateDoc(doc(db, 'graduations', graduationId, 'students', studentId), {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating student:', error);
        throw new Error(`Failed to update student: ${error.message}`);
    }
};

/**
 * Delete a student
 * @param {string} graduationId - The graduation ID
 * @param {string} studentId - The student ID
 * @returns {Promise<void>}
 */
export const deleteStudent = async (graduationId, studentId) => {
    try {
        logger.studentAction('delete', graduationId, studentId, 'unknown');
        await deleteDoc(doc(db, 'graduations', graduationId, 'students', studentId));
        logger.studentAction('deleted', graduationId, studentId, 'unknown');
    } catch (error) {
        logger.error('Error deleting student', error, {
            gradId: graduationId,
            studentId: studentId,
            action: 'deleteStudent'
        });
        throw new Error(`Failed to delete student: ${error.message}`);
    }
};

/**
 * Set up real-time listener for students
 * @param {string} graduationId - The graduation ID
 * @param {Function} callback - Called with array of students when data changes
 * @returns {Function} Unsubscribe function
 */
export const onStudentsUpdate = (graduationId, callback) => {
    return onSnapshot(collection(db, 'graduations', graduationId, 'students'), (snapshot) => {
        const students = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // Sort alphabetically by name
        students.sort((a, b) => a.name.localeCompare(b.name));
        callback(students);
    }, (error) => {
        console.error('Error listening to students:', error);
    });
};

// ===== CONTENT PAGE OPERATIONS =====

/**
 * Add a content page (message, speech, etc.) to a graduation
 * @param {string} graduationId - The graduation ID
 * @param {Object} contentData - Content info (type, title, text, author, etc.)
 * @returns {Promise<string>} New content page ID
 */
export const addContentPage = async (graduationId, contentData) => {
    try {
        const docRef = await addDoc(collection(db, 'graduations', graduationId, 'contentPages'), {
            ...contentData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding content page:', error);
        throw new Error(`Failed to add content: ${error.message}`);
    }
};

/**
 * Get all content pages for a graduation
 * @param {string} graduationId - The graduation ID
 * @returns {Promise<Array>} Array of content page objects with IDs
 */
export const getContentPages = async (graduationId) => {
    try {
        const snapshot = await getDocs(collection(db, 'graduations', graduationId, 'contentPages'));
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting content pages:', error);
        throw new Error(`Failed to fetch content pages: ${error.message}`);
    }
};

/**
 * Update a content page
 * @param {string} graduationId - The graduation ID
 * @param {string} contentId - The content page ID
 * @param {Object} updates - Data to update
 * @returns {Promise<void>}
 */
export const updateContentPage = async (graduationId, contentId, updates) => {
    try {
        await updateDoc(doc(db, 'graduations', graduationId, 'contentPages', contentId), {
            ...updates,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating content page:', error);
        throw new Error(`Failed to update content page: ${error.message}`);
    }
};

/**
 * Delete a content page
 * @param {string} graduationId - The graduation ID
 * @param {string} contentId - The content page ID
 * @returns {Promise<void>}
 */
export const deleteContentPage = async (graduationId, contentId) => {
    try {
        await deleteDoc(doc(db, 'graduations', graduationId, 'contentPages', contentId));
    } catch (error) {
        console.error('Error deleting content page:', error);
        throw new Error(`Failed to delete content page: ${error.message}`);
    }
};

/**
 * Set up real-time listener for content pages
 * @param {string} graduationId - The graduation ID
 * @param {Function} callback - Called with array of content pages when data changes
 * @returns {Function} Unsubscribe function
 */
export const onContentPagesUpdate = (graduationId, callback) => {
    return onSnapshot(collection(db, 'graduations', graduationId, 'contentPages'), (snapshot) => {
        const pages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(pages);
    }, (error) => {
        console.error('Error listening to content pages:', error);
    });
};

// ===== QUERY OPERATIONS =====

/**
 * Query graduations by a condition
 * @param {string} fieldPath - Field to query (e.g., 'createdBy')
 * @param {string} operator - Query operator ('==', '<', '>', '<=', '>=')
 * @param {any} value - Value to query for
 * @returns {Promise<Array>} Array of matching graduations
 */
export const queryGraduations = async (fieldPath, operator, value) => {
    try {
        const q = query(collection(db, 'graduations'), where(fieldPath, operator, value));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error querying graduations:', error);
        throw new Error(`Failed to query graduations: ${error.message}`);
    }
};

export default {
    // Graduation operations
    createGraduation,
    getGraduation,
    updateGraduation,
    onGraduationUpdate,
    
    // Student operations
    createStudent,
    getStudent,
    getAllStudents,
    updateStudent,
    deleteStudent,
    onStudentsUpdate,
    
    // Content operations
    addContentPage,
    getContentPages,
    updateContentPage,
    deleteContentPage,
    onContentPagesUpdate,
    
    // Query operations
    queryGraduations
};

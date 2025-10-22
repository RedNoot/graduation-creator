/**
 * Router Module
 * Handles authenticated and public route navigation and rendering
 */

import { parseRoute, ROUTE_METADATA } from './routes.js';
import { goToDashboard } from './navigation.js';
import { GraduationRepository } from '../data/graduation-repository.js';
import { StudentRepository } from '../data/student-repository.js';
import { logger } from '../utils/logger.js';

/**
 * Main router for authenticated users
 * Routes: #/dashboard, #/edit/:gradId, #/new
 * 
 * @param {Function} renderLoading - Function to show loading state
 * @param {Function} renderLoginPage - Function to show login page
 * @param {Function} renderDashboard - Function to show dashboard
 * @param {Function} renderNewGraduationForm - Function to show new graduation form
 * @param {Function} renderEditor - Function to show editor
 * @param {Function} getCurrentUser - Function to get current authenticated user
 * @param {Ref} currentGraduationListener - Ref object to store listener unsubscribe
 * @returns {Function} Router function
 */
export const createRouter = ({
    renderLoading,
    renderLoginPage,
    renderDashboard,
    renderNewGraduationForm,
    renderEditor,
    getCurrentUser,
    currentGraduationListener
}) => {
    return async () => {
        const hash = window.location.hash;
        const currentUser = getCurrentUser(); // Get current user dynamically
        
        // Redirect to login if not authenticated
        if (!currentUser) {
            renderLoginPage();
            return;
        }

        renderLoading(); // Show loading indicator during data fetch

        const route = parseRoute(hash);

        try {
            switch (route.name) {
                case 'EDIT_GRADUATION': {
                    const { gradId } = route.params;

                    // Detach any previous listener
                    if (currentGraduationListener.current) {
                        currentGraduationListener.current();
                    }

                    // Attach a new realtime listener using repository
                    currentGraduationListener.current = GraduationRepository.onUpdate(gradId, async (gradData) => {
                        if (gradData) {
                            // Check ownership
                            if (gradData.ownerUid !== currentUser.uid) {
                                goToDashboard();
                                return;
                            }

                            // Ensure config exists (fallback to empty object if not set)
                            gradData.config = gradData.config || {};
                            
                            renderEditor(gradData, gradId);
                        } else {
                            goToDashboard();
                        }
                    });
                    break;
                }

                case 'NEW_GRADUATION': {
                    renderNewGraduationForm();
                    break;
                }

                case 'DASHBOARD':
                default: {
                    renderDashboard();
                    break;
                }
            }
        } catch (error) {
            console.error("Router error:", error);
            goToDashboard();
        }
    };
};

/**
 * Public router for unauthenticated public pages
 * Routes: #/view/:gradId, #/upload/:gradId, #/upload/:gradId/:linkId
 * 
 * @param {Function} renderLoading - Function to show loading state
 * @param {Function} renderLoginPage - Function to show login page
 * @param {Function} renderPublicView - Function to show public graduation view
 * @param {Function} renderStudentUploadPortal - Function to show upload portal
 * @param {Function} renderDirectUpload - Function to show direct student upload
 * @param {Function} showModal - Function to show modal
 * @param {Function} getCurrentUser - Function to get current authenticated user (may be null)
 * @returns {Function} Public router function
 */
export const createPublicRouter = ({
    renderLoading,
    renderLoginPage,
    renderPublicView,
    renderStudentUploadPortal,
    renderDirectUpload,
    showModal,
    getCurrentUser,
    router
}) => {
    return async () => {
        const hash = window.location.hash;
        renderLoading();

        const route = parseRoute(hash);

        try {
            switch (route.name) {
                case 'PUBLIC_VIEW': {
                    const { gradId } = route.params;
                    const gradData = await GraduationRepository.getById(gradId);
                    
                    if (gradData) {
                        // Ensure config exists (fallback to empty object if not set)
                        gradData.config = gradData.config || {};

                        // Fetch students
                        const students = await StudentRepository.getAll(gradId);
                        
                        renderPublicView(gradData, students, gradId);
                    } else {
                        showModal('Not Found', 'Graduation not found.');
                    }
                    break;
                }

                case 'UPLOAD_PORTAL': {
                    const { gradId } = route.params;
                    const gradData = await GraduationRepository.getById(gradId);
                    
                    // Check if project is locked
                    if (gradData && gradData.isLocked === true) {
                        logger.warn('Student attempted upload on locked project', {
                            gradId,
                            schoolName: gradData.schoolName,
                            isLocked: gradData.isLocked
                        });
                        showModal('Submissions Closed', 'The teacher has closed submissions for this project. No more PDFs can be uploaded at this time.');
                    } else if (gradData) {
                        logger.info('Student access to upload portal', {
                            gradId,
                            schoolName: gradData.schoolName
                        });
                        const students = await StudentRepository.getAll(gradId);
                        renderStudentUploadPortal(gradId, students);
                    } else {
                        logger.warn('Upload portal requested for non-existent project', { gradId });
                        showModal('Not Found', 'Graduation project not found.');
                    }
                    break;
                }

                case 'DIRECT_UPLOAD': {
                    const { gradId, linkId } = route.params;
                    const gradData = await GraduationRepository.getById(gradId);
                    
                    // Check if project is locked
                    if (gradData && gradData.isLocked === true) {
                        logger.warn('Student attempted direct upload on locked project', {
                            gradId,
                            schoolName: gradData.schoolName,
                            linkId,
                            isLocked: gradData.isLocked
                        });
                        showModal('Submissions Closed', 'The teacher has closed submissions for this project. No more PDFs can be uploaded at this time.');
                    } else if (gradData) {
                        const students = await StudentRepository.getAll(gradId);
                        
                        // Find student with matching unique link ID
                        const student = students.find(s => s.uniqueLinkId === linkId);
                        
                        if (student) {
                            logger.info('Student accessing direct upload link', {
                                gradId,
                                studentId: student.id,
                                studentName: student.name
                            });
                            renderDirectUpload(gradId, student);
                        } else {
                            logger.warn('Invalid or expired upload link', {
                                gradId,
                                linkId
                            });
                            showModal('Invalid Link', 'This upload link is not valid or has expired.');
                        }
                    } else {
                        logger.warn('Direct upload requested for non-existent project', { gradId, linkId });
                        showModal('Not Found', 'Graduation project not found.');
                    }
                    break;
                }

                case 'LOGIN':
                default: {
                    const currentUser = getCurrentUser();
                    if (!currentUser) {
                        renderLoginPage();
                    } else {
                        // User is logged in but on public page, redirect to dashboard
                        router();
                    }
                    break;
                }
            }
        } catch (error) {
            console.error("Public router error:", error);
            showModal('Error', 'An error occurred while loading the page.');
        }
    };
};

export default {
    createRouter,
    createPublicRouter
};

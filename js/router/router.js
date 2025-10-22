/**
 * Router Module
 * Handles authenticated and public route navigation and rendering
 */

import { parseRoute, ROUTE_METADATA } from './routes.js';
import { goToDashboard } from './navigation.js';
import { GraduationRepository } from '../data/graduation-repository.js';
import { StudentRepository } from '../data/student-repository.js';

/**
 * Main router for authenticated users
 * Routes: #/dashboard, #/edit/:gradId, #/new
 * 
 * @param {Function} renderLoading - Function to show loading state
 * @param {Function} renderLoginPage - Function to show login page
 * @param {Function} renderDashboard - Function to show dashboard
 * @param {Function} renderNewGraduationForm - Function to show new graduation form
 * @param {Function} renderEditor - Function to show editor
 * @param {Object} currentUser - Current authenticated user
 * @param {Ref} currentGraduationListener - Ref object to store listener unsubscribe
 * @returns {Function} Router function
 */
export const createRouter = ({
    renderLoading,
    renderLoginPage,
    renderDashboard,
    renderNewGraduationForm,
    renderEditor,
    currentUser,
    currentGraduationListener
}) => {
    return async () => {
        const hash = window.location.hash;
        
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

                            // Fetch config subcollection
                            const config = await GraduationRepository.getConfig(gradId);
                            gradData.config = config || {};
                            
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
 * @param {Object} currentUser - Current authenticated user (may be null)
 * @returns {Function} Public router function
 */
export const createPublicRouter = ({
    renderLoading,
    renderLoginPage,
    renderPublicView,
    renderStudentUploadPortal,
    renderDirectUpload,
    showModal,
    currentUser,
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
                        // Fetch config
                        const config = await GraduationRepository.getConfig(gradId);
                        gradData.config = config || {};

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
                    const students = await StudentRepository.getAll(gradId);
                    renderStudentUploadPortal(gradId, students);
                    break;
                }

                case 'DIRECT_UPLOAD': {
                    const { gradId, linkId } = route.params;
                    const students = await StudentRepository.getAll(gradId);
                    
                    // Find student with matching unique link ID
                    const student = students.find(s => s.uniqueLinkId === linkId);
                    
                    if (student) {
                        renderDirectUpload(gradId, student);
                    } else {
                        showModal('Invalid Link', 'This upload link is not valid or has expired.');
                    }
                    break;
                }

                case 'LOGIN':
                default: {
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

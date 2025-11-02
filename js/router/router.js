/**
 * Router Module
 * Handles authenticated and public route navigation and rendering
 */

import { parseRoute, ROUTE_METADATA } from './routes.js';
import { goToDashboard } from './navigation.js';
import { GraduationRepository } from '../data/graduation-repository.js';
import { StudentRepository } from '../data/student-repository.js';
import { logger } from '../utils/logger.js';
import { isSlug, extractIdFromSlug } from '../utils/url-slug.js';
import collaborativeEditingManager from '../utils/collaborative-editing.js';
import { showActiveEditorsBanner, removeActiveEditorsBanner } from '../components/collaborative-ui.js';
import { showModal } from '../components/modal.js';

/**
 * Resolve a slug or ID to a graduation ID
 * If it's a slug, query Firestore to find the graduation by slug
 * Otherwise return the ID as-is
 * @param {string} identifier - Slug or graduation ID
 * @returns {Promise<string|null>} - Graduation ID or null if not found
 */
async function resolveGraduationIdentifier(identifier) {
    // If it's just an ID (no hyphens or looks like a document ID), return as-is
    if (!isSlug(identifier)) {
        return identifier;
    }
    
    // It's a slug - query Firestore to find the graduation
    try {
        const graduation = await GraduationRepository.getBySlug(identifier);
        return graduation ? graduation.id : null;
    } catch (error) {
        console.error('Error resolving slug:', error);
        return null;
    }
}

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
                    const { gradId: identifier } = route.params;
                    
                    // Resolve slug to ID if necessary
                    const gradId = await resolveGraduationIdentifier(identifier);
                    
                    if (!gradId) {
                        goToDashboard();
                        return;
                    }

                    // Stop tracking previous graduation if any
                    if (currentGraduationListener.current) {
                        currentGraduationListener.current();
                    }
                    collaborativeEditingManager.stopTracking(gradId, currentUser.uid);

                    // Start presence tracking for collaborative editing
                    collaborativeEditingManager.startTracking(
                        gradId,
                        currentUser.uid,
                        async (otherEditorUids) => {
                            // Fetch editor details and show banner
                            try {
                                const response = await fetch('/.netlify/functions/manage-editors', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        action: 'getEditorEmails',
                                        graduationId: gradId,
                                        requestingUserUid: currentUser.uid
                                    })
                                });
                                
                                const result = await response.json();
                                if (result.success) {
                                    const otherEditors = result.editors.filter(e => 
                                        e.uid !== currentUser.uid && otherEditorUids.includes(e.uid)
                                    );
                                    
                                    const container = document.getElementById('tab-content');
                                    if (container && otherEditors.length > 0) {
                                        showActiveEditorsBanner(otherEditors, container);
                                    } else {
                                        removeActiveEditorsBanner();
                                    }
                                }
                            } catch (error) {
                                console.error('Error fetching editor details:', error);
                            }
                        }
                    );

                    // Attach a new realtime listener using repository
                    currentGraduationListener.current = GraduationRepository.onUpdate(gradId, async (gradData) => {
                        if (gradData) {
                            // Check if user is an editor (with backwards compatibility for ownerUid)
                            const editors = gradData.editors || [];
                            const isEditor = editors.includes(currentUser.uid) || 
                                           (gradData.ownerUid && gradData.ownerUid === currentUser.uid);
                            
                            if (!isEditor) {
                                // User was removed from editors - show message and redirect
                                collaborativeEditingManager.stopTracking(gradId, currentUser.uid);
                                showModal('Access Removed', 'You have been removed from this project by another collaborator. Redirecting to dashboard...', false);
                                setTimeout(() => {
                                    goToDashboard();
                                }, 2000);
                                return;
                            }

                            // Check if user has pending changes
                            if (collaborativeEditingManager.hasPendingChanges(gradId)) {
                                // Don't re-render - user is actively editing
                                console.log('[Collaborative] Skipping re-render - user has pending changes');
                                return;
                            }

                            // Ensure config exists (fallback to empty object if not set)
                            gradData.config = gradData.config || {};
                            
                            renderEditor(gradData, gradId);
                        } else {
                            // Project was deleted
                            collaborativeEditingManager.stopTracking(gradId, currentUser.uid);
                            showModal('Project Deleted', 'This project has been deleted. Redirecting to dashboard...', false);
                            setTimeout(() => {
                                goToDashboard();
                            }, 2000);
                        }
                    });
                    break;
                }

                case 'NEW_GRADUATION': {
                    // Stop tracking when leaving edit page
                    if (currentGraduationListener.current) {
                        const prevGradId = currentGraduationListener.current.gradId;
                        if (prevGradId) {
                            collaborativeEditingManager.stopTracking(prevGradId, currentUser.uid);
                        }
                        currentGraduationListener.current();
                    }
                    removeActiveEditorsBanner();
                    renderNewGraduationForm();
                    break;
                }

                case 'DASHBOARD':
                default: {
                    // Stop tracking when leaving edit page
                    if (currentGraduationListener.current) {
                        const prevGradId = currentGraduationListener.current.gradId;
                        if (prevGradId) {
                            collaborativeEditingManager.stopTracking(prevGradId, currentUser.uid);
                        }
                        currentGraduationListener.current();
                    }
                    removeActiveEditorsBanner();
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
 * @param {Function} showPasswordModal - Function to show password input modal
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
    showPasswordModal,
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
                    const { gradId: identifier } = route.params;
                    
                    // Resolve slug to ID if necessary
                    const gradId = await resolveGraduationIdentifier(identifier);
                    
                    if (!gradId) {
                        showModal('Not Found', 'Graduation not found.');
                        break;
                    }
                    
                    const gradData = await GraduationRepository.getById(gradId);
                    
                    if (gradData) {
                        // Ensure config exists (fallback to empty object if not set)
                        gradData.config = gradData.config || {};

                        // Check if site password protection is enabled
                        const sitePasswordHash = gradData.config.sitePasswordHash;
                        const sessionKey = `sitePasswordVerified_${gradId}`;
                        const isVerified = sessionStorage.getItem(sessionKey) === 'true';
                        
                        if (sitePasswordHash && !isVerified) {
                            // Site is password protected and user hasn't verified yet
                            // Track state to prevent infinite loops
                            let isVerifying = false;
                            let lockoutEndTime = null;
                            
                            const attemptPassword = async (password, attemptCount = 0) => {
                                // Prevent concurrent verification attempts
                                if (isVerifying) {
                                    console.warn('Password verification already in progress');
                                    return;
                                }
                                
                                // Check if currently in lockout period
                                if (lockoutEndTime && Date.now() < lockoutEndTime) {
                                    const remainingSeconds = Math.ceil((lockoutEndTime - Date.now()) / 1000);
                                    showModal('Too Many Attempts', `Please wait ${remainingSeconds} seconds before trying again.`);
                                    return;
                                }
                                
                                // Progressive temporary lockouts (no permanent blocking)
                                if (attemptCount >= 5) {
                                    // Exponential backoff: 10s, 20s, 40s, 60s, 120s, then 300s (5 min) max
                                    const lockoutDuration = Math.min(300000, 10000 * Math.pow(2, attemptCount - 5));
                                    lockoutEndTime = Date.now() + lockoutDuration;
                                    
                                    const minutes = Math.floor(lockoutDuration / 60000);
                                    const seconds = Math.floor((lockoutDuration % 60000) / 1000);
                                    const timeMessage = minutes > 0 
                                        ? `${minutes} minute${minutes > 1 ? 's' : ''} and ${seconds} seconds`
                                        : `${seconds} seconds`;
                                    
                                    showModal('Too Many Attempts', `Too many failed attempts. Please wait ${timeMessage} before trying again.`);
                                    
                                    // Reset lockout and show modal again after delay
                                    setTimeout(() => {
                                        lockoutEndTime = null;
                                        attemptPassword(null, attemptCount);
                                    }, lockoutDuration);
                                    return;
                                }
                                
                                if (password === null) {
                                    // Initial call or after lockout - show modal
                                    showPasswordModal(
                                        '🔒 Password Protected',
                                        'This graduation site is password protected. Please enter the password to continue.',
                                        (enteredPassword) => attemptPassword(enteredPassword, attemptCount),
                                        attemptCount > 0 ? `Incorrect password. Attempt ${attemptCount}/5. Please try again.` : ''
                                    );
                                    return;
                                }
                                
                                // Verify password with serverless function
                                isVerifying = true;
                                try {
                                    const controller = new AbortController();
                                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                                    
                                    const response = await fetch('/.netlify/functions/secure-operations', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            action: 'verifySitePassword',
                                            graduationId: gradId,
                                            passwordToVerifySite: password
                                        }),
                                        signal: controller.signal
                                    });
                                    
                                    clearTimeout(timeoutId);
                                    
                                    if (!response.ok) {
                                        throw new Error(`Server error: ${response.status}`);
                                    }
                                    
                                    const result = await response.json();
                                    
                                    if (result.isValid) {
                                        // Password correct! Save to session and render the site
                                        sessionStorage.setItem(sessionKey, 'true');
                                        const students = await StudentRepository.getAll(gradId);
                                        renderPublicView(gradData, students, gradId);
                                    } else {
                                        // Password incorrect, increment attempt counter
                                        const newAttemptCount = attemptCount + 1;
                                        isVerifying = false; // Reset flag before showing modal
                                        
                                        showPasswordModal(
                                            '🔒 Password Protected',
                                            'This graduation site is password protected. Please enter the password to continue.',
                                            (enteredPassword) => attemptPassword(enteredPassword, newAttemptCount),
                                            `Incorrect password. Attempt ${newAttemptCount}/5. Please try again.`
                                        );
                                    }
                                } catch (error) {
                                    isVerifying = false; // Reset flag on error
                                    console.error('Password verification error:', error);
                                    
                                    if (error.name === 'AbortError') {
                                        showModal('Timeout', 'Password verification timed out. Please check your connection and try again.');
                                    } else {
                                        showModal('Error', 'An error occurred while verifying the password. Please try again.');
                                    }
                                    
                                    // Allow user to retry after error without incrementing counter
                                    setTimeout(() => {
                                        attemptPassword(null, attemptCount);
                                    }, 2000);
                                }
                            };
                            
                            // Start password verification flow
                            attemptPassword(null, 0);
                        } else {
                            // No password protection or already verified
                            // Fetch students
                            const students = await StudentRepository.getAll(gradId);
                            
                            renderPublicView(gradData, students, gradId);
                        }
                    } else {
                        showModal('Not Found', 'Graduation not found.');
                    }
                    break;
                }

                case 'UPLOAD_PORTAL': {
                    const { gradId: identifier } = route.params;
                    
                    // Resolve slug to ID if necessary
                    const gradId = await resolveGraduationIdentifier(identifier);
                    
                    if (!gradId) {
                        showModal('Not Found', 'Graduation project not found.');
                        break;
                    }
                    
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
                    const { gradId: identifier, linkId } = route.params;
                    
                    // Resolve slug to ID if necessary
                    const gradId = await resolveGraduationIdentifier(identifier);
                    
                    if (!gradId) {
                        showModal('Not Found', 'Graduation project not found.');
                        break;
                    }
                    
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

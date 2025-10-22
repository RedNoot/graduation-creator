/**
 * Navigation Helpers Module
 * Utilities for navigation and URL/hash management
 */

import { generateRoute, getFullRouteUrl } from './routes.js';

/**
 * Navigate to a route
 * @param {string} routeName - Route name or hash string
 * @param {Object} params - Route parameters
 * @returns {void}
 */
export const navigateTo = (routeName, params = {}) => {
    if (routeName.startsWith('#')) {
        // Direct hash navigation
        window.location.hash = routeName;
    } else {
        // Route name navigation
        window.location.hash = generateRoute(routeName, params);
    }
};

/**
 * Navigate to dashboard
 * @returns {void}
 */
export const goToDashboard = () => {
    navigateTo('DASHBOARD');
};

/**
 * Navigate to edit graduation
 * @param {string} gradId - Graduation ID
 * @returns {void}
 */
export const goToEditGraduation = (gradId) => {
    navigateTo('EDIT_GRADUATION', { gradId });
};

/**
 * Navigate to create new graduation
 * @returns {void}
 */
export const goToNewGraduation = () => {
    navigateTo('NEW_GRADUATION');
};

/**
 * Navigate to public graduation view
 * @param {string} gradId - Graduation ID
 * @returns {void}
 */
export const goToPublicView = (gradId) => {
    navigateTo('PUBLIC_VIEW', { gradId });
};

/**
 * Navigate to upload portal
 * @param {string} gradId - Graduation ID
 * @returns {void}
 */
export const goToUploadPortal = (gradId) => {
    navigateTo('UPLOAD_PORTAL', { gradId });
};

/**
 * Navigate to direct upload
 * @param {string} gradId - Graduation ID
 * @param {string} linkId - Student unique link ID
 * @returns {void}
 */
export const goToDirectUpload = (gradId, linkId) => {
    navigateTo('DIRECT_UPLOAD', { gradId, linkId });
};

/**
 * Get public sharing URL for a graduation
 * @param {string} gradId - Graduation ID
 * @returns {string} Full URL for public view
 */
export const getPublicShareUrl = (gradId) => {
    return getFullRouteUrl('PUBLIC_VIEW', { gradId });
};

/**
 * Get upload portal URL for a graduation
 * @param {string} gradId - Graduation ID
 * @returns {string} Full URL for upload portal
 */
export const getUploadPortalUrl = (gradId) => {
    return getFullRouteUrl('UPLOAD_PORTAL', { gradId });
};

/**
 * Get direct upload URL for a student
 * @param {string} gradId - Graduation ID
 * @param {string} linkId - Student unique link ID
 * @returns {string} Full URL for direct upload
 */
export const getDirectUploadUrl = (gradId, linkId) => {
    return getFullRouteUrl('DIRECT_UPLOAD', { gradId, linkId });
};

/**
 * Get current hash
 * @returns {string} Current window.location.hash
 */
export const getCurrentHash = () => {
    return window.location.hash;
};

/**
 * Get current page URL without hash
 * @returns {string} Base URL without hash
 */
export const getBaseUrl = () => {
    return `${window.location.origin}${window.location.pathname}`;
};

/**
 * Check if currently on a public route
 * @returns {boolean} True if on public route
 */
export const isPublicRoute = () => {
    const hash = getCurrentHash();
    return hash.startsWith('#/view/') || 
           hash.startsWith('#/upload/');
};

/**
 * Check if currently on authenticated route
 * @returns {boolean} True if on authenticated route
 */
export const isAuthenticatedRoute = () => {
    return !isPublicRoute();
};

export default {
    navigateTo,
    goToDashboard,
    goToEditGraduation,
    goToNewGraduation,
    goToPublicView,
    goToUploadPortal,
    goToDirectUpload,
    getPublicShareUrl,
    getUploadPortalUrl,
    getDirectUploadUrl,
    getCurrentHash,
    getBaseUrl,
    isPublicRoute,
    isAuthenticatedRoute
};

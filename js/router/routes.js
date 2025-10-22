/**
 * Route Definitions and Constants
 * Defines all application routes and navigation constants
 */

/**
 * Route patterns and metadata
 */
export const ROUTES = {
    // Authenticated routes
    DASHBOARD: '#/dashboard',
    EDIT_GRADUATION: '#/edit/:gradId',
    NEW_GRADUATION: '#/new',
    
    // Public/unauthenticated routes
    PUBLIC_VIEW: '#/view/:gradId',
    UPLOAD_PORTAL: '#/upload/:gradId',
    DIRECT_UPLOAD: '#/upload/:gradId/:linkId',
    
    // Auth routes
    LOGIN: '#/login'
};

/**
 * Parse route hash and extract parameters
 * @param {string} hash - Window location hash
 * @returns {Object} Route object with {name, params, hash}
 */
export const parseRoute = (hash) => {
    if (!hash || hash === '#/' || hash === '') {
        return { name: 'DASHBOARD', params: {}, hash: ROUTES.DASHBOARD };
    }
    
    if (hash === ROUTES.DASHBOARD) {
        return { name: 'DASHBOARD', params: {}, hash };
    }
    
    if (hash === ROUTES.NEW_GRADUATION) {
        return { name: 'NEW_GRADUATION', params: {}, hash };
    }
    
    if (hash.startsWith('#/edit/')) {
        const gradId = hash.split('/')[2];
        return { name: 'EDIT_GRADUATION', params: { gradId }, hash };
    }
    
    if (hash.startsWith('#/view/')) {
        const gradId = hash.split('/')[2];
        return { name: 'PUBLIC_VIEW', params: { gradId }, hash };
    }
    
    if (hash.startsWith('#/upload/')) {
        const pathParts = hash.split('/');
        const gradId = pathParts[2];
        const linkId = pathParts[3];
        
        if (linkId) {
            return { name: 'DIRECT_UPLOAD', params: { gradId, linkId }, hash };
        } else {
            return { name: 'UPLOAD_PORTAL', params: { gradId }, hash };
        }
    }
    
    if (hash === ROUTES.LOGIN) {
        return { name: 'LOGIN', params: {}, hash };
    }
    
    // Default to dashboard
    return { name: 'DASHBOARD', params: {}, hash: ROUTES.DASHBOARD };
};

/**
 * Generate a route hash with parameters
 * @param {string} routeName - Route name from ROUTES
 * @param {Object} params - Route parameters {gradId, linkId, etc}
 * @returns {string} Complete hash URL
 */
export const generateRoute = (routeName, params = {}) => {
    switch (routeName) {
        case 'DASHBOARD':
            return ROUTES.DASHBOARD;
        case 'NEW_GRADUATION':
            return ROUTES.NEW_GRADUATION;
        case 'EDIT_GRADUATION':
            return `#/edit/${params.gradId}`;
        case 'PUBLIC_VIEW':
            return `#/view/${params.gradId}`;
        case 'UPLOAD_PORTAL':
            return `#/upload/${params.gradId}`;
        case 'DIRECT_UPLOAD':
            return `#/upload/${params.gradId}/${params.linkId}`;
        case 'LOGIN':
            return ROUTES.LOGIN;
        default:
            return ROUTES.DASHBOARD;
    }
};

/**
 * Get full URL for a route
 * @param {string} routeName - Route name from ROUTES
 * @param {Object} params - Route parameters
 * @returns {string} Full URL with origin and pathname
 */
export const getFullRouteUrl = (routeName, params = {}) => {
    const hash = generateRoute(routeName, params);
    return `${window.location.origin}${window.location.pathname}${hash}`;
};

/**
 * Route metadata (for navigation context)
 */
export const ROUTE_METADATA = {
    DASHBOARD: {
        title: 'Your Graduations',
        requiresAuth: true,
        isPublic: false
    },
    EDIT_GRADUATION: {
        title: 'Edit Graduation',
        requiresAuth: true,
        isPublic: false
    },
    NEW_GRADUATION: {
        title: 'Create New Graduation',
        requiresAuth: true,
        isPublic: false
    },
    PUBLIC_VIEW: {
        title: 'Graduation View',
        requiresAuth: false,
        isPublic: true
    },
    UPLOAD_PORTAL: {
        title: 'Upload Portal',
        requiresAuth: false,
        isPublic: true
    },
    DIRECT_UPLOAD: {
        title: 'Upload Profile',
        requiresAuth: false,
        isPublic: true
    },
    LOGIN: {
        title: 'Sign In',
        requiresAuth: false,
        isPublic: false
    }
};

export default {
    ROUTES,
    ROUTE_METADATA,
    parseRoute,
    generateRoute,
    getFullRouteUrl
};

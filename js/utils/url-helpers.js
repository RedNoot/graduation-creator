/**
 * URL Helper Utilities
 * Functions for parsing, manipulating, and validating URLs
 */

/**
 * Ensure PDF URLs are properly formatted for public access
 * Adds fl_attachment flag for download behavior and handles public/private URLs
 * @param {string} url - The PDF URL to process
 * @returns {string} Properly formatted public PDF URL
 */
export const ensurePublicPdfUrl = (url) => {
    if (!url) return '';
    
    // If already has fl_attachment, return as-is
    if (url.includes('fl_attachment')) {
        return url;
    }
    
    // If it's a Cloudinary URL, add fl_attachment for download behavior
    if (url.includes('cloudinary.com')) {
        return url.replace('/upload/', '/upload/fl_attachment/');
    }
    
    return url;
};

/**
 * Get the current graduation ID from URL hash
 * @deprecated Use parseRoute() from js/router/routes.js instead
 * @returns {string|null} The graduation ID or null if not found
 */
export function getCurrentGradId() {
    const path = window.location.hash;
    const match = path.match(/#\/graduation\/([^\/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Encode URL parameter safely
 * @param {string} param - Parameter to encode
 * @returns {string} Safely encoded parameter
 */
export function encodeUrlParam(param) {
    return encodeURIComponent(param).replace(/%20/g, '+');
}

/**
 * Decode URL parameter safely
 * @param {string} param - Parameter to decode
 * @returns {string} Decoded parameter
 */
export function decodeUrlParam(param) {
    return decodeURIComponent(param.replace(/\+/g, '%20'));
}

/**
 * Get query parameter from URL
 * @param {string} paramName - Name of parameter to retrieve
 * @returns {string|null} Parameter value or null if not found
 */
export function getQueryParam(paramName) {
    const params = new URLSearchParams(window.location.search);
    return params.get(paramName);
}

/**
 * Add or update query parameter
 * @param {string} paramName - Name of parameter
 * @param {string} value - New value
 */
export function setQueryParam(paramName, value) {
    const params = new URLSearchParams(window.location.search);
    params.set(paramName, value);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
}

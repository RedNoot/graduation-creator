/**
 * URL Slug Utility
 * Generates URL-friendly slugs from school name and graduation year
 */

/**
 * Generate a URL-friendly slug from school name and year
 * @param {string} schoolName - School name
 * @param {number} graduationYear - Graduation year
 * @param {string} gradId - Graduation document ID (for uniqueness)
 * @returns {string} - URL-friendly slug
 * 
 * @example
 * generateUrlSlug("Lincoln High School", 2024, "abc123")
 * // Returns: "lincoln-high-school-2024-abc123"
 */
export function generateUrlSlug(schoolName, graduationYear, gradId) {
    // Convert school name to lowercase and replace spaces/special chars with hyphens
    const nameSlug = schoolName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')      // Replace spaces with hyphens
        .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
    
    // Get last 8 characters of gradId for uniqueness (shorter URL)
    const shortId = gradId.slice(-8);
    
    // Combine: schoolname-year-id
    return `${nameSlug}-${graduationYear}-${shortId}`;
}

/**
 * Extract graduation ID from a URL slug
 * @param {string} slug - URL slug (e.g., "lincoln-high-school-2024-abc123")
 * @returns {string|null} - Graduation ID or null if not found
 * 
 * @example
 * extractIdFromSlug("lincoln-high-school-2024-abc12345")
 * // Returns: "abc12345" (last 8 chars)
 */
export function extractIdFromSlug(slug) {
    if (!slug) return null;
    
    // The ID is the last segment after the last hyphen
    const parts = slug.split('-');
    
    // If it looks like just an ID (no hyphens or short), return as-is
    if (parts.length === 1) {
        return slug;
    }
    
    // Return the last part (which should be the short ID)
    return parts[parts.length - 1];
}

/**
 * Check if a string is likely a slug (vs just an ID)
 * @param {string} identifier - String to check
 * @returns {boolean} - True if it looks like a slug
 */
export function isSlug(identifier) {
    return identifier && identifier.includes('-') && identifier.split('-').length > 2;
}

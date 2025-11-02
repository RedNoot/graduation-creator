/**
 * Secure Download Helper
 * Validates download permissions via serverless function before downloading
 */

/**
 * Initiate secure download with server-side validation
 * @param {string} graduationId - The graduation ID
 * @param {Function} showModal - Modal display function
 * @returns {Promise<void>}
 */
export const initiateSecureDownload = async (graduationId, showModal) => {
    try {
        // Call serverless function to validate download permissions
        const response = await fetch(`/.netlify/functions/download-booklet/${graduationId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.status === 403) {
            // Download not yet available due to scheduling
            const availableDate = new Date(result.availableAt);
            const timeRemaining = formatTimeRemaining(result.remainingMilliseconds);
            
            showModal(
                'Download Not Available',
                `${result.message}\n\nThis booklet will be available on ${availableDate.toLocaleDateString()} at ${availableDate.toLocaleTimeString()}.\n\nTime remaining: ${timeRemaining}`
            );
            return;
        }

        if (!response.ok) {
            throw new Error(result.error || 'Failed to validate download');
        }

        if (result.success && result.downloadUrl) {
            // All checks passed - initiate download
            console.log('[Download] Starting secure download');
            
            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = result.downloadUrl;
            link.download = result.filename || 'graduation-booklet.pdf';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('[Download] Download initiated successfully');
        } else {
            throw new Error('Invalid response from server');
        }

    } catch (error) {
        console.error('[Download] Error:', error);
        showModal(
            'Download Error',
            `Failed to download booklet: ${error.message}\n\nPlease try again or contact support.`
        );
    }
};

/**
 * Format milliseconds into human-readable time remaining
 * @param {number} milliseconds - Time remaining in milliseconds
 * @returns {string} Formatted time string
 */
function formatTimeRemaining(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} and ${hours % 24} hour${(hours % 24) !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes % 60} minute${(minutes % 60) !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} and ${seconds % 60} second${(seconds % 60) !== 1 ? 's' : ''}`;
    } else {
        return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
}

/**
 * Check if download is available without initiating download
 * @param {string} graduationId - The graduation ID
 * @returns {Promise<Object>} Status object with isAvailable, message, etc.
 */
export const checkDownloadAvailability = async (graduationId) => {
    try {
        const response = await fetch(`/.netlify/functions/download-booklet/${graduationId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.status === 403) {
            return {
                isAvailable: false,
                reason: 'scheduled',
                message: result.message,
                availableAt: result.availableAt,
                remainingMilliseconds: result.remainingMilliseconds
            };
        }

        if (!response.ok) {
            return {
                isAvailable: false,
                reason: 'error',
                message: result.error || 'Unknown error'
            };
        }

        return {
            isAvailable: true,
            downloadUrl: result.downloadUrl,
            filename: result.filename
        };

    } catch (error) {
        console.error('[Download] Check availability error:', error);
        return {
            isAvailable: false,
            reason: 'error',
            message: error.message
        };
    }
};

export default {
    initiateSecureDownload,
    checkDownloadAvailability
};

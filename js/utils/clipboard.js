/**
 * Clipboard Utility
 * Handles copying text to clipboard with visual feedback
 */

/**
 * Copy text to clipboard with visual feedback
 * @param {string} text - Text to copy
 * @param {HTMLElement} buttonElement - Button element to show feedback on
 */
export function copyToClipboard(text, buttonElement = null) {
    const targetButton = buttonElement || event.target;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        // Modern clipboard API
        const originalText = targetButton.textContent;
        navigator.clipboard.writeText(text).then(() => {
            targetButton.textContent = 'Copied!';
            setTimeout(() => {
                targetButton.textContent = originalText;
            }, 2000);
        }).catch(() => {
            // Fallback to older method if modern API fails
            fallbackCopyToClipboard(text, targetButton);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyToClipboard(text, targetButton);
    }
}

/**
 * Fallback clipboard copy for older browsers
 * @private
 * @param {string} text - Text to copy
 * @param {HTMLElement} button - Button element for feedback
 */
function fallbackCopyToClipboard(text, button) {
    const originalText = button.textContent;
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text:', err);
        button.textContent = 'Failed to copy';
    }
    
    document.body.removeChild(textArea);
}

/**
 * Accessibility Utilities Module
 * Provides helper functions for WCAG compliance and keyboard navigation
 */

/**
 * Focus Trap Manager - Trap focus within a container (for modals)
 * @param {HTMLElement} container - The container to trap focus within
 * @returns {Object} Object with activate/deactivate methods
 */
export class FocusTrap {
    constructor(container) {
        this.container = container;
        this.previousFocus = null;
        this.isActive = false;
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }
    
    /**
     * Get all focusable elements within container
     * @returns {Array<HTMLElement>} Array of focusable elements
     */
    getFocusableElements() {
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'textarea:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
        
        return Array.from(this.container.querySelectorAll(focusableSelectors))
            .filter(el => {
                // Filter out hidden elements
                return el.offsetParent !== null;
            });
    }
    
    /**
     * Handle Tab key navigation
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyDown(e) {
        if (e.key !== 'Tab') return;
        
        const focusableElements = this.getFocusableElements();
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey) {
            // Shift + Tab: moving backwards
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab: moving forwards
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
    
    /**
     * Activate the focus trap
     */
    activate() {
        if (this.isActive) return;
        
        // Store current focus
        this.previousFocus = document.activeElement;
        
        // Add event listener
        this.container.addEventListener('keydown', this.handleKeyDown);
        
        // Focus first focusable element
        const focusableElements = this.getFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
        
        this.isActive = true;
    }
    
    /**
     * Deactivate the focus trap and restore focus
     */
    deactivate() {
        if (!this.isActive) return;
        
        // Remove event listener
        this.container.removeEventListener('keydown', this.handleKeyDown);
        
        // Restore previous focus
        if (this.previousFocus && this.previousFocus.focus) {
            this.previousFocus.focus();
        }
        
        this.isActive = false;
    }
}

/**
 * Calculate color contrast ratio between two colors
 * @param {string} color1 - First color (hex format)
 * @param {string} color2 - Second color (hex format)
 * @returns {number} Contrast ratio
 */
export function getContrastRatio(color1, color2) {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color
 * @param {string} color - Color in hex format (#RRGGBB)
 * @returns {number} Relative luminance
 */
export function getLuminance(color) {
    // Remove # if present
    color = color.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(color.substr(0, 2), 16) / 255;
    const g = parseInt(color.substr(2, 2), 16) / 255;
    const b = parseInt(color.substr(4, 2), 16) / 255;
    
    // Apply gamma correction
    const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
    
    // Calculate luminance
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Check if contrast ratio meets WCAG standards
 * @param {number} ratio - Contrast ratio
 * @param {string} level - 'AA' or 'AAA'
 * @param {boolean} isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns {boolean} Whether ratio meets standard
 */
export function meetsWCAG(ratio, level = 'AA', isLargeText = false) {
    const requirements = {
        'AA': isLargeText ? 3 : 4.5,
        'AAA': isLargeText ? 4.5 : 7
    };
    
    return ratio >= requirements[level];
}

/**
 * Get WCAG compliance level for a contrast ratio
 * @param {number} ratio - Contrast ratio
 * @param {boolean} isLargeText - Whether text is large
 * @returns {string} Compliance level ('AAA', 'AA', or 'Fail')
 */
export function getWCAGLevel(ratio, isLargeText = false) {
    if (meetsWCAG(ratio, 'AAA', isLargeText)) return 'AAA';
    if (meetsWCAG(ratio, 'AA', isLargeText)) return 'AA';
    return 'Fail';
}

/**
 * Add keyboard navigation support to an element
 * @param {HTMLElement} element - Element to make keyboard navigable
 * @param {Function} onActivate - Callback when element is activated (Enter/Space)
 * @param {Object} options - Additional options
 */
export function makeKeyboardNavigable(element, onActivate, options = {}) {
    const { role = 'button', tabindex = '0' } = options;
    
    // Set ARIA role if not already set
    if (!element.getAttribute('role')) {
        element.setAttribute('role', role);
    }
    
    // Set tabindex if not already set
    if (!element.getAttribute('tabindex')) {
        element.setAttribute('tabindex', tabindex);
    }
    
    // Add keyboard event listener
    element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onActivate(e);
        }
    });
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export function announceToScreenReader(message, priority = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

/**
 * Skip link functionality - useful for keyboard navigation
 * @param {string} targetId - ID of element to skip to
 * @param {string} label - Label for skip link
 * @returns {HTMLElement} Skip link element
 */
export function createSkipLink(targetId, label = 'Skip to main content') {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = label;
    skipLink.className = 'skip-link';
    
    skipLink.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
            target.setAttribute('tabindex', '-1');
            target.focus();
            target.addEventListener('blur', () => {
                target.removeAttribute('tabindex');
            }, { once: true });
        }
    });
    
    return skipLink;
}

/**
 * Ensure element has proper ARIA label
 * @param {HTMLElement} element - Element to check
 * @param {string} label - Fallback label if none exists
 */
export function ensureAriaLabel(element, label) {
    if (!element.getAttribute('aria-label') && 
        !element.getAttribute('aria-labelledby') &&
        !element.textContent.trim()) {
        element.setAttribute('aria-label', label);
    }
}

/**
 * Check if element is visible to screen readers
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} Whether element is visible
 */
export function isVisibleToScreenReader(element) {
    return element.offsetParent !== null && 
           !element.hasAttribute('aria-hidden') &&
           element.getAttribute('aria-hidden') !== 'true';
}

/**
 * Create accessible dropdown menu
 * @param {HTMLElement} trigger - Trigger button
 * @param {HTMLElement} menu - Menu container
 * @returns {Object} Dropdown controller
 */
export function createAccessibleDropdown(trigger, menu) {
    let isOpen = false;
    
    const open = () => {
        isOpen = true;
        menu.classList.remove('hidden');
        trigger.setAttribute('aria-expanded', 'true');
        
        // Focus first menu item
        const firstItem = menu.querySelector('[role="menuitem"]');
        if (firstItem) firstItem.focus();
    };
    
    const close = () => {
        isOpen = false;
        menu.classList.add('hidden');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
    };
    
    const toggle = () => {
        if (isOpen) close();
        else open();
    };
    
    // Keyboard navigation
    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
        }
    });
    
    menu.addEventListener('keydown', (e) => {
        const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
        const currentIndex = items.indexOf(document.activeElement);
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % items.length;
                items[nextIndex].focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = (currentIndex - 1 + items.length) % items.length;
                items[prevIndex].focus();
                break;
            case 'Escape':
                e.preventDefault();
                close();
                break;
            case 'Home':
                e.preventDefault();
                items[0].focus();
                break;
            case 'End':
                e.preventDefault();
                items[items.length - 1].focus();
                break;
        }
    });
    
    return { open, close, toggle };
}

export default {
    FocusTrap,
    getContrastRatio,
    getLuminance,
    meetsWCAG,
    getWCAGLevel,
    makeKeyboardNavigable,
    announceToScreenReader,
    createSkipLink,
    ensureAriaLabel,
    isVisibleToScreenReader,
    createAccessibleDropdown
};

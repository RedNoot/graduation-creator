/**
 * Field Locking Integration Helper
 * Provides easy integration of field locking for forms
 */

import fieldLockManager from '../utils/field-lock-manager.js';
import { 
    showFieldLockIndicator, 
    removeFieldLockIndicator,
    showEditingIndicator,
    removeEditingIndicator,
    showFieldLockConflict
} from '../components/collaborative-ui.js';
import { showModal } from '../components/modal.js';

/**
 * Setup field locking for a form element
 * @param {HTMLElement} element - The form element (input, textarea, select)
 * @param {string} graduationId - Graduation ID
 * @param {string} fieldPath - Field path (e.g., "student.{id}.graduationSpeech")
 * @param {Object} options - Options
 *   - autoLockOnFocus: Whether to automatically lock on focus (default: true)
 *   - autoUnlockOnBlur: Whether to automatically unlock on blur (default: true)
 *   - showEditingState: Whether to show editing indicator when locked by current user (default: true)
 */
export function setupFieldLocking(element, graduationId, fieldPath, options = {}) {
    const {
        autoLockOnFocus = true,
        autoUnlockOnBlur = true,
        showEditingState = true
    } = options;

    // Check initial lock state
    updateFieldLockState(element, graduationId, fieldPath, showEditingState);

    // Listen for lock changes
    fieldLockManager.onLockChange(graduationId, fieldPath, (isLocked, lockOwner) => {
        updateFieldLockState(element, graduationId, fieldPath, showEditingState);
    });

    // Auto-lock on focus
    if (autoLockOnFocus) {
        element.addEventListener('focus', async () => {
            const success = await fieldLockManager.lockField(graduationId, fieldPath);
            
            if (!success) {
                // Lock failed - field is locked by someone else
                const lockOwner = fieldLockManager.getFieldLockOwner(graduationId, fieldPath);
                element.blur(); // Remove focus
                
                // Show conflict modal
                showFieldLockConflict(
                    showModal,
                    lockOwner?.email || 'Another editor',
                    async () => {
                        // Force unlock
                        await fieldLockManager.forceUnlockField(graduationId, fieldPath);
                        element.focus(); // Try again
                    },
                    () => {
                        // Do nothing - just wait
                    }
                );
            } else {
                // Lock acquired
                if (showEditingState) {
                    showEditingIndicator(element);
                }
            }
        });
    }

    // Auto-unlock on blur
    if (autoUnlockOnBlur) {
        element.addEventListener('blur', async () => {
            if (fieldLockManager.isFieldLockedByMe(graduationId, fieldPath)) {
                await fieldLockManager.unlockField(graduationId, fieldPath);
                if (showEditingState) {
                    removeEditingIndicator(element);
                }
            }
        });
    }

    // Cleanup on element removal
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const removedNode of mutation.removedNodes) {
                if (removedNode === element || removedNode.contains(element)) {
                    cleanup();
                }
            }
        }
    });

    observer.observe(element.parentNode || document.body, { childList: true, subtree: true });

    function cleanup() {
        fieldLockManager.offLockChange(graduationId, fieldPath);
        observer.disconnect();
    }

    return cleanup;
}

/**
 * Update field lock visual state
 * @param {HTMLElement} element - The form element
 * @param {string} graduationId - Graduation ID
 * @param {string} fieldPath - Field path
 * @param {boolean} showEditingState - Whether to show editing indicator
 */
function updateFieldLockState(element, graduationId, fieldPath, showEditingState) {
    const isLocked = fieldLockManager.isFieldLocked(graduationId, fieldPath);
    const isLockedByMe = fieldLockManager.isFieldLockedByMe(graduationId, fieldPath);
    
    if (isLocked && !isLockedByMe) {
        // Locked by someone else
        const lockOwner = fieldLockManager.getFieldLockOwner(graduationId, fieldPath);
        showFieldLockIndicator(element, lockOwner?.email || 'Another editor');
    } else {
        // Not locked or locked by me
        removeFieldLockIndicator(element);
        
        if (isLockedByMe && showEditingState && document.activeElement === element) {
            showEditingIndicator(element);
        } else {
            removeEditingIndicator(element);
        }
    }
}

/**
 * Setup field locking for multiple form elements
 * @param {Array<Object>} fields - Array of {element, fieldPath, options}
 * @param {string} graduationId - Graduation ID
 * @returns {Function} Cleanup function
 */
export function setupMultipleFieldLocks(fields, graduationId) {
    const cleanupFunctions = fields.map(({ element, fieldPath, options }) => 
        setupFieldLocking(element, graduationId, fieldPath, options)
    );

    return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
    };
}

/**
 * Setup field locking for a student form
 * @param {string} graduationId - Graduation ID
 * @param {string} studentId - Student ID
 */
export function setupStudentFormLocking(graduationId, studentId) {
    const fields = [];

    // Graduation speech
    const speechTextarea = document.getElementById('graduation-speech');
    if (speechTextarea) {
        fields.push({
            element: speechTextarea,
            fieldPath: `student.${studentId}.graduationSpeech`
        });
    }

    // Setup all fields
    return setupMultipleFieldLocks(fields, graduationId);
}

/**
 * Setup field locking for a content page form
 * @param {string} graduationId - Graduation ID
 * @param {string} contentId - Content page ID
 */
export function setupContentFormLocking(graduationId, contentId) {
    const fields = [];

    // Title
    const titleInput = document.getElementById('content-title');
    if (titleInput) {
        fields.push({
            element: titleInput,
            fieldPath: `content.${contentId}.title`
        });
    }

    // Author
    const authorInput = document.getElementById('content-author');
    if (authorInput) {
        fields.push({
            element: authorInput,
            fieldPath: `content.${contentId}.author`
        });
    }

    // Content textarea
    const contentTextarea = document.getElementById('content-text');
    if (contentTextarea) {
        fields.push({
            element: contentTextarea,
            fieldPath: `content.${contentId}.content`
        });
    }

    // Setup all fields
    return setupMultipleFieldLocks(fields, graduationId);
}

/**
 * Setup field locking for graduation settings form
 * @param {string} graduationId - Graduation ID
 */
export function setupGraduationSettingsLocking(graduationId) {
    const fields = [];

    // School name
    const schoolNameInput = document.getElementById('school-name');
    if (schoolNameInput) {
        fields.push({
            element: schoolNameInput,
            fieldPath: 'graduation.schoolName'
        });
    }

    // Graduation year
    const yearInput = document.getElementById('graduation-year');
    if (yearInput) {
        fields.push({
            element: yearInput,
            fieldPath: 'graduation.graduationYear'
        });
    }

    // Setup all fields
    return setupMultipleFieldLocks(fields, graduationId);
}

export default {
    setupFieldLocking,
    setupMultipleFieldLocks,
    setupStudentFormLocking,
    setupContentFormLocking,
    setupGraduationSettingsLocking
};

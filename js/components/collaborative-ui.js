/**
 * Active Editors Banner Component
 * Shows which other editors are currently viewing/editing the graduation
 */

/**
 * Create and show active editors banner
 * @param {Array<Object>} editors - Array of editor objects with {uid, email}
 * @param {HTMLElement} container - Container to insert banner into
 * @returns {HTMLElement} The banner element
 */
export function showActiveEditorsBanner(editors, container) {
    // Remove existing banner if present
    removeActiveEditorsBanner();
    
    if (editors.length === 0) return null;
    
    const banner = document.createElement('div');
    banner.id = 'active-editors-banner';
    banner.className = 'bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 flex items-center justify-between';
    banner.setAttribute('role', 'alert');
    
    const leftSection = document.createElement('div');
    leftSection.className = 'flex items-center';
    
    // Icon
    const icon = document.createElement('div');
    icon.className = 'flex-shrink-0';
    icon.innerHTML = `
        <svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
    `;
    
    // Text
    const textDiv = document.createElement('div');
    textDiv.className = 'ml-3';
    
    const heading = document.createElement('p');
    heading.className = 'text-sm font-medium text-blue-800';
    
    if (editors.length === 1) {
        heading.textContent = `${editors[0].email || 'Another editor'} is also viewing this project`;
    } else {
        heading.textContent = `${editors.length} other editors are viewing this project`;
    }
    
    textDiv.appendChild(heading);
    
    if (editors.length > 1) {
        const details = document.createElement('p');
        details.className = 'text-xs text-blue-700 mt-1';
        details.textContent = editors.map(e => e.email || 'Unknown').join(', ');
        textDiv.appendChild(details);
    }
    
    leftSection.appendChild(icon);
    leftSection.appendChild(textDiv);
    
    // Pulse indicator
    const pulseDiv = document.createElement('div');
    pulseDiv.className = 'flex items-center';
    pulseDiv.innerHTML = `
        <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </span>
        <span class="ml-2 text-xs text-blue-700">Live</span>
    `;
    
    banner.appendChild(leftSection);
    banner.appendChild(pulseDiv);
    
    // Insert at the top of the container
    container.insertBefore(banner, container.firstChild);
    
    return banner;
}

/**
 * Remove active editors banner
 */
export function removeActiveEditorsBanner() {
    const existing = document.getElementById('active-editors-banner');
    if (existing) {
        existing.remove();
    }
}

/**
 * Show conflict warning modal
 * @param {Function} showModal - Modal display function
 * @param {Function} onConfirm - Callback if user chooses to overwrite
 * @param {Function} onCancel - Callback if user chooses to reload
 */
export function showConflictWarning(showModal, onConfirm, onCancel) {
    const modalContent = `
        <div class="text-left">
            <div class="flex items-center mb-4">
                <svg class="h-6 w-6 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <h3 class="text-lg font-semibold text-gray-900">Editing Conflict Detected</h3>
            </div>
            <p class="text-sm text-gray-600 mb-4">
                Another editor has made changes since you started editing. Your changes may overwrite theirs.
            </p>
            <p class="text-sm font-medium text-gray-700 mb-2">What would you like to do?</p>
            <ul class="text-sm text-gray-600 space-y-2 mb-4">
                <li class="flex items-start">
                    <span class="font-semibold mr-2">Save Anyway:</span>
                    <span>Your changes will be saved, potentially overwriting recent changes by others.</span>
                </li>
                <li class="flex items-start">
                    <span class="font-semibold mr-2">Reload:</span>
                    <span>Discard your changes and reload the latest version.</span>
                </li>
            </ul>
        </div>
    `;
    
    showModal('Conflict Warning', modalContent, true, [
        {
            text: 'Reload Latest',
            onclick: onCancel,
            style: 'bg-gray-200 text-gray-800 hover:bg-gray-300'
        },
        {
            text: 'Save Anyway',
            onclick: onConfirm,
            style: 'bg-yellow-600 text-white hover:bg-yellow-700'
        }
    ]);
}

/**
 * Show unsaved changes warning when navigating away
 * @param {Function} showModal - Modal display function
 * @param {Function} onConfirm - Callback if user confirms leaving
 * @param {Function} onCancel - Callback if user cancels
 */
export function showUnsavedChangesWarning(showModal, onConfirm, onCancel) {
    showModal(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.',
        true,
        [
            {
                text: 'Stay',
                onclick: onCancel,
                style: 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            },
            {
                text: 'Leave',
                onclick: onConfirm,
                style: 'bg-red-600 text-white hover:bg-red-700'
            }
        ]
    );
}

/**
 * Show save indicator
 * @param {string} status - Status: 'saving', 'saved', 'error'
 * @param {HTMLElement} container - Container to show indicator in
 */
export function showSaveIndicator(status, container) {
    let existing = document.getElementById('save-indicator');
    if (!existing) {
        existing = document.createElement('div');
        existing.id = 'save-indicator';
        existing.className = 'fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg flex items-center transition-all';
        container.appendChild(existing);
    }
    
    const icons = {
        saving: `<svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`,
        saved: `<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
        error: `<svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`
    };
    
    const messages = {
        saving: 'Saving...',
        saved: 'All changes saved',
        error: 'Save failed'
    };
    
    const classes = {
        saving: 'bg-blue-500 text-white',
        saved: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white'
    };
    
    existing.className = `fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg flex items-center transition-all ${classes[status]}`;
    existing.innerHTML = `${icons[status]}<span class="text-sm font-medium">${messages[status]}</span>`;
    
    // Auto-hide after 3 seconds for saved/error
    if (status !== 'saving') {
        setTimeout(() => {
            if (existing && existing.parentNode) {
                existing.style.opacity = '0';
                setTimeout(() => existing.remove(), 300);
            }
        }, 3000);
    }
}

export default {
    showActiveEditorsBanner,
    removeActiveEditorsBanner,
    showConflictWarning,
    showUnsavedChangesWarning,
    showSaveIndicator
};

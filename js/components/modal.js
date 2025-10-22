/**
 * Modal Component Module
 * Handles all modal dialogs and notifications
 */

/**
 * Display a modal dialog with customizable content and buttons
 * @param {string} title - Modal title
 * @param {string} message - Modal message/content
 * @param {boolean} showClose - Whether to show a close button (default: true)
 * @param {Array<Object>} buttons - Array of button objects with {text, onclick, style}
 * @returns {void}
 * @example
 * showModal('Success', 'Operation completed!');
 * showModal('Confirm', 'Are you sure?', true, [
 *   { text: 'Cancel', onclick: () => {}, style: 'bg-gray-300 text-gray-700' },
 *   { text: 'Confirm', onclick: () => doSomething(), style: 'bg-red-600 text-white' }
 * ]);
 */
export const showModal = (title, message, showClose = true, buttons = null) => {
    const modalId = `modal-${Date.now()}`;
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center';
    
    let buttonsHtml = '';
    if (buttons && Array.isArray(buttons)) {
        // Custom buttons provided
        buttonsHtml = buttons.map((btn, idx) => 
            `<button id="modal-btn-${idx}" class="px-4 py-2 ${btn.style} text-base font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 flex-1 ${idx > 0 ? 'ml-2' : ''}">${btn.text}</button>`
        ).join('');
    } else if (showClose) {
        buttonsHtml = `<button id="close-modal-btn" class="px-4 py-2 bg-indigo-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">Close</button>`;
    }
    
    modal.innerHTML = `
        <div class="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3 text-center">
                <h3 class="text-lg leading-6 font-medium text-gray-900">${title}</h3>
                <div class="mt-2 px-7 py-3">
                    <p class="text-sm text-gray-500">${message}</p>
                </div>
                <div class="items-center px-4 py-3 flex gap-2">
                    ${buttonsHtml}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    if (buttons && Array.isArray(buttons)) {
        // Attach click handlers to custom buttons
        buttons.forEach((btn, idx) => {
            const btnElement = document.getElementById(`modal-btn-${idx}`);
            if (btnElement) {
                btnElement.addEventListener('click', () => {
                    modal.remove();
                    if (btn.onclick) btn.onclick();
                });
            }
        });
    } else if (showClose) {
        document.getElementById('close-modal-btn').addEventListener('click', () => {
            modal.remove();
        });
    } else {
        // Auto-close informational modals after 3 seconds
        setTimeout(() => {
            if(document.getElementById(modalId)) modal.remove();
        }, 3000);
    }
};

/**
 * Close all open modals on the page
 * @returns {void}
 */
export const closeModal = () => {
    const modals = document.querySelectorAll('[id^="modal-"]');
    modals.forEach(m => m.remove());
};

/**
 * Show an error modal with red styling
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @returns {void}
 */
export const showErrorModal = (title, message) => {
    showModal(title, message, true, [
        {
            text: 'Close',
            onclick: closeModal,
            style: 'bg-red-600 text-white hover:bg-red-700 w-full'
        }
    ]);
};

/**
 * Show a success modal with green styling
 * @param {string} title - Success title
 * @param {string} message - Success message
 * @returns {void}
 */
export const showSuccessModal = (title, message) => {
    showModal(title, message, false); // Auto-closes after 3 seconds
};

/**
 * Show a confirmation modal with cancel/confirm buttons
 * @param {string} title - Confirmation title
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Callback when user confirms
 * @param {string} confirmText - Text for confirm button (default: 'Confirm')
 * @returns {void}
 */
export const showConfirmModal = (title, message, onConfirm, confirmText = 'Confirm') => {
    showModal(title, message, true, [
        {
            text: 'Cancel',
            onclick: closeModal,
            style: 'bg-gray-300 text-gray-700 hover:bg-gray-400'
        },
        {
            text: confirmText,
            onclick: onConfirm,
            style: 'bg-indigo-600 text-white hover:bg-indigo-700'
        }
    ]);
};

/**
 * Show a loading modal that doesn't auto-close
 * @param {string} title - Loading title
 * @param {string} message - Loading message
 * @returns {Function} Function to call to close the modal
 */
export const showLoadingModal = (title, message) => {
    const modalId = `modal-${Date.now()}`;
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center';
    
    modal.innerHTML = `
        <div class="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3 text-center">
                <h3 class="text-lg leading-6 font-medium text-gray-900">${title}</h3>
                <div class="mt-2 px-7 py-3">
                    <div class="spinner w-8 h-8 border-4 border-indigo-600 rounded-full mx-auto mb-4"></div>
                    <p class="text-sm text-gray-500">${message}</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Return a function to close this specific modal
    return () => {
        if (document.getElementById(modalId)) {
            modal.remove();
        }
    };
};

export default {
    showModal,
    closeModal,
    showErrorModal,
    showSuccessModal,
    showConfirmModal,
    showLoadingModal
};

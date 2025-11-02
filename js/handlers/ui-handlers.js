/**
 * General UI Event Handlers
 * Manages tab switching, modal interactions, and general UI buttons
 */

/**
 * Setup tab switching handler
 * @param {NodeList} tabs - Collection of tab elements
 * @param {Object} renderFunctions - Object containing render functions
 *   - renderStudentsTab: Function to render students
 *   - renderContentPagesTab: Function to render content
 *   - renderSettingsTab: Function to render settings
 *   - renderShareTab: Function to render share
 *   - renderBookletTab: Function to render booklet
 * @param {Object} handlers - Additional handlers
 *   - gradId: Graduation ID
 *   - gradData: Graduation data object
 */
export function setupTabHandlers(tabs, renderFunctions, handlers) {
    const { gradId, gradData } = handlers;
    const { renderStudentsTab, renderContentPagesTab, renderSettingsTab, renderShareTab, renderBookletTab } = renderFunctions;
    const publicUrl = `${window.location.origin}${window.location.pathname}#/view/${gradId}`;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active styles from all tabs
            tabs.forEach(t => {
                t.classList.remove('border-indigo-500', 'text-indigo-600');
                t.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            });
            
            // Add active styles to clicked tab
            e.target.classList.add('border-indigo-500', 'text-indigo-600');
            e.target.classList.remove('border-transparent', 'text-gray-500');

            // Render appropriate tab content
            const tabName = e.target.dataset.tab;
            
            switch (tabName) {
                case 'students':
                    renderStudentsTab(gradId);
                    break;
                case 'content':
                    renderContentPagesTab(gradId);
                    break;
                case 'settings':
                    renderSettingsTab(gradId, gradData.config, gradData.customCoverUrl);
                    break;
                case 'share':
                    renderShareTab(publicUrl);
                    break;
                case 'booklet':
                    // Always fetch fresh data for booklet tab to get latest URL
                    (async () => {
                        const { GraduationRepository } = await import('../data/graduation-repository.js');
                        const freshGradData = await GraduationRepository.getById(gradId);
                        if (freshGradData) {
                            console.log('Booklet URL from Firestore:', freshGradData.generatedBookletUrl);
                            console.log('Booklet generated at:', freshGradData.bookletGeneratedAt);
                            renderBookletTab(gradId, freshGradData);
                        }
                    })();
                    break;
            }
        });
    });
}

/**
 * Setup download scheduling toggle handler
 * @param {HTMLElement} toggleElement - Checkbox element for enabling download scheduling
 * @param {Object} handlers - Required handlers
 *   - showModal: Function to show modal
 *   - gradId: Graduation ID
 */
export function setupDownloadSchedulingHandler(toggleElement, handlers) {
    const { showModal, gradId } = handlers;
    
    toggleElement.addEventListener('change', async (e) => {
        try {
            const { GraduationRepository } = await import('../data/graduation-repository.js');
            const config = {
                downloadSchedulingEnabled: e.target.checked
            };
            
            if (e.target.checked) {
                const startDate = document.getElementById('downloadStartDate')?.value;
                const startTime = document.getElementById('downloadStartTime')?.value;
                
                if (!startDate || !startTime) {
                    showModal('Error', 'Please set both date and time for download availability.');
                    e.target.checked = false;
                    return;
                }
                
                config.downloadAvailableFrom = new Date(`${startDate}T${startTime}`);
            }
            
            await GraduationRepository.updateConfig(gradId, {
                downloadScheduling: config
            });
            
            showModal('Success', e.target.checked ? 'Download scheduling enabled.' : 'Download scheduling disabled.');
        } catch (error) {
            console.error('Error updating download scheduling:', error);
            showModal('Error', 'Failed to update download scheduling.');
            e.target.checked = !e.target.checked;
        }
    });
}

/**
 * Setup settings form submit handler
 * @param {HTMLElement} formElement - Settings form element
 * @param {Object} handlers - Required handlers
 *   - showModal: Function to show modal
 *   - sanitizeInput: Function to sanitize input
 *   - uploadToCloudinary: Function to upload images
 *   - gradId: Graduation ID
 */
export function setupSettingsFormHandler(formElement, handlers) {
    const { showModal, sanitizeInput, uploadFile, gradId } = handlers;
    
    // Track form input changes for collaborative editing
    const trackInputChange = async () => {
        const collaborativeEditingManager = (await import('../utils/collaborative-editing.js')).default;
        collaborativeEditingManager.setPendingChanges(gradId, true);
    };
    
    // Add input listeners to all form fields
    const formInputs = formElement.querySelectorAll('input, textarea, select');
    formInputs.forEach(input => {
        input.addEventListener('input', trackInputChange);
        input.addEventListener('change', trackInputChange);
    });
    
    formElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            showModal('Saving...', 'Updating settings...', false);
            const { GraduationRepository } = await import('../data/graduation-repository.js');
            const collaborativeEditingManager = (await import('../utils/collaborative-editing.js')).default;
            const { showConflictWarning } = await import('../components/collaborative-ui.js');
            
            const config = {
                schoolLogo: document.getElementById('schoolLogo')?.value || '',
                primaryColor: document.getElementById('primaryColor')?.value || '#3B82F6',
                font: document.getElementById('font')?.value || 'Inter',
                accentColor: document.getElementById('accentColor')?.value || '#06B6D4',
                motto: sanitizeInput(document.getElementById('motto')?.value || '', 'text'),
                aboutText: sanitizeInput(document.getElementById('aboutText')?.value || '', 'text')
            };
            
            // Handle logo upload if new file selected
            const logoFile = document.getElementById('schoolLogo')?.files?.[0];
            if (logoFile) {
                const logoUrl = await uploadFile(logoFile);
                config.schoolLogoUrl = logoUrl;
            }
            
            // Handle booklet generation if enabled
            const generateBooklet = document.getElementById('generateBooklet')?.checked;
            if (generateBooklet) {
                // Trigger booklet generation through Netlify function
                const response = await fetch('/.netlify/functions/generate-booklet', {
                    method: 'POST',
                    body: JSON.stringify({ graduationId: gradId })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to generate booklet');
                }
            }
            
            // Use collaborative editing manager for safe update with conflict detection
            const success = await collaborativeEditingManager.safeUpdate(
                gradId,
                async () => {
                    // Save configuration to Firestore using repository
                    await GraduationRepository.updateConfig(gradId, config);
                },
                () => {
                    // On conflict, show warning modal
                    return new Promise((resolve) => {
                        showConflictWarning(() => {
                            // User chose to reload - reject to cancel save
                            resolve(false);
                            window.location.reload();
                        }, () => {
                            // User chose to save anyway - resolve to continue
                            resolve(true);
                        });
                    });
                }
            );
            
            if (success) {
                // Clear pending changes flag
                collaborativeEditingManager.setPendingChanges(gradId, false);
                showModal('Success', 'Settings saved successfully.');
            }
            // If not successful, user chose to reload or conflict callback handled it
            
        } catch (error) {
            console.error('Error saving settings:', error);
            showModal('Error', 'Failed to save settings. Please try again.');
        }
    });
}

/**
 * Setup copy to clipboard functionality (global helper)
 * @param {string} text - Text to copy
 * @param {HTMLElement} button - Button that was clicked
 */
export function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

/**
 * Setup modal functionality (global helper)
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {boolean} isConfirm - Whether this is a confirmation dialog
 * @param {Function} onConfirm - Callback if confirmed (optional)
 */
export function showModal(title, message, isConfirm = false, onConfirm = null) {
    // Implementation would depend on your modal component structure
    // For now, using browser alert as fallback
    if (isConfirm) {
        if (confirm(`${title}\n\n${message}`)) {
            onConfirm?.();
        }
    } else {
        alert(`${title}\n\n${message}`);
    }
}

/**
 * Content Management Event Handlers
 * Manages adding, editing, and deleting content pages
 */

/**
 * Setup add content button handler
 * @param {HTMLElement} addBtn - Add content button
 */
export function setupAddContentHandler(addBtn) {
    addBtn.addEventListener('click', () => {
        document.getElementById('content-form').classList.remove('hidden');
        document.getElementById('content-title').focus();
    });
}

/**
 * Setup cancel content button handler
 * @param {HTMLElement} cancelBtn - Cancel button
 */
export function setupCancelContentHandler(cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        document.getElementById('content-form').classList.add('hidden');
        document.getElementById('add-content-form').reset();
        delete document.getElementById('add-content-form').dataset.editId;
    });
}

/**
 * Setup add/edit content form handler
 * @param {HTMLElement} formElement - Form element
 * @param {string} gradId - Graduation ID
 * @param {Object} handlers - Required handlers
 *   - sanitizeInput: Function to sanitize input
 *   - showModal: Function to show modal
 */
export function setupContentFormHandler(formElement, gradId, handlers) {
    const { sanitizeInput, showModal } = handlers;
    
    formElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = sanitizeInput(document.getElementById('content-title').value, 'text');
        const author = sanitizeInput(document.getElementById('content-author').value, 'name');
        const type = document.getElementById('content-type').value;
        const content = sanitizeInput(document.getElementById('content-body').value, 'text');

        if (!title || !content) {
            showModal('Error', 'Please fill in the title and content fields.');
            return;
        }

        try {
            const { ContentRepository } = await import('../data/content-repository.js');
            
            const contentData = {
                title,
                author: author || null,
                type,
                content,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const editId = e.target.dataset.editId;
            if (editId) {
                // Update existing content
                await ContentRepository.update(gradId, editId, {
                    ...contentData,
                    updatedAt: new Date()
                });
                showModal('Success', 'Content page updated successfully.');
            } else {
                // Add new content
                await ContentRepository.create(gradId, contentData);
                showModal('Success', 'Content page added successfully.');
            }

            document.getElementById('content-form').classList.add('hidden');
            document.getElementById('add-content-form').reset();
            delete e.target.dataset.editId;

        } catch (error) {
            console.error('Error saving content page:', error);
            showModal('Error', 'Failed to save content page.');
        }
    });
}

/**
 * Setup edit content handler (called via onclick)
 * @param {string} docId - Document ID
 * @param {string} title - Content title
 * @param {string} author - Content author
 * @param {string} type - Content type
 * @param {string} content - Content body
 */
export function editContentPage(docId, title, author, type, content) {
    // Populate form with existing data
    document.getElementById('content-title').value = title;
    document.getElementById('content-author').value = author;
    document.getElementById('content-type').value = type;
    document.getElementById('content-body').value = content;
    
    // Set the form into edit mode
    const form = document.getElementById('add-content-form');
    form.dataset.editId = docId;
    
    // Show form
    document.getElementById('content-form').classList.remove('hidden');
    document.getElementById('content-title').focus();
}

/**
 * Setup delete content handler (called via onclick)
 * @param {string} docId - Document ID to delete
 * @param {string} gradId - Graduation ID
 * @param {Object} handlers - Required handlers
 *   - showModal: Function to show modal
 *   - db: Firestore database instance
 *   - doc, deleteDoc: Firestore functions
 */
export async function deleteContentPage(docId, gradId, handlers) {
    const { showModal, db, doc, deleteDoc } = handlers;
    
    showModal('Confirm', 'Are you sure you want to delete this content page?', true, async () => {
        try {
            const contentRef = doc(db, "graduations", gradId, "contentPages", docId);
            await deleteDoc(contentRef);
            showModal('Success', 'Content page deleted successfully.');
        } catch (error) {
            console.error('Error deleting content:', error);
            showModal('Error', 'Failed to delete content page.');
        }
    });
}

/**
 * Setup page order management handlers
 * @param {Object} handlers - Required handlers
 *   - showModal: Function to show modal
 *   - gradId: Graduation ID
 */
export function setupPageOrderHandlers(handlers) {
    const { showModal, gradId } = handlers;
    
    // Make functions available globally for onclick handlers
    window.movePageUp = function(index) {
        const pages = Array.from(document.querySelectorAll('[data-page-index]'));
        if (index > 0) {
            const order = pages.map(p => p.dataset.pageIndex);
            [order[index - 1], order[index]] = [order[index], order[index - 1]];
            updatePageOrder(order);
        }
    };
    
    window.movePageDown = function(index) {
        const pages = Array.from(document.querySelectorAll('[data-page-index]'));
        if (index < pages.length - 1) {
            const order = pages.map(p => p.dataset.pageIndex);
            [order[index], order[index + 1]] = [order[index + 1], order[index]];
            updatePageOrder(order);
        }
    };
    
    async function updatePageOrder(order) {
        try {
            const { GraduationRepository } = await import('../data/graduation-repository.js');
            await GraduationRepository.update(gradId, {
                pageOrder: order
            });
            showModal('Success', 'Page order updated.');
        } catch (error) {
            console.error('Error updating page order:', error);
            showModal('Error', 'Failed to update page order.');
        }
    }
}

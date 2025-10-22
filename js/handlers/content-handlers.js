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
        
        // Get image files
        const authorPhotoInput = document.getElementById('content-author-photo');
        const bodyImagesInput = document.getElementById('content-body-images');

        if (!title || !content) {
            showModal('Error', 'Please fill in the title and content fields.');
            return;
        }

        try {
            showModal('Uploading', 'Uploading images and saving content...', false);
            
            // Check for existing images when editing
            const authorPhotoPreview = document.getElementById('author-photo-preview');
            const bodyImagesPreview = document.getElementById('body-images-preview');
            const editId = e.target.dataset.editId;
            
            // Upload author photo if present, or keep existing
            let authorPhotoUrl = null;
            if (authorPhotoInput && authorPhotoInput.files.length > 0) {
                authorPhotoUrl = await uploadImageToCloudinary(authorPhotoInput.files[0], 'content-author-photos');
            } else if (editId && authorPhotoPreview.dataset.existingUrl) {
                // Keep existing photo when editing
                authorPhotoUrl = authorPhotoPreview.dataset.existingUrl;
            }
            
            // Upload body images if present, or keep existing
            let bodyImageUrls = [];
            if (editId && bodyImagesPreview.dataset.existingUrls) {
                // Start with existing images
                bodyImageUrls = JSON.parse(bodyImagesPreview.dataset.existingUrls);
            }
            if (bodyImagesInput && bodyImagesInput.files.length > 0) {
                // Add new images
                const uploadPromises = Array.from(bodyImagesInput.files).map(file => 
                    uploadImageToCloudinary(file, 'content-body-images')
                );
                const newUrls = await Promise.all(uploadPromises);
                bodyImageUrls = [...bodyImageUrls, ...newUrls];
            }
            
            const { ContentRepository } = await import('../data/content-repository.js');
            
            const contentData = {
                title,
                author: author || null,
                authorPhotoUrl: authorPhotoUrl,
                type,
                content,
                bodyImageUrls: bodyImageUrls,
                createdAt: new Date(),
                updatedAt: new Date()
            };

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
            
            // Clear image previews
            document.getElementById('author-photo-preview').classList.add('hidden');
            document.getElementById('body-images-preview').innerHTML = '';

        } catch (error) {
            console.error('Error saving content page:', error);
            showModal('Error', 'Failed to save content page: ' + error.message);
        }
    });
}

/**
 * Upload image to Cloudinary
 * @param {File} file - Image file to upload
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<string>} - URL of uploaded image
 */
async function uploadImageToCloudinary(file, folder) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'graduation_creator');
    formData.append('folder', folder);
    
    const response = await fetch('https://api.cloudinary.com/v1_1/dqhtyzvbj/image/upload', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        throw new Error('Failed to upload image to Cloudinary');
    }
    
    const data = await response.json();
    return data.secure_url;
}

/**
 * Setup edit content handler (called via onclick)
 * @param {string} docId - Document ID
 * @param {string} title - Content title
 * @param {string} author - Content author
 * @param {string} type - Content type
 * @param {string} content - Content body
 * @param {string} authorPhotoUrl - Author photo URL (optional)
 * @param {Array<string>} bodyImageUrls - Body image URLs (optional)
 */
export function editContentPage(docId, title, author, type, content, authorPhotoUrl = null, bodyImageUrls = []) {
    // Populate form with existing data
    document.getElementById('content-title').value = title;
    document.getElementById('content-author').value = author;
    document.getElementById('content-type').value = type;
    document.getElementById('content-body').value = content;
    
    // Show author photo if exists
    if (authorPhotoUrl) {
        const authorPhotoPreview = document.getElementById('author-photo-preview');
        const authorPhotoPreviewImg = document.getElementById('author-photo-preview-img');
        authorPhotoPreviewImg.src = authorPhotoUrl;
        authorPhotoPreview.classList.remove('hidden');
        // Store the URL so we don't lose it on save
        authorPhotoPreview.dataset.existingUrl = authorPhotoUrl;
    }
    
    // Show body images if exist
    if (bodyImageUrls && bodyImageUrls.length > 0) {
        const bodyImagesPreview = document.getElementById('body-images-preview');
        bodyImagesPreview.innerHTML = '';
        bodyImageUrls.forEach((url, index) => {
            const div = document.createElement('div');
            div.className = 'relative';
            div.innerHTML = `
                <img src="${url}" class="h-24 w-full object-cover rounded border-2 border-gray-300" alt="Body image ${index + 1}">
                <span class="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">Existing</span>
            `;
            bodyImagesPreview.appendChild(div);
        });
        // Store the URLs so we don't lose them on save
        bodyImagesPreview.dataset.existingUrls = JSON.stringify(bodyImageUrls);
    }
    
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

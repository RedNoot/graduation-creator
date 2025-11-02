/**
 * Content Management Event Handlers
 * Manages adding, editing, and deleting content pages
 */

import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../config.js';

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
        
        const title = sanitizeInput(document.getElementById('content-title').value, 'text');
        const author = sanitizeInput(document.getElementById('content-author').value, 'name');
        const type = document.getElementById('content-type').value;
        const content = sanitizeInput(document.getElementById('content-body').value, 'text');
        const imageSize = document.getElementById('image-size').value;
        
        // Get file inputs
        const authorPhotoInput = document.getElementById('content-author-photo');
        const bodyImagesInput = document.getElementById('content-body-images');
        const videoFileInput = document.getElementById('content-video-upload');

        // Validate required fields
        if (!title || !content) {
            showModal('Error', 'Please fill in the title and content fields.');
            return;
        }
        
        // Validate minimum content length (prevent empty/whitespace-only content)
        const MIN_CONTENT_LENGTH = 10;
        if (title.trim().length < 3) {
            showModal('Error', 'Title must be at least 3 characters long.');
            return;
        }
        if (content.trim().length < MIN_CONTENT_LENGTH) {
            showModal('Error', `Content must be at least ${MIN_CONTENT_LENGTH} characters long.`);
            return;
        }
        
        // Validate author name if provided
        if (author && author.trim().length > 0 && author.trim().length < 2) {
            showModal('Error', 'Author name must be at least 2 characters long.');
            return;
        }

        try {
            showModal('Uploading', 'Uploading images and saving content...', false);
            
            // Check for existing images and video when editing
            const authorPhotoPreview = document.getElementById('author-photo-preview');
            const bodyImagesPreview = document.getElementById('body-images-preview');
            const videoPreview = document.getElementById('video-preview');
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
            
            // Upload video if present, or keep existing
            let videoUrl = null;
            if (editId && videoPreview.dataset.existingUrl) {
                // Keep existing video when editing
                videoUrl = videoPreview.dataset.existingUrl;
            }
            if (videoFileInput && videoFileInput.files.length > 0) {
                // Upload new video with progress tracking
                showModal('Uploading', 'Uploading video (0%)...', false);
                videoUrl = await uploadVideoToCloudinary(
                    videoFileInput.files[0], 
                    'content-videos',
                    (progress) => {
                        showModal('Uploading', `Uploading video (${Math.round(progress)}%)...`, false);
                    }
                );
                showModal('Uploading', 'Processing content...', false);
            }
            
            const { ContentRepository } = await import('../data/content-repository.js');
            const collaborativeEditingManager = (await import('../utils/collaborative-editing.js')).default;
            const { showConflictWarning } = await import('../components/collaborative-ui.js');
            
            const contentData = {
                title,
                author: author || null,
                authorPhotoUrl: authorPhotoUrl,
                type,
                content,
                bodyImageUrls: bodyImageUrls,
                imageSize: imageSize || 'medium',
                videoUrl: videoUrl,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Use collaborative editing manager for safe update with conflict detection
            const success = await collaborativeEditingManager.safeUpdate(
                gradId,
                async () => {
                    if (editId) {
                        // Update existing content
                        await ContentRepository.update(gradId, editId, {
                            ...contentData,
                            updatedAt: new Date()
                        });
                    } else {
                        // Add new content
                        await ContentRepository.create(gradId, contentData);
                    }
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
                showModal('Success', editId ? 'Content page updated successfully.' : 'Content page added successfully.');
                
                document.getElementById('content-form').classList.add('hidden');
                document.getElementById('add-content-form').reset();
                delete e.target.dataset.editId;
                
                // Clear image previews
                document.getElementById('author-photo-preview').classList.add('hidden');
                document.getElementById('body-images-preview').innerHTML = '';
            }
            // If not successful, user chose to reload or conflict callback handled it

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
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Cloudinary upload error:', errorData);
        throw new Error(`Failed to upload image to Cloudinary: ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    return data.secure_url;
}

/**
 * Upload video to Cloudinary
 * @param {File} file - Video file to upload
 * @param {string} folder - Cloudinary folder name
 * @param {Function} progressCallback - Optional callback for upload progress
 * @returns {Promise<string>} - URL of uploaded video
 */
async function uploadVideoToCloudinary(file, folder, progressCallback) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);
    formData.append('resource_type', 'video'); // Important: specify video resource type
    
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress for large video files
        if (progressCallback) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressCallback(percentComplete);
                }
            });
        }
        
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                resolve(data.secure_url);
            } else {
                const errorData = JSON.parse(xhr.responseText || '{}');
                console.error('Cloudinary video upload error:', errorData);
                reject(new Error(`Failed to upload video to Cloudinary: ${errorData.error?.message || xhr.statusText}`));
            }
        });
        
        xhr.addEventListener('error', () => {
            reject(new Error('Network error during video upload'));
        });
        
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`);
        xhr.send(formData);
    });
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
 * @param {string} imageSize - Image size setting (optional)
 */
export function editContentPage(docId, title, author, type, content, authorPhotoUrl = null, bodyImageUrls = [], imageSize = 'medium', videoUrl = null) {
    // Populate form with existing data
    document.getElementById('content-title').value = title;
    document.getElementById('content-author').value = author;
    document.getElementById('content-type').value = type;
    document.getElementById('content-body').value = content;
    document.getElementById('image-size').value = imageSize || 'medium';
    
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
    
    // Show video if exists
    if (videoUrl) {
        const videoPreview = document.getElementById('video-preview');
        const videoPlayer = document.getElementById('video-preview-player');
        videoPlayer.src = videoUrl;
        videoPreview.classList.remove('hidden');
        // Store the URL so we don't lose it on save
        videoPreview.dataset.existingUrl = videoUrl;
    }
    
    // Set the form into edit mode
    const form = document.getElementById('add-content-form');
    form.dataset.editId = docId;
    
    // Show form
    document.getElementById('content-form').classList.remove('hidden');
    document.getElementById('content-title').focus();
    
    // Setup field locking for content form
    setTimeout(async () => {
        const { setupContentFormLocking } = await import('../utils/field-locking-integration.js');
        const cleanup = setupContentFormLocking(gradId, docId);
        
        // Store cleanup function
        window.addEventListener('beforeunload', cleanup);
    }, 100);
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
    
    // Create confirmation buttons
    const confirmDelete = async () => {
        try {
            const contentRef = doc(db, "graduations", gradId, "contentPages", docId);
            await deleteDoc(contentRef);
            showModal('Success', 'Content page deleted successfully.');
        } catch (error) {
            console.error('Error deleting content:', error);
            showModal('Error', 'Failed to delete content page.');
        }
    };
    
    // Show confirmation modal with custom buttons
    showModal('Confirm', 'Are you sure you want to delete this content page?', true, [
        {
            text: 'Cancel',
            onclick: () => {}, // Just close the modal
            style: 'bg-gray-300 text-gray-700 hover:bg-gray-400'
        },
        {
            text: 'Delete',
            onclick: confirmDelete,
            style: 'bg-red-600 text-white hover:bg-red-700'
        }
    ]);
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

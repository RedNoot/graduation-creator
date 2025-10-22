/**
 * Cloudinary Service Module
 * Handles all file uploads (PDFs, images) to Cloudinary
 */

import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_URL } from '../config.js';

/**
 * Comprehensive file upload to Cloudinary
 * Supports PDFs and images with validation
 * @param {File} file - File object to upload (PDF, JPEG, PNG)
 * @returns {Promise<string>} Secure URL of uploaded file
 * @throws {Error} If file validation or upload fails
 */
export const uploadFile = async (file) => {
    // Comprehensive file validation
    if (!file) {
        throw new Error('No file provided for upload');
    }

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        throw new Error('File size too large. Please keep files under 10MB.');
    }

    // Check file type and validate file extension
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    
    if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload PDF, JPEG, or PNG files only.');
    }

    // Additional security: check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
        throw new Error('Invalid file extension. Please use .pdf, .jpg, .jpeg, or .png files.');
    }

    // Security: Validate file name
    const sanitizedFileName = fileName.replace(/[^a-z0-9._-]/g, '');
    if (sanitizedFileName.length === 0) {
        throw new Error('Invalid file name. Please use alphanumeric characters only.');
    }

    // Check for potentially malicious file patterns
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
        throw new Error('Invalid file name pattern detected.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    // Determine the correct Cloudinary endpoint based on file type
    // PDFs must use /raw/upload, not /image/upload
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const uploadUrl = isPdf 
        ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`
        : CLOUDINARY_URL; // Use default for images

    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            // Get detailed error response from Cloudinary
            let errorDetail = '';
            try {
                const errorData = await response.json();
                errorDetail = errorData.error?.message || JSON.stringify(errorData);
            } catch (e) {
                errorDetail = await response.text();
            }
            
            console.error('Cloudinary error response:', errorDetail);
            
            if (response.status === 400) {
                throw new Error(`Upload failed: ${errorDetail || 'Invalid file or configuration'}`);
            } else if (response.status === 413) {
                throw new Error('File too large for upload');
            } else if (response.status === 429) {
                throw new Error('Too many upload requests. Please wait and try again.');
            } else if (response.status >= 500) {
                throw new Error('Upload service temporarily unavailable');
            } else {
                throw new Error(`Upload failed with status: ${response.status} - ${errorDetail}`);
            }
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Upload error: ${data.error.message}`);
        }

        if (data.secure_url) {
            // Additional security: validate returned URL
            if (!data.secure_url.startsWith('https://')) {
                throw new Error('Invalid upload response - insecure URL');
            }
            return data.secure_url;
        } else {
            throw new Error('File upload failed - no URL returned');
        }
        
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        
        // Re-throw with user-friendly message
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error during upload. Please check your connection.');
        } else if (error.message.includes('Upload failed') || error.message.includes('File')) {
            throw error; // Already user-friendly
        } else {
            throw new Error('Upload failed. Please try again.');
        }
    }
};

/**
 * Get a Cloudinary URL with download attachment flag
 * Used when user wants to download PDF instead of viewing in browser
 * @param {string} originalUrl - Original Cloudinary secure URL
 * @returns {string} URL with fl_attachment flag for downloads
 */
export const getDownloadUrl = (originalUrl) => {
    if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
        return originalUrl;
    }
    
    // Insert fl_attachment flag into Cloudinary URL
    // URL format: https://res.cloudinary.com/[cloud]/image/upload/[transformations]/[filename]
    // We need to insert fl_attachment in the transformations section
    const url = new URL(originalUrl);
    const pathParts = url.pathname.split('/');
    
    // Find where 'upload' is in the path
    const uploadIndex = pathParts.indexOf('upload');
    if (uploadIndex !== -1) {
        // Insert fl_attachment flag after 'upload'
        pathParts.splice(uploadIndex + 1, 0, 'fl_attachment');
        url.pathname = pathParts.join('/');
    }
    
    return url.toString();
};

/**
 * Upload PDF modal for teachers
 * Creates a modal UI for teachers to upload student PDFs
 * @param {string} studentId - The student ID
 * @param {string} studentName - The student name (for display)
 * @param {string} gradId - The graduation ID
 * @param {Function} onSuccess - Callback when upload succeeds
 * @returns {void}
 */
export const showUploadModal = (studentId, studentName, gradId, onSuccess) => {
    // Create modal HTML
    const modalHtml = `
        <div id="upload-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 text-center">Upload PDF for ${studentName}</h3>
                    <div class="mt-4 px-7 py-3">
                        <div class="mb-4">
                            <label for="teacher-pdf-upload" class="block text-sm font-medium text-gray-700 mb-2">
                                Select PDF file (max 10MB)
                            </label>
                            <input type="file" id="teacher-pdf-upload" accept=".pdf" 
                                   class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100">
                        </div>
                        <div class="flex gap-3">
                            <button id="upload-confirm-btn" class="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
                                Upload PDF
                            </button>
                            <button id="upload-cancel-btn" class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Get modal elements
    const modal = document.getElementById('upload-modal');
    const uploadBtn = document.getElementById('upload-confirm-btn');
    const cancelBtn = document.getElementById('upload-cancel-btn');
    const fileInput = document.getElementById('teacher-pdf-upload');
    
    // Cancel button functionality
    cancelBtn.onclick = () => {
        document.body.removeChild(modal);
    };
    
    // Close modal on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    // Upload button functionality
    uploadBtn.onclick = async () => {
        const file = fileInput.files[0];
        if (!file) {
            console.error('No file selected');
            return;
        }
        
        try {
            // Remove the modal first
            document.body.removeChild(modal);
            
            // Call the onSuccess callback with the file
            await onSuccess(file);
        } catch (error) {
            console.error('Upload error:', error);
        }
    };
};

export default {
    uploadFile,
    getDownloadUrl,
    showUploadModal
};

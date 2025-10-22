/**
 * PDF Service Module
 * Handles PDF generation, viewing, and management
 */

import { getConfig } from '../config.js';
import { logger } from '../utils/logger.js';

/**
 * Generate PDF booklet from graduation students
 * Calls the serverless Netlify function to handle server-side PDF generation
 * @param {string} graduationId - The graduation ID
 * @param {Function} onSuccess - Callback on success with result data
 * @param {Function} onError - Callback on error with error message
 * @returns {Promise<void>}
 */
export const generateBooklet = async (graduationId, onSuccess, onError) => {
    try {
        logger.pdfAction('start', graduationId, { action: 'generateBooklet' });
        
        const config = getConfig();
        
        // Fetch latest graduation data to get customCoverUrl and pageOrder
        const { GraduationRepository } = await import('../data/graduation-repository.js');
        const gradData = await GraduationRepository.getById(graduationId);
        const customCoverUrl = gradData?.customCoverUrl || null;
        const pageOrder = gradData?.config?.pageOrder || ['students', 'messages', 'speeches'];
        
        if (customCoverUrl) {
            logger.info('Using custom cover page for booklet', {
                gradId: graduationId,
                customCoverUrl: customCoverUrl.substring(0, 50)
            });
        }
        
        logger.info('Using page order for booklet', {
            gradId: graduationId,
            pageOrder: pageOrder
        });
        
        // Call the Netlify serverless function
        const functionUrl = config.isDevelopment 
            ? '/.netlify/functions/generate-booklet'  // Local development
            : '/.netlify/functions/generate-booklet'; // Production
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                graduationId: graduationId,
                customCoverUrl: customCoverUrl,
                pageOrder: pageOrder
            })
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (parseError) {
                logger.error('Could not parse PDF error response', parseError, {
                    gradId: graduationId,
                    statusCode: response.status,
                    action: 'generateBooklet'
                });
                throw new Error(`Server error: ${response.status} - ${response.statusText}`);
            }
            
            const errorMsg = errorData.message || errorData.error || `Server error: ${response.status}`;
            logger.error('PDF generation server error', new Error(errorMsg), {
                gradId: graduationId,
                statusCode: response.status,
                action: 'generateBooklet'
            });
            throw new Error(errorMsg);
        }

        const result = await response.json();
        
        if (result.success) {
            logger.pdfAction('success', graduationId, {
                pageCount: result.pageCount,
                studentCount: result.studentCount,
                processedStudents: result.processedStudents,
                skippedStudents: result.skippedStudents?.length || 0,
                bookletUrl: result.bookletUrl?.substring(0, 50)
            });
            
            // Call success callback with result data (including skippedStudents)
            if (onSuccess) {
                onSuccess({
                    bookletUrl: result.bookletUrl,
                    pageCount: result.pageCount,
                    studentCount: result.studentCount,
                    processedStudents: result.processedStudents,
                    skippedStudents: result.skippedStudents || [] // Always pass array
                });
            }
        } else {
            throw new Error(result.message || 'PDF generation failed');
        }

    } catch (error) {
        logger.pdfAction('failure', graduationId, {
            error: error.message,
            action: 'generateBooklet'
        });
        
        // Parse and provide user-friendly error message
        let errorMessage = 'Could not generate PDF booklet. ';
        
        if (error.message.includes('No student PDFs found') || error.message.includes('none have uploaded PDFs')) {
            errorMessage = 'No Student PDFs Available. Students need to upload their PDF profiles before you can generate a class booklet. Check the Students tab to see who still needs to upload.';
        } else if (error.message.includes('Server configuration error')) {
            errorMessage = 'Server Configuration Issue. The PDF generation service is not properly configured. Please contact support.';
        } else if (error.message.includes('Invalid JSON') || error.message.includes('Request body')) {
            errorMessage = 'Request Error. There was a problem sending the request. Please try again.';
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
            errorMessage = 'Network Error. Please check your internet connection and try again.';
        } else if (error.message.includes('Server error: 5')) {
            errorMessage = 'Server Error. The server is experiencing issues. Please try again in a few minutes.';
        } else if (error.message.includes('Server error: 4')) {
            errorMessage = `Request Error: ${error.message}. Please check that all data is correct and try again.`;
        } else {
            errorMessage += error.message;
        }
        
        // Call error callback
        if (onError) {
            onError(errorMessage);
        }
    }
};

/**
 * Display student PDF in modal viewer
 * Fetches PDF and creates blob URL to bypass CSP restrictions
 * @param {string} pdfUrl - URL of the PDF to view
 * @param {string} studentName - Name of student (for display)
 * @returns {Promise<void>}
 */
export const viewStudentPdf = async (pdfUrl, studentName) => {
    // Create modal with loading state
    const modal = document.createElement('div');
    modal.id = 'pdf-viewer-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
            <div class="flex justify-between items-center p-4 border-b">
                <h3 class="text-xl font-bold text-gray-900">${studentName}'s Profile</h3>
                <button onclick="window.closeStudentPdfModal()" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
            </div>
            <div id="pdf-content" class="flex-1 overflow-hidden flex items-center justify-center">
                <div class="text-center">
                    <div class="spinner w-12 h-12 border-4 border-indigo-600 rounded-full mx-auto mb-4"></div>
                    <p class="text-gray-600">Loading PDF...</p>
                </div>
            </div>
            <div class="p-4 border-t flex justify-end gap-3">
                <a href="${pdfUrl}" target="_blank" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                    Open in New Tab
                </a>
                <button onclick="window.closeStudentPdfModal()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeStudentPdfModal();
        }
    });
    
    // Fetch PDF and create blob URL to bypass CSP
    try {
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error('Failed to load PDF');
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Replace loading state with PDF viewer (no toolbar)
        const pdfContent = document.getElementById('pdf-content');
        pdfContent.innerHTML = `
            <iframe src="${blobUrl}#toolbar=0&navpanes=0&scrollbar=0" class="w-full h-full border-0"></iframe>
        `;
        
        // Store blob URL for cleanup
        modal.dataset.blobUrl = blobUrl;
    } catch (error) {
        console.error('Error loading PDF:', error);
        const pdfContent = document.getElementById('pdf-content');
        pdfContent.innerHTML = `
            <div class="text-center">
                <p class="text-red-600 mb-4">Unable to load PDF preview</p>
                <a href="${pdfUrl}" target="_blank" class="text-indigo-600 hover:underline">
                    Click here to open PDF in new tab
                </a>
            </div>
        `;
    }
};

/**
 * Close the PDF viewer modal
 * Cleans up blob URLs to prevent memory leaks
 * @returns {void}
 */
export const closeStudentPdfModal = () => {
    const modal = document.getElementById('pdf-viewer-modal');
    if (modal) {
        // Clean up blob URL if it exists
        if (modal.dataset.blobUrl) {
            URL.revokeObjectURL(modal.dataset.blobUrl);
        }
        document.body.removeChild(modal);
    }
};

export default {
    generateBooklet,
    viewStudentPdf,
    closeStudentPdfModal
};

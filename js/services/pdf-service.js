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
 * Display student PDF in modal viewer with student info
 * Fetches PDF and creates blob URL to bypass CSP restrictions
 * @param {string} pdfUrl - URL of the PDF to view
 * @param {string|Object} studentNameOrData - Student name string OR full student object with photos/message
 * @returns {Promise<void>}
 */
export const viewStudentPdf = async (pdfUrl, studentNameOrData) => {
    // Handle both old (string) and new (object) calling patterns
    const studentData = typeof studentNameOrData === 'string' 
        ? { name: studentNameOrData }
        : studentNameOrData;
    
    const studentName = studentData.name || 'Student';
    
    // Create modal with loading state - clean, minimal design
    const modal = document.createElement('div');
    modal.id = 'pdf-viewer-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-2';
    
    // Build student header content if we have additional data
    let headerContent = '';
    const hasPhotos = studentData.profilePhotoUrl || studentData.coverPhotoBeforeUrl || studentData.coverPhotoAfterUrl;
    const hasMessage = studentData.graduationSpeech;
    
    if (hasPhotos || hasMessage) {
        headerContent = `
            <!-- Student Info Section (scrolls with PDF) -->
            <div class="bg-white p-6 border-b border-gray-200">
                <!-- Student Name -->
                <h2 class="text-2xl font-bold text-gray-900 mb-4 text-center">${studentName}</h2>
                
                <!-- Photos Section -->
                ${hasPhotos ? `
                    <div class="flex justify-center gap-4 mb-4 flex-wrap">
                        ${studentData.profilePhotoUrl ? `
                            <div class="text-center">
                                <img src="${studentData.profilePhotoUrl}" 
                                     alt="${studentName} - Profile" 
                                     class="w-32 h-32 rounded-lg object-cover shadow-md border-2 border-gray-200"
                                     onerror="this.style.display='none'">
                                <p class="text-xs text-gray-500 mt-1">Profile</p>
                            </div>
                        ` : ''}
                        
                        ${studentData.coverPhotoBeforeUrl ? `
                            <div class="text-center">
                                <img src="${studentData.coverPhotoBeforeUrl}" 
                                     alt="${studentName} - Before" 
                                     class="w-32 h-32 rounded-lg object-cover shadow-md border-2 border-gray-200"
                                     onerror="this.style.display='none'">
                                <p class="text-xs text-gray-500 mt-1">Before</p>
                            </div>
                        ` : ''}
                        
                        ${studentData.coverPhotoAfterUrl ? `
                            <div class="text-center">
                                <img src="${studentData.coverPhotoAfterUrl}" 
                                     alt="${studentName} - After" 
                                     class="w-32 h-32 rounded-lg object-cover shadow-md border-2 border-gray-200"
                                     onerror="this.style.display='none'">
                                <p class="text-xs text-gray-500 mt-1">After</p>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                <!-- Graduation Message -->
                ${hasMessage ? `
                    <div class="bg-gray-50 rounded-lg p-4 max-w-2xl mx-auto">
                        <p class="text-sm font-semibold text-gray-700 mb-2">Graduation Message</p>
                        <p class="text-sm text-gray-600 italic">"${studentData.graduationSpeech}"</p>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="bg-white w-full max-w-5xl h-full max-h-[95vh] shadow-2xl rounded-lg overflow-hidden relative">
            <!-- Close button - minimal, top-right corner -->
            <button 
                onclick="window.closeStudentPdfModal()" 
                class="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-100 rounded-full shadow-lg text-gray-600 hover:text-gray-900 text-2xl font-bold transition-colors"
                aria-label="Close"
            >
                &times;
            </button>
            
            <!-- Scrollable container for student info + PDF -->
            <div class="h-full overflow-y-auto">
                ${headerContent}
                
                <!-- PDF Content Area -->
                <div id="pdf-content" class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div class="text-center">
                        <div class="spinner w-12 h-12 border-4 border-indigo-600 rounded-full mx-auto mb-4"></div>
                        <p class="text-gray-600">Loading PDF...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on outside click (clicking the dark overlay)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeStudentPdfModal();
        }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeStudentPdfModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Fetch PDF and create blob URL to bypass CSP
    try {
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error('Failed to load PDF');
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Replace loading state with PDF viewer (full height, scrollable)
        const pdfContent = document.getElementById('pdf-content');
        pdfContent.className = 'bg-white';
        pdfContent.innerHTML = `
            <iframe 
                src="${blobUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH" 
                class="w-full border-0 bg-white"
                style="height: 1200px; display: block;"
                title="${studentName}'s Profile PDF"
            ></iframe>
        `;
        
        // Store blob URL for cleanup
        modal.dataset.blobUrl = blobUrl;
    } catch (error) {
        console.error('Error loading PDF:', error);
        const pdfContent = document.getElementById('pdf-content');
        pdfContent.innerHTML = `
            <div class="text-center p-8">
                <p class="text-red-600 mb-4 text-lg">Unable to load PDF preview</p>
                <p class="text-gray-600 mb-4">Please try again or contact support if the issue persists.</p>
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

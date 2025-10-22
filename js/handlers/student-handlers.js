/**
 * Student Management Event Handlers
 * Manages adding, editing, deleting students and their associated files
 */

/**
 * Setup add student form handler (supports bulk add via textarea)
 * @param {HTMLElement} formElement - The add student form
 * @param {Object} handlers - Required handlers and functions
 *   - showModal: Function to show modal
 *   - showLoadingModal: Function to show loading modal
 *   - showSuccessModal: Function to show success modal
 *   - showErrorModal: Function to show error modal
 *   - sanitizeInput: Function to sanitize input
 *   - rateLimiter: Rate limiter object with isAllowed method
 *   - currentUser: Current authenticated user
 *   - gradId: Graduation ID
 *   - router: Router function to refresh
 */
export function setupAddStudentFormHandler(formElement, handlers) {
    const { showModal, showLoadingModal, showSuccessModal, showErrorModal, sanitizeInput, rateLimiter, currentUser, gradId, router } = handlers;
    
    formElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const namesInput = document.getElementById('student-names').value;
        const accessType = document.getElementById('access-type').value;

        // Parse and validate names from textarea
        const lines = namesInput.split('\n');
        const validNames = [];
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue; // Skip empty lines
            
            const sanitizedName = sanitizeInput(trimmedLine, 'name');
            if (sanitizedName) {
                validNames.push(sanitizedName);
            }
        }
        
        if (validNames.length === 0) {
            showErrorModal('No Valid Names', 'Please enter at least one valid student name.');
            return;
        }

        // Rate limiting check - allow up to 100 students per minute for bulk operations
        const rateLimitKey = `add-students-bulk-${currentUser.uid}`;
        if (!rateLimiter.isAllowed(rateLimitKey, 100, 60000)) {
            showErrorModal('Rate Limit', 'Too many requests. Please wait a minute before adding more students.');
            return;
        }

        try {
            // Show loading modal with count
            const closeLoading = showLoadingModal('Adding Students...', `Adding ${validNames.length} student${validNames.length > 1 ? 's' : ''}. Please wait...`);

            const results = {
                successful: [],
                failed: []
            };

            // Helper function to generate memorable password
            const generatePassword = () => {
                const adjectives = ['Blue', 'Red', 'Green', 'Gold', 'Silver', 'Bright', 'Smart', 'Cool', 'Star', 'Epic'];
                const nouns = ['Tiger', 'Eagle', 'Lion', 'Bear', 'Wolf', 'Shark', 'Falcon', 'Phoenix', 'Dragon', 'Hawk'];
                const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
                const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
                const randomNum = Math.floor(10 + Math.random() * 90);
                return `${randomAdj}${randomNoun}${randomNum}`;
            };

            // Add students sequentially to avoid overwhelming backend
            for (let i = 0; i < validNames.length; i++) {
                const studentName = validNames[i];
                
                try {
                    const requestBody = {
                        action: 'createStudent',
                        graduationId: gradId,
                        studentName: studentName,
                        accessType: accessType,
                    };

                    // Add password for password-protected students
                    if (accessType === 'password') {
                        requestBody.password = generatePassword();
                    }

                    const response = await fetch('/.netlify/functions/secure-operations', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestBody),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to create student');
                    }

                    const result = await response.json();
                    results.successful.push({
                        name: studentName,
                        password: result.generatedPassword
                    });

                } catch (error) {
                    console.error(`Error adding student ${studentName}:`, error);
                    results.failed.push({
                        name: studentName,
                        error: error.message
                    });
                }

                // Small delay to avoid rate limits (50ms between requests)
                if (i < validNames.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            // Close loading modal
            closeLoading();

            // Clear the form
            document.getElementById('add-student-form').reset();

            // Show results
            if (results.failed.length === 0) {
                // All succeeded
                let message = `Successfully added ${results.successful.length} student${results.successful.length > 1 ? 's' : ''}!`;
                
                // Show passwords if any
                if (accessType === 'password') {
                    message += '\n\n📋 Generated Passwords:\n';
                    results.successful.forEach(s => {
                        message += `${s.name}: ${s.password}\n`;
                    });
                    message += '\n⚠️ Make sure to save these passwords!';
                }
                
                showSuccessModal('Success!', message);
            } else if (results.successful.length === 0) {
                // All failed
                showErrorModal('Failed', `Failed to add all students. Errors: ${results.failed.map(f => `${f.name} (${f.error})`).join(', ')}`);
            } else {
                // Partial success
                let message = `Added ${results.successful.length} student${results.successful.length > 1 ? 's' : ''} successfully.\n\n`;
                message += `Failed to add ${results.failed.length}: ${results.failed.map(f => f.name).join(', ')}`;
                
                if (accessType === 'password') {
                    message += '\n\n📋 Generated Passwords (for successful additions):\n';
                    results.successful.forEach(s => {
                        message += `${s.name}: ${s.password}\n`;
                    });
                }
                
                showModal('Partial Success', message, true);
            }
            
            // Refresh the current page to show the new students
            setTimeout(() => {
                router();
            }, 2000);
            
        } catch (error) {
            console.error('Bulk student creation error:', error);
            showErrorModal('Error', error.message || 'Failed to add students. Please try again.');
        }
    });
}

/**
 * Setup copy general upload URL handler
 * @param {HTMLElement} copyBtn - Copy button element
 * @param {Function} copyToClipboard - Clipboard copy function
 */
export function setupCopyGeneralUrlHandler(copyBtn, copyToClipboard) {
    copyBtn.addEventListener('click', (e) => {
        const urlInput = document.getElementById('general-upload-url');
        copyToClipboard(urlInput.value, e.target);
    });
}

/**
 * Setup delete student handler (called via onclick)
 * @param {string} studentId - ID of student to delete
 * @param {string} studentName - Name of student
 * @param {string} gradId - Graduation ID
 * @param {Object} modals - Modal functions object with showModal, showSuccessModal, showConfirmModal
 * @param {Function} router - Router function to refresh
 */
export async function deleteStudent(studentId, studentName, gradId, modals, router) {
    // Import showConfirmModal if not provided
    let showConfirm = modals?.showConfirmModal;
    let showSuccess = modals?.showSuccessModal;
    let showError = modals?.showErrorModal;
    
    if (!showConfirm || !showSuccess || !showError) {
        const modalModule = await import('../components/modal.js');
        showConfirm = showConfirm || modalModule.showConfirmModal;
        showSuccess = showSuccess || modalModule.showSuccessModal;
        showError = showError || modalModule.showErrorModal;
    }
    
    showConfirm('Confirm Delete', `Are you sure you want to delete ${studentName}?`, async () => {
        try {
            // Import repository (if not already available)
            const { StudentRepository } = await import('../data/student-repository.js');
            await StudentRepository.delete(gradId, studentId);
            showSuccess('Success', `${studentName} has been removed from the student list.`);
            
            setTimeout(() => {
                router();
            }, 1000);
        } catch (error) {
            console.error('Error deleting student:', error);
            showError('Error', 'Failed to delete student. Please try again.');
        }
    }, 'Delete');
}

/**
 * Setup upload PDF handler for student (called via onclick)
 * @param {string} studentId - ID of student
 * @param {string} studentName - Name of student  
 * @param {string} gradId - Graduation ID
 * @param {Object} handlers - Required handlers
 *   - showModal: Function to show modal
 *   - uploadToCloudinary: Function to upload file
 *   - router: Router function to refresh
 */
export async function uploadPdfForStudent(studentId, studentName, gradId, handlers) {
    const { showModal, uploadToCloudinary, router } = handlers;
    
    // Create hidden file input and click it
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf';
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            showModal('Uploading...', 'Uploading PDF, please wait...', false);
            const uploadedUrl = await uploadToCloudinary(file, `graduation-${gradId}-${studentId}`);
            
            // Save URL to Firestore
            showModal('Saving...', 'Saving to database...', false);
            const { StudentRepository } = await import('../data/student-repository.js');
            await StudentRepository.update(gradId, studentId, { profilePdfUrl: uploadedUrl });
            
            showModal('Success', `PDF uploaded successfully for ${studentName}!`);
            setTimeout(() => {
                router();
            }, 1000);
        } catch (error) {
            console.error('Upload error:', error);
            showModal('Error', 'Failed to upload PDF. Please try again.');
        }
    };
    fileInput.click();
}

/**
 * Setup remove PDF handler for student (called via onclick)
 * @param {string} studentId - ID of student
 * @param {string} studentName - Name of student
 * @param {string} gradId - Graduation ID
 * @param {Object} handlers - Required handlers
 *   - modals: Object with showConfirmModal, showSuccessModal, showErrorModal, showLoadingModal
 *   - router: Router function to refresh
 */
export async function removePdfForStudent(studentId, studentName, gradId, handlers) {
    const { modals, router } = handlers;
    
    // Import modal functions if not provided
    let showConfirm = modals?.showConfirmModal;
    let showSuccess = modals?.showSuccessModal;
    let showError = modals?.showErrorModal;
    let showLoading = modals?.showLoadingModal;
    
    if (!showConfirm || !showSuccess || !showError || !showLoading) {
        const modalModule = await import('../components/modal.js');
        showConfirm = showConfirm || modalModule.showConfirmModal;
        showSuccess = showSuccess || modalModule.showSuccessModal;
        showError = showError || modalModule.showErrorModal;
        showLoading = showLoading || modalModule.showLoadingModal;
    }
    
    showConfirm('Confirm Remove', `Remove PDF for ${studentName}?`, async () => {
        try {
            const closeLoading = showLoading('Removing...', 'Removing PDF...');
            const { StudentRepository } = await import('../data/student-repository.js');
            await StudentRepository.update(gradId, studentId, { profilePdfUrl: null });
            closeLoading();
            
            showSuccess('Success', `PDF removed for ${studentName}!`);
            setTimeout(() => {
                router();
            }, 1000);
        } catch (error) {
            console.error('Error removing PDF:', error);
            showError('Error', 'Failed to remove PDF. Please try again.');
        }
    }, 'Remove');
}

/**
 * Import students from CSV file
 * @param {File} file - CSV file to import
 * @param {string} accessType - Access method for all students
 * @param {string} gradId - Graduation ID
 * @param {Object} handlers - Required handlers
 *   - showModal: Function to show modal
 *   - showLoadingModal: Function to show loading modal
 *   - showSuccessModal: Function to show success modal
 *   - showErrorModal: Function to show error modal
 *   - sanitizeInput: Function to sanitize input
 *   - rateLimiter: Rate limiter object
 *   - currentUser: Current authenticated user
 *   - router: Router function to refresh
 */
export async function importStudentsFromCSV(file, accessType, gradId, handlers) {
    const { showModal, showLoadingModal, showSuccessModal, showErrorModal, sanitizeInput, rateLimiter, currentUser, router } = handlers;
    
    try {
        // Read file contents
        const text = await file.text();
        
        // Parse CSV - split by newlines
        const lines = text.split(/\r?\n/);
        const validNames = [];
        
        // Check if first line is a header (contains "Name" or "name")
        let startIndex = 0;
        if (lines.length > 0 && lines[0].toLowerCase().trim() === 'name') {
            startIndex = 1; // Skip header row
        }
        
        // Process each line
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines
            
            // Handle CSV with commas (take first column only)
            const name = line.split(',')[0].trim();
            
            if (name) {
                const sanitizedName = sanitizeInput(name, 'name');
                if (sanitizedName) {
                    validNames.push(sanitizedName);
                }
            }
        }
        
        if (validNames.length === 0) {
            showErrorModal('No Valid Names', 'No valid student names found in the CSV file. Please check the file format.');
            return;
        }
        
        // Rate limiting check - allow up to 100 students per minute for bulk operations
        const rateLimitKey = `import-csv-${currentUser.uid}`;
        if (!rateLimiter.isAllowed(rateLimitKey, 100, 60000)) {
            showErrorModal('Rate Limit', 'Too many import requests. Please wait a minute before importing more students.');
            return;
        }
        
        // Show loading modal
        const closeLoading = showLoadingModal('Importing Students...', `Importing ${validNames.length} student${validNames.length > 1 ? 's' : ''} from CSV. Please wait...`);
        
        const results = {
            successful: [],
            failed: []
        };
        
        // Helper function to generate memorable password
        const generatePassword = () => {
            const adjectives = ['Blue', 'Red', 'Green', 'Gold', 'Silver', 'Bright', 'Smart', 'Cool', 'Star', 'Epic'];
            const nouns = ['Tiger', 'Eagle', 'Lion', 'Bear', 'Wolf', 'Shark', 'Falcon', 'Phoenix', 'Dragon', 'Hawk'];
            const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
            const randomNum = Math.floor(10 + Math.random() * 90);
            return `${randomAdj}${randomNoun}${randomNum}`;
        };
        
        // Add students sequentially
        for (let i = 0; i < validNames.length; i++) {
            const studentName = validNames[i];
            
            try {
                const requestBody = {
                    action: 'createStudent',
                    graduationId: gradId,
                    studentName: studentName,
                    accessType: accessType,
                };
                
                // Add password for password-protected students
                if (accessType === 'password') {
                    requestBody.password = generatePassword();
                }
                
                const response = await fetch('/.netlify/functions/secure-operations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to create student');
                }
                
                const result = await response.json();
                results.successful.push({
                    name: studentName,
                    password: result.generatedPassword
                });
                
            } catch (error) {
                console.error(`Error adding student ${studentName}:`, error);
                results.failed.push({
                    name: studentName,
                    error: error.message
                });
            }
            
            // Small delay between requests (50ms)
            if (i < validNames.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        // Close loading modal
        closeLoading();
        
        // Show results
        if (results.failed.length === 0) {
            // All succeeded
            let message = `Successfully imported ${results.successful.length} student${results.successful.length > 1 ? 's' : ''} from CSV!`;
            
            // Show passwords if any
            if (accessType === 'password') {
                message += '\n\n📋 Generated Passwords:\n';
                results.successful.forEach(s => {
                    message += `${s.name}: ${s.password}\n`;
                });
                message += '\n⚠️ Make sure to save these passwords!';
            }
            
            showSuccessModal('Import Successful!', message);
        } else if (results.successful.length === 0) {
            // All failed
            showErrorModal('Import Failed', `Failed to import all students. Errors: ${results.failed.map(f => `${f.name} (${f.error})`).join(', ')}`);
        } else {
            // Partial success
            let message = `Imported ${results.successful.length} student${results.successful.length > 1 ? 's' : ''} successfully.\n\n`;
            message += `Failed to import ${results.failed.length}: ${results.failed.map(f => f.name).join(', ')}`;
            
            if (accessType === 'password') {
                message += '\n\n📋 Generated Passwords (for successful imports):\n';
                results.successful.forEach(s => {
                    message += `${s.name}: ${s.password}\n`;
                });
            }
            
            showModal('Partial Success', message, true);
        }
        
        // Refresh the page
        setTimeout(() => {
            router();
        }, 2000);
        
    } catch (error) {
        console.error('CSV import error:', error);
        showErrorModal('Import Error', `Failed to import CSV: ${error.message}`);
    }
}

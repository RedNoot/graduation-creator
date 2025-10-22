/**
 * Student Management Event Handlers
 * Manages adding, editing, deleting students and their associated files
 */

/**
 * Setup add student form handler
 * @param {HTMLElement} formElement - The add student form
 * @param {Object} handlers - Required handlers and functions
 *   - showModal: Function to show modal
 *   - sanitizeInput: Function to sanitize input
 *   - rateLimiter: Rate limiter object with isAllowed method
 *   - currentUser: Current authenticated user
 *   - gradId: Graduation ID
 *   - router: Router function to refresh
 */
export function setupAddStudentFormHandler(formElement, handlers) {
    const { showModal, sanitizeInput, rateLimiter, currentUser, gradId, router } = handlers;
    
    formElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('student-name').value;
        const accessType = document.getElementById('access-type').value;

        // Client-side input sanitization
        const sanitizedName = sanitizeInput(nameInput, 'name');
        
        if (!sanitizedName) {
            showModal('Error', 'Please enter a valid student name.');
            return;
        }

        // Rate limiting check
        const rateLimitKey = `add-student-${currentUser.uid}`;
        if (!rateLimiter.isAllowed(rateLimitKey, 10, 60000)) {
            showModal('Rate Limit', 'Too many requests. Please wait a minute before adding more students.');
            return;
        }

        try {
            showModal('Creating...', 'Adding student to the class.', false);

            let response;
            if (accessType === 'password') {
                // Generate memorable password
                const adjectives = ['Blue', 'Red', 'Green', 'Gold', 'Silver', 'Bright', 'Smart', 'Cool', 'Star', 'Epic'];
                const nouns = ['Tiger', 'Eagle', 'Lion', 'Bear', 'Wolf', 'Shark', 'Falcon', 'Phoenix', 'Dragon', 'Hawk'];
                const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
                const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
                const randomNum = Math.floor(10 + Math.random() * 90);
                const generatedPassword = `${randomAdj}${randomNoun}${randomNum}`;
                
                response = await fetch('/.netlify/functions/secure-operations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'createStudent',
                        graduationId: gradId,
                        studentName: sanitizedName,
                        accessType: accessType,
                        password: generatedPassword,
                    }),
                });
            } else {
                // For public and link access types
                response = await fetch('/.netlify/functions/secure-operations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'createStudent',
                        graduationId: gradId,
                        studentName: sanitizedName,
                        accessType: accessType,
                    }),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create student');
            }

            const result = await response.json();
            
            // The student is already created server-side, no need to add again
            document.getElementById('add-student-form').reset();
            
            // Show success message with password if it's a password student
            if (accessType === 'password' && result.generatedPassword) {
                showModal('Success', `Student added successfully! Password: ${result.generatedPassword}`);
            } else {
                showModal('Success', 'Student added successfully!');
            }
            
            // Refresh the current page to show the new student
            setTimeout(() => {
                router(); // Reload the current route
            }, 1000);
            
        } catch (error) {
            console.error('Student creation error:', error);
            showModal('Error', error.message || 'Failed to add student. Please try again.');
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
 * @param {Object} showModal - Function to show modal
 * @param {Function} router - Router function to refresh
 */
export async function deleteStudent(studentId, studentName, gradId, showModal, router) {
    showModal('Confirm', `Are you sure you want to delete ${studentName}?`, true, async () => {
        try {
            // Import repository (if not already available)
            const { StudentRepository } = await import('../data/student-repository.js');
            await StudentRepository.delete(gradId, studentId);
            showModal('Success', `${studentName} has been removed from the student list.`);
            
            setTimeout(() => {
                router();
            }, 1000);
        } catch (error) {
            console.error('Error deleting student:', error);
            showModal('Error', 'Failed to delete student. Please try again.');
        }
    });
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
 *   - showModal: Function to show modal
 *   - router: Router function to refresh
 */
export async function removePdfForStudent(studentId, studentName, gradId, handlers) {
    const { showModal, router } = handlers;
    
    showModal('Confirm', `Remove PDF for ${studentName}?`, true, async () => {
        try {
            showModal('Removing...', 'Removing PDF...', false);
            const { StudentRepository } = await import('../data/student-repository.js');
            await StudentRepository.update(gradId, studentId, { profilePdfUrl: null });
            
            showModal('Success', `PDF removed for ${studentName}!`);
            setTimeout(() => {
                router();
            }, 1000);
        } catch (error) {
            console.error('Error removing PDF:', error);
            showModal('Error', 'Failed to remove PDF. Please try again.');
        }
    });
}

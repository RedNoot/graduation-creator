/**
 * Setup Guide Component
 * Provides a guided onboarding experience for new graduation projects
 * Shows golden path checklist and links to relevant tabs
 */

/**
 * Render the Setup Guide component
 * @param {Object} gradData - Graduation data including setupStatus
 * @param {string} gradId - Graduation ID
 * @param {Function} activateTab - Function to activate a specific tab
 * @returns {string} HTML string for setup guide
 */
export function renderSetupGuide(gradData, gradId, activateTab) {
    const setupStatus = gradData.config?.setupStatus || {
        studentsAdded: false,
        contentAdded: false,
        themeCustomized: false,
        bookletGenerated: false
    };
    
    // Check if all steps are complete
    const allComplete = setupStatus.studentsAdded && 
                       setupStatus.contentAdded && 
                       setupStatus.themeCustomized && 
                       setupStatus.bookletGenerated;
    
    // Auto-mark setup as complete if all steps are done
    if (allComplete && !gradData.isSetupComplete) {
        markSetupComplete(gradId);
    }
    
    const checkIcon = (isComplete) => isComplete 
        ? '<span class="text-green-600 text-2xl">✅</span>' 
        : '<span class="text-gray-300 text-2xl">⬜</span>';
    
    return `
        <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center py-12 px-4">
            <div class="max-w-3xl w-full">
                <!-- Header -->
                <div class="text-center mb-8">
                    <div class="inline-block p-3 bg-indigo-100 rounded-full mb-3">
                        <svg class="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h1 class="text-2xl font-bold text-gray-900 mb-2">Let's Get Your Graduation Site Set Up</h1>
                    <p class="text-base text-gray-600">Follow these 4 simple steps to create a beautiful graduation website</p>
                </div>
                
                <!-- Setup Steps Card -->
                <div class="bg-white rounded-xl shadow-lg p-6 space-y-4">
                    
                    <!-- Step 1: Add Students -->
                    <div class="setup-step-item ${setupStatus.studentsAdded ? 'opacity-60' : ''}" data-step="students">
                        <div class="flex items-start space-x-3 p-3 rounded-lg transition-colors">
                            <div class="flex-shrink-0 mt-0.5">
                                <input 
                                    type="checkbox" 
                                    id="setup-students-checkbox"
                                    ${setupStatus.studentsAdded ? 'checked disabled' : ''}
                                    onchange="window.toggleSetupStep('${gradId}', 'studentsAdded', this.checked)"
                                    class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>
                            <div class="flex-1 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2" onclick="window.setupGuideActivateTab('students')">
                                <h3 class="text-base font-semibold text-gray-900 mb-1">
                                    Step 1: Add Your Students
                                </h3>
                                <p class="text-sm text-gray-600 mb-2">
                                    Add your graduating students by entering their names individually or importing them via CSV.
                                </p>
                                ${!setupStatus.studentsAdded ? `
                                    <button class="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors">
                                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                        Add Students
                                    </button>
                                ` : `
                                    <div class="inline-flex items-center text-green-600 text-sm font-medium">
                                        <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                        </svg>
                                        Completed
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                    
                    <div class="border-t border-gray-200"></div>
                    
                    <!-- Step 2: Add Content -->
                    <div class="setup-step-item ${setupStatus.contentAdded ? 'opacity-60' : ''}" data-step="content">
                        <div class="flex items-start space-x-3 p-3 rounded-lg transition-colors">
                            <div class="flex-shrink-0 mt-0.5">
                                <input 
                                    type="checkbox" 
                                    id="setup-content-checkbox"
                                    ${setupStatus.contentAdded ? 'checked disabled' : ''}
                                    onchange="window.toggleSetupStep('${gradId}', 'contentAdded', this.checked)"
                                    class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>
                            <div class="flex-1 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2" onclick="window.setupGuideActivateTab('content')">
                                <h3 class="text-base font-semibold text-gray-900 mb-1">
                                    Step 2: Add Speeches & Messages
                                </h3>
                                <p class="text-sm text-gray-600 mb-2">
                                    Add welcoming messages, speeches, or memories to personalize your graduation website.
                                </p>
                                ${!setupStatus.contentAdded ? `
                                    <button class="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors">
                                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                        </svg>
                                        Add Content
                                    </button>
                                ` : `
                                    <div class="inline-flex items-center text-green-600 text-sm font-medium">
                                        <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                        </svg>
                                        Completed
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                    
                    <div class="border-t border-gray-200"></div>
                    
                    <!-- Step 3: Customize Theme -->
                    <div class="setup-step-item ${setupStatus.themeCustomized ? 'opacity-60' : ''}" data-step="settings">
                        <div class="flex items-start space-x-3 p-3 rounded-lg transition-colors">
                            <div class="flex-shrink-0 mt-0.5">
                                <input 
                                    type="checkbox" 
                                    id="setup-theme-checkbox"
                                    ${setupStatus.themeCustomized ? 'checked disabled' : ''}
                                    onchange="window.toggleSetupStep('${gradId}', 'themeCustomized', this.checked)"
                                    class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>
                            <div class="flex-1 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2" onclick="window.setupGuideActivateTab('settings')">
                                <h3 class="text-base font-semibold text-gray-900 mb-1">
                                    Step 3: Customize Your Site
                                </h3>
                                <p class="text-sm text-gray-600 mb-2">
                                    Choose colors, layouts, and styles to make your graduation website uniquely yours.
                                </p>
                                ${!setupStatus.themeCustomized ? `
                                    <button class="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors">
                                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
                                        </svg>
                                        Customize Theme
                                    </button>
                                ` : `
                                    <div class="inline-flex items-center text-green-600 text-sm font-medium">
                                        <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                        </svg>
                                        Completed
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                    
                    <div class="border-t border-gray-200"></div>
                    
                    <!-- Step 4: Generate Booklet -->
                    <div class="setup-step-item ${setupStatus.bookletGenerated ? 'opacity-60' : ''}" data-step="booklet">
                        <div class="flex items-start space-x-3 p-3 rounded-lg transition-colors">
                            <div class="flex-shrink-0 mt-0.5">
                                <input 
                                    type="checkbox" 
                                    id="setup-booklet-checkbox"
                                    ${setupStatus.bookletGenerated ? 'checked disabled' : ''}
                                    onchange="window.toggleSetupStep('${gradId}', 'bookletGenerated', this.checked)"
                                    class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>
                            <div class="flex-1 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2" onclick="window.setupGuideActivateTab('booklet')">
                                <h3 class="text-base font-semibold text-gray-900 mb-1">
                                    Step 4: Generate Booklet & Publish
                                </h3>
                                <p class="text-sm text-gray-600 mb-2">
                                    Create a downloadable PDF booklet and share your beautiful graduation website with the world.
                                </p>
                                ${!setupStatus.bookletGenerated ? `
                                    <button class="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors">
                                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                        Generate Booklet
                                    </button>
                                ` : `
                                    <div class="inline-flex items-center text-green-600 text-sm font-medium">
                                        <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                        </svg>
                                        Completed
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                    
                    ${allComplete ? `
                        <div class="border-t border-gray-200 mt-4 pt-4">
                            <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                <div class="inline-block p-2 bg-green-100 rounded-full mb-3">
                                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                                <h3 class="text-lg font-bold text-green-900 mb-2">Setup Complete! 🎉</h3>
                                <p class="text-sm text-green-700 mb-3">Your graduation website is ready! The full dashboard will appear on your next visit.</p>
                                <button onclick="window.location.reload()" class="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors">
                                    Continue to Dashboard
                                </button>
                            </div>
                        </div>
                    ` : ''}
                    
                </div>
                
                <!-- Skip Setup Link -->
                <div class="text-center mt-8">
                    <button onclick="window.skipSetupGuide('${gradId}')" class="text-gray-500 hover:text-gray-700 text-sm underline">
                        I'm already familiar with this - skip to full dashboard
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Mark setup as complete in Firestore
 * @param {string} gradId - Graduation ID
 */
async function markSetupComplete(gradId) {
    try {
        const { GraduationRepository } = await import('../data/graduation-repository.js');
        await GraduationRepository.update(gradId, {
            isSetupComplete: true
        });
        console.log('[Setup Guide] Marked setup as complete');
    } catch (error) {
        console.error('[Setup Guide] Error marking setup complete:', error);
    }
}

/**
 * Toggle setup step completion status
 * @param {string} gradId - Graduation ID
 * @param {string} stepName - Name of the setup step
 * @param {boolean} isChecked - Whether checkbox is checked
 */
async function toggleSetupStep(gradId, stepName, isChecked) {
    try {
        console.log('[Setup Guide] toggleSetupStep called:', { gradId, stepName, isChecked });
        
        const { updateDoc, doc, getDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
        const { db } = await import('../firebase-init.js');
        const { GraduationRepository } = await import('../data/graduation-repository.js');
        const { auth } = await import('../firebase-init.js');
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error('[Setup Guide] No authenticated user');
            alert('You must be logged in to update setup steps.');
            return;
        }
        
        console.log('[Setup Guide] Current user:', currentUser.uid);
        
        // First, verify user has permission
        const gradRef = doc(db, 'graduations', gradId);
        const gradDoc = await getDoc(gradRef);
        
        if (!gradDoc.exists()) {
            console.error('[Setup Guide] Graduation document not found:', gradId);
            alert('Graduation not found.');
            return;
        }
        
        const gradData = gradDoc.data();
        const editors = gradData.editors || [];
        const ownerUid = gradData.ownerUid;
        const isEditor = editors.includes(currentUser.uid) || ownerUid === currentUser.uid;
        
        console.log('[Setup Guide] Permission check:', { 
            editors, 
            ownerUid, 
            currentUserUid: currentUser.uid,
            isEditor 
        });
        
        if (!isEditor) {
            console.error('[Setup Guide] User is not an editor');
            alert('You do not have permission to edit this graduation.');
            return;
        }
        
        // Use Firestore's dot notation directly in updateDoc
        const fieldPath = `config.setupStatus.${stepName}`;
        const updates = {
            [fieldPath]: isChecked,
            updatedAt: serverTimestamp()
        };
        
        console.log('[Setup Guide] Attempting update with:', updates);
        
        await updateDoc(gradRef, updates);
        
        console.log(`[Setup Guide] Successfully toggled ${stepName} to ${isChecked}`);
        
        // If all steps are complete, mark setup as complete and reload
        if (isChecked) {
            // Fetch current data to check if all steps are now complete
            const gradData = await GraduationRepository.getById(gradId);
            const setupStatus = gradData.config?.setupStatus || {};
            
            const allComplete = setupStatus.studentsAdded && 
                               setupStatus.contentAdded && 
                               setupStatus.themeCustomized && 
                               setupStatus.bookletGenerated;
            
            if (allComplete) {
                await markSetupComplete(gradId);
                // Show success message and reload
                alert('🎉 Setup complete! Your graduation website is ready.');
                window.location.reload();
            } else {
                // Just reload to show updated checkboxes
                window.location.reload();
            }
        } else {
            // If unchecking, just reload to show updated state
            window.location.reload();
        }
    } catch (error) {
        console.error('[Setup Guide] Error toggling setup step:', error);
        alert('Error updating setup status. Please try again.');
    }
}

/**
 * Setup global functions for setup guide interaction
 * @param {Function} activateTabFn - Function to activate a specific tab
 * @param {string} gradId - Graduation ID
 */
export function setupSetupGuideHandlers(activateTabFn, gradId) {
    // Make tab activation available globally
    window.setupGuideActivateTab = (tabName) => {
        activateTabFn(tabName);
    };
    
    // Make skip function available globally
    window.skipSetupGuide = async (gradId) => {
        const confirmed = confirm('Are you sure you want to skip the setup guide and access the full dashboard?');
        if (confirmed) {
            await markSetupComplete(gradId);
            window.location.reload();
        }
    };
    
    // Make toggle setup step available globally
    window.toggleSetupStep = toggleSetupStep;
}

export default {
    renderSetupGuide,
    setupSetupGuideHandlers
};

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
                <div class="text-center mb-12">
                    <div class="inline-block p-4 bg-indigo-100 rounded-full mb-4">
                        <svg class="w-16 h-16 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h1 class="text-4xl font-bold text-gray-900 mb-3">Let's Get Your Graduation Site Set Up</h1>
                    <p class="text-lg text-gray-600">Follow these 4 simple steps to create a beautiful graduation website</p>
                </div>
                
                <!-- Setup Steps Card -->
                <div class="bg-white rounded-2xl shadow-xl p-8 space-y-6">
                    
                    <!-- Step 1: Add Students -->
                    <div class="setup-step-item ${setupStatus.studentsAdded ? 'opacity-60' : ''}" data-step="students">
                        <div class="flex items-start space-x-4 cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors" onclick="window.setupGuideActivateTab('students')">
                            <div class="flex-shrink-0 mt-1">
                                ${checkIcon(setupStatus.studentsAdded)}
                            </div>
                            <div class="flex-1">
                                <h3 class="text-xl font-semibold text-gray-900 mb-2">
                                    Step 1: Add Your Students
                                </h3>
                                <p class="text-gray-600 mb-3">
                                    Add your graduating students by entering their names individually or importing them via CSV.
                                </p>
                                ${!setupStatus.studentsAdded ? `
                                    <button class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors">
                                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                        Add Students
                                    </button>
                                ` : `
                                    <div class="inline-flex items-center text-green-600 font-medium">
                                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
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
                        <div class="flex items-start space-x-4 cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors" onclick="window.setupGuideActivateTab('content')">
                            <div class="flex-shrink-0 mt-1">
                                ${checkIcon(setupStatus.contentAdded)}
                            </div>
                            <div class="flex-1">
                                <h3 class="text-xl font-semibold text-gray-900 mb-2">
                                    Step 2: Add Speeches & Messages
                                </h3>
                                <p class="text-gray-600 mb-3">
                                    Add welcoming messages, speeches, or memories to personalize your graduation website.
                                </p>
                                ${!setupStatus.contentAdded ? `
                                    <button class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors">
                                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                        </svg>
                                        Add Content
                                    </button>
                                ` : `
                                    <div class="inline-flex items-center text-green-600 font-medium">
                                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
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
                        <div class="flex items-start space-x-4 cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors" onclick="window.setupGuideActivateTab('settings')">
                            <div class="flex-shrink-0 mt-1">
                                ${checkIcon(setupStatus.themeCustomized)}
                            </div>
                            <div class="flex-1">
                                <h3 class="text-xl font-semibold text-gray-900 mb-2">
                                    Step 3: Customize Your Site
                                </h3>
                                <p class="text-gray-600 mb-3">
                                    Choose colors, layouts, and styles to make your graduation website uniquely yours.
                                </p>
                                ${!setupStatus.themeCustomized ? `
                                    <button class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors">
                                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
                                        </svg>
                                        Customize Theme
                                    </button>
                                ` : `
                                    <div class="inline-flex items-center text-green-600 font-medium">
                                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
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
                        <div class="flex items-start space-x-4 cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors" onclick="window.setupGuideActivateTab('booklet')">
                            <div class="flex-shrink-0 mt-1">
                                ${checkIcon(setupStatus.bookletGenerated)}
                            </div>
                            <div class="flex-1">
                                <h3 class="text-xl font-semibold text-gray-900 mb-2">
                                    Step 4: Generate Booklet & Publish
                                </h3>
                                <p class="text-gray-600 mb-3">
                                    Create a downloadable PDF booklet and share your beautiful graduation website with the world.
                                </p>
                                ${!setupStatus.bookletGenerated ? `
                                    <button class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors">
                                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                        Generate Booklet
                                    </button>
                                ` : `
                                    <div class="inline-flex items-center text-green-600 font-medium">
                                        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                        </svg>
                                        Completed
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                    
                    ${allComplete ? `
                        <div class="border-t border-gray-200 mt-6 pt-6">
                            <div class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                                <div class="inline-block p-3 bg-green-100 rounded-full mb-4">
                                    <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                                <h3 class="text-2xl font-bold text-green-900 mb-2">Setup Complete! 🎉</h3>
                                <p class="text-green-700 mb-4">Your graduation website is ready! The full dashboard will appear on your next visit.</p>
                                <button onclick="window.location.reload()" class="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
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
}

export default {
    renderSetupGuide,
    setupSetupGuideHandlers
};

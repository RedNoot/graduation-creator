/**
 * Project Home Dashboard Component
 * Main landing page for established graduation projects
 * Provides at-a-glance stats, progress tracking, and quick actions
 */

import { StudentRepository } from '../data/student-repository.js';
import { ContentRepository } from '../data/content-repository.js';

/**
 * Render progress bar
 * @param {number} current - Current count
 * @param {number} total - Total count
 * @param {number} percentage - Progress percentage
 * @param {string} color - Tailwind color class (e.g., 'indigo', 'green', 'purple')
 * @param {string} label - Progress bar label
 * @returns {string} HTML for progress bar
 */
const renderProgressBar = (current, total, percentage, color, label) => {
    const colorClasses = {
        indigo: {
            bg: 'bg-indigo-500',
            text: 'text-indigo-700',
            bgLight: 'bg-indigo-100'
        },
        green: {
            bg: 'bg-green-500',
            text: 'text-green-700',
            bgLight: 'bg-green-100'
        },
        purple: {
            bg: 'bg-purple-500',
            text: 'text-purple-700',
            bgLight: 'bg-purple-100'
        },
        orange: {
            bg: 'bg-orange-500',
            text: 'text-orange-700',
            bgLight: 'bg-orange-100'
        }
    };

    const colors = colorClasses[color] || colorClasses.indigo;
    const isComplete = percentage === 100;
    const isPartial = percentage > 0 && percentage < 100;
    const isEmpty = percentage === 0;

    return `
        <div class="space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700">${label}</span>
                <span class="text-sm font-semibold ${colors.text}">
                    ${current} / ${total}
                    ${isComplete ? '✅' : isPartial ? '🔄' : '⚪'}
                </span>
            </div>
            <div class="w-full ${colors.bgLight} rounded-full h-3 overflow-hidden">
                <div 
                    class="${colors.bg} h-3 rounded-full transition-all duration-500 ease-out"
                    style="width: ${percentage}%"
                    role="progressbar"
                    aria-valuenow="${percentage}"
                    aria-valuemin="0"
                    aria-valuemax="100">
                </div>
            </div>
            <p class="text-xs text-gray-500">${percentage}% complete</p>
        </div>
    `;
};

/**
 * Render large quick action button
 * @param {Object} action - Action configuration
 * @param {string} action.icon - Emoji icon
 * @param {string} action.title - Button title
 * @param {string} action.description - Button description
 * @param {string} action.page - Target page ID
 * @param {string} action.color - Color theme
 * @param {boolean} action.primary - Is primary action (larger button)
 * @returns {string} HTML for quick action button
 */
const renderQuickAction = (action) => {
    const colorClasses = {
        indigo: 'hover:border-indigo-500 hover:bg-indigo-50',
        green: 'hover:border-green-500 hover:bg-green-50',
        purple: 'hover:border-purple-500 hover:bg-purple-50',
        blue: 'hover:border-blue-500 hover:bg-blue-50',
        gray: 'hover:border-gray-500 hover:bg-gray-50'
    };

    const hoverClass = colorClasses[action.color] || colorClasses.indigo;
    const primaryClass = action.primary ? 'md:col-span-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent hover:from-indigo-600 hover:to-purple-700' : '';

    if (action.primary) {
        return `
            <button 
                class="quick-action-btn flex items-center gap-3 p-4 border-2 rounded-lg transition-all transform hover:scale-[1.02] ${primaryClass}"
                data-target-page="${action.page}">
                <span class="text-2xl">${action.icon}</span>
                <div class="text-left flex-1">
                    <p class="text-base font-bold">${action.title}</p>
                    <p class="text-sm opacity-90">${action.description}</p>
                </div>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </button>
        `;
    }

    return `
        <button 
            class="quick-action-btn flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg transition-all ${hoverClass}"
            data-target-page="${action.page}">
            <span class="text-2xl">${action.icon}</span>
            <div class="text-left">
                <p class="text-sm font-medium text-gray-900">${action.title}</p>
                <p class="text-xs text-gray-600">${action.description}</p>
            </div>
        </button>
    `;
};

/**
 * Render Project Home dashboard
 * @param {Object} gradData - Graduation data
 * @param {string} gradId - Graduation ID
 * @param {Function} navigateToPage - Navigation function
 * @returns {Promise<string>} HTML for project home dashboard
 */
export const renderProjectHome = async (gradData, gradId, navigateToPage) => {
    try {
        // Fetch dashboard stats
        const stats = await StudentRepository.getDashboardStats(gradId);
        const contentPages = await ContentRepository.getAll(gradId);

        // Use slug for URLs if available
        const urlIdentifier = gradData?.urlSlug || gradId;
        const publicUrl = `${window.location.origin}${window.location.pathname}#/view/${urlIdentifier}`;
        const uploadUrl = `${window.location.origin}${window.location.pathname}#/upload/${urlIdentifier}`;

        // Determine readiness for booklet generation
        const hasStudents = stats.totalStudents > 0;
        const hasPdfs = stats.pdfCount > 0;
        const readyForBooklet = hasStudents && hasPdfs;

        return `
            <div class="space-y-4" id="project-home-dashboard">
                <!-- Project Header -->
                <div class="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 rounded-lg shadow-lg">
                    <h2 class="text-xl font-bold mb-1">
                        ${gradData.schoolName || 'Graduation Project'}
                    </h2>
                    <p class="text-indigo-100 text-sm">
                        Graduation Year: ${gradData.graduationYear || 'Not set'}
                    </p>
                    ${gradData.generatedBookletUrl ? `
                        <div class="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                            <span class="text-lg">✅</span>
                            <span class="text-sm font-medium">Booklet Generated</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Upload Progress Section -->
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <span class="text-lg">📊</span>
                        Upload Progress
                    </h3>
                    <p class="text-sm text-gray-600 mb-4">Track student submissions and content completion</p>

                    ${stats.totalStudents === 0 ? `
                        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                            <div class="flex items-start gap-2">
                                <span class="text-lg">⚠️</span>
                                <div>
                                    <p class="text-sm font-medium text-yellow-800">No students added yet</p>
                                    <p class="text-xs text-yellow-700 mt-1">Add students to start tracking their progress.</p>
                                    <button 
                                        class="quick-action-btn mt-2 px-3 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-xs font-medium"
                                        data-target-page="students">
                                        Add Students Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="space-y-4">
                            <!-- PDF Progress -->
                            ${renderProgressBar(
                                stats.pdfCount,
                                stats.totalStudents,
                                stats.pdfProgress,
                                'indigo',
                                '📄 Profile PDFs Uploaded'
                            )}

                            <!-- Photo Progress -->
                            ${renderProgressBar(
                                stats.photoCount,
                                stats.totalStudents,
                                stats.photoProgress,
                                'green',
                                '📷 Profile Photos Uploaded'
                            )}

                            <!-- Cover Photos Progress -->
                            ${renderProgressBar(
                                stats.coverPhotoCount,
                                stats.totalStudents,
                                stats.coverPhotoProgress,
                                'purple',
                                '🖼️ Cover Photos Uploaded'
                            )}

                            <!-- Speech Progress -->
                            ${renderProgressBar(
                                stats.speechCount,
                                stats.totalStudents,
                                stats.speechProgress,
                                'orange',
                                '✍️ Graduation Speeches Written'
                            )}
                        </div>
                    `}
                </div>

                <!-- Quick Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <!-- Total Students -->
                    <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-200 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-xs text-indigo-600 font-medium uppercase tracking-wide">Total Students</p>
                                <p class="text-2xl font-bold text-indigo-900 mt-1">${stats.totalStudents}</p>
                            </div>
                            <span class="text-3xl">👥</span>
                        </div>
                    </div>

                    <!-- Content Pages -->
                    <div class="bg-green-50 p-4 rounded-lg border border-green-200 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-xs text-green-600 font-medium uppercase tracking-wide">Content Pages</p>
                                <p class="text-2xl font-bold text-green-900 mt-1">${contentPages.length}</p>
                            </div>
                            <span class="text-3xl">📝</span>
                        </div>
                    </div>

                    <!-- Booklet Status -->
                    <div class="bg-purple-50 p-4 rounded-lg border border-purple-200 shadow-sm">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-xs text-purple-600 font-medium uppercase tracking-wide">Booklet Status</p>
                                <p class="text-base font-bold text-purple-900 mt-1">
                                    ${gradData.generatedBookletUrl ? '✅ Generated' : readyForBooklet ? '⚡ Ready' : '⏳ Pending'}
                                </p>
                            </div>
                            <span class="text-3xl">📄</span>
                        </div>
                    </div>
                </div>

                <!-- Primary Quick Action - Generate Booklet -->
                ${readyForBooklet ? `
                    <div class="bg-white p-4 rounded-lg shadow">
                        <h3 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <span class="text-lg">⚡</span>
                            Ready to Generate
                        </h3>
                        ${renderQuickAction({
                            icon: '📄',
                            title: 'Generate Booklet',
                            description: 'Create your complete graduation booklet PDF',
                            page: 'booklet',
                            color: 'purple',
                            primary: true
                        })}
                    </div>
                ` : ''}

                <!-- Quick Actions Grid -->
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span class="text-lg">🚀</span>
                        Quick Actions
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${renderQuickAction({
                            icon: '👥',
                            title: 'Manage Students',
                            description: 'Add, edit, or remove students',
                            page: 'students',
                            color: 'indigo'
                        })}
                        
                        ${renderQuickAction({
                            icon: '💬',
                            title: 'Add Content',
                            description: 'Create speeches & messages',
                            page: 'content',
                            color: 'green'
                        })}
                        
                        ${renderQuickAction({
                            icon: '🔗',
                            title: 'Share Links',
                            description: 'Get upload & public links',
                            page: 'share',
                            color: 'blue'
                        })}
                        
                        ${renderQuickAction({
                            icon: '⚙️',
                            title: 'Customize Site',
                            description: 'Change theme & settings',
                            page: 'settings',
                            color: 'gray'
                        })}
                    </div>
                </div>

                <!-- Public Links Section -->
                <div class="bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-4 rounded-lg shadow">
                    <h3 class="text-base font-bold mb-1 flex items-center gap-2">
                        <span class="text-lg">🌐</span>
                        Share Your Graduation Site
                    </h3>
                    <p class="text-sm text-blue-100 mb-3">Share these links with students, parents, and teachers</p>
                    
                    <div class="space-y-3">
                        <!-- Public View Link -->
                        <div>
                            <label class="text-sm font-medium text-blue-100 mb-1 block">Public Graduation Site</label>
                            <div class="flex gap-2">
                                <input 
                                    type="text" 
                                    readonly 
                                    value="${publicUrl}" 
                                    class="flex-1 px-4 py-2 rounded-md bg-white text-gray-800 text-sm"
                                    id="home-public-url">
                                <button 
                                    onclick="window.copyToClipboard(document.getElementById('home-public-url').value, 'Public URL copied!')"
                                    class="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 font-medium text-sm">
                                    Copy
                                </button>
                                <a 
                                    href="${publicUrl}" 
                                    target="_blank"
                                    class="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 font-medium text-sm flex items-center gap-1">
                                    Visit
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                    </svg>
                                </a>
                            </div>
                        </div>
                        
                        <!-- Upload Portal Link -->
                        <div>
                            <label class="text-sm font-medium text-blue-100 mb-1 block">Student Upload Portal</label>
                            <div class="flex gap-2">
                                <input 
                                    type="text" 
                                    readonly 
                                    value="${uploadUrl}" 
                                    class="flex-1 px-4 py-2 rounded-md bg-white text-gray-800 text-sm"
                                    id="home-upload-url">
                                <button 
                                    onclick="window.copyToClipboard(document.getElementById('home-upload-url').value, 'Upload URL copied!')"
                                    class="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 font-medium text-sm">
                                    Copy
                                </button>
                                <a 
                                    href="${uploadUrl}" 
                                    target="_blank"
                                    class="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 font-medium text-sm flex items-center gap-1">
                                    Visit
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('[ProjectHome] Error rendering dashboard:', error);
        return `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex items-start gap-2">
                    <span class="text-xl">⚠️</span>
                    <div>
                        <p class="text-sm font-medium text-red-800">Error loading dashboard</p>
                        <p class="text-xs text-red-700 mt-1">Please refresh the page or contact support if the issue persists.</p>
                    </div>
                </div>
            </div>
        `;
    }
};

/**
 * Setup Project Home event handlers
 * Attaches event listeners to quick action buttons
 * @param {Function} navigateToPage - Navigation function
 */
export const setupProjectHomeHandlers = (navigateToPage) => {
    // Handle all quick action buttons
    const quickActionButtons = document.querySelectorAll('.quick-action-btn');
    quickActionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = button.getAttribute('data-target-page');
            if (targetPage && navigateToPage) {
                navigateToPage(targetPage);
            }
        });
    });
    
    console.log('[ProjectHome] Event handlers ready -', quickActionButtons.length, 'buttons configured');
};

export default {
    renderProjectHome,
    setupProjectHomeHandlers
};

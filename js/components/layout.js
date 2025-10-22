/**
 * Layout Components Module
 * Handles header, loading states, and page layout
 */

/**
 * Render page header with title and logout button
 * @param {string} pageTitle - Title to display in header
 * @param {Object} currentUser - Current user object (if logged in)
 * @param {boolean} showChangeProject - Whether to show the "Change Project" button
 * @returns {string} HTML for header
 */
export const renderHeader = (pageTitle = "Dashboard", currentUser = null, showChangeProject = false) => {
    const buttons = [];
    
    if (currentUser) {
        if (showChangeProject) {
            buttons.push(`<button id="change-project-btn" class="text-sm font-medium text-gray-600 hover:text-gray-900 mr-4">← Change Project</button>`);
        }
        buttons.push(`<button id="logout-btn" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">Logout</button>`);
    }
    
    return `
        <header class="bg-white shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 class="text-2xl font-bold text-gray-900">${pageTitle}</h1>
                <div class="flex items-center">
                    ${buttons.join('')}
                </div>
            </div>
        </header>
    `;
};

/**
 * Render full page loading indicator
 * @param {HTMLElement} container - Container element to render into
 * @returns {void}
 */
export const renderLoading = (container) => {
    container.innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
            <div class="spinner w-12 h-12 border-4 border-indigo-600 rounded-full"></div>
        </div>
    `;
};

/**
 * Render page wrapper with header and content area
 * @param {string} headerHtml - Header HTML
 * @param {string} contentHtml - Main content HTML
 * @returns {string} Complete page HTML
 */
export const renderPageLayout = (headerHtml, contentHtml) => {
    return `
        ${headerHtml}
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            ${contentHtml}
        </main>
    `;
};

export default {
    renderHeader,
    renderLoading,
    renderPageLayout
};

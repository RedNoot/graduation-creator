/**
 * Tab Navigation Component Module
 * Handles tab switching and tab UI
 */

/**
 * Render tab navigation header
 * @param {Array<Object>} tabs - Array of tab objects with {id, label, icon (optional)}
 * @param {string} activeTab - ID of currently active tab
 * @returns {string} HTML for tab navigation
 * @example
 * renderTabNav(
 *   [
 *     { id: 'students', label: 'Students', icon: '👥' },
 *     { id: 'content', label: 'Content', icon: '📝' }
 *   ],
 *   'students'
 * );
 */
export const renderTabNav = (tabs, activeTab) => {
    return `
        <div class="border-b border-gray-200">
            <nav class="flex gap-8" role="tablist">
                ${tabs.map(tab => `
                    <button 
                        data-tab="${tab.id}"
                        role="tab"
                        aria-selected="${tab.id === activeTab}"
                        class="py-4 px-1 border-b-2 font-medium text-sm tab-btn transition-colors ${
                            tab.id === activeTab 
                                ? 'border-indigo-500 text-indigo-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }">
                        ${tab.icon ? `<span class="mr-2">${tab.icon}</span>` : ''}
                        ${tab.label}
                    </button>
                `).join('')}
            </nav>
        </div>
    `;
};

/**
 * Render tab content container
 * @param {Array<Object>} tabs - Array of tab objects with {id, label}
 * @param {string} activeTab - ID of currently active tab
 * @param {Object} contentMap - Map of tab id to content HTML
 * @returns {string} HTML for tab content area
 */
export const renderTabContent = (tabs, activeTab, contentMap) => {
    return `
        <div class="mt-6">
            ${tabs.map(tab => `
                <div 
                    data-tab-content="${tab.id}"
                    role="tabpanel"
                    class="tab-content transition-opacity ${
                        tab.id === activeTab ? 'block' : 'hidden'
                    }">
                    ${contentMap[tab.id] || '<p class="text-gray-500">Loading...</p>'}
                </div>
            `).join('')}
        </div>
    `;
};

/**
 * Set up tab switching event listeners
 * @param {Function} onTabChange - Callback when tab changes with tab id
 * @returns {void}
 */
export const setupTabListeners = (onTabChange) => {
    const tabButtons = document.querySelectorAll('[data-tab]');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = button.getAttribute('data-tab');
            
            // Update active button styling
            tabButtons.forEach(btn => {
                const isActive = btn.getAttribute('data-tab') === tabId;
                btn.classList.toggle('border-indigo-500', isActive);
                btn.classList.toggle('text-indigo-600', isActive);
                btn.classList.toggle('border-transparent', !isActive);
                btn.classList.toggle('text-gray-500', !isActive);
                btn.setAttribute('aria-selected', isActive);
            });
            
            // Show/hide tab content
            const contentPanels = document.querySelectorAll('[data-tab-content]');
            contentPanels.forEach(panel => {
                const isActive = panel.getAttribute('data-tab-content') === tabId;
                panel.classList.toggle('hidden', !isActive);
                panel.classList.toggle('block', isActive);
            });
            
            // Call callback
            if (onTabChange) {
                onTabChange(tabId);
            }
        });
    });
};

/**
 * Render a simple button group
 * @param {Array<Object>} buttons - Array of button objects with {id, label, style (optional)}
 * @returns {string} HTML for button group
 */
export const renderButtonGroup = (buttons) => {
    return `
        <div class="flex gap-2">
            ${buttons.map(btn => `
                <button 
                    id="${btn.id}" 
                    class="px-4 py-2 rounded-md text-sm font-medium ${
                        btn.style || 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }">
                    ${btn.label}
                </button>
            `).join('')}
        </div>
    `;
};

export default {
    renderTabNav,
    renderTabContent,
    setupTabListeners,
    renderButtonGroup
};

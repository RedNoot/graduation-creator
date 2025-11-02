/**
 * Main Navigation Component Module
 * Hierarchical navigation bar with dropdown menus for graduation editor
 * Replaces the flat 7-tab layout with cleaner structure
 */

/**
 * Render main navigation bar with hierarchical menu structure
 * @param {string} activePage - Currently active page ID
 * @returns {string} HTML for main navigation bar
 * @example
 * renderMainNav('students'); // Highlights "Manage Content" parent and "Students" child
 */
export const renderMainNav = (activePage) => {
    // Define navigation structure
    const navStructure = [
        {
            id: 'home',
            label: 'Project Home',
            icon: '🏠',
            page: 'home'
        },
        {
            id: 'manage-content',
            label: 'Manage Content',
            icon: '📝',
            hasDropdown: true,
            children: [
                { id: 'students', label: 'Students', icon: '👥', page: 'students' },
                { id: 'content', label: 'Speeches & Messages', icon: '💬', page: 'content' }
            ]
        },
        {
            id: 'publishing',
            label: 'Publishing',
            icon: '🚀',
            hasDropdown: true,
            children: [
                { id: 'booklet', label: 'Booklet Generation', icon: '📄', page: 'booklet' },
                { id: 'share', label: 'Share Links', icon: '🔗', page: 'share' }
            ]
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: '⚙️',
            page: 'settings'
        }
    ];

    // Determine which parent is active based on activePage
    const getActiveParent = (page) => {
        for (const item of navStructure) {
            if (item.page === page) return item.id;
            if (item.children) {
                if (item.children.some(child => child.page === page)) {
                    return item.id;
                }
            }
        }
        return null;
    };

    const activeParent = getActiveParent(activePage);

    // Build navigation HTML
    return `
        <nav class="main-nav bg-white border-b border-gray-200 shadow-sm" role="navigation" aria-label="Main navigation">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                    <div class="flex items-center space-x-1">
                        ${navStructure.map(item => {
                            const isActive = item.id === activeParent;
                            const baseClass = `nav-item px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                isActive 
                                    ? 'text-indigo-600 bg-indigo-50' 
                                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                            }`;

                            if (item.hasDropdown) {
                                return `
                                    <div class="nav-dropdown-wrapper relative">
                                        <button 
                                            class="${baseClass} nav-dropdown-btn flex items-center gap-1"
                                            data-nav-id="${item.id}"
                                            aria-haspopup="true"
                                            aria-expanded="false">
                                            <span>${item.icon}</span>
                                            <span>${item.label}</span>
                                            <svg class="w-4 h-4 transition-transform dropdown-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </button>
                                        <div class="nav-dropdown-menu absolute left-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50 hidden" role="menu">
                                            ${item.children.map(child => {
                                                const isChildActive = child.page === activePage;
                                                return `
                                                    <button 
                                                        class="dropdown-item w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                                                            isChildActive 
                                                                ? 'text-indigo-600 bg-indigo-50 font-medium' 
                                                                : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                                                        }"
                                                        data-page="${child.page}"
                                                        role="menuitem">
                                                        <span>${child.icon}</span>
                                                        <span>${child.label}</span>
                                                    </button>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                `;
                            } else {
                                return `
                                    <button 
                                        class="${baseClass} nav-link"
                                        data-page="${item.page}">
                                        <span>${item.icon}</span>
                                        <span>${item.label}</span>
                                    </button>
                                `;
                            }
                        }).join('')}
                    </div>
                </div>
            </div>
        </nav>
    `;
};

/**
 * Set up navigation event listeners
 * Handles both direct navigation and dropdown interactions
 * @param {Function} onNavigate - Callback when navigation occurs with page id
 * @returns {void}
 */
export const setupMainNavListeners = (onNavigate) => {
    // Handle direct navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (onNavigate && page) {
                onNavigate(page);
            }
        });
    });

    // Handle dropdown menu items
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            if (onNavigate && page) {
                // Close dropdown
                const dropdown = item.closest('.nav-dropdown-menu');
                if (dropdown) {
                    dropdown.classList.add('hidden');
                    const button = dropdown.previousElementSibling;
                    if (button) {
                        button.setAttribute('aria-expanded', 'false');
                        const chevron = button.querySelector('.dropdown-chevron');
                        if (chevron) chevron.classList.remove('rotate-180');
                    }
                }
                onNavigate(page);
            }
        });
    });

    // Handle dropdown toggles
    const dropdownButtons = document.querySelectorAll('.nav-dropdown-btn');
    dropdownButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const dropdown = button.nextElementSibling;
            const isHidden = dropdown.classList.contains('hidden');
            
            // Close all other dropdowns first
            document.querySelectorAll('.nav-dropdown-menu').forEach(menu => {
                if (menu !== dropdown) {
                    menu.classList.add('hidden');
                    const otherButton = menu.previousElementSibling;
                    if (otherButton) {
                        otherButton.setAttribute('aria-expanded', 'false');
                        const chevron = otherButton.querySelector('.dropdown-chevron');
                        if (chevron) chevron.classList.remove('rotate-180');
                    }
                }
            });
            
            // Toggle current dropdown
            dropdown.classList.toggle('hidden', !isHidden);
            button.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
            
            // Rotate chevron
            const chevron = button.querySelector('.dropdown-chevron');
            if (chevron) {
                chevron.classList.toggle('rotate-180', isHidden);
            }
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-dropdown-wrapper')) {
            document.querySelectorAll('.nav-dropdown-menu').forEach(menu => {
                menu.classList.add('hidden');
                const button = menu.previousElementSibling;
                if (button) {
                    button.setAttribute('aria-expanded', 'false');
                    const chevron = button.querySelector('.dropdown-chevron');
                    if (chevron) chevron.classList.remove('rotate-180');
                }
            });
        }
    });

    // Close dropdowns on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.nav-dropdown-menu').forEach(menu => {
                menu.classList.add('hidden');
                const button = menu.previousElementSibling;
                if (button) {
                    button.setAttribute('aria-expanded', 'false');
                    const chevron = button.querySelector('.dropdown-chevron');
                    if (chevron) chevron.classList.remove('rotate-180');
                }
            });
        }
    });
};

/**
 * Get page ID from old tab ID for backwards compatibility
 * Maps old tab IDs to new page IDs
 * @param {string} tabId - Old tab identifier
 * @returns {string} New page identifier
 */
export const mapTabToPage = (tabId) => {
    const mapping = {
        'students': 'students',
        'content': 'content',
        'settings': 'settings',
        'share': 'share',
        'booklet': 'booklet',
        'home': 'home'
    };
    return mapping[tabId] || 'home';
};

export default {
    renderMainNav,
    setupMainNavListeners,
    mapTabToPage
};

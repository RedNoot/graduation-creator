/**
 * Form Components Module
 * Handles login, signup, and data entry forms
 */

/**
 * Render login/signup form page
 * @returns {string} HTML for login page
 */
export const renderLoginPage = () => {
    return `
        <div class="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div class="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Graduation Creator
                </h2>
                <p id="auth-subtitle" class="mt-2 text-center text-sm text-gray-600">
                    Sign in to continue
                </p>
            </div>

            <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form id="auth-form" class="space-y-6">
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
                            <div class="mt-1">
                                <input id="email" name="email" type="email" autocomplete="email" required class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            </div>
                        </div>
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                            <div class="mt-1">
                                <input id="password" name="password" type="password" autocomplete="current-password" required class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            </div>
                            <div id="password-hint" class="mt-1 text-xs text-gray-500 hidden">Password must be at least 6 characters long</div>
                        </div>
                        <div id="auth-error" class="text-red-500 text-sm hidden"></div>
                        <div class="flex items-center justify-between">
                            <button id="auth-submit-btn" type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                Sign in
                            </button>
                        </div>
                        <p class="mt-2 text-center text-sm text-gray-600">
                            <span id="toggle-text">Don't have an account?</span> <button type="button" id="toggle-auth-btn" class="font-medium text-indigo-600 hover:text-indigo-500">Create an account</button>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    `;
};

/**
 * Create new graduation form
 * @returns {string} HTML for graduation creation form
 */
export const renderNewGraduationForm = () => {
    return `
        <div class="space-y-6">
            <div>
                <h3 class="text-lg font-medium leading-6 text-gray-900">Create New Graduation Project</h3>
            </div>
            <form id="new-grad-form" class="space-y-6">
                <div>
                    <label for="grad-name" class="block text-sm font-medium text-gray-700">Graduation Name</label>
                    <input type="text" name="grad-name" id="grad-name" placeholder="e.g., Grade 6 Class of 2025" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                    <label for="grad-year" class="block text-sm font-medium text-gray-700">Graduation Year</label>
                    <input type="number" name="grad-year" id="grad-year" placeholder="2025" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                    <label for="grad-password" class="block text-sm font-medium text-gray-700">Student Access Password</label>
                    <input type="text" name="grad-password" id="grad-password" placeholder="Set a password for students to view" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    <p class="mt-1 text-xs text-gray-500">Students will use this password to access the public view</p>
                </div>
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Create Project
                    </button>
                    <button type="button" id="cancel-new-grad" class="flex-1 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    `;
};

/**
 * Render a text input field
 * @param {string} name - Input name/id
 * @param {string} label - Display label
 * @param {string} placeholder - Placeholder text
 * @param {string} value - Current value
 * @param {boolean} required - Whether field is required
 * @returns {string} HTML for input field
 */
export const renderInputField = (name, label, placeholder = '', value = '', required = false) => {
    return `
        <div>
            <label for="${name}" class="block text-sm font-medium text-gray-700">${label}</label>
            <input 
                type="text" 
                name="${name}" 
                id="${name}" 
                placeholder="${placeholder}"
                value="${value}"
                ${required ? 'required' : ''}
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        </div>
    `;
};

/**
 * Render a text area field
 * @param {string} name - Textarea name/id
 * @param {string} label - Display label
 * @param {string} placeholder - Placeholder text
 * @param {string} value - Current value
 * @param {number} rows - Number of rows
 * @returns {string} HTML for textarea field
 */
export const renderTextareaField = (name, label, placeholder = '', value = '', rows = 4) => {
    return `
        <div>
            <label for="${name}" class="block text-sm font-medium text-gray-700">${label}</label>
            <textarea 
                name="${name}" 
                id="${name}" 
                placeholder="${placeholder}"
                rows="${rows}"
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">${value}</textarea>
        </div>
    `;
};

/**
 * Render a checkbox field
 * @param {string} name - Checkbox name/id
 * @param {string} label - Display label
 * @param {boolean} checked - Whether checkbox is checked
 * @returns {string} HTML for checkbox field
 */
export const renderCheckboxField = (name, label, checked = false) => {
    return `
        <div class="flex items-center">
            <input 
                type="checkbox" 
                name="${name}" 
                id="${name}"
                ${checked ? 'checked' : ''}
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
            <label for="${name}" class="ml-2 block text-sm text-gray-700">${label}</label>
        </div>
    `;
};

export default {
    renderLoginPage,
    renderNewGraduationForm,
    renderInputField,
    renderTextareaField,
    renderCheckboxField
};

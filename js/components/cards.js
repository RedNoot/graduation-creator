/**
 * Card and List Components Module
 * Handles student cards, content cards, and list rendering
 */

/**
 * Render a student card
 * @param {Object} student - Student object with {id, name, profilePdfUrl}
 * @param {string} graduationId - The graduation ID
 * @param {Object} options - Options for card rendering
 * @returns {string} HTML for student card
 */
export const renderStudentCard = (student, graduationId, options = {}) => {
    const { 
        showDeleteBtn = true,
        showUploadBtn = true,
        showDownloadBtn = true
    } = options;
    
    return `
        <div class="vct-card-glass p-4">
            <div class="flex gap-3 items-start">
                <!-- Student Photo -->
                <div class="flex-shrink-0">
                    ${student.profilePhotoUrl ? `
                        <img src="${student.profilePhotoUrl}" 
                             alt="${student.name}" 
                             class="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
                             onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center" style="display: none;">
                            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        </div>
                    ` : `
                        <div class="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        </div>
                    `}
                </div>
                
                <!-- Student Info -->
                <div class="flex-1">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h4 class="font-semibold text-gray-900">${student.name}</h4>
                            <p class="text-xs text-gray-500 mt-1">
                                ${student.profilePdfUrl ? '✓ PDF' : '○ No PDF'} 
                                ${student.profilePhotoUrl ? ' | ✓ Photo' : ' | ○ No Photo'}
                            </p>
                        </div>
                        ${student.profilePdfUrl ? 
                            `<div class="text-green-600 text-lg">✓</div>` 
                            : `<div class="text-gray-300 text-lg">○</div>`
                        }
                    </div>
                </div>
            </div>
            
            <div class="mt-3 flex flex-wrap gap-2">
                ${showUploadBtn ? `
                    <button 
                        onclick="window.uploadPhotoForStudentWrapper('${student.id}', '${student.name}')"
                        class="vct-button-glass-sm bg-green-100 text-green-700"
                        title="Upload profile photo">
                        📸 Photo
                    </button>
                    <button 
                        onclick="window.uploadPdfForStudentWrapper('${student.id}', '${student.name}')"
                        class="vct-button-glass-sm bg-indigo-100 text-indigo-700"
                        title="Upload PDF profile">
                        📄 PDF
                    </button>
                ` : ''}
                
                ${showDownloadBtn && student.profilePdfUrl ? `
                    <button 
                        onclick="window.viewStudentPdf('${student.profilePdfUrl}', '${student.name}')"
                        class="vct-button-glass-sm bg-blue-100 text-blue-700">
                        View PDF
                    </button>
                ` : ''}
                
                ${showDeleteBtn ? `
                    <button 
                        onclick="window.removePdfForStudent('${student.id}', '${student.name}', '${graduationId}')"
                        class="vct-button-glass-sm bg-red-100 text-red-700">
                        Delete
                    </button>
                ` : ''}
            </div>
        </div>
    `;
};

/**
 * Render a grid of student cards
 * @param {Array<Object>} students - Array of student objects
 * @param {string} graduationId - The graduation ID
 * @param {Object} options - Rendering options
 * @returns {string} HTML for student grid
 */
export const renderStudentGrid = (students, graduationId, options = {}) => {
    if (!students || students.length === 0) {
        return `
            <div class="text-center py-8">
                <p class="text-gray-500">No students yet. Add students to get started!</p>
            </div>
        `;
    }
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${students.map(student => renderStudentCard(student, graduationId, options)).join('')}
        </div>
    `;
};

/**
 * Render a content card (message, speech, etc.)
 * @param {Object} content - Content object with {id, type, title, author, text}
 * @param {Object} options - Options for card rendering
 * @returns {string} HTML for content card
 */
export const renderContentCard = (content, options = {}) => {
    const { 
        showEditBtn = true,
        showDeleteBtn = true,
        maxCharacters = 150
    } = options;
    
    const preview = content.text ? content.text.substring(0, maxCharacters) + (content.text.length > maxCharacters ? '...' : '') : '';
    const typeColor = {
        message: 'bg-blue-100 text-blue-800',
        speech: 'bg-purple-100 text-purple-800',
        poem: 'bg-pink-100 text-pink-800',
        quote: 'bg-yellow-100 text-yellow-800'
    }[content.type] || 'bg-gray-100 text-gray-800';
    
    return `
        <div class="vct-card-glass p-4">
            <div class="flex justify-between items-start gap-2">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="px-2 py-1 text-xs font-semibold rounded ${typeColor}">
                            ${content.type.charAt(0).toUpperCase() + content.type.slice(1)}
                        </span>
                    </div>
                    <h4 class="font-semibold text-gray-900">${content.title}</h4>
                    ${content.author ? `<p class="text-xs text-gray-600 mt-1">by ${content.author}</p>` : ''}
                    <p class="text-sm text-gray-600 mt-2">${preview}</p>
                </div>
            </div>
            
            <div class="mt-3 flex flex-wrap gap-2">
                ${showEditBtn ? `
                    <button 
                        onclick="window.editContentPage('${content.id}')"
                        class="vct-button-glass-sm bg-blue-100 text-blue-700">
                        Edit
                    </button>
                ` : ''}
                
                ${showDeleteBtn ? `
                    <button 
                        onclick="window.deleteContentPage('${content.id}')"
                        class="vct-button-glass-sm bg-red-100 text-red-700">
                        Delete
                    </button>
                ` : ''}
            </div>
        </div>
    `;
};

/**
 * Render a list of content items
 * @param {Array<Object>} contentItems - Array of content objects
 * @param {Object} options - Rendering options
 * @returns {string} HTML for content list
 */
export const renderContentList = (contentItems, options = {}) => {
    if (!contentItems || contentItems.length === 0) {
        return `
            <div class="text-center py-8">
                <p class="text-gray-500">No content yet. Add messages or speeches to get started!</p>
            </div>
        `;
    }
    
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${contentItems.map(item => renderContentCard(item, options)).join('')}
        </div>
    `;
};

/**
 * Render a simple list item
 * @param {string} text - List item text
 * @param {Object} options - Options with {icon, className}
 * @returns {string} HTML for list item
 */
export const renderListItem = (text, options = {}) => {
    const { icon = '', className = '' } = options;
    
    return `
        <li class="py-2 flex items-center gap-2 ${className}">
            ${icon ? `<span class="text-lg">${icon}</span>` : ''}
            <span>${text}</span>
        </li>
    `;
};

/**
 * Render an unordered list
 * @param {Array<string>} items - List items
 * @param {Object} options - Rendering options
 * @returns {string} HTML for list
 */
export const renderList = (items, options = {}) => {
    if (!items || items.length === 0) {
        return '<p class="text-gray-500">No items</p>';
    }
    
    return `
        <ul class="space-y-1">
            ${items.map(item => renderListItem(item, options)).join('')}
        </ul>
    `;
};

export default {
    renderStudentCard,
    renderStudentGrid,
    renderContentCard,
    renderContentList,
    renderListItem,
    renderList
};

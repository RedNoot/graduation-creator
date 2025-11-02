/**
 * Contrast Checker Component
 * Real-time WCAG contrast compliance checker for theme settings
 */

import { getContrastRatio, getWCAGLevel, meetsWCAG } from '../utils/accessibility.js';

/**
 * Create and render contrast checker UI
 * @param {string} containerId - ID of container to render checker in
 * @returns {Object} Controller object with update method
 */
export function createContrastChecker(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return null;
    }
    
    // Create checker HTML
    container.innerHTML = `
        <div class="bg-white border-2 border-gray-200 rounded-lg p-4 mt-4">
            <div class="flex items-center justify-between mb-3">
                <h6 class="text-sm font-semibold text-gray-900">Contrast Checker</h6>
                <span class="px-2 py-1 text-xs font-semibold rounded bg-indigo-100 text-indigo-800">WCAG 2.1</span>
            </div>
            
            <!-- Primary on Background -->
            <div class="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-medium text-gray-700">Primary Text on Background</span>
                    <span id="contrast-badge-1" class="px-2 py-1 text-xs font-semibold rounded">-</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-600">Ratio: <span id="contrast-ratio-1" class="font-mono font-bold">-</span></span>
                    <div class="flex gap-2">
                        <span id="contrast-aa-1" class="text-gray-400">AA: -</span>
                        <span id="contrast-aaa-1" class="text-gray-400">AAA: -</span>
                    </div>
                </div>
                <!-- Preview -->
                <div id="contrast-preview-1" class="mt-2 p-2 rounded text-sm font-medium text-center">
                    Sample Text
                </div>
            </div>
            
            <!-- Secondary on Background -->
            <div class="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-medium text-gray-700">Secondary Text on Background</span>
                    <span id="contrast-badge-2" class="px-2 py-1 text-xs font-semibold rounded">-</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-600">Ratio: <span id="contrast-ratio-2" class="font-mono font-bold">-</span></span>
                    <div class="flex gap-2">
                        <span id="contrast-aa-2" class="text-gray-400">AA: -</span>
                        <span id="contrast-aaa-2" class="text-gray-400">AAA: -</span>
                    </div>
                </div>
                <!-- Preview -->
                <div id="contrast-preview-2" class="mt-2 p-2 rounded text-sm text-center">
                    Sample Text
                </div>
            </div>
            
            <!-- Primary on Secondary -->
            <div class="p-3 bg-gray-50 rounded border border-gray-200">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-medium text-gray-700">Primary on Secondary (Buttons)</span>
                    <span id="contrast-badge-3" class="px-2 py-1 text-xs font-semibold rounded">-</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-600">Ratio: <span id="contrast-ratio-3" class="font-mono font-bold">-</span></span>
                    <div class="flex gap-2">
                        <span id="contrast-aa-3" class="text-gray-400">AA: -</span>
                        <span id="contrast-aaa-3" class="text-gray-400">AAA: -</span>
                    </div>
                </div>
                <!-- Preview -->
                <div id="contrast-preview-3" class="mt-2 p-2 rounded text-sm font-medium text-center">
                    Button Text
                </div>
            </div>
            
            <!-- Information -->
            <div class="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <p class="text-blue-800">
                    <strong>WCAG AA:</strong> Minimum standard (4.5:1 normal, 3:1 large text)<br>
                    <strong>WCAG AAA:</strong> Enhanced standard (7:1 normal, 4.5:1 large text)
                </p>
            </div>
        </div>
    `;
    
    /**
     * Update contrast checker with new colors
     * @param {string} primaryColor - Primary color hex
     * @param {string} secondaryColor - Secondary color hex
     * @param {string} backgroundColor - Background color hex
     */
    function update(primaryColor, secondaryColor, backgroundColor) {
        // Calculate ratios
        const ratio1 = getContrastRatio(primaryColor, backgroundColor);
        const ratio2 = getContrastRatio(secondaryColor, backgroundColor);
        const ratio3 = getContrastRatio(primaryColor, secondaryColor);
        
        // Update displays
        updateContrastDisplay(1, ratio1, primaryColor, backgroundColor);
        updateContrastDisplay(2, ratio2, secondaryColor, backgroundColor);
        updateContrastDisplay(3, ratio3, primaryColor, secondaryColor);
    }
    
    /**
     * Update a single contrast display
     * @param {number} index - Display index (1-3)
     * @param {number} ratio - Contrast ratio
     * @param {string} foreground - Foreground color
     * @param {string} background - Background color
     */
    function updateContrastDisplay(index, ratio, foreground, background) {
        const level = getWCAGLevel(ratio, false);
        const passAA = meetsWCAG(ratio, 'AA', false);
        const passAAA = meetsWCAG(ratio, 'AAA', false);
        
        // Update ratio
        document.getElementById(`contrast-ratio-${index}`).textContent = ratio.toFixed(2);
        
        // Update badge
        const badge = document.getElementById(`contrast-badge-${index}`);
        if (level === 'AAA') {
            badge.className = 'px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800';
            badge.textContent = '✓ AAA';
        } else if (level === 'AA') {
            badge.className = 'px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800';
            badge.textContent = '✓ AA';
        } else {
            badge.className = 'px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800';
            badge.textContent = '✗ Fail';
        }
        
        // Update AA/AAA indicators
        const aaIndicator = document.getElementById(`contrast-aa-${index}`);
        aaIndicator.className = passAA ? 'text-green-600 font-semibold' : 'text-red-600';
        aaIndicator.textContent = passAA ? 'AA: ✓' : 'AA: ✗';
        
        const aaaIndicator = document.getElementById(`contrast-aaa-${index}`);
        aaaIndicator.className = passAAA ? 'text-green-600 font-semibold' : 'text-gray-400';
        aaaIndicator.textContent = passAAA ? 'AAA: ✓' : 'AAA: ✗';
        
        // Update preview
        const preview = document.getElementById(`contrast-preview-${index}`);
        preview.style.color = foreground;
        preview.style.backgroundColor = background;
        preview.style.border = `1px solid ${ratio < 3 ? '#EF4444' : '#D1D5DB'}`;
    }
    
    return {
        update
    };
}

/**
 * Setup automatic contrast checking on color inputs
 * @param {string} primaryInputId - ID of primary color input
 * @param {string} secondaryInputId - ID of secondary color input
 * @param {string} backgroundInputId - ID of background color input
 * @param {string} containerId - ID of contrast checker container
 */
export function setupContrastChecker(primaryInputId, secondaryInputId, backgroundInputId, containerId) {
    const primaryInput = document.getElementById(primaryInputId);
    const secondaryInput = document.getElementById(secondaryInputId);
    const backgroundInput = document.getElementById(backgroundInputId);
    
    if (!primaryInput || !secondaryInput || !backgroundInput) {
        console.error('Color inputs not found');
        return null;
    }
    
    // Create checker
    const checker = createContrastChecker(containerId);
    if (!checker) return null;
    
    // Initial update
    checker.update(
        primaryInput.value,
        secondaryInput.value,
        backgroundInput.value
    );
    
    // Listen for changes
    const updateChecker = () => {
        checker.update(
            primaryInput.value,
            secondaryInput.value,
            backgroundInput.value
        );
    };
    
    primaryInput.addEventListener('input', updateChecker);
    secondaryInput.addEventListener('input', updateChecker);
    backgroundInput.addEventListener('input', updateChecker);
    
    return checker;
}

export default {
    createContrastChecker,
    setupContrastChecker
};

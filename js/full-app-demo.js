/**
 * Graduation Creator - Full App Demo JavaScript
 * Handles navigation, modals, confetti effects, and interactions
 */

// =============================================================================
// PAGE NAVIGATION
// =============================================================================

const navLinks = document.querySelectorAll('.nav-link');
const pageContents = document.querySelectorAll('.page-content');

// Handle navigation clicks
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        const targetPage = link.dataset.page;
        
        // Update active nav link
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Show target page
        pageContents.forEach(page => page.classList.remove('active'));
        document.getElementById(`page-${targetPage}`).classList.add('active');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// Handle quick action navigation
document.querySelectorAll('.quick-action-button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetPage = btn.dataset.page;
        const targetLink = document.querySelector(`.nav-link[data-page="${targetPage}"]`);
        if (targetLink) {
            targetLink.click();
        }
    });
});

// =============================================================================
// CONFETTI EFFECTS
// =============================================================================

function createConfetti() {
    const colors = ['#7C3AED', '#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
    const confettiCount = 100;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        confetti.style.opacity = '1';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '9999';
        confetti.style.animation = `confettiFall ${2 + Math.random() * 2}s linear forwards`;
        confetti.style.animationDelay = Math.random() * 0.3 + 's';
        
        document.body.appendChild(confetti);
        
        // Remove after animation
        setTimeout(() => {
            confetti.remove();
        }, 4500);
    }
}

function showSuccessToast(title, message) {
    const toast = document.getElementById('successToast');
    const toastTitle = toast.querySelector('.toast-title');
    const toastMessage = toast.querySelector('.toast-message');
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    toast.classList.remove('toast-hidden');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('toast-hidden');
    }, 3000);
}

// =============================================================================
// BOOKLET GENERATION WITH CONFETTI
// =============================================================================

const generateBookletBtn = document.getElementById('generateBookletBtn');
const generateFinalBookletBtn = document.getElementById('generateFinalBookletBtn');

if (generateBookletBtn) {
    generateBookletBtn.addEventListener('click', () => {
        // Simulate booklet generation
        generateBookletBtn.innerHTML = `
            <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
        `;
        generateBookletBtn.disabled = true;
        
        setTimeout(() => {
            // Success!
            createConfetti();
            showSuccessToast('Booklet Generated! 🎉', 'Your graduation booklet is ready to download');
            
            generateBookletBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Download Complete Booklet
            `;
            generateBookletBtn.disabled = false;
        }, 2000);
    });
}

if (generateFinalBookletBtn) {
    generateFinalBookletBtn.addEventListener('click', () => {
        // Simulate booklet generation
        generateFinalBookletBtn.innerHTML = `
            <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating Booklet...
        `;
        generateFinalBookletBtn.disabled = true;
        
        setTimeout(() => {
            // Success!
            createConfetti();
            showSuccessToast('Booklet Complete! 🎊', '62 student profiles combined successfully');
            
            generateFinalBookletBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Download Booklet
            `;
            generateFinalBookletBtn.disabled = false;
        }, 2500);
    });
}

// =============================================================================
// IMPORT STUDENTS WITH CONFETTI
// =============================================================================

const importStudentsBtn = document.getElementById('importStudentsBtn');

if (importStudentsBtn) {
    importStudentsBtn.addEventListener('click', () => {
        // Simulate file picker and import
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                // Simulate import process
                showSuccessToast('Importing Students...', 'Processing CSV file');
                
                setTimeout(() => {
                    createConfetti();
                    showSuccessToast('Import Complete! 🎉', '15 students successfully imported');
                }, 1500);
            }
        });
        
        fileInput.click();
    });
}

// =============================================================================
// ADD STUDENT MODAL
// =============================================================================

const addStudentBtn = document.getElementById('addStudentBtn');
const addStudentModal = document.getElementById('addStudentModal');
const closeAddStudentModal = document.getElementById('closeAddStudentModal');
const cancelAddStudent = document.getElementById('cancelAddStudent');
const confirmAddStudent = document.getElementById('confirmAddStudent');

if (addStudentBtn && addStudentModal) {
    addStudentBtn.addEventListener('click', () => {
        addStudentModal.classList.add('active');
    });
}

if (closeAddStudentModal) {
    closeAddStudentModal.addEventListener('click', () => {
        addStudentModal.classList.remove('active');
    });
}

if (cancelAddStudent) {
    cancelAddStudent.addEventListener('click', () => {
        addStudentModal.classList.remove('active');
    });
}

if (confirmAddStudent) {
    confirmAddStudent.addEventListener('click', () => {
        // Simulate adding student
        addStudentModal.classList.remove('active');
        
        setTimeout(() => {
            createConfetti();
            showSuccessToast('Student Added! ✨', 'New student profile created successfully');
        }, 300);
    });
}

// Close modal on overlay click
if (addStudentModal) {
    addStudentModal.addEventListener('click', (e) => {
        if (e.target === addStudentModal) {
            addStudentModal.classList.remove('active');
        }
    });
}

// =============================================================================
// SAVE SETTINGS WITH SUCCESS FEEDBACK
// =============================================================================

const saveSettingsBtn = document.getElementById('saveSettingsBtn');

if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
        // Simulate saving
        saveSettingsBtn.innerHTML = `
            <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
        `;
        saveSettingsBtn.disabled = true;
        
        setTimeout(() => {
            createConfetti();
            showSuccessToast('Settings Saved! ✓', 'All changes have been applied');
            
            saveSettingsBtn.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Saved Successfully
            `;
            
            setTimeout(() => {
                saveSettingsBtn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Save All Changes
                `;
                saveSettingsBtn.disabled = false;
            }, 2000);
        }, 1000);
    });
}

// =============================================================================
// COLOR PICKER INTERACTION
// =============================================================================

document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
    });
});

// =============================================================================
// URL COPY TO CLIPBOARD
// =============================================================================

document.querySelectorAll('.url-display .glass-button-icon').forEach(btn => {
    btn.addEventListener('click', () => {
        const urlText = btn.previousElementSibling.textContent;
        navigator.clipboard.writeText(urlText).then(() => {
            showSuccessToast('Copied! 📋', 'URL copied to clipboard');
        });
    });
});

// =============================================================================
// GRADIENT BUTTON HOVER EFFECTS
// =============================================================================

document.querySelectorAll('.gradient-button').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        btn.style.setProperty('--mouse-x', `${x}px`);
        btn.style.setProperty('--mouse-y', `${y}px`);
    });
});

// =============================================================================
// WELCOME CONFETTI ON PAGE LOAD
// =============================================================================

window.addEventListener('load', () => {
    console.log('🎓 Graduation Creator - Full App Demo Loaded');
    console.log('✨ Vibrant Compact Theme Active');
    console.log('🔮 Glassmorphism Enabled');
    console.log('🌊 Animated Gradients Enabled');
    console.log('🎉 Confetti Effects Ready');
    
    // Optional: Show welcome confetti
    // setTimeout(() => {
    //     createConfetti();
    //     showSuccessToast('Welcome! 🎉', 'Full app demo loaded successfully');
    // }, 500);
});

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + 1-4 for quick navigation
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const pages = ['home', 'students', 'booklet', 'settings'];
        const pageIndex = parseInt(e.key) - 1;
        const targetLink = document.querySelector(`.nav-link[data-page="${pages[pageIndex]}"]`);
        if (targetLink) {
            targetLink.click();
        }
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        if (addStudentModal && addStudentModal.classList.contains('active')) {
            addStudentModal.classList.remove('active');
        }
    }
});

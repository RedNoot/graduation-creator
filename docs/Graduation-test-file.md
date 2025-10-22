i<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grade 6 Graduation Website Creator</title>
    
    <!-- Security Headers -->
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="X-XSS-Protection" content="1; mode=block">
    <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://res.cloudinary.com; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://api.cloudinary.com /.netlify/functions/">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        .spinner {
            border-top-color: transparent;
            border-right-color: transparent;
            animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-gray-50 text-gray-800">

    <div id="app" class="min-h-screen">
        <!-- Main application content will be rendered here -->
    </div>

    <!-- Firebase SDKs -->
    <script type="module">
        // Import Firebase modules
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { 
            getAuth, 
            onAuthStateChanged, 
            createUserWithEmailAndPassword, 
            signInWithEmailAndPassword, 
            signOut 
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { 
            getFirestore, 
            collection, 
            addDoc, 
            doc, 
            getDoc, 
            setDoc,
            query, 
            where, 
            getDocs,
            onSnapshot,
            updateDoc
        } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // --- CONFIGURATION ---
        // Environment-based configuration
        const getConfig = () => {
            // In production, these would be set via build-time environment variables
            // For development, you can set them directly here or use a build process
            return {
                firebase: {
                    apiKey: "AIzaSyDH7bp9-HnNefk27NLaOq1gx5VF4Onenqg",
                    authDomain: "graduation-creator.firebaseapp.com",
                    projectId: "graduation-creator",
                    storageBucket: "graduation-creator.firebasestorage.app",
                    messagingSenderId: "215273409051",
                    appId: "1:215273409051:web:73e80f9c6057fd7d6686be"
                },
                cloudinary: {
                    cloudName: "dkm3avvjl", // Replace with your Cloudinary cloud name
                    uploadPreset: "Graduation-Uploads" // Replace with your upload preset
                },
                isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            };
        };

        const config = getConfig();
        const firebaseConfig = config.firebase;
        
        // --- CLOUDINARY CONFIGURATION ---
        const CLOUDINARY_CLOUD_NAME = config.cloudinary.cloudName;
        const CLOUDINARY_UPLOAD_PRESET = config.cloudinary.uploadPreset;
        const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        const appContainer = document.getElementById('app');
        let currentUser = null;
        let currentGraduationListener = null;

        // --- UTILITY & HELPER FUNCTIONS ---
        
        // Secure password operations are now handled server-side
        // This function calls the serverless function for password verification
        const verifyStudentPassword = async (graduationId, studentId, password) => {
            try {
                const response = await fetch('/.netlify/functions/secure-operations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'verifyPassword',
                        graduationId,
                        studentId,
                        passwordToVerify: password,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }

                const result = await response.json();
                return result.isValid;
            } catch (error) {
                console.error('Password verification error:', error);
                throw new Error('Failed to verify password. Please try again.');
            }
        };

        // Input sanitization function
        const sanitizeInput = (input, type = 'text') => {
            if (!input || typeof input !== 'string') return '';
            
            switch (type) {
                case 'name':
                    // Allow letters, spaces, hyphens, apostrophes, and periods
                    return input.replace(/[^a-zA-Z\s\-'\.]/g, '').trim().substring(0, 100);
                case 'text':
                    // Remove HTML tags and limit length
                    return input.replace(/<[^>]*>/g, '').trim().substring(0, 1000);
                case 'email':
                    // Basic email sanitization
                    return input.toLowerCase().trim().substring(0, 254);
                default:
                    return input.replace(/<[^>]*>/g, '').trim();
            }
        };

        // Rate limiting helper (client-side basic implementation)
        const rateLimiter = {
            attempts: new Map(),
            
            isAllowed(key, maxAttempts = 5, windowMs = 60000) {
                const now = Date.now();
                const attempts = this.attempts.get(key) || [];
                
                // Remove old attempts outside the window
                const validAttempts = attempts.filter(time => now - time < windowMs);
                
                if (validAttempts.length >= maxAttempts) {
                    return false;
                }
                
                validAttempts.push(now);
                this.attempts.set(key, validAttempts);
                return true;
            },
            
            reset(key) {
                this.attempts.delete(key);
            }
        };
        
        const uploadFile = async (file) => {
            // Comprehensive file validation
            if (!file) {
                throw new Error('No file provided for upload');
            }

            // Check file size (limit to 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                throw new Error('File size too large. Please keep files under 10MB.');
            }

            // Check file type and validate file extension
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
            
            if (!allowedTypes.includes(file.type)) {
                throw new Error('Invalid file type. Please upload PDF, JPEG, or PNG files only.');
            }

            // Additional security: check file extension
            const fileName = file.name.toLowerCase();
            const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
            if (!hasValidExtension) {
                throw new Error('Invalid file extension. Please use .pdf, .jpg, .jpeg, or .png files.');
            }

            // Security: Validate file name
            const sanitizedFileName = fileName.replace(/[^a-z0-9._-]/g, '');
            if (sanitizedFileName.length === 0) {
                throw new Error('Invalid file name. Please use alphanumeric characters only.');
            }

            // Check for potentially malicious file patterns
            if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
                throw new Error('Invalid file name pattern detected.');
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            try {
                const response = await fetch(CLOUDINARY_URL, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    if (response.status === 400) {
                        throw new Error('Upload failed: Invalid file or configuration');
                    } else if (response.status === 413) {
                        throw new Error('File too large for upload');
                    } else if (response.status === 429) {
                        throw new Error('Too many upload requests. Please wait and try again.');
                    } else if (response.status >= 500) {
                        throw new Error('Upload service temporarily unavailable');
                    } else {
                        throw new Error(`Upload failed with status: ${response.status}`);
                    }
                }

                const data = await response.json();
                
                if (data.error) {
                    throw new Error(`Upload error: ${data.error.message}`);
                }

                if (data.secure_url) {
                    // Additional security: validate returned URL
                    if (!data.secure_url.startsWith('https://')) {
                        throw new Error('Invalid upload response - insecure URL');
                    }
                    return data.secure_url;
                } else {
                    throw new Error('File upload failed - no URL returned');
                }
                
            } catch (error) {
                console.error("Cloudinary upload error:", error);
                
                // Re-throw with user-friendly message
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    throw new Error('Network error during upload. Please check your connection.');
                } else if (error.message.includes('Upload failed') || error.message.includes('File')) {
                    throw error; // Already user-friendly
                } else {
                    throw new Error('Upload failed. Please try again.');
                }
            }
        };

        // --- PDF GENERATION (SERVER-SIDE) ---
        // Updated implementation that calls the Netlify serverless function
        // This replaces the problematic client-side PDF merging
        const generateBooklet = async (graduationId) => {
            showModal('Processing...', 'Generating PDF booklet. This may take a moment...', false);
            
            try {
                // Call the Netlify serverless function
                const functionUrl = config.isDevelopment 
                    ? '/.netlify/functions/generate-booklet'  // Local development
                    : '/.netlify/functions/generate-booklet'; // Production
                
                const response = await fetch(functionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        graduationId: graduationId
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Server error: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.success) {
                    // Update the local state with the new booklet URL
                    showModal(
                        'Success!', 
                        `PDF booklet generated successfully! Contains ${result.pageCount} pages from ${result.studentCount} students. You can download it from the Booklet tab.`
                    );
                    
                    // Reload the booklet tab to show the new download link
                    if (document.querySelector('[data-tab="booklet"].active')) {
                        const graduationDoc = await getDoc(doc(db, "graduations", graduationId));
                        if (graduationDoc.exists()) {
                            renderBookletTab(graduationId, graduationDoc.data());
                        }
                    }
                } else {
                    throw new Error(result.message || 'PDF generation failed');
                }

            } catch (error) {
                console.error("PDF Generation Error:", error);
                
                let errorMessage = 'Could not generate PDF booklet. ';
                
                if (error.message.includes('No student PDFs found')) {
                    errorMessage += 'Make sure students have uploaded their PDF profiles first.';
                } else if (error.message.includes('Network')) {
                    errorMessage += 'Please check your internet connection and try again.';
                } else if (error.message.includes('Server error: 5')) {
                    errorMessage += 'The server is experiencing issues. Please try again in a few minutes.';
                } else {
                    errorMessage += 'This might be due to a server issue or network problem.';
                }
                
                showModal('Error', errorMessage);
            }
        };


        // --- UI RENDERING FUNCTIONS ---
        
        const renderHeader = (pageTitle = "Dashboard") => {
            return `
                <header class="bg-white shadow-sm">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <h1 class="text-2xl font-bold text-gray-900">${pageTitle}</h1>
                        ${currentUser ? `<button id="logout-btn" class="text-sm font-medium text-indigo-600 hover:text-indigo-500">Logout</button>` : ''}
                    </div>
                </header>
            `;
        };
        
        const renderLoading = () => {
             appContainer.innerHTML = `
                <div class="min-h-screen flex items-center justify-center">
                    <div class="spinner w-12 h-12 border-4 border-indigo-600 rounded-full"></div>
                </div>
            `;
        };

        const renderLoginPage = () => {
            appContainer.innerHTML = `
                <div class="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                    <div class="sm:mx-auto sm:w-full sm:max-w-md">
                        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Graduation Creator
                        </h2>
                        <p class="mt-2 text-center text-sm text-gray-600">
                            Sign in or create an account to continue
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
                                </div>
                                <div id="auth-error" class="text-red-500 text-sm hidden"></div>
                                <div class="flex items-center justify-between">
                                    <button id="login-btn" type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                        Sign in
                                    </button>
                                </div>
                                 <p class="mt-2 text-center text-sm text-gray-600">
                                    Or <button type="button" id="signup-btn" class="font-medium text-indigo-600 hover:text-indigo-500">create an account</button>
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            // Event Listeners
            document.getElementById('login-btn').addEventListener('click', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;
                
                // Basic validation
                if (!email || !password) {
                    document.getElementById('auth-error').textContent = 'Please enter both email and password.';
                    document.getElementById('auth-error').classList.remove('hidden');
                    return;
                }
                
                try {
                    await signInWithEmailAndPassword(auth, email, password);
                    // Success - auth state change will trigger redirect
                } catch (error) {
                    let errorMessage = 'Login failed. ';
                    
                    switch (error.code) {
                        case 'auth/user-not-found':
                            errorMessage += 'No account found with this email address.';
                            break;
                        case 'auth/wrong-password':
                            errorMessage += 'Incorrect password.';
                            break;
                        case 'auth/invalid-email':
                            errorMessage += 'Please enter a valid email address.';
                            break;
                        case 'auth/too-many-requests':
                            errorMessage += 'Too many failed attempts. Please try again later.';
                            break;
                        case 'auth/network-request-failed':
                            errorMessage += 'Network error. Please check your connection.';
                            break;
                        default:
                            errorMessage += 'Please check your email and password.';
                    }
                    
                    document.getElementById('auth-error').textContent = errorMessage;
                    document.getElementById('auth-error').classList.remove('hidden');
                }
            });
            document.getElementById('signup-btn').addEventListener('click', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;
                
                // Basic validation
                if (!email || !password) {
                    document.getElementById('auth-error').textContent = 'Please enter both email and password.';
                    document.getElementById('auth-error').classList.remove('hidden');
                    return;
                }
                
                if (password.length < 6) {
                    document.getElementById('auth-error').textContent = 'Password must be at least 6 characters long.';
                    document.getElementById('auth-error').classList.remove('hidden');
                    return;
                }
                
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    // Success - auth state change will trigger redirect
                } catch (error) {
                    let errorMessage = 'Account creation failed. ';
                    
                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage += 'An account with this email already exists.';
                            break;
                        case 'auth/invalid-email':
                            errorMessage += 'Please enter a valid email address.';
                            break;
                        case 'auth/weak-password':
                            errorMessage += 'Password is too weak. Use at least 6 characters.';
                            break;
                        case 'auth/network-request-failed':
                            errorMessage += 'Network error. Please check your connection.';
                            break;
                        default:
                            errorMessage += 'Please try again with different credentials.';
                    }
                    
                    document.getElementById('auth-error').textContent = errorMessage;
                    document.getElementById('auth-error').classList.remove('hidden');
                }
            });
        };
        
        const renderDashboard = async () => {
            const header = renderHeader("Your Graduations");
            let mainContent = `
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-semibold">Your Projects</h2>
                        <button id="create-new-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Create New Graduation</button>
                    </div>
                    <div id="graduations-list" class="bg-white shadow overflow-hidden sm:rounded-md">
                        <div class="p-8 text-center text-gray-500">Loading projects...</div>
                    </div>
                </div>
            `;
            appContainer.innerHTML = header + `<main>${mainContent}</main>`;

            document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
            document.getElementById('create-new-btn').addEventListener('click', () => {
                 window.location.hash = '#/new';
            });

            // Fetch and display graduations
            const q = query(collection(db, "graduations"), where("ownerUid", "==", currentUser.uid));
            const querySnapshot = await getDocs(q);
            const listContainer = document.getElementById('graduations-list');
            if (querySnapshot.empty) {
                listContainer.innerHTML = `<div class="p-8 text-center text-gray-500">You haven't created any graduation websites yet.</div>`;
            } else {
                let html = '<ul>';
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    html += `
                        <li class="border-t border-gray-200">
                            <a href="#/edit/${doc.id}" class="block hover:bg-gray-50">
                                <div class="px-4 py-4 sm:px-6">
                                    <div class="flex items-center justify-between">
                                        <p class="text-lg font-medium text-indigo-600 truncate">${data.schoolName || 'Untitled Project'}</p>
                                        <p class="ml-2 flex-shrink-0 text-sm text-gray-500">${data.graduationYear || ''}</p>
                                    </div>
                                </div>
                            </a>
                        </li>
                    `;
                });
                html += '</ul>';
                listContainer.innerHTML = html;
            }
        };

        const renderNewGraduationForm = () => {
             const header = renderHeader("Create New Graduation");
             let mainContent = `
                <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div class="bg-white p-8 rounded-lg shadow">
                         <form id="new-grad-form">
                            <div class="space-y-6">
                                <div>
                                    <label for="schoolName" class="block text-sm font-medium text-gray-700">School Name</label>
                                    <input type="text" id="schoolName" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                </div>
                                <div>
                                    <label for="graduationYear" class="block text-sm font-medium text-gray-700">Graduation Year</label>
                                    <input type="number" id="graduationYear" required value="${new Date().getFullYear()}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                </div>
                                <div class="flex justify-end gap-4">
                                    <button type="button" id="cancel-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Create</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
             `;
             appContainer.innerHTML = header + `<main>${mainContent}</main>`;

             document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
             document.getElementById('cancel-btn').addEventListener('click', () => window.location.hash = '#/dashboard');
             document.getElementById('new-grad-form').addEventListener('submit', async (e) => {
                 e.preventDefault();
                 const schoolNameInput = document.getElementById('schoolName').value;
                 const graduationYearInput = document.getElementById('graduationYear').value;
                 
                 // Input validation and sanitization
                 const schoolName = sanitizeInput(schoolNameInput, 'text');
                 const graduationYear = parseInt(graduationYearInput);
                 
                 if (!schoolName || schoolName.length < 2) {
                     showModal('Error', 'Please enter a valid school name (at least 2 characters).');
                     return;
                 }
                 
                 if (!graduationYear || graduationYear < 2000 || graduationYear > 2050) {
                     showModal('Error', 'Please enter a valid graduation year between 2000 and 2050.');
                     return;
                 }

                 // Rate limiting for graduation creation
                 const rateLimitKey = `create-grad-${currentUser.uid}`;
                 if (!rateLimiter.isAllowed(rateLimitKey, 5, 300000)) { // 5 creations per 5 minutes
                     showModal('Rate Limit', 'Too many graduation projects created. Please wait 5 minutes before creating another.');
                     return;
                 }
                 
                 try {
                    showModal('Creating...', 'Setting up your graduation project.', false);
                    
                    const newGradRef = await addDoc(collection(db, 'graduations'), {
                        schoolName,
                        graduationYear: graduationYear,
                        ownerUid: currentUser.uid,
                        isLocked: false,
                        generatedBookletUrl: null,
                        createdAt: new Date(),
                    });
                    
                    // Create default config subcollection
                    await setDoc(doc(db, "graduations", newGradRef.id, "config", "settings"), {
                        // Basic settings
                        schoolLogoUrl: null,
                        primaryColor: "#4f46e5", // indigo-600
                        font: "Inter",
                        layout: "grid",
                        showSpeeches: true,
                        showMessages: true,
                        pageOrder: ["students", "messages", "speeches"],
                        
                        // Advanced theme settings
                        secondaryColor: "#6B7280", // gray-500
                        backgroundColor: "#F9FAFB", // gray-50
                        cardStyle: "shadow",
                        borderRadius: "medium",
                        headerStyle: "centered",
                        animationStyle: "fade",
                        
                        // Download scheduling
                        enableDownloadScheduling: false,
                        downloadableAfterDate: null,
                        downloadMessage: null,
                        
                        // Metadata
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });

                    window.location.hash = `#/edit/${newGradRef.id}`;
                 } catch (error) {
                     console.error("Error creating graduation:", error);
                     showModal('Error', 'Could not create the project.');
                 }
             });
        };

        const renderEditor = (gradData, gradId) => {
            const header = renderHeader(gradData.schoolName);
            const publicUrl = `${window.location.origin}${window.location.pathname}#/view/${gradId}`;
            
            const mainContent = `
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <!-- TABS -->
                    <div class="mb-6 border-b border-gray-200">
                        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                            <a href="#" class="tab-link border-indigo-500 text-indigo-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="students">Students</a>
                            <a href="#" class="tab-link border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="content">Content Pages</a>
                            <a href="#" class="tab-link border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="settings">Settings</a>
                            <a href="#" class="tab-link border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="share">Share & View</a>
                            <a href="#" class="tab-link border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm" data-tab="booklet">Booklet</a>
                        </nav>
                    </div>

                    <!-- TAB CONTENT -->
                    <div id="tab-content">
                        <!-- Content will be injected here -->
                    </div>
                </div>
            `;
            appContainer.innerHTML = header + `<main>${mainContent}</main>`;
            
            // Initial tab load
            renderStudentsTab(gradId);

            document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

            // Tab switching logic
            const tabs = document.querySelectorAll('.tab-link');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    tabs.forEach(t => {
                        t.classList.remove('border-indigo-500', 'text-indigo-600');
                        t.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                    });
                    e.target.classList.add('border-indigo-500', 'text-indigo-600');
                    e.target.classList.remove('border-transparent', 'text-gray-500');

                    const tabName = e.target.dataset.tab;
                    if(tabName === 'students') renderStudentsTab(gradId);
                    if(tabName === 'content') renderContentPagesTab(gradId);
                    if(tabName === 'settings') renderSettingsTab(gradId, gradData.config);
                    if(tabName === 'share') renderShareTab(publicUrl);
                    if(tabName === 'booklet') renderBookletTab(gradId, gradData);
                });
            });
        };

        const renderStudentsTab = async (gradId) => {
            const contentContainer = document.getElementById('tab-content');
            contentContainer.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">Manage Students</h3>
                    <form id="add-student-form" class="flex gap-4 mb-6 items-end">
                        <div class="flex-grow">
                            <label for="student-name" class="block text-sm font-medium text-gray-700">Student Name</label>
                            <input type="text" id="student-name" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                        </div>
                        <div>
                            <label for="access-type" class="block text-sm font-medium text-gray-700">Access Method</label>
                            <select id="access-type" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                <option value="public">Public (Select from list)</option>
                                <option value="link">Unique Link (Secure)</option>
                                <option value="password">Password (Secure)</option>
                            </select>
                        </div>
                        <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md h-fit">Add Student</button>
                    </form>
                    <div id="student-list-container">Loading...</div>
                </div>
            `;

            const studentListContainer = document.getElementById('student-list-container');
            const studentsRef = collection(db, "graduations", gradId, "students");
            onSnapshot(studentsRef, (snapshot) => {
                if (snapshot.empty) {
                    studentListContainer.innerHTML = `<p class="text-gray-500">No students added yet.</p>`;
                    return;
                }
                let html = `<ul class="divide-y divide-gray-200">`;
                snapshot.forEach(doc => {
                    const student = doc.data();
                    let accessInfo = '';
                    if (student.accessType === 'link') {
                        const uploadUrl = `${window.location.origin}${window.location.pathname}#/upload/${gradId}/${student.uniqueLinkId}`;
                        accessInfo = `<p class="text-xs text-gray-500 mt-1">Link: <a href="${uploadUrl}" target="_blank" class="text-indigo-600">${uploadUrl}</a></p>`;
                    } else if (student.accessType === 'password') {
                         accessInfo = `<p class="text-xs text-gray-500 mt-1">Password: ${student.passwordPlain || 'N/A'}</p>`;
                    }
                    
                    html += `
                        <li class="py-4">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-md font-medium text-gray-800">${student.name}</p>
                                    ${accessInfo}
                                </div>
                                ${student.profilePdfUrl 
                                    ? `<a href="${student.profilePdfUrl}" target="_blank" class="text-sm text-green-600">PDF Uploaded</a>` 
                                    : `<span class="text-sm text-red-500">No PDF</span>`
                                }
                            </div>
                        </li>
                    `;
                });
                html += `</ul>`;
                studentListContainer.innerHTML = html;
            });
            
            document.getElementById('add-student-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('student-name').value;
                const accessType = document.getElementById('access-type').value;

                // Client-side input sanitization
                const sanitizedName = sanitizeInput(nameInput, 'name');
                
                if (!sanitizedName) {
                    showModal('Error', 'Please enter a valid student name.');
                    return;
                }

                // Rate limiting check
                const rateLimitKey = `add-student-${currentUser.uid}`;
                if (!rateLimiter.isAllowed(rateLimitKey, 10, 60000)) {
                    showModal('Rate Limit', 'Too many requests. Please wait a minute before adding more students.');
                    return;
                }

                try {
                    showModal('Creating...', 'Adding student to the class.', false);

                    let response;
                    if (accessType === 'password') {
                        // Generate secure password on server
                        const generatedPassword = `Class${Math.floor(100 + Math.random() * 900)}`;
                        response = await fetch('/.netlify/functions/secure-operations', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                action: 'createStudent',
                                graduationId: gradId,
                                studentName: sanitizedName,
                                accessType: accessType,
                                password: generatedPassword,
                            }),
                        });
                    } else {
                        // For public and link access types
                        response = await fetch('/.netlify/functions/secure-operations', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                action: 'createStudent',
                                graduationId: gradId,
                                studentName: sanitizedName,
                                accessType: accessType,
                            }),
                        });
                    }

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to create student');
                    }

                    const result = await response.json();
                    
                    // Update the client-side display with the new student
                    const studentsRef = collection(db, "graduations", gradId, "students");
                    const newStudentData = {
                        name: sanitizedName,
                        accessType: accessType,
                        profilePdfUrl: null,
                    };

                    if (result.uniqueLinkId) {
                        newStudentData.uniqueLinkId = result.uniqueLinkId;
                    }
                    
                    if (result.generatedPassword) {
                        newStudentData.passwordPlain = result.generatedPassword;
                    }

                    await addDoc(studentsRef, newStudentData);
                    document.getElementById('add-student-form').reset();
                    
                    showModal('Success', 'Student added successfully!');
                    
                } catch (error) {
                    console.error('Student creation error:', error);
                    showModal('Error', error.message || 'Failed to add student. Please try again.');
                }
            });
        };
        
        const renderContentPagesTab = async (gradId) => {
            const contentContainer = document.getElementById('tab-content');
            
            // Fetch existing content pages
            const contentPagesRef = collection(db, "graduations", gradId, "contentPages");
            
            contentContainer.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-lg font-medium leading-6 text-gray-900">Content Pages</h3>
                        <button id="add-content-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Add New Page</button>
                    </div>
                    
                    <div id="content-pages-list" class="space-y-4 mb-6">
                        <div class="flex items-center justify-center p-8 text-gray-500">
                            <div class="text-center">
                                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                </svg>
                                <p class="mt-2">No content pages yet</p>
                                <p class="text-sm">Add speeches, messages, or other custom content</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Add/Edit Content Form -->
                    <div id="content-form" class="hidden bg-gray-50 p-6 rounded-lg border">
                        <h4 class="text-md font-medium text-gray-900 mb-4">Add/Edit Content Page</h4>
                        <form id="add-content-form" class="space-y-4">
                            <div>
                                <label for="content-title" class="block text-sm font-medium text-gray-700">Page Title</label>
                                <input type="text" id="content-title" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g., Principal's Message, Class Memories">
                            </div>
                            
                            <div>
                                <label for="content-author" class="block text-sm font-medium text-gray-700">Author (Optional)</label>
                                <input type="text" id="content-author" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g., Mrs. Smith, Class 6A">
                            </div>
                            
                            <div>
                                <label for="content-type" class="block text-sm font-medium text-gray-700">Content Type</label>
                                <select id="content-type" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                    <option value="text">Text Content</option>
                                    <option value="speech">Speech/Message</option>
                                    <option value="memory">Class Memory</option>
                                    <option value="thanks">Thank You Note</option>
                                </select>
                            </div>
                            
                            <div>
                                <label for="content-body" class="block text-sm font-medium text-gray-700">Content</label>
                                <textarea id="content-body" rows="8" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Enter your content here..."></textarea>
                                <p class="mt-1 text-sm text-gray-500">You can use simple formatting: **bold**, *italic*, and line breaks</p>
                            </div>
                            
                            <div class="flex justify-end gap-4">
                                <button type="button" id="cancel-content-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                                <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Content</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            // Load existing content pages
            const loadContentPages = () => {
                onSnapshot(contentPagesRef, (snapshot) => {
                    const listContainer = document.getElementById('content-pages-list');
                    
                    if (snapshot.empty) {
                        listContainer.innerHTML = `
                            <div class="flex items-center justify-center p-8 text-gray-500">
                                <div class="text-center">
                                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                    </svg>
                                    <p class="mt-2">No content pages yet</p>
                                    <p class="text-sm">Add speeches, messages, or other custom content</p>
                                </div>
                            </div>
                        `;
                        return;
                    }

                    let html = '<div class="space-y-4">';
                    snapshot.forEach(doc => {
                        const content = doc.data();
                        const preview = content.content.length > 100 ? content.content.substring(0, 100) + '...' : content.content;
                        
                        html += `
                            <div class="border border-gray-200 rounded-lg p-4">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <h4 class="text-lg font-medium text-gray-900">${content.title}</h4>
                                        ${content.author ? `<p class="text-sm text-gray-600 mt-1">By: ${content.author}</p>` : ''}
                                        <span class="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${getContentTypeStyle(content.type)}">${getContentTypeLabel(content.type)}</span>
                                        <p class="mt-3 text-gray-700">${preview}</p>
                                    </div>
                                    <div class="flex gap-2 ml-4">
                                        <button onclick="editContentPage('${doc.id}', '${content.title}', '${content.author || ''}', '${content.type}', \`${content.content.replace(/`/g, '\\`')}\`)" class="text-indigo-600 hover:text-indigo-800 text-sm">Edit</button>
                                        <button onclick="deleteContentPage('${doc.id}')" class="text-red-600 hover:text-red-800 text-sm">Delete</button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    html += '</div>';
                    listContainer.innerHTML = html;
                });
            };

            // Helper functions for content type styling
            window.getContentTypeStyle = (type) => {
                const styles = {
                    text: 'bg-blue-100 text-blue-800',
                    speech: 'bg-green-100 text-green-800', 
                    memory: 'bg-purple-100 text-purple-800',
                    thanks: 'bg-pink-100 text-pink-800'
                };
                return styles[type] || styles.text;
            };

            window.getContentTypeLabel = (type) => {
                const labels = {
                    text: 'Text Content',
                    speech: 'Speech/Message',
                    memory: 'Class Memory', 
                    thanks: 'Thank You Note'
                };
                return labels[type] || 'Content';
            };

            // Global functions for editing and deleting
            window.editContentPage = (id, title, author, type, content) => {
                document.getElementById('content-title').value = title;
                document.getElementById('content-author').value = author;
                document.getElementById('content-type').value = type;
                document.getElementById('content-body').value = content;
                document.getElementById('content-form').classList.remove('hidden');
                document.getElementById('add-content-form').dataset.editId = id;
            };

            window.deleteContentPage = async (id) => {
                if (confirm('Are you sure you want to delete this content page?')) {
                    try {
                        await deleteDoc(doc(db, "graduations", gradId, "contentPages", id));
                        showModal('Success', 'Content page deleted successfully.');
                    } catch (error) {
                        console.error('Error deleting content page:', error);
                        showModal('Error', 'Failed to delete content page.');
                    }
                }
            };

            // Event listeners
            document.getElementById('add-content-btn').addEventListener('click', () => {
                document.getElementById('content-form').classList.remove('hidden');
                document.getElementById('add-content-form').reset();
                delete document.getElementById('add-content-form').dataset.editId;
            });

            document.getElementById('cancel-content-btn').addEventListener('click', () => {
                document.getElementById('content-form').classList.add('hidden');
                document.getElementById('add-content-form').reset();
                delete document.getElementById('add-content-form').dataset.editId;
            });

            document.getElementById('add-content-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const title = sanitizeInput(document.getElementById('content-title').value, 'text');
                const author = sanitizeInput(document.getElementById('content-author').value, 'name');
                const type = document.getElementById('content-type').value;
                const content = sanitizeInput(document.getElementById('content-body').value, 'text');

                if (!title || !content) {
                    showModal('Error', 'Please fill in the title and content fields.');
                    return;
                }

                try {
                    const contentData = {
                        title,
                        author: author || null,
                        type,
                        content,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };

                    const editId = e.target.dataset.editId;
                    if (editId) {
                        // Update existing content
                        await updateDoc(doc(db, "graduations", gradId, "contentPages", editId), {
                            ...contentData,
                            updatedAt: new Date()
                        });
                        showModal('Success', 'Content page updated successfully.');
                    } else {
                        // Add new content
                        await addDoc(contentPagesRef, contentData);
                        showModal('Success', 'Content page added successfully.');
                    }

                    document.getElementById('content-form').classList.add('hidden');
                    document.getElementById('add-content-form').reset();
                    delete e.target.dataset.editId;

                } catch (error) {
                    console.error('Error saving content page:', error);
                    showModal('Error', 'Failed to save content page.');
                }
            });

            // Load content pages
            loadContentPages();
        };
        
        const renderSettingsTab = (gradId, config) => {
             const contentContainer = document.getElementById('tab-content');
             contentContainer.innerHTML = `
                 <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-medium leading-6 text-gray-900 mb-6">Website Settings</h3>
                     <form id="settings-form" class="space-y-6">
                        <div>
                            <label for="schoolLogo" class="block text-sm font-medium text-gray-700">School Logo</label>
                            <input type="file" id="schoolLogo" accept="image/*" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100">
                            ${config.schoolLogoUrl ? `<img src="${config.schoolLogoUrl}" class="h-16 mt-2 rounded">` : ''}
                        </div>
                        
                        <div>
                            <label for="primaryColor" class="block text-sm font-medium text-gray-700">Primary Color</label>
                            <input type="color" id="primaryColor" value="${config.primaryColor || '#3B82F6'}" class="mt-1 h-10 w-full block border border-gray-300 rounded-md">
                        </div>
                        
                        <div>
                            <label for="font" class="block text-sm font-medium text-gray-700">Font Family</label>
                            <select id="font" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                <option value="Inter" ${config.font === 'Inter' ? 'selected' : ''}>Inter</option>
                                <option value="Roboto" ${config.font === 'Roboto' ? 'selected' : ''}>Roboto</option>
                                <option value="Arial" ${config.font === 'Arial' ? 'selected' : ''}>Arial</option>
                                <option value="Georgia" ${config.font === 'Georgia' ? 'selected' : ''}>Georgia</option>
                            </select>
                        </div>
                        
                        <div>
                            <label for="layout" class="block text-sm font-medium text-gray-700">Layout Style</label>
                            <select id="layout" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                <option value="grid" ${config.layout === 'grid' ? 'selected' : ''}>Grid Layout</option>
                                <option value="scroll" ${config.layout === 'scroll' ? 'selected' : ''}>Scroll Layout</option>
                                <option value="cards" ${config.layout === 'cards' ? 'selected' : ''}>Card Layout</option>
                                <option value="list" ${config.layout === 'list' ? 'selected' : ''}>List Layout</option>
                            </select>
                        </div>
                        
                        <!-- Advanced Theme Settings -->
                        <div class="border-t pt-6">
                            <h4 class="text-lg font-medium text-gray-900 mb-4">Advanced Theme Options</h4>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label for="secondaryColor" class="block text-sm font-medium text-gray-700">Secondary Color</label>
                                    <input type="color" id="secondaryColor" value="${config.secondaryColor || '#6B7280'}" class="mt-1 h-10 w-full block border border-gray-300 rounded-md">
                                    <p class="mt-1 text-sm text-gray-500">Used for secondary text and accents</p>
                                </div>
                                
                                <div>
                                    <label for="backgroundColor" class="block text-sm font-medium text-gray-700">Background Color</label>
                                    <input type="color" id="backgroundColor" value="${config.backgroundColor || '#F9FAFB'}" class="mt-1 h-10 w-full block border border-gray-300 rounded-md">
                                    <p class="mt-1 text-sm text-gray-500">Main background color</p>
                                </div>
                                
                                <div>
                                    <label for="cardStyle" class="block text-sm font-medium text-gray-700">Card Style</label>
                                    <select id="cardStyle" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                        <option value="shadow" ${config.cardStyle === 'shadow' ? 'selected' : ''}>Drop Shadow</option>
                                        <option value="border" ${config.cardStyle === 'border' ? 'selected' : ''}>Border Only</option>
                                        <option value="elevated" ${config.cardStyle === 'elevated' ? 'selected' : ''}>Elevated</option>
                                        <option value="minimal" ${config.cardStyle === 'minimal' ? 'selected' : ''}>Minimal</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label for="borderRadius" class="block text-sm font-medium text-gray-700">Border Radius</label>
                                    <select id="borderRadius" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                        <option value="none" ${config.borderRadius === 'none' ? 'selected' : ''}>None (0px)</option>
                                        <option value="small" ${config.borderRadius === 'small' ? 'selected' : ''}>Small (4px)</option>
                                        <option value="medium" ${config.borderRadius === 'medium' ? 'selected' : ''}>Medium (8px)</option>
                                        <option value="large" ${config.borderRadius === 'large' ? 'selected' : ''}>Large (12px)</option>
                                        <option value="full" ${config.borderRadius === 'full' ? 'selected' : ''}>Rounded (50px)</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label for="headerStyle" class="block text-sm font-medium text-gray-700">Header Style</label>
                                    <select id="headerStyle" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                        <option value="centered" ${config.headerStyle === 'centered' ? 'selected' : ''}>Centered</option>
                                        <option value="left" ${config.headerStyle === 'left' ? 'selected' : ''}>Left Aligned</option>
                                        <option value="banner" ${config.headerStyle === 'banner' ? 'selected' : ''}>Full Banner</option>
                                        <option value="minimal" ${config.headerStyle === 'minimal' ? 'selected' : ''}>Minimal</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label for="animationStyle" class="block text-sm font-medium text-gray-700">Animation Style</label>
                                    <select id="animationStyle" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                        <option value="none" ${config.animationStyle === 'none' ? 'selected' : ''}>No Animation</option>
                                        <option value="fade" ${config.animationStyle === 'fade' ? 'selected' : ''}>Fade In</option>
                                        <option value="slide" ${config.animationStyle === 'slide' ? 'selected' : ''}>Slide In</option>
                                        <option value="bounce" ${config.animationStyle === 'bounce' ? 'selected' : ''}>Bounce In</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="space-y-3">
                            <label class="block text-sm font-medium text-gray-700">Content Visibility</label>
                            <div class="space-y-2">
                                <label class="flex items-center">
                                    <input type="checkbox" id="showSpeeches" ${config.showSpeeches !== false ? 'checked' : ''} class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                                    <span class="ml-2 text-sm text-gray-700">Show Speeches Section</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="showMessages" ${config.showMessages !== false ? 'checked' : ''} class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                                    <span class="ml-2 text-sm text-gray-700">Show Messages Section</span>
                                </label>
                            </div>
                        </div>
                        
                        <!-- Download Scheduling -->
                        <div class="border-t pt-6">
                            <h4 class="text-lg font-medium text-gray-900 mb-4">Download Settings</h4>
                            
                            <div class="space-y-4">
                                <label class="flex items-center">
                                    <input type="checkbox" id="enableDownloadScheduling" ${config.enableDownloadScheduling ? 'checked' : ''} class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                                    <span class="ml-2 text-sm text-gray-700">Schedule PDF booklet availability</span>
                                </label>
                                
                                <div id="download-scheduling" class="ml-6 space-y-4 ${config.enableDownloadScheduling ? '' : 'hidden'}">
                                    <div>
                                        <label for="downloadAvailableDate" class="block text-sm font-medium text-gray-700">Make booklet available on</label>
                                        <input type="datetime-local" id="downloadAvailableDate" value="${config.downloadableAfterDate ? new Date(config.downloadableAfterDate).toISOString().slice(0, 16) : ''}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                        <p class="mt-1 text-sm text-gray-500">Students and parents will only be able to download the booklet after this date</p>
                                    </div>
                                    
                                    <div>
                                        <label for="downloadMessage" class="block text-sm font-medium text-gray-700">Message before availability (Optional)</label>
                                        <textarea id="downloadMessage" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g., The graduation booklet will be available after the ceremony...">${config.downloadMessage || ''}</textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Page Order</label>
                            <div id="page-order" class="space-y-2">
                                ${(config.pageOrder || ['students', 'messages', 'speeches']).map((page, index) => `
                                    <div class="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                        <span class="capitalize">${page}</span>
                                        <div class="space-x-2">
                                            <button type="button" onclick="movePageUp(${index})" class="text-blue-600 hover:text-blue-800" ${index === 0 ? 'disabled' : ''}>↑</button>
                                            <button type="button" onclick="movePageDown(${index})" class="text-blue-600 hover:text-blue-800" ${index === (config.pageOrder || ['students', 'messages', 'speeches']).length - 1 ? 'disabled' : ''}>↓</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="flex justify-end">
                            <button type="submit" class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Settings</button>
                        </div>
                    </form>
                 </div>
             `;

             // Add page order management functions to window for onclick handlers
             window.movePageUp = (index) => {
                 const orderElements = document.querySelectorAll('#page-order > div');
                 if (index > 0) {
                     const currentOrder = Array.from(orderElements).map(el => el.querySelector('span').textContent);
                     [currentOrder[index], currentOrder[index - 1]] = [currentOrder[index - 1], currentOrder[index]];
                     updatePageOrderDisplay(currentOrder);
                 }
             };
             
             window.movePageDown = (index) => {
                 const orderElements = document.querySelectorAll('#page-order > div');
                 if (index < orderElements.length - 1) {
                     const currentOrder = Array.from(orderElements).map(el => el.querySelector('span').textContent);
                     [currentOrder[index], currentOrder[index + 1]] = [currentOrder[index + 1], currentOrder[index]];
                     updatePageOrderDisplay(currentOrder);
                 }
             };
             
             const updatePageOrderDisplay = (order) => {
                 const container = document.getElementById('page-order');
                 container.innerHTML = order.map((page, index) => `
                     <div class="flex items-center justify-between p-2 bg-gray-50 rounded border">
                         <span class="capitalize">${page}</span>
                         <div class="space-x-2">
                             <button type="button" onclick="movePageUp(${index})" class="text-blue-600 hover:text-blue-800" ${index === 0 ? 'disabled' : ''}>↑</button>
                             <button type="button" onclick="movePageDown(${index})" class="text-blue-600 hover:text-blue-800" ${index === order.length - 1 ? 'disabled' : ''}>↓</button>
                         </div>
                     </div>
                 `).join('');
             };

             // Add download scheduling toggle handler
             document.getElementById('enableDownloadScheduling').addEventListener('change', (e) => {
                 const schedulingDiv = document.getElementById('download-scheduling');
                 if (e.target.checked) {
                     schedulingDiv.classList.remove('hidden');
                 } else {
                     schedulingDiv.classList.add('hidden');
                 }
             });

             document.getElementById('settings-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                showModal('Saving...', 'Updating your settings.', false);
                
                // Basic settings
                const color = document.getElementById('primaryColor').value;
                const font = document.getElementById('font').value;
                const layout = document.getElementById('layout').value;
                const showSpeeches = document.getElementById('showSpeeches').checked;
                const showMessages = document.getElementById('showMessages').checked;
                const logoFile = document.getElementById('schoolLogo').files[0];
                
                // Advanced theme settings
                const secondaryColor = document.getElementById('secondaryColor').value;
                const backgroundColor = document.getElementById('backgroundColor').value;
                const cardStyle = document.getElementById('cardStyle').value;
                const borderRadius = document.getElementById('borderRadius').value;
                const headerStyle = document.getElementById('headerStyle').value;
                const animationStyle = document.getElementById('animationStyle').value;
                
                // Download scheduling settings
                const enableDownloadScheduling = document.getElementById('enableDownloadScheduling').checked;
                const downloadAvailableDate = document.getElementById('downloadAvailableDate').value;
                const downloadMessage = document.getElementById('downloadMessage').value;
                
                // Get current page order
                const orderElements = document.querySelectorAll('#page-order > div');
                const pageOrder = Array.from(orderElements).map(el => el.querySelector('span').textContent);
                
                let logoUrl = config.schoolLogoUrl;

                if (logoFile) {
                    if (CLOUDINARY_CLOUD_NAME === "YOUR_CLOUD_NAME") {
                        showModal("Configuration Needed", "Please set up your Cloudinary details in the HTML file to upload a logo.");
                        return;
                    }
                    try {
                        logoUrl = await uploadFile(logoFile);
                    } catch (error) {
                        showModal('Error', `Failed to upload logo: ${error.message}`);
                        return;
                    }
                }

                const newConfig = {
                    ...config,
                    // Basic settings
                    primaryColor: color,
                    font: font,
                    layout: layout,
                    showSpeeches: showSpeeches,
                    showMessages: showMessages,
                    pageOrder: pageOrder,
                    schoolLogoUrl: logoUrl,
                    
                    // Advanced theme settings
                    secondaryColor: secondaryColor,
                    backgroundColor: backgroundColor,
                    cardStyle: cardStyle,
                    borderRadius: borderRadius,
                    headerStyle: headerStyle,
                    animationStyle: animationStyle,
                    
                    // Download scheduling
                    enableDownloadScheduling: enableDownloadScheduling,
                    downloadableAfterDate: enableDownloadScheduling && downloadAvailableDate ? new Date(downloadAvailableDate) : null,
                    downloadMessage: enableDownloadScheduling ? downloadMessage : null,
                    
                    // Metadata
                    updatedAt: new Date()
                };

                const configRef = doc(db, "graduations", gradId, "config", "settings");
                await setDoc(configRef, newConfig);
                showModal('Saved!', 'Your settings have been updated.');
                // Trigger a re-render of the editor to show the new logo
                router(); 
             });
        };

        const renderShareTab = (publicUrl) => {
            const contentContainer = document.getElementById('tab-content');
            contentContainer.innerHTML = `
                 <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-medium leading-6 text-gray-900 mb-4">Share Your Website</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Public URL</label>
                            <div class="mt-1 flex rounded-md shadow-sm">
                                <input type="text" readonly id="public-url-input" value="${publicUrl}" class="flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 bg-gray-50 p-2">
                                <button id="copy-url-btn" class="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">Copy</button>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">QR Code</label>
                            <div id="qrcode" class="mt-2 p-4 bg-white inline-block border rounded-md"></div>
                        </div>
                         <a href="${publicUrl}" target="_blank" class="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Open Public Site</a>
                    </div>
                </div>
            `;
            new QRCode(document.getElementById("qrcode"), {
                text: publicUrl,
                width: 128,
                height: 128,
            });
            document.getElementById('copy-url-btn').addEventListener('click', () => {
                const input = document.getElementById('public-url-input');
                input.select();
                document.execCommand('copy');
                showModal('Copied!', 'The URL has been copied to your clipboard.');
            });
        };
        
        const renderBookletTab = (gradId, gradData) => {
            const contentContainer = document.getElementById('tab-content');
            const config = gradData.config || {};
            
            // Check if download is scheduled and available
            const isScheduled = config.enableDownloadScheduling && config.downloadableAfterDate;
            const isAvailable = !isScheduled || new Date() >= new Date(config.downloadableAfterDate);
            
            let bookletInfo = `
                <p class="text-gray-600 mb-4">Click the button to combine all uploaded student PDFs into a single downloadable booklet.</p>
                <button id="generate-booklet-btn" class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Generate Booklet</button>
            `;
            
            if (gradData.generatedBookletUrl) {
                if (isScheduled) {
                    if (isAvailable) {
                        bookletInfo = `
                            <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                                <div class="flex">
                                    <svg class="h-5 w-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <div class="ml-3">
                                        <h3 class="text-sm font-medium text-green-800">Booklet Available</h3>
                                        <p class="text-sm text-green-700">The graduation booklet is now available for download.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="flex gap-4">
                                <a href="${gradData.generatedBookletUrl}" target="_blank" class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Download Booklet</a>
                                <button id="generate-booklet-btn" class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Re-generate Booklet</button>
                            </div>
                        `;
                    } else {
                        const availableDate = new Date(config.downloadableAfterDate);
                        bookletInfo = `
                            <div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                                <div class="flex">
                                    <svg class="h-5 w-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <div class="ml-3">
                                        <h3 class="text-sm font-medium text-yellow-800">Booklet Scheduled</h3>
                                        <p class="text-sm text-yellow-700">
                                            The booklet will be available for download on 
                                            <strong>${availableDate.toLocaleDateString()} at ${availableDate.toLocaleTimeString()}</strong>
                                        </p>
                                        ${config.downloadMessage ? `<p class="text-sm text-yellow-700 mt-2">${config.downloadMessage}</p>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="flex gap-4">
                                <button disabled class="px-6 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed">Download Not Yet Available</button>
                                <button id="generate-booklet-btn" class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Re-generate Booklet</button>
                            </div>
                        `;
                    }
                } else {
                    bookletInfo = `
                        <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                            <div class="flex">
                                <svg class="h-5 w-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <div class="ml-3">
                                    <h3 class="text-sm font-medium text-green-800">Booklet Generated</h3>
                                    <p class="text-sm text-green-700">Your graduation booklet is ready for download.</p>
                                </div>
                            </div>
                        </div>
                        <div class="flex gap-4">
                            <a href="${gradData.generatedBookletUrl}" target="_blank" class="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Download Booklet</a>
                            <button id="generate-booklet-btn" class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Re-generate Booklet</button>
                        </div>
                    `;
                }
            }
            
            contentContainer.innerHTML = `
                 <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-medium leading-6 text-gray-900 mb-2">Graduation Booklet</h3>
                    ${bookletInfo}
                    
                    ${isScheduled ? `
                        <div class="mt-6 pt-6 border-t border-gray-200">
                            <h4 class="text-md font-medium text-gray-900 mb-2">Download Settings</h4>
                            <div class="text-sm text-gray-600">
                                <p><strong>Scheduled Release:</strong> ${new Date(config.downloadableAfterDate).toLocaleString()}</p>
                                ${config.downloadMessage ? `<p class="mt-2"><strong>Message:</strong> ${config.downloadMessage}</p>` : ''}
                                <p class="mt-2 text-xs text-gray-500">You can change these settings in the Settings tab.</p>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            if (document.getElementById('generate-booklet-btn')) {
                document.getElementById('generate-booklet-btn').addEventListener('click', () => generateBooklet(gradId));
            }
        };
        
        const renderPublicView = async (gradData, students) => {
             const { config } = gradData;
             const fontFamily = config.font || 'Inter';
             const layoutClass = config.layout === 'scroll' ? 'space-y-8' : 
                               config.layout === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' :
                               config.layout === 'list' ? 'space-y-4' :
                               'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6';
             
             // Get border radius class
             const borderRadiusClass = {
                 'none': 'rounded-none',
                 'small': 'rounded',
                 'medium': 'rounded-lg', 
                 'large': 'rounded-xl',
                 'full': 'rounded-full'
             }[config.borderRadius] || 'rounded-lg';
             
             // Get card style classes
             const cardStyleClass = {
                 'shadow': 'shadow-md hover:shadow-lg transition-shadow',
                 'border': 'border border-gray-200',
                 'elevated': 'shadow-lg transform hover:scale-105 transition-all',
                 'minimal': 'bg-transparent'
             }[config.cardStyle] || 'shadow-md';
             
             // Get animation classes
             const animationClass = {
                 'fade': 'animate-fade-in',
                 'slide': 'animate-slide-in',
                 'bounce': 'animate-bounce-in',
                 'none': ''
             }[config.animationStyle] || '';
             
             // Fetch content pages
             const contentPagesRef = collection(db, "graduations", gradData.id, "contentPages");
             const contentSnapshot = await getDocs(contentPagesRef);
             const contentPages = [];
             contentSnapshot.forEach(doc => {
                 contentPages.push({ id: doc.id, ...doc.data() });
             });
             
             // Sort content pages by creation date
             contentPages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
             
             appContainer.innerHTML = `
                <style>
                    .animate-fade-in { animation: fadeIn 0.6s ease-in; }
                    .animate-slide-in { animation: slideIn 0.8s ease-out; }
                    .animate-bounce-in { animation: bounceIn 1s ease-out; }
                    
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    
                    @keyframes slideIn {
                        from { transform: translateY(30px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    
                    @keyframes bounceIn {
                        0% { transform: scale(0.3); opacity: 0; }
                        50% { transform: scale(1.05); }
                        70% { transform: scale(0.9); }
                        100% { transform: scale(1); opacity: 1; }
                    }
                </style>
                <div class="min-h-screen ${animationClass}" style="font-family: '${fontFamily}', sans-serif; background-color: ${config.backgroundColor || '#F9FAFB'};">
                    <div class="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
                        <header class="my-12 ${config.headerStyle === 'left' ? 'text-left' : config.headerStyle === 'banner' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-xl text-center' : config.headerStyle === 'minimal' ? 'text-center py-4' : 'text-center'}">
                             ${config.schoolLogoUrl ? `<img src="${config.schoolLogoUrl}" class="h-24 ${config.headerStyle === 'left' ? '' : 'mx-auto'} mb-4 ${borderRadiusClass}">` : ''}
                            <h1 class="text-4xl font-bold ${config.headerStyle === 'banner' ? 'text-white' : ''}" style="color: ${config.headerStyle === 'banner' ? 'white' : config.primaryColor};">${gradData.schoolName}</h1>
                            <p class="text-2xl ${config.headerStyle === 'banner' ? 'text-blue-100' : 'text-gray-600'} mt-2">Class of ${gradData.graduationYear}</p>
                        </header>
                        
                        <main class="space-y-12">
                            ${(config.pageOrder || ['students', 'messages', 'speeches']).map(section => {
                                if (section === 'students') {
                                    return `
                                        <section class="${animationClass}">
                                            <h2 class="text-3xl font-bold text-center mb-8" style="color: ${config.primaryColor};">Our Graduates</h2>
                                            <div class="${layoutClass}">
                                                ${students.map(s => `
                                                    <div class="text-center ${config.layout === 'scroll' || config.layout === 'list' ? `p-6 bg-white ${cardStyleClass} ${borderRadiusClass}` : config.layout === 'cards' ? `bg-white ${cardStyleClass} ${borderRadiusClass} p-4` : ''}">
                                                        <div class="w-32 h-32 bg-gray-200 ${borderRadiusClass} mx-auto flex items-center justify-center mb-2" style="background-color: ${config.secondaryColor}20;">
                                                            <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                                        </div>
                                                        <h3 class="font-semibold text-gray-800">${s.name}</h3>
                                                        ${s.profilePdfUrl ? `<a href="${s.profilePdfUrl}" target="_blank" class="text-sm hover:underline transition-colors" style="color: ${config.primaryColor};">View Profile</a>` : ''}
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </section>
                                    `;
                                } else if (section === 'messages' && config.showMessages !== false) {
                                    const messagePages = contentPages.filter(p => p.type === 'thanks' || p.type === 'memory');
                                    return `
                                        <section class="${animationClass}">
                                            <h2 class="text-3xl font-bold text-center mb-8" style="color: ${config.primaryColor};">Messages & Memories</h2>
                                            ${messagePages.length > 0 ? `
                                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    ${messagePages.map(page => `
                                                        <div class="bg-white ${cardStyleClass} ${borderRadiusClass} p-6">
                                                            <h3 class="text-xl font-semibold mb-2" style="color: ${config.primaryColor};">${page.title}</h3>
                                                            ${page.author ? `<p class="text-sm text-gray-600 mb-4">By: ${page.author}</p>` : ''}
                                                            <div class="prose prose-sm">${page.content.replace(/\n/g, '<br>')}</div>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            ` : `
                                                <div class="bg-white ${cardStyleClass} ${borderRadiusClass} p-8 text-center">
                                                    <p style="color: ${config.secondaryColor};">Messages and memories will appear here.</p>
                                                </div>
                                            `}
                                        </section>
                                    `;
                                } else if (section === 'speeches' && config.showSpeeches !== false) {
                                    const speechPages = contentPages.filter(p => p.type === 'speech' || p.type === 'text');
                                    return `
                                        <section class="${animationClass}">
                                            <h2 class="text-3xl font-bold text-center mb-8" style="color: ${config.primaryColor};">Speeches & Presentations</h2>
                                            ${speechPages.length > 0 ? `
                                                <div class="space-y-6">
                                                    ${speechPages.map(page => `
                                                        <div class="bg-white ${cardStyleClass} ${borderRadiusClass} p-8">
                                                            <h3 class="text-2xl font-bold mb-4" style="color: ${config.primaryColor};">${page.title}</h3>
                                                            ${page.author ? `<p class="text-gray-600 mb-6 italic">By: ${page.author}</p>` : ''}
                                                            <div class="prose prose-lg max-w-none">${page.content.replace(/\n/g, '<br>')}</div>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            ` : `
                                                <div class="bg-white ${cardStyleClass} ${borderRadiusClass} p-8 text-center">
                                                    <p style="color: ${config.secondaryColor};">Graduation speeches will appear here.</p>
                                                </div>
                                            `}
                                        </section>
                                    `;
                                }
                                return '';
                            }).filter(Boolean).join('')}
                        </main>
                    </div>
                </div>
             `;
        };

        const renderStudentUploadPortal = (gradId, students) => {
            // Filter students by access type for display
            const publicStudents = students.filter(s => s.accessType === 'public');
            const passwordStudents = students.filter(s => s.accessType === 'password');
            
            appContainer.innerHTML = `
                 <div class="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                    <div class="sm:mx-auto sm:w-full sm:max-w-xl">
                        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Student PDF Upload
                        </h2>
                    </div>

                    <div id="student-selector" class="mt-8 sm:mx-auto sm:w-full sm:max-w-xl bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 space-y-4">
                        ${publicStudents.length > 0 ? `
                        <div>
                            <label for="student-select" class="block text-sm font-medium text-gray-700">Select Your Name</label>
                            <select id="student-select" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                <option value="">-- Please select --</option>
                                ${publicStudents.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                            </select>
                        </div>
                        ` : ''}
                        
                        ${passwordStudents.length > 0 ? `
                        <div>
                            <label for="password-student-select" class="block text-sm font-medium text-gray-700">Select Your Name (Password Required)</label>
                            <select id="password-student-select" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                <option value="">-- Please select --</option>
                                ${passwordStudents.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                            </select>
                        </div>
                        <div id="password-area" class="hidden">
                            <label for="student-password" class="block text-sm font-medium text-gray-700">Enter Your Password</label>
                            <input type="password" id="student-password" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                            <button id="verify-password-btn" class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Verify Password</button>
                        </div>
                        ` : ''}
                        
                         <div id="upload-area" class="hidden">
                            <label for="pdf-upload" class="block text-sm font-medium text-gray-700">Upload Your PDF Profile</label>
                            <input type="file" id="pdf-upload" accept=".pdf" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100">
                            <button id="submit-pdf-btn" class="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Upload PDF</button>
                        </div>
                        
                        ${publicStudents.length === 0 && passwordStudents.length === 0 ? `
                        <div class="text-center text-gray-500">
                            <p>No students available for upload. Please check with your teacher.</p>
                        </div>
                        ` : ''}
                    </div>
                 </div>
            `;

            let selectedStudentId = null;

            // Handle public student selection
            if (publicStudents.length > 0) {
                document.getElementById('student-select').addEventListener('change', (e) => {
                    selectedStudentId = e.target.value;
                    if (selectedStudentId) {
                        document.getElementById('upload-area').classList.remove('hidden');
                        // Hide password area if visible
                        const passwordArea = document.getElementById('password-area');
                        if (passwordArea) passwordArea.classList.add('hidden');
                    } else {
                        document.getElementById('upload-area').classList.add('hidden');
                    }
                });
            }

            // Handle password-protected student selection
            if (passwordStudents.length > 0) {
                document.getElementById('password-student-select').addEventListener('change', (e) => {
                    const studentId = e.target.value;
                    if (studentId) {
                        document.getElementById('password-area').classList.remove('hidden');
                        // Hide upload area until password is verified
                        document.getElementById('upload-area').classList.add('hidden');
                        selectedStudentId = null;
                    } else {
                        document.getElementById('password-area').classList.add('hidden');
                        document.getElementById('upload-area').classList.add('hidden');
                    }
                });

                document.getElementById('verify-password-btn').addEventListener('click', async () => {
                    const studentId = document.getElementById('password-student-select').value;
                    const password = document.getElementById('student-password').value;
                    
                    if (!studentId || !password) {
                        showModal('Error', 'Please select a student and enter the password.');
                        return;
                    }

                    // Rate limiting for password attempts
                    const rateLimitKey = `password-verify-${studentId}`;
                    if (!rateLimiter.isAllowed(rateLimitKey, 3, 300000)) { // 3 attempts per 5 minutes
                        showModal('Rate Limit', 'Too many password attempts. Please wait 5 minutes before trying again.');
                        return;
                    }

                    try {
                        showModal('Verifying...', 'Checking your password.', false);
                        
                        const isValid = await verifyStudentPassword(gradId, studentId, password);
                        
                        if (isValid) {
                            selectedStudentId = studentId;
                            document.getElementById('upload-area').classList.remove('hidden');
                            rateLimiter.reset(rateLimitKey); // Reset on successful verification
                            showModal('Success', 'Password verified! You can now upload your PDF.');
                        } else {
                            showModal('Error', 'Incorrect password. Please try again.');
                        }
                    } catch (error) {
                        console.error('Password verification error:', error);
                        showModal('Error', 'Failed to verify password. Please try again.');
                    }
                });
            }

             document.getElementById('submit-pdf-btn').addEventListener('click', async () => {
                if (!selectedStudentId) {
                    showModal('Error', 'Please select your name first.');
                    return;
                }
                const file = document.getElementById('pdf-upload').files[0];
                if (!file) {
                    showModal('Error', 'Please select a PDF file to upload.');
                    return;
                }
                
                if (CLOUDINARY_CLOUD_NAME === "YOUR_CLOUD_NAME") {
                    showModal("Configuration Needed", "This feature is disabled until the app is configured with Cloudinary details.");
                    return;
                }

                try {
                    showModal('Uploading...', 'Your file is being uploaded.', false);
                    const pdfUrl = await uploadFile(file);

                    if (pdfUrl) {
                        const studentDocRef = doc(db, "graduations", gradId, "students", selectedStudentId);
                        await updateDoc(studentDocRef, { profilePdfUrl: pdfUrl });
                        showModal('Success!', 'Your PDF has been uploaded successfully. You can now close this page.');
                    }
                } catch (error) {
                    console.error('PDF upload error:', error);
                    showModal('Upload Failed', error.message || 'Failed to upload PDF. Please try again.');
                }
             });
        };
        
        const renderDirectUpload = (gradId, student) => {
            appContainer.innerHTML = `
                <div class="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                    <div class="sm:mx-auto sm:w-full sm:max-w-xl">
                        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            PDF Upload for ${student.name}
                        </h2>
                    </div>

                    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-xl bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 space-y-4">
                        <div class="text-center mb-4">
                            <p class="text-lg font-medium text-gray-700">Welcome, ${student.name}!</p>
                            <p class="text-sm text-gray-500">Upload your PDF profile using the form below.</p>
                        </div>
                        
                        <div>
                            <label for="pdf-upload" class="block text-sm font-medium text-gray-700">Upload Your PDF Profile</label>
                            <input type="file" id="pdf-upload" accept=".pdf" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100">
                            <button id="submit-pdf-btn" class="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Upload PDF</button>
                        </div>
                        
                        ${student.profilePdfUrl ? `
                        <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                            <p class="text-sm text-green-700">✓ You have already uploaded a PDF. Uploading a new one will replace the previous file.</p>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;

            document.getElementById('submit-pdf-btn').addEventListener('click', async () => {
                const file = document.getElementById('pdf-upload').files[0];
                if (!file) {
                    showModal('Error', 'Please select a PDF file to upload.');
                    return;
                }
                
                if (CLOUDINARY_CLOUD_NAME === "YOUR_CLOUD_NAME") {
                    showModal("Configuration Needed", "This feature is disabled until the app is configured with Cloudinary details.");
                    return;
                }

                try {
                    showModal('Uploading...', 'Your file is being uploaded.', false);
                    const pdfUrl = await uploadFile(file);

                    if (pdfUrl) {
                        const studentDocRef = doc(db, "graduations", gradId, "students", student.id);
                        await updateDoc(studentDocRef, { profilePdfUrl: pdfUrl });
                        showModal('Success!', 'Your PDF has been uploaded successfully. You can now close this page.');
                    }
                } catch (error) {
                    console.error('PDF upload error:', error);
                    showModal('Upload Failed', error.message || 'Failed to upload PDF. Please try again.');
                }
            });
        };
        
        const showModal = (title, message, showClose = true) => {
            const modalId = `modal-${Date.now()}`;
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center';
            modal.innerHTML = `
                <div class="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div class="mt-3 text-center">
                        <h3 class="text-lg leading-6 font-medium text-gray-900">${title}</h3>
                        <div class="mt-2 px-7 py-3">
                            <p class="text-sm text-gray-500">${message}</p>
                        </div>
                        <div class="items-center px-4 py-3">
                            ${showClose ? `<button id="close-modal-btn" class="px-4 py-2 bg-indigo-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">Close</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            if (showClose) {
                document.getElementById('close-modal-btn').addEventListener('click', () => {
                    modal.remove();
                });
            } else {
                 // Auto-close informational modals
                 setTimeout(() => {
                     if(document.getElementById(modalId)) modal.remove();
                 }, 3000);
            }
        };

        // --- ROUTING ---
        const router = async () => {
            const hash = window.location.hash;
            
            if (!currentUser) {
                renderLoginPage();
                return;
            }

            renderLoading(); // Show loading indicator during data fetch

            if (hash.startsWith('#/edit/')) {
                const gradId = hash.split('/')[2];
                try {
                    const gradDocRef = doc(db, "graduations", gradId);

                    // Detach any previous listener
                    if (currentGraduationListener) {
                        currentGraduationListener();
                    }

                    // Attach a new realtime listener
                    currentGraduationListener = onSnapshot(gradDocRef, async (gradDoc) => {
                        if (gradDoc.exists()) {
                            const gradData = gradDoc.data();

                            if (gradData.ownerUid !== currentUser.uid) {
                                window.location.hash = '#/dashboard';
                                return;
                            }
                            // Also fetch the config subcollection
                            const configDocRef = doc(db, "graduations", gradId, "config", "settings");
                            const configDoc = await getDoc(configDocRef);
                            gradData.config = configDoc.exists() ? configDoc.data() : {};
                            
                            renderEditor(gradData, gradId);
                        } else {
                             window.location.hash = '#/dashboard';
                        }
                    });
                } catch(error) {
                    console.error("Error fetching graduation data:", error);
                    window.location.hash = '#/dashboard';
                }
            } else if (hash === '#/new') {
                renderNewGraduationForm();
            } else {
                renderDashboard();
            }
        };

        const publicRouter = async () => {
             const hash = window.location.hash;
             renderLoading();

             if (hash.startsWith('#/view/')) {
                 const gradId = hash.split('/')[2];
                 const gradDocRef = doc(db, "graduations", gradId);
                 const gradDoc = await getDoc(gradDocRef);
                 if (gradDoc.exists()) {
                     const gradData = gradDoc.data();
                     const configDocRef = doc(db, "graduations", gradId, "config", "settings");
                     const configDoc = await getDoc(configDocRef);
                     gradData.config = configDoc.exists() ? configDoc.data() : {};

                     const studentsRef = collection(db, "graduations", gradId, "students");
                     const studentSnapshot = await getDocs(studentsRef);
                     const students = studentSnapshot.docs.map(doc => doc.data());
                     
                     renderPublicView(gradData, students);
                 } else {
                     appContainer.innerHTML = `<p class="text-center p-8">Graduation not found.</p>`;
                 }
             } else if (hash.startsWith('#/upload/')) {
                 const pathParts = hash.split('/');
                 const gradId = pathParts[2];
                 const linkId = pathParts[3]; // For unique link access
                 
                 const studentsRef = collection(db, "graduations", gradId, "students");
                 
                 if (linkId) {
                     // Handle unique link access
                     const q = query(studentsRef, where("uniqueLinkId", "==", linkId));
                     const snapshot = await getDocs(q);
                     if (!snapshot.empty) {
                         const studentData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
                         renderDirectUpload(gradId, studentData);
                     } else {
                         showModal('Invalid Link', 'This upload link is not valid or has expired.');
                     }
                 } else {
                     // Handle public and password access
                     const studentSnapshot = await getDocs(studentsRef);
                     const students = studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                     renderStudentUploadPortal(gradId, students);
                 }
             } else if (!currentUser) {
                 renderLoginPage();
             } else {
                 router(); // User is logged in, but not on a public page, go to their dashboard
             }
        }
        
        // --- INITIALIZATION ---
        onAuthStateChanged(auth, user => {
            currentUser = user;
            const isPublicRoute = window.location.hash.startsWith('#/view/') || window.location.hash.startsWith('#/upload/');

            if (isPublicRoute) {
                publicRouter();
            } else {
                if (user) {
                    if(!window.location.hash || window.location.hash === '#/') {
                        window.location.hash = '#/dashboard';
                    }
                    router();
                } else {
                    renderLoginPage();
                }
            }
        });

        window.addEventListener('hashchange', () => {
            const isPublicRoute = window.location.hash.startsWith('#/view/') || window.location.hash.startsWith('#/upload/');
             if (isPublicRoute) {
                publicRouter();
            } else {
                router();
            }
        });

    </script>
</body>
</html>


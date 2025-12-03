/**
 * Authentication Event Handlers
 * Manages login, signup, and logout interactions
 */

/**
 * Setup authentication toggle handler (switch between login and signup modes)
 * @param {HTMLElement} toggleAuthBtn - Button to toggle auth mode
 * @param {HTMLElement} authSubmitBtn - Submit button element
 * @param {HTMLElement} toggleText - Text element showing current mode
 * @param {HTMLElement} authSubtitle - Subtitle element
 * @param {HTMLElement} passwordHint - Password hint element
 * @param {Object} state - State object to track mode (should have isSignUpMode property)
 */
export function setupAuthToggleHandler(toggleAuthBtn, authSubmitBtn, toggleText, authSubtitle, passwordHint, state) {
    toggleAuthBtn.addEventListener('click', (e) => {
        e.preventDefault();
        state.isSignUpMode = !state.isSignUpMode;
        
        if (state.isSignUpMode) {
            authSubmitBtn.textContent = 'Create Account';
            toggleAuthBtn.textContent = 'Sign in instead';
            toggleText.textContent = 'Already have an account?';
            authSubtitle.textContent = 'Create a new account to continue';
            passwordHint.classList.remove('hidden');
        } else {
            authSubmitBtn.textContent = 'Sign in';
            toggleAuthBtn.textContent = 'Create an account';
            toggleText.textContent = "Don't have an account?";
            authSubtitle.textContent = 'Sign in to continue';
            passwordHint.classList.add('hidden');
        }
        
        // Clear any error messages
        document.getElementById('auth-error').classList.add('hidden');
    });
}

/**
 * Setup authentication submit handler (login or signup)
 * @param {HTMLElement} authSubmitBtn - Submit button element
 * @param {Object} authFunctions - Object containing Firebase auth functions
 *   - createUserWithEmailAndPassword
 *   - signInWithEmailAndPassword
 * @param {Object} state - State object with isSignUpMode and auth reference
 */
export function setupAuthSubmitHandler(authSubmitBtn, authFunctions, state) {
    authSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('auth-error');
        
        // Basic validation
        if (!email || !password) {
            errorEl.textContent = 'Please enter both email and password.';
            errorEl.classList.remove('hidden');
            return;
        }
        
        if (state.isSignUpMode && password.length < 6) {
            errorEl.textContent = 'Password must be at least 6 characters long.';
            errorEl.classList.remove('hidden');
            return;
        }
        
        try {
            if (state.isSignUpMode) {
                console.log('Attempting to create user with Firebase...');
                await authFunctions.createUserWithEmailAndPassword(state.auth, email, password);
                console.log('User created successfully!');
                // Success - auth state change will trigger redirect
            } else {
                console.log('Attempting to sign in with Firebase...');
                await authFunctions.signInWithEmailAndPassword(state.auth, email, password);
                console.log('User signed in successfully!');
                // Success - auth state change will trigger redirect
            }
        } catch (error) {
            console.error('Firebase Auth Error:', error);
            console.error('Error Code:', error.code);
            console.error('Error Message:', error.message);
            let errorMessage = state.isSignUpMode ? 'Account creation failed. ' : 'Login failed. ';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage += 'An account with this email already exists.';
                    break;
                case 'auth/user-not-found':
                    errorMessage += 'No account found with this email address.';
                    break;
                case 'auth/wrong-password':
                    errorMessage += 'Incorrect password.';
                    break;
                case 'auth/invalid-email':
                    errorMessage += 'Please enter a valid email address.';
                    break;
                case 'auth/weak-password':
                    errorMessage += 'Password is too weak. Use at least 6 characters.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage += 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage += 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage += state.isSignUpMode ? 'Please try again with different credentials.' : 'Please check your email and password.';
            }
            
            errorEl.textContent = errorMessage;
            errorEl.classList.remove('hidden');
        }
    });
}

/**
 * Setup logout handler
 * @param {HTMLElement} logoutBtn - Logout button element
 * @param {Function} signOutFn - Firebase signOut function
 * @param {Object} auth - Firebase auth reference
 */
export function setupLogoutHandler(logoutBtn, signOutFn, auth) {
    logoutBtn.addEventListener('click', () => signOutFn(auth));
}

/**
 * Setup create new graduation button handler
 * @param {HTMLElement} createNewBtn - Create new button element
 * @param {Function} navigationFn - Navigation function (e.g., goToNewGraduation)
 */
export function setupCreateNewHandler(createNewBtn, navigationFn) {
    createNewBtn.addEventListener('click', () => {
        navigationFn();
    });
}

/**
 * Setup form submission handler for new graduation creation
 * @param {HTMLElement} formElement - Form element
 * @param {Function} navigationFn - Navigation function (e.g., goToEditGraduation)
 * @param {Object} dbFunctions - Firestore functions
 * @param {Object} currentUser - Current authenticated user
 * @param {Function} showModalFn - Function to show modal
 */
export function setupNewGraduationFormHandler(formElement, navigationFn, dbFunctions, currentUser, showModalFn) {
    formElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const schoolName = document.getElementById('schoolName').value.trim();
            const graduationYear = document.getElementById('graduationYear').value;
            
            if (!schoolName || !graduationYear) {
                showModalFn('Error', 'Please fill in all fields.');
                return;
            }
            
            showModalFn('Creating...', 'Setting up your graduation website...', false);
            
            const { collection, addDoc } = dbFunctions;
            const newGradRef = await addDoc(collection(dbFunctions.db, 'graduations'), {
                editors: [currentUser.uid],
                createdBy: currentUser.uid,
                schoolName: schoolName,
                graduationYear: graduationYear,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            navigationFn(newGradRef.id);
        } catch (error) {
            console.error("Error creating graduation:", error);
            showModalFn('Error', 'Could not create the project.');
        }
    });
}

/**
 * Setup cancel button handler for forms
 * @param {HTMLElement} cancelBtn - Cancel button element
 * @param {Function} navigationFn - Navigation function to redirect
 */
export function setupCancelHandler(cancelBtn, navigationFn) {
    cancelBtn.addEventListener('click', () => navigationFn());
}

/**
 * Setup forgot password button handler
 * @param {HTMLElement} forgotPasswordBtn - Forgot password button element
 * @param {Function} showForgotPasswordModalFn - Function to show forgot password modal
 * @param {Function} resetPasswordFn - Password reset function from auth service
 * @param {Function} showModalFn - Function to show modal
 */
export function setupForgotPasswordHandler(forgotPasswordBtn, showForgotPasswordModalFn, resetPasswordFn, showModalFn) {
    if (!forgotPasswordBtn) return;
    
    forgotPasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        showForgotPasswordModalFn(async (email) => {
            try {
                // Show loading state
                showModalFn('Sending...', 'Sending password reset email...', false);
                
                // Call the reset password function
                await resetPasswordFn(email);
                
                // Show success message
                showModalFn('Email Sent', `Password reset link has been sent to ${email}. Please check your inbox and spam folder.`);
            } catch (error) {
                console.error('Password reset error:', error);
                showModalFn('Error', error.message || 'Failed to send password reset email. Please try again.');
            }
        });
    });
}

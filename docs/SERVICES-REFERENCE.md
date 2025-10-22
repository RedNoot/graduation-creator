# Phase 2 Services - Quick Reference Guide

## Overview

Phase 2 extracted business logic into **4 reusable service modules**. All services use standard ES6 module imports and export named functions.

## Service Modules

### 🔐 Authentication Service (`js/services/auth.js`)

**Purpose**: Handle user authentication with Firebase

```javascript
import { verifyStudentPassword, signUp, signIn, signOut, onAuthStateChange } from './js/services/auth.js';

// Verify a student's graduation password (server-side verification)
const isValid = await verifyStudentPassword(graduationId, studentId, password);

// Sign up new user
const credential = await signUp(email, password);

// Sign in existing user
const credential = await signIn(email, password);

// Sign out
await signOut();

// Listen to auth state changes
const unsubscribe = onAuthStateChange((user) => {
    if (user) console.log('User logged in:', user);
    else console.log('User logged out');
});
```

### ☁️ Cloudinary Service (`js/services/cloudinary.js`)

**Purpose**: Handle file uploads to Cloudinary

```javascript
import { uploadFile, getDownloadUrl, showUploadModal } from './js/services/cloudinary.js';

// Upload a file (PDF or image)
try {
    const url = await uploadFile(fileObject);
    console.log('Upload successful:', url);
} catch (error) {
    console.error('Upload failed:', error.message);
}

// Add download flag to Cloudinary URL
const downloadUrl = getDownloadUrl(cloudinaryUrl);

// Show upload modal for teachers
showUploadModal(studentId, studentName, graduationId, async (file) => {
    try {
        const pdfUrl = await uploadFile(file);
        // Update student record with PDF URL
    } catch (error) {
        console.error('Error:', error);
    }
});
```

**Supported File Types**: PDF, JPEG, PNG (max 10MB)

### 🗄️ Firestore Service (`js/services/firestore.js`)

**Purpose**: Manage all database operations

```javascript
import * as firestore from './js/services/firestore.js';

// GRADUATIONS
const gradId = await firestore.createGraduation({
    name: 'Class of 2024',
    year: 2024,
    createdBy: userId
});

const grad = await firestore.getGraduation(gradId);
await firestore.updateGraduation(gradId, { name: 'New Name' });

// Listen to changes
const unsub = firestore.onGraduationUpdate(gradId, (grad) => {
    console.log('Graduation updated:', grad);
});

// STUDENTS
const studentId = await firestore.createStudent(gradId, {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password'
});

const students = await firestore.getAllStudents(gradId);
const student = await firestore.getStudent(gradId, studentId);

await firestore.updateStudent(gradId, studentId, {
    profilePdfUrl: 'https://cloudinary.com/...'
});

await firestore.deleteStudent(gradId, studentId);

// Listen to student changes
firestore.onStudentsUpdate(gradId, (students) => {
    console.log('Students updated:', students);
});

// CONTENT PAGES (Messages, Speeches, etc)
const contentId = await firestore.addContentPage(gradId, {
    type: 'message', // 'message', 'speech', 'poem', etc
    title: 'Thank You',
    content: 'Lorem ipsum...',
    author: 'Principal'
});

const pages = await firestore.getContentPages(gradId);
await firestore.updateContentPage(gradId, contentId, { content: 'Updated' });
await firestore.deleteContentPage(gradId, contentId);

// Listen to content changes
firestore.onContentPagesUpdate(gradId, (pages) => {
    console.log('Content updated:', pages);
});

// QUERIES
const myGraduations = await firestore.queryGraduations('createdBy', '==', userId);
```

### 📄 PDF Service (`js/services/pdf-service.js`)

**Purpose**: Generate and view PDFs

```javascript
import { generateBooklet, viewStudentPdf, closeStudentPdfModal } from './js/services/pdf-service.js';

// Generate PDF booklet
await generateBooklet(graduationId,
    // Success callback
    (result) => {
        console.log(`Generated ${result.pageCount} pages from ${result.studentCount} students`);
        console.log('Booklet URL:', result.bookletUrl);
    },
    // Error callback
    (errorMessage) => {
        console.error('Generation failed:', errorMessage);
    }
);

// View student PDF in modal
await viewStudentPdf(pdfUrl, studentName);

// Close the PDF modal
closeStudentPdfModal();

// Make functions available globally for onclick handlers
window.viewStudentPdf = viewStudentPdf;
window.closeStudentPdfModal = closeStudentPdfModal;
```

## Integration Examples

### Example 1: Upload and Save Student PDF

```javascript
import { uploadFile } from './js/services/cloudinary.js';
import * as firestore from './js/services/firestore.js';

async function uploadStudentPdf(file, studentId, graduationId) {
    try {
        // Upload to Cloudinary
        const pdfUrl = await uploadFile(file);
        
        // Update student in Firestore
        await firestore.updateStudent(graduationId, studentId, {
            profilePdfUrl: pdfUrl,
            updatedAt: new Date()
        });
        
        console.log('Student PDF saved successfully');
    } catch (error) {
        console.error('Failed to save PDF:', error);
    }
}
```

### Example 2: Set Up Real-Time Graduation Dashboard

```javascript
import * as firestore from './js/services/firestore.js';

async function setupGraduationDashboard(graduationId) {
    // Listen to graduation changes
    const unsubGrad = firestore.onGraduationUpdate(graduationId, (grad) => {
        updateGraduationHeader(grad);
    });
    
    // Listen to student changes
    const unsubStudents = firestore.onStudentsUpdate(graduationId, (students) => {
        updateStudentsList(students);
    });
    
    // Listen to content changes
    const unsubContent = firestore.onContentPagesUpdate(graduationId, (pages) => {
        updateContentList(pages);
    });
    
    // Return cleanup function
    return () => {
        unsubGrad();
        unsubStudents();
        unsubContent();
    };
}
```

### Example 3: Verify Student and Show PDF

```javascript
import { verifyStudentPassword } from './js/services/auth.js';
import { viewStudentPdf } from './js/services/pdf-service.js';
import * as firestore from './js/services/firestore.js';

async function viewStudentProfile(graduationId, studentId, password) {
    try {
        // Verify password
        const isValid = await verifyStudentPassword(graduationId, studentId, password);
        
        if (!isValid) {
            showError('Invalid password');
            return;
        }
        
        // Get student data
        const student = await firestore.getStudent(graduationId, studentId);
        
        // Show PDF
        if (student.profilePdfUrl) {
            await viewStudentPdf(student.profilePdfUrl, student.name);
        } else {
            showError('No PDF available for this student');
        }
    } catch (error) {
        showError('Error:', error.message);
    }
}
```

## Error Handling

All services throw descriptive errors:

```javascript
try {
    const result = await uploadFile(file);
} catch (error) {
    // error.message contains user-friendly error text
    console.error('Upload failed:', error.message);
    
    // Possible messages:
    // - 'No file provided for upload'
    // - 'File size too large...'
    // - 'Invalid file type...'
    // - 'Upload failed...'
    // - 'Network error...'
}
```

## Dependencies

- **auth.js**: Firebase Auth SDK
- **cloudinary.js**: None (fetch API only)
- **firestore.js**: Firebase Firestore SDK
- **pdf-service.js**: None (fetch API only)

All services import from:
- `firebase-init.js` (for Firebase app instances)
- `config.js` (for configuration)

## Global Functions

Some functions are made available globally for inline event handlers:

```javascript
// In index.html
window.viewStudentPdf = viewStudentPdf;
window.closeStudentPdfModal = closeStudentPdfModal;

// In HTML onclick handlers
<button onclick="viewStudentPdf('url', 'name')">View PDF</button>
<button onclick="closeStudentPdfModal()">Close</button>
```

## Next Steps

See `PHASE-2-COMPLETE.md` for complete documentation and architecture overview.

Future phases will extract:
- **Phase 3**: UI Components (buttons, modals, cards, etc)
- **Phase 4**: Router/Navigation Logic
- **Phase 5**: Build System (Vite, Rollup, etc)

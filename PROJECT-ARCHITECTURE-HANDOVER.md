# Graduation Creator - Complete Project Architecture & System Documentation

**Project Lead Handover Document**  
**Date:** November 2, 2025  
**Version:** 1.0.0  
**Repository:** graduation-creator (RedNoot/graduation-creator)

---

## 📋 Executive Summary

The Graduation Creator is a **comprehensive web-based platform** for schools to create, manage, and publish interactive graduation websites. The application allows teachers to:
- Manage student profiles with photos and PDFs
- Generate professional booklets combining all student profiles
- Create custom content pages (speeches, messages, memories)
- Publish beautiful, themed public graduation websites
- Support multi-user collaboration with real-time conflict detection
- Schedule booklet downloads with customizable release dates

**Tech Stack:** Jamstack Architecture (Static Frontend + Serverless Functions)  
**Hosting:** Netlify (with auto-deployment from GitHub)  
**Database:** Firebase Firestore  
**Authentication:** Firebase Auth  
**File Storage:** Cloudinary  
**Error Tracking:** Sentry  
**Frontend:** Vanilla JavaScript (ES6 Modules) + Tailwind CSS  
**Backend:** Netlify Functions (Node.js 18+)

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Static Frontend (index.html + JS Modules)          │   │
│  │  - SPA Routing (Hash-based)                         │   │
│  │  - Firebase Auth                                    │   │
│  │  - Real-time Listeners                              │   │
│  └──────────────────┬──────────────────────────────────┘   │
└────────────────────┼───────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼─────────┐     ┌────────▼─────────┐
│  Netlify CDN    │     │  Netlify         │
│  (Static Host)  │     │  Functions       │
│  - HTML/CSS/JS  │     │  (Serverless)    │
│  - Auto Deploy  │     │  - PDF Gen       │
│  - CSP Headers  │     │  - Auth Ops      │
└────────┬────────┘     │  - Cleanup       │
         │              └────────┬──────────┘
         │                       │
    ┌────▼──────────────────────▼────┐
    │                                 │
┌───▼─────────────┐     ┌────────────▼────────┐
│  Firebase       │     │  Cloudinary         │
│  - Firestore DB │     │  - PDF Storage      │
│  - Auth         │     │  - Image Storage    │
│  - Real-time    │     │  - Transformations  │
└─────────────────┘     └─────────────────────┘
```

### Component Architecture

**Frontend (Client-Side)**
```
js/
├── config.js                    # Environment configuration
├── firebase-init.js             # Firebase SDK initialization
├── components/                  # UI Components
│   ├── cards.js                # Student/Content card rendering
│   ├── forms.js                # Form generators
│   ├── layout.js               # Page layout components
│   ├── modal.js                # Modal dialogs
│   ├── tabs.js                 # Tab navigation
│   ├── collaborative-ui.js     # Real-time editing UI
│   └── setup-guide.js          # Onboarding wizard for new projects
├── data/                        # Repository Pattern (Data Layer)
│   ├── graduation-repository.js
│   ├── student-repository.js
│   └── content-repository.js
├── handlers/                    # Event Handlers
│   ├── auth-handlers.js        # Login/signup/logout
│   ├── student-handlers.js     # Student CRUD + uploads
│   ├── content-handlers.js     # Content page management
│   └── ui-handlers.js          # Settings, tabs, downloads
├── router/                      # SPA Routing System
│   ├── router.js               # Route orchestration
│   ├── routes.js               # Route definitions
│   └── navigation.js           # Navigation helpers
├── services/                    # Business Logic Services
│   ├── auth.js                 # Authentication service
│   ├── firestore.js            # Database operations
│   ├── cloudinary.js           # File uploads
│   ├── pdf-service.js          # PDF generation/viewing
│   ├── error-handler.js        # Error parsing/handling
│   └── logger.js               # Structured logging
└── utils/                       # Utility Functions
    ├── collaborative-editing.js # Multi-user conflict detection
    ├── sentry-config.js        # Error tracking setup
    ├── sanitize.js             # Input sanitization
    ├── url-helpers.js          # URL manipulation
    ├── clipboard.js            # Copy-to-clipboard
    └── error-recovery.js       # Retry logic
```

**Backend (Serverless Functions)**
```
netlify/functions/
├── generate-booklet.js          # PDF merging & generation (main)
├── manage-editors.js            # Multi-user editor management
├── secure-operations.js         # Password verification
├── download-booklet.js          # Secure download endpoint
├── scheduled-cleanup.js         # Daily cleanup (cron job)
└── utils/
    └── rate-limiter.js          # Request rate limiting
```

---

## 🗄️ Data Model & Schema

### Firestore Database Structure

```
firestore/
├── assetsPendingDeletion/{docId}            # Orphaned asset tracking
│   ├── url: string                          # Full Cloudinary URL
│   ├── publicId: string                     # Extracted public ID
│   ├── context: string                      # Asset type context
│   ├── markedAt: timestamp                  # When marked for deletion
│   ├── status: 'pending'|'failed'           # Processing status
│   ├── lastAttempt: timestamp               # Last deletion attempt
│   └── error: string                        # Error message if failed
│
├── graduations/{gradId}                     # Main graduation documents
│   ├── schoolName: string
│   ├── graduationYear: number
│   ├── urlSlug: string (unique)
│   ├── editors: array<uid>                  # Multi-user support
│   ├── createdBy: uid
│   ├── ownerUid: uid (backwards compat)
│   ├── generatedBookletUrl: string
│   ├── bookletGeneratedAt: timestamp        # Last booklet generation time
│   ├── customCoverUrl: string
│   ├── isSetupComplete: boolean             # Setup guide completion flag
│   ├── activeEditors: map<uid, timestamp>   # Real-time presence
│   ├── lockedFields: map<fieldPath, {editorUid, email, timestamp}>  # Field-level locks (NEW)
│   ├── config: {                            # Settings object
│   │   primaryColor: string
│   │   secondaryColor: string
│   │   textColor: string
│   │   font: string
│   │   layout: 'grid'|'cards'|'list'|'scroll'
│   │   cardStyle: 'shadow'|'border'|'elevated'|'minimal'
│   │   borderRadius: 'none'|'small'|'medium'|'large'|'full'
│   │   headerStyle: 'centered'|'left'|'banner'|'minimal'
│   │   animationStyle: 'fade'|'slide'|'bounce'|'none'
│   │   showSpeeches: boolean
│   │   showMessages: boolean
│   │   enableStudentCoverPages: boolean
│   │   allowCoverPhotos: boolean
│   │   pageOrder: array<string>
│   │   enableDownloadScheduling: boolean
│   │   downloadableAfterDate: timestamp
│   │   downloadMessage: string
│   │   setupStatus: {                       # Setup guide progress tracking
│   │       studentsAdded: boolean
│   │       contentAdded: boolean
│   │       themeCustomized: boolean
│   │       bookletGenerated: boolean
│   │   }
│   │   }
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
│   
│   ├── students/{studentId}                 # Students subcollection
│   │   ├── name: string
│   │   ├── order: number (for drag-drop sorting)
│   │   ├── profilePdfUrl: string
│   │   ├── profilePhotoUrl: string
│   │   ├── coverPhotoBeforeUrl: string
│   │   ├── coverPhotoAfterUrl: string
│   │   ├── graduationSpeech: string
│   │   ├── password: string (hashed for direct upload)
│   │   ├── createdAt: timestamp
│   │   └── updatedAt: timestamp
│   
│   └── contentPages/{pageId}                # Custom content subcollection
│       ├── title: string
│       ├── author: string
│       ├── type: 'speech'|'memory'|'thanks'|'text'
│       ├── content: string (rich text)
│       ├── authorPhotoUrl: string
│       ├── bodyImageUrls: array<string>
│       ├── imageSize: 'small'|'medium'|'large'
│       ├── videoUrl: string
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
```

### Security Rules

**File:** `firestore.rules`

**Key Features:**
- ✅ Multi-user support with `editors` array
- ✅ Backwards compatibility with `ownerUid` field
- ✅ Real-time presence tracking (`activeEditors` map)
- ✅ Atomic editor list updates
- ✅ Immutable `createdBy` field
- ✅ Subcollection inheritance (students/contentPages)

**Access Control:**
- Read: User must be in `editors` array OR legacy `ownerUid`
- Create: User must add themselves to `editors` array
- Update: Only editors can modify; special rule for presence updates
- Delete: Only editors can delete
- Subcollections: Inherit parent graduation permissions

---

## 🔑 Key Features & Implementations

### 1. Multi-User Collaboration System

**Status:** ✅ Fully Implemented (Enhanced Nov 2, 2025)

**Components:**
- **Presence Tracking:** Real-time awareness of active editors
- **Conflict Detection:** Timestamp-based change detection
- **Conflict Resolution:** Modal warning with Reload/Force Save options
- **Unsaved Changes Warning:** Prevent accidental data loss on navigation
- **Stale Presence Cleanup:** Auto-remove inactive editors after 5 minutes
- **🆕 Real-Time Field Locking:** Google Docs-style field-level locking (NEW)

**Files:**
- `js/utils/collaborative-editing.js` - Core manager singleton
- `js/utils/field-lock-manager.js` - Field locking manager (NEW)
- `js/utils/field-locking-integration.js` - Integration helpers (NEW)
- `js/components/collaborative-ui.js` - UI components (includes field lock indicators)
- Integration in routers and handlers
- Full documentation: `docs/FIELD-LOCKING-IMPLEMENTATION.md` (NEW)

**Flow:**
```
User enters edit page
  → Start presence tracking (activeEditors.{uid} = timestamp)
  → Initialize field lock manager
  → Listen for other editors
  → Show banner if others present
  → Heartbeat every 60s
  
User focuses on form field (NEW)
  → Attempt to acquire field lock
  → If successful: Show "Editing" indicator, allow typing
  → If locked by other: Blur field, show conflict modal
  
User types in unlocked field
  → Mark pendingChanges = true
  → Field remains locked
  
User blurs field (NEW)
  → Release field lock automatically
  → Remove "Editing" indicator
  
User clicks Save
  → Check for conflicts (compare updatedAt)
  → If conflict: Show modal (Reload | Force Save)
  → If no conflict: Save normally
  → Clear pendingChanges
  
User navigates away
  → If pendingChanges: Warn user
  → Unlock all held fields
  → Stop tracking (remove from activeEditors)
  → Cleanup field lock manager
```

### 2. PDF Booklet Generation

**Status:** ✅ Fully Implemented

**Architecture:** Server-side processing (Netlify Function)

**Function:** `netlify/functions/generate-booklet.js`

**Features:**
- ✅ Merge multiple student PDFs
- ✅ Custom cover page support
- ✅ Table of Contents generation
- ✅ Content pages (speeches/messages) integration
- ✅ Student cover pages with photos + grad message
- ✅ Custom page ordering
- ✅ PDF optimization (q_auto:eco)
- ✅ Validation & error handling
- ✅ Rate limiting (3 requests/minute)
- ✅ Cloudinary cleanup (old booklets)
- ✅ Generation timestamp tracking (bookletGeneratedAt)

**Flow:**
```
Client → POST /.netlify/functions/generate-booklet
  Request Body: {graduationId, customCoverUrl, pageOrder}
  
Server:
  1. Validate request & rate limit
  2. Fetch graduation data from Firestore
  3. Fetch all students with PDFs
  4. Fetch content pages
  5. Create new PDF document (pdf-lib)
  6. Add custom cover OR generate default
  7. Add Table of Contents
  8. For each section in pageOrder:
     - Add section title page
     - Add content pages OR student PDFs
     - For students: Add cover page if enabled
  9. Optimize & save final PDF
  10. Upload to Cloudinary
  11. Delete old booklet from Cloudinary
  12. Update Firestore with new URL
  13. Return success + metadata

Client receives:
  {bookletUrl, pageCount, studentCount, processedStudents, skippedStudents}
```

### 3. File Upload System

**Status:** ✅ Fully Implemented

**Service:** `js/services/cloudinary.js`

**Features:**
- ✅ PDF uploads (raw/upload endpoint)
- ✅ Image uploads (JPEG, PNG)
- ✅ File validation (type, size, extension)
- ✅ Security checks (sanitization, malicious patterns)
- ✅ Size limit (10MB)
- ✅ Error handling with user-friendly messages
- ✅ Progress tracking & logging

**Upload Flow:**
```
User selects file
  → Frontend validates (type, size, name)
  → Create FormData with file + upload_preset
  → Determine endpoint (raw/upload for PDFs, image/upload for images)
  → POST to Cloudinary
  → Handle errors with specific messages
  → Return secure_url
  → Update Firestore with URL
```

### 4. Authentication & Authorization

**Status:** ✅ Fully Implemented

**Service:** `js/services/auth.js`

**Features:**
- ✅ Email/password authentication
- ✅ User sign up & sign in
- ✅ Auto sign out
- ✅ Auth state persistence
- ✅ Sentry user context tracking
- ✅ Student password verification (serverless function)

**Routes:**
- **Authenticated:** Dashboard, Edit Graduation, New Graduation
- **Public:** Public View, Upload Portal, Direct Upload
- **Mixed:** Login (public when logged out)

**Authorization Flow:**
```
User Authentication:
  Login → Firebase Auth → Set user context → Route to dashboard
  
Graduation Access:
  User opens graduation
    → Check if user.uid in graduation.editors OR user.uid === ownerUid
    → If yes: Grant edit access
    → If no: Deny (redirect to dashboard)
  
Student Upload:
  Upload portal → Password verification via serverless function
  Direct link → Auto-authenticated with linkId
```

### 5. Theming & Customization

**Status:** ✅ Fully Implemented

**Configuration:** `graduation.config` object

**Options:**
- **Colors:** primary, secondary, background, text
- **Layout:** grid, cards, list, scroll
- **Card Style:** shadow, border, elevated, minimal
- **Border Radius:** none, small, medium, large, full
- **Header Style:** centered, left, banner, minimal
- **Animation:** fade, slide, bounce, none
- **Font:** system selection (Inter, Roboto, etc.)

**Dynamic Rendering:**
```javascript
// Example: Card style application
const cardStyleClass = {
    'shadow': 'shadow-md hover:shadow-lg transition-shadow',
    'border': 'border border-gray-200',
    'elevated': 'shadow-lg transform hover:scale-105 transition-all',
    'minimal': 'bg-transparent'
}[config.cardStyle];

// All public view elements use config values dynamically
```

### 6. Content Management System

**Status:** ✅ Fully Implemented

**Collection:** `graduations/{gradId}/contentPages`

**Features:**
- ✅ Multiple content types (speech, memory, thanks, text)
- ✅ Rich text editor (multi-line textarea)
- ✅ Author attribution with photo
- ✅ Body images (multiple, with size control)
- ✅ Video embedding (YouTube/Vimeo)
- ✅ Real-time CRUD operations
- ✅ Integration into PDF booklet
- ✅ Public website display

**Content Flow:**
```
Teacher creates content
  → Fill form (title, author, type, content, optional media)
  → Save to Firestore contentPages subcollection
  → Real-time listener updates content list
  → Content appears on public website
  → Content included in PDF booklet (videos excluded)
```

### 7. Student Profile Management

**Status:** ✅ Fully Implemented

**Features:**
- ✅ Add/Edit/Delete students
- ✅ Drag-and-drop reordering
- ✅ CSV bulk import
- ✅ Profile photos
- ✅ Before/After cover photos
- ✅ Graduation speech/message
- ✅ PDF profile upload
- ✅ Direct upload links (password-protected)
- ✅ PDF viewer modal with student info

**CSV Import Format:**
```csv
name,password
John Smith,password123
Jane Doe,securepass456
```

### 8. Download Scheduling

**Status:** ✅ Fully Implemented

**Features:**
- ✅ Enable/disable toggle
- ✅ Date/time picker for release
- ✅ Custom pre-release message
- ✅ Visual status indicators
- ✅ Countdown display
- ✅ Server-side validation (via serverless function)

**Logic:**
```javascript
const isScheduled = config.enableDownloadScheduling && config.downloadableAfterDate;
const isAvailable = !isScheduled || new Date() >= new Date(config.downloadableAfterDate);

if (isAvailable) {
  // Show download button
} else {
  // Show "Available on {date}" message + custom text
}
```

### 9. Orphaned Asset Cleanup System

**Status:** ✅ Fully Implemented (Nov 2, 2025)

**Purpose:** Automatically track and delete replaced/deleted Cloudinary assets to prevent storage bloat and unnecessary costs.

**Components:**
- `js/utils/asset-cleanup.js` - Asset tracking utilities
- `netlify/functions/scheduled-cleanup.js` - Daily cleanup processor
- Firestore collection: `assetsPendingDeletion`

**Features:**
- ✅ Automatic tracking when assets are replaced
- ✅ Graceful degradation (tracking failures don't block operations)
- ✅ Two-phase deletion (mark → process)
- ✅ Context tracking (student photos, PDFs, content images, etc.)
- ✅ Daily scheduled cleanup via Netlify function
- ✅ Failed deletion retry mechanism

**Tracked Assets:**
- Student profile photos
- Student cover photos (before/after)
- Student profile PDFs
- Content page author photos
- Content page body images
- Custom cover pages
- Generated booklets

**Flow:**
```javascript
// When asset is replaced:
await replaceAsset(oldUrl, newUrl, 'student-profile-photo');
  → Adds oldUrl to assetsPendingDeletion collection
  → Status: 'pending'
  
// Daily at 2 AM (scheduled-cleanup.js):
Query assetsPendingDeletion where status='pending'
  → For each asset:
    - Delete from Cloudinary via Admin API
    - If success: Delete tracking doc
    - If failed: Mark status='failed' for retry
```

**Integration:**
All repository update/delete methods automatically track old assets using try-catch blocks to ensure operations continue even if tracking fails.

### 10. Setup Guide Tracking System

**Status:** ✅ Fully Implemented (Nov 2, 2025)

**Purpose:** Track user onboarding progress through key setup steps for new graduation projects.

**Components:**
- `isSetupComplete` - Top-level boolean flag (false for new projects)
- `config.setupStatus` - Object tracking 4 setup milestones
- `GraduationRepository.setSetupStepComplete()` - Function to mark steps complete

**Tracked Steps:**
1. **studentsAdded** - Triggers when first student is added (bulk or CSV import)
2. **contentAdded** - Triggers when first content page is created
3. **themeCustomized** - Triggers when graduation settings are saved
4. **bookletGenerated** - Triggers when PDF booklet is successfully generated

**Auto-Completion Logic:**
When all 4 steps are complete, `isSetupComplete` automatically updates to `true`.

**Implementation:**
```javascript
// New graduation initialization (in firestore.js)
config: {
  setupStatus: {
    studentsAdded: false,
    contentAdded: false,
    themeCustomized: false,
    bookletGenerated: false
  }
},
isSetupComplete: false

// Mark step complete (in GraduationRepository)
await GraduationRepository.setSetupStepComplete(gradId, 'studentsAdded');
  → Updates config.setupStatus.studentsAdded = true
  → Checks if all steps complete
  → If yes, sets isSetupComplete = true
```

**Data Flow:**
```
User adds first student
  → student-handlers.js detects successful add
  → Calls setSetupStepComplete(gradId, 'studentsAdded')
  → Updates Firestore: config.setupStatus.studentsAdded = true
  → Router passes updated gradData to editor
  → UI can display setup progress (future enhancement)
```

**Benefits:**
- Non-blocking (wrapped in try-catch, failures don't interrupt operations)
- Automatic tracking across bulk and single operations
- Foundation for setup wizard UI (Task 19)
- Available in `gradData` for conditional rendering

**UI Component:**
- `js/components/setup-guide.js` - Visual onboarding wizard (Task 19)
- Renders as full-screen alternative to tabbed dashboard for new projects
- Shows golden path checklist with dynamic completion indicators
- Clickable steps activate corresponding tabs
- Auto-completes and reloads when all steps done
- Includes skip option for experienced users

### 11. Onboarding Experience (Setup Guide)

**Status:** ✅ Fully Implemented (Nov 2, 2025)

**Purpose:** Provide guided onboarding for new graduation projects to improve user experience and reduce confusion.

**Component:** `js/components/setup-guide.js`

**Features:**
- ✅ Full-screen Setup Guide replaces tabbed dashboard for new projects
- ✅ 4-step golden path checklist with visual progress
- ✅ Dynamic checkmarks (✅/⬜) based on `config.setupStatus`
- ✅ Clickable steps activate corresponding tabs
- ✅ Auto-completion celebration when all steps done
- ✅ Skip option for experienced users
- ✅ Beautiful gradient design with responsive layout

**Setup Steps Shown:**
1. **Add Your Students** → Activates Students tab
2. **Add Speeches & Messages** → Activates Content tab
3. **Customize Your Site** → Activates Settings tab
4. **Generate Booklet & Publish** → Activates Booklet tab

**Conditional Rendering:**
```javascript
// In renderEditor (index.html)
if (!gradData.isSetupComplete) {
  // Show Setup Guide (full-screen onboarding)
  renderSetupGuide(gradData, gradId, activateTab);
} else {
  // Show full tabbed dashboard
  renderFullDashboard(gradData, gradId);
}
```

**User Flow:**
```
New project created
  → isSetupComplete: false
  → User sees Setup Guide instead of tabs
  
User clicks "Add Your Students"
  → activateTab('students') called
  → Full dashboard renders with Students tab active
  → User adds first student
  → studentsAdded flips to true
  → Setup Guide shows checkmark on next visit
  
All 4 steps completed
  → Setup Guide shows celebration message
  → User clicks "Continue to Dashboard"
  → Page reloads, shows full tabbed interface
  → isSetupComplete: true persists forever
```

**Skip Functionality:**
Users familiar with the system can click "skip to full dashboard" link to bypass the guide and immediately access all tabs.

### 12. Error Handling & Monitoring

**Status:** ✅ Fully Implemented

**Tools:**
- **Sentry:** Real-time error tracking with context
- **Logger:** Structured logging utility
- **Error Service:** User-friendly error messages

**Features:**
- ✅ Automatic error capture
- ✅ User context tracking (UID, email, gradId)
- ✅ Breadcrumb trail
- ✅ Severity levels (info, warn, error, critical)
- ✅ Action tracking (auth, upload, PDF, database)
- ✅ Network error detection
- ✅ Graceful error recovery with retry logic

**Integration:**
```javascript
// Example: Automatic error logging
import { logger } from './utils/logger.js';

try {
  await uploadFile(file);
  logger.uploadAction('success', fileName, fileSize, fileType);
} catch (error) {
  logger.error('Upload failed', error, {
    gradId: graduationId,
    studentId: studentId,
    action: 'uploadFile'
  });
  // Error automatically sent to Sentry with full context
}
```

---

## 🚀 Deployment & Infrastructure

### Hosting: Netlify

**Configuration:** `netlify.toml`

**Features:**
- ✅ Auto-deployment from GitHub (main branch)
- ✅ Serverless functions bundling (esbuild)
- ✅ SPA routing redirects
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ Scheduled functions (daily cleanup cron)
- ✅ Environment variable injection

**Build Settings:**
```toml
[build]
  functions = "netlify/functions"
  publish = "."
  
[build.environment]
  NODE_VERSION = "18"
  SECRETS_SCAN_ENABLED = "false"
```

**Redirects:**
```
/view/* → /index.html (SPA routing)
/upload/* → /index.html (SPA routing)
/api/* → /.netlify/functions/:splat (API proxy)
/download/:gradId → /.netlify/functions/download-booklet/:gradId
/* → /index.html (catch-all)
```

### Environment Variables

**Frontend (Public - Client-accessible):**
```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

**Backend (Private - Functions only):**
```
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_BASE_64_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_UPLOAD_PRESET
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

**Security:**
```
SECRETS_SCAN_ENABLED=false (Firebase frontend config is intentionally public)
```

### Database: Firebase Firestore

**Features:**
- ✅ Real-time listeners (onSnapshot)
- ✅ Compound queries
- ✅ Subcollection support
- ✅ Server timestamps
- ✅ Array operations (arrayUnion, arrayRemove)
- ✅ Security rules enforcement

**Indexes:** (Auto-created by Firebase)
- `graduations` where `editors array-contains {uid}`
- `graduations` where `ownerUid == {uid}`
- `students` order by `order asc`

### File Storage: Cloudinary

**Features:**
- ✅ PDF storage (raw upload)
- ✅ Image storage with transformations
- ✅ URL-based optimizations (q_auto)
- ✅ Secure upload presets
- ✅ Automatic cleanup via scheduled function

**Folders:**
```
graduation-pdfs/          # Student profile PDFs
graduation-photos/        # Student profile photos
graduation-booklets/      # Generated class booklets
graduation-covers/        # Custom cover pages
graduation-content/       # Content page media
```

---

## 🔒 Security Implementation

### Content Security Policy (CSP)

**File:** `netlify.toml` (headers section)

**Policy:**
```
default-src 'self'
script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdn.tailwindcss.com
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
img-src 'self' data: https://res.cloudinary.com
connect-src 'self' https://*.googleapis.com https://api.cloudinary.com
frame-src 'self' blob: https://www.youtube.com https://player.vimeo.com
```

**Features:**
- ✅ Prevents XSS attacks
- ✅ Restricts external script loading
- ✅ Allows required CDNs (Firebase, Cloudinary, Tailwind)
- ✅ Blob URLs for PDF viewing
- ✅ Video embedding (YouTube/Vimeo)

### Input Sanitization

**File:** `js/utils/sanitize.js`

**Functions:**
- `sanitizeHTML()` - Remove script tags, dangerous attributes
- `sanitizeURL()` - Validate and clean URLs
- `sanitizeFilename()` - Remove path traversal attempts

**Applied:**
- All user-generated content
- File uploads
- URL parameters
- Form inputs

### Rate Limiting

**File:** `netlify/functions/utils/rate-limiter.js`

**Limits:**
- PDF Generation: 3 requests/minute per IP
- Editor Management: 10 requests/minute per IP
- Password Verification: 5 requests/minute per IP

**Implementation:**
```javascript
const rateLimitCheck = rateLimiter.check(clientIP, {
  maxAttempts: 3,
  windowMs: 60 * 1000,
  action: 'PDF generation'
});

if (!rateLimitCheck.allowed) {
  return rateLimiter.createRateLimitResponse(rateLimitCheck);
}
```

### Authentication Security

**Features:**
- ✅ Firebase Auth (industry-standard)
- ✅ Secure session management
- ✅ Password hashing (bcrypt via serverless function)
- ✅ Token-based API authentication
- ✅ HTTPS-only cookies

---

## 🧪 Testing & Quality Assurance

### Manual Testing Checklist

**Authentication:**
- [ ] Sign up new user
- [ ] Sign in existing user
- [ ] Sign out
- [ ] Session persistence across page reload

**Graduation Management:**
- [ ] Create new graduation
- [ ] Edit graduation settings
- [ ] View graduation list
- [ ] Delete graduation

**Student Management:**
- [ ] Add student manually
- [ ] Import students via CSV
- [ ] Drag-and-drop reorder
- [ ] Upload profile photo
- [ ] Upload profile PDF
- [ ] Upload cover page photos
- [ ] Add graduation speech
- [ ] Delete student

**Content Pages:**
- [ ] Create speech
- [ ] Create message
- [ ] Create memory
- [ ] Add author photo
- [ ] Add body images
- [ ] Embed video
- [ ] Edit content
- [ ] Delete content

**PDF Booklet:**
- [ ] Generate booklet with students
- [ ] Generate booklet with content pages
- [ ] Generate booklet with custom cover
- [ ] Generate booklet with student cover pages
- [ ] Download booklet
- [ ] View generated PDF

**Theming:**
- [ ] Change primary/secondary colors
- [ ] Switch layouts (grid, cards, list, scroll)
- [ ] Change card style
- [ ] Change border radius
- [ ] Change animations
- [ ] Verify public site reflects changes

**Multi-User:**
- [ ] Two editors open same graduation
- [ ] Both editors see active banner
- [ ] Editor A makes change
- [ ] Editor B saves (should detect conflict)
- [ ] Navigate away with unsaved changes (should warn)
- [ ] **Field Locking (NEW):**
  - [ ] Editor A focuses field → field locks, green indicator shows
  - [ ] Editor B sees amber "locked" indicator and disabled field
  - [ ] Editor A blurs field → unlocks automatically
  - [ ] Editor B can now edit field
  - [ ] Stale locks cleanup after 5 minutes

**Download Scheduling:**
- [ ] Enable scheduling
- [ ] Set future date
- [ ] Verify download blocked
- [ ] Change date to past
- [ ] Verify download allowed

**Error Scenarios:**
- [ ] Upload oversized file (>10MB)
- [ ] Upload wrong file type
- [ ] Generate PDF with no students
- [ ] Network disconnect during upload
- [ ] Invalid graduation ID in URL

### Browser Compatibility

**Tested Browsers:**
- ✅ Chrome 90+ (primary)
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Mobile Responsive:**
- ✅ iOS Safari
- ✅ Chrome Mobile
- ✅ Tablet layouts

---

## 📊 Performance Optimization

### Client-Side

**Implemented:**
- ✅ ES6 module bundling
- ✅ Dynamic imports (code splitting)
- ✅ Real-time listener debouncing
- ✅ Lazy loading images
- ✅ Efficient DOM updates
- ✅ Minimal re-renders

### Server-Side

**Implemented:**
- ✅ PDF compression (q_auto:eco)
- ✅ Cloudinary CDN delivery
- ✅ Function cold start optimization
- ✅ Firestore query optimization
- ✅ Rate limiting prevents abuse

### Recommendations

**Future Optimizations:**
- [ ] Service Worker for offline support
- [ ] IndexedDB caching for graduation data
- [ ] Image optimization pipeline
- [ ] Pre-generate common PDFs
- [ ] WebP image format support

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **PDF Size:** Student PDFs limited to 50 pages each, final booklet max 100MB
2. ~~**Concurrent Editing:** No real-time form field locking (only conflict detection on save)~~ **✅ RESOLVED Nov 2, 2025** - Real-time field locking now implemented
3. **File Uploads:** 10MB limit per file
4. **CSV Import:** Basic validation (name + password only)
5. **Video Embedding:** Not included in PDF booklets (web-only)

### Known Bugs

**Non-Critical:**
- ⚠️ 403 errors on presence tracking (handled gracefully, non-blocking)
- ⚠️ Modal focus trap not implemented (accessibility)
- ⚠️ Drag-and-drop visual feedback could be improved

**Fixed Issues:**
- ✅ PDF modal scroll squishing (resolved Nov 2, 2025)
- ✅ Profile picture upload when cover photos disabled (resolved Nov 2, 2025)
- ✅ Syntax error in student data onclick (resolved Nov 2, 2025)
- ✅ Content validation blocking PDF generation (resolved Nov 2, 2025)

---

## 📝 Maintenance & Operations

### Daily Operations

**Automated:**
- Scheduled cleanup runs daily via `scheduled-cleanup.js`
- Deletes graduation booklets older than 30 days (configurable)
- Cleans up Cloudinary orphaned files
- Auto-deployment on git push to main

**Manual:**
- Monitor Sentry for critical errors
- Check Netlify function logs for anomalies
- Review Cloudinary storage usage

### Common Tasks

**Add New Editor to Project:**
```javascript
// Via UI: Settings → Manage Editors → Add by email
// Via Console:
await GraduationRepository.addEditor(gradId, newEditorUid);
```

**Reset Student Password:**
```javascript
// Via UI: Students tab → Edit student → Set password
// Or regenerate direct upload link
```

**Manually Trigger Cleanup:**
```
POST /.netlify/functions/scheduled-cleanup
Headers: X-Cleanup-Secret: {secret-from-env}
```

**Debug Firestore Rules:**
```
firebase emulators:start --only firestore
```

### Backup & Recovery

**Data Backup:**
- Firebase automatic daily backups (enabled in console)
- Export Firestore data: `gcloud firestore export gs://bucket`

**File Backup:**
- Cloudinary versioning enabled
- Manual backup: Download all files via Cloudinary API

**Recovery Procedure:**
1. Restore Firestore from backup
2. Verify graduation data integrity
3. Re-generate booklets if needed
4. Test authentication flow

---

## 🔄 Migration Guide

### From Previous Version

**Multi-User Migration:**
The system maintains backwards compatibility with the old `ownerUid` field while supporting the new `editors` array.

**Automatic:**
- Firestore rules check both `editors` array and `ownerUid`
- Repository queries both fields
- No manual migration required

**Optional Enhancement:**
```javascript
// Run migration script to convert ownerUid → editors array
import { migrateGraduation } from './js/utils/migrate-editors.js';
await migrateGraduation(gradId, gradData, false); // dryRun=false
```

**Student Order Migration:**
```javascript
// If students lack 'order' field, run migration
import { migrateGraduationStudents } from './js/utils/migrate-student-order.js';
await migrateGraduationStudents(gradId);
```

---

## 📚 API Reference

### Repository Methods

**GraduationRepository:**
```javascript
await GraduationRepository.create(data)
await GraduationRepository.getById(gradId)
await GraduationRepository.getBySlug(slug)
await GraduationRepository.update(gradId, updates)
await GraduationRepository.getByOwner(userUid)
await GraduationRepository.addEditor(gradId, editorUid)
await GraduationRepository.removeEditor(gradId, editorUid)
await GraduationRepository.setSetupStepComplete(gradId, stepName)
GraduationRepository.onUpdate(gradId, callback)
```

**StudentRepository:**
```javascript
await StudentRepository.create(gradId, data)
await StudentRepository.getById(gradId, studentId)
await StudentRepository.getAll(gradId)
await StudentRepository.update(gradId, studentId, updates)
await StudentRepository.delete(gradId, studentId)
await StudentRepository.updateOrder(gradId, updates)
StudentRepository.onUpdate(gradId, callback)
```

**ContentRepository:**
```javascript
await ContentRepository.create(gradId, data)
await ContentRepository.getAll(gradId)
await ContentRepository.update(gradId, contentId, updates)
await ContentRepository.delete(gradId, contentId)
ContentRepository.onUpdate(gradId, callback)
```

### Netlify Functions

**generate-booklet:**
```
POST /.netlify/functions/generate-booklet
Body: {
  graduationId: string,
  customCoverUrl?: string,
  pageOrder?: string[]
}
Response: {
  success: boolean,
  bookletUrl: string,
  pageCount: number,
  studentCount: number,
  processedStudents: number,
  skippedStudents: string[]
}
```

**manage-editors:**
```
POST /.netlify/functions/manage-editors
Body: {
  action: 'add' | 'remove' | 'list',
  graduationId: string,
  email?: string
}
Response: {
  success: boolean,
  editors?: array,
  message?: string
}
```

---

## 🎯 Future Roadmap

### Short-Term (Next 3 Months)

- [x] ✅ Real-time form field locking (show who's editing what) - **COMPLETED Nov 2, 2025**
- [x] ✅ Booklet generation timestamp display - **COMPLETED Nov 2, 2025**
- [x] ✅ Orphaned asset cleanup system - **COMPLETED Nov 2, 2025**
- [ ] Email notifications for editor invites
- [ ] Bulk student photo upload
- [ ] PDF preview before generation
- [ ] Export graduation data as JSON
- [ ] Accessibility improvements (WCAG 2.1 AA)

### Medium-Term (3-6 Months)

- [ ] Mobile app (React Native)
- [ ] Student self-registration portal
- [ ] Advanced analytics dashboard
- [ ] Template library for cover pages
- [ ] Multi-language support (i18n)
- [ ] Print-ready booklet formatting options

### Long-Term (6-12 Months)

- [ ] White-label solution for schools
- [ ] Integrated payment for premium features
- [ ] AI-powered photo enhancement
- [ ] Video montage generation
- [ ] Alumni tracking system
- [ ] Integration with school SIS systems

---

## 📞 Support & Resources

### Documentation

- `README.md` - Getting started guide
- `docs/FEATURES.md` - Feature descriptions
- `docs/DEPLOYMENT.md` - Deployment instructions
- `docs/SECURITY.md` - Security guidelines
- `docs/CONCURRENT-EDITING-IMPLEMENTATION.md` - Multi-user details
- `docs/FIELD-LOCKING-IMPLEMENTATION.md` - Field locking system (NEW)

### External Resources

- **Firebase Docs:** https://firebase.google.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **Cloudinary Docs:** https://cloudinary.com/documentation
- **Sentry Docs:** https://docs.sentry.io
- **Tailwind CSS:** https://tailwindcss.com/docs

### Contact

- **Repository:** https://github.com/RedNoot/graduation-creator
- **Issues:** https://github.com/RedNoot/graduation-creator/issues
- **Sentry:** https://sentry.io (project: graduation-creator)

---

## ✅ Handover Checklist

### For Project Lead

- [ ] Read this entire document
- [ ] Access to GitHub repository (RedNoot/graduation-creator)
- [ ] Access to Firebase console (graduation-creator project)
- [ ] Access to Netlify dashboard
- [ ] Access to Cloudinary account
- [ ] Access to Sentry project
- [ ] Review Firestore security rules
- [ ] Test deployment process
- [ ] Run through feature checklist
- [ ] Review error logs in Sentry
- [ ] Check scheduled function logs
- [ ] Verify backup procedures
- [ ] Update environment variables if needed

### System Health Check

```bash
# Clone repository
git clone https://github.com/RedNoot/graduation-creator.git
cd graduation-creator

# Install dependencies
npm install
cd netlify/functions && npm install && cd ../..

# Run locally
netlify dev

# Test production build
netlify deploy --prod --dir=.

# Check Firestore rules
firebase deploy --only firestore:rules

# Verify environment variables
netlify env:list
```

---

## 📄 Appendix

### Glossary

- **Graduation:** A project/event representing one school's graduating class
- **Student:** An individual graduate in a graduation project
- **Content Page:** Custom text content (speeches, messages, memories)
- **Booklet:** The generated PDF combining all student profiles
- **Editor:** A teacher/admin with edit access to a graduation
- **Upload Portal:** Public page where students upload their PDFs
- **Direct Link:** Password-protected unique URL for individual student uploads
- **Presence:** Real-time indicator showing which editors are currently active
- **Conflict:** Two editors saving changes to the same data simultaneously

### File Size Guidelines

| Asset Type | Recommended Size | Maximum Size |
|------------|------------------|--------------|
| Student PDF | 1-5 MB | 10 MB |
| Profile Photo | 100-500 KB | 5 MB |
| Cover Photos | 200-800 KB | 5 MB |
| Content Images | 100-500 KB | 5 MB |
| Custom Cover | 1-3 MB | 10 MB |
| Final Booklet | 10-50 MB | 100 MB |

### Color Palette Recommendations

```
Primary (Indigo): #4F46E5
Secondary (Gray): #6B7280
Background (Light): #F9FAFB
Text (Dark): #1F2937
Success (Green): #10B981
Warning (Yellow): #F59E0B
Error (Red): #EF4444
```

---

**Document Version:** 1.0.0  
**Last Updated:** November 2, 2025  
**Status:** Active System - Fully Operational  
**Maintained By:** Development Team

---

*End of Architecture & Handover Documentation*

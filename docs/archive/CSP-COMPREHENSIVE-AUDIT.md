# CSP Comprehensive Audit Report

## Executive Summary

**Audit Date:** October 22, 2025
**Scope:** Complete Content Security Policy configuration
**Issues Found:** 3 critical issues
**Severity:** High (blocking features)
**Status:** AUDIT COMPLETE - FIXES IDENTIFIED

---

## Issues Identified

### 🔴 ISSUE #1: Missing `worker-src` Directive (CRITICAL)

**Error:**
```
Refused to create a worker from 'blob:https://...' because it violates CSP
"worker-src" was not explicitly set, so "script-src" is used as a fallback
```

**Location:** Sentry Session Replay integration (phase of Sentry initialization)

**Root Cause:** CSP missing `worker-src` directive for Web Workers

**What's Affected:** Sentry's session replay feature tries to use Web Workers but CSP blocks it

**Current CSP:**
```
script-src: Has cdn.jsdelivr.net ✓
worker-src: NOT DEFINED ✗
```

**Fix Required:**
```
Add: worker-src 'self' blob:
Reason: Allow self-hosted and blob-based workers
Impact: Enables Sentry session replay, error context recording
```

---

### 🔴 ISSUE #2: Firebase Auth Functions Destructuring Error (CRITICAL)

**Error:**
```
Firebase Auth Error: TypeError: authFunctions.signInWithEmailAndPassword is not a function
Error Code: undefined
Error Message: authFunctions.signInWithEmailAndPassword is not a function
```

**Location:** `index.html` line 147

**Code:**
```javascript
const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = auth.constructor;
```

**Root Cause:** Attempting to destructure Firebase auth functions from `auth.constructor` (the Auth class constructor), which doesn't expose these methods.

**The Problem:**
```
auth.constructor → Firebase Auth class constructor
                → Does NOT have these methods
                → Returns undefined
                → Functions can't be called
```

**Fix Required:**
```javascript
// CORRECT:
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 
  "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// THEN pass them to handler:
setupAuthSubmitHandler(authSubmitBtn, {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
}, authState);
```

**Why This Matters:** Login/signup functionality completely broken without this fix

---

### 🟡 ISSUE #3: CSP Inconsistency Between Files (MEDIUM)

**Problem:** Two CSP configurations with different rules:

**netlify.toml:**
```
script-src: ... https://*.googleapis.com ✓
connect-src: ... https://*.googleapis.com ✓
worker-src: NOT DEFINED ✗
```

**_headers:**
```
script-src: ... (missing https://*.googleapis.com) ✗
connect-src: (limited endpoints) ✗
worker-src: NOT DEFINED ✗
```

**Root Cause:** Files not kept in sync, netlify.toml has more complete config

**Fix Required:** Update both files to be identical with complete rules

---

## Detailed CSP Analysis

### Current netlify.toml CSP (PRIMARY - WHAT'S BEING USED)
```
default-src 'self'
script-src 'self' 'unsafe-inline' 
  https://www.gstatic.com 
  https://cdn.tailwindcss.com 
  https://cdnjs.cloudflare.com 
  https://cdn.jsdelivr.net 
  https://*.googleapis.com ✓
style-src 'self' 'unsafe-inline' 
  https://fonts.googleapis.com 
  https://cdn.tailwindcss.com
font-src 'self' https://fonts.gstatic.com
img-src 'self' data: https://res.cloudinary.com
connect-src 'self' 
  https://*.googleapis.com ✓
  https://*.gstatic.com ✓
  https://api.cloudinary.com 
  https://*.cloudinary.com 
  https://*.netlify.app 
  https://*.firebaseapp.com 
  https://cdn.jsdelivr.net ✓
media-src 'self' blob: data:
frame-src 'self' blob: https://res.cloudinary.com
object-src 'self' blob:
worker-src [MISSING] ✗✗✗
```

### Issues in Current CSP

| Directive | Required | Current | Status |
|-----------|----------|---------|--------|
| script-src | Firebase SDK | ✓ | OK |
| script-src | Sentry SDK | ✓ | OK |
| script-src | Tailwind | ✓ | OK |
| connect-src | Firebase endpoints | ✓ | OK |
| connect-src | Sentry endpoint | ✓ | OK |
| connect-src | Cloudinary | ✓ | OK |
| worker-src | Sentry replay | ✗ | **MISSING** |
| worker-src | Web Workers | ✗ | **MISSING** |

---

## Fix Implementation Plan

### Fix #1: Add worker-src Directive to netlify.toml

**Current Line 48:**
```toml
Content-Security-Policy = "default-src 'self'; script-src ... object-src 'self' blob:"
```

**Should Include:**
```toml
worker-src 'self' blob:
```

**Full Fixed Line:**
```toml
Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://res.cloudinary.com; connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://api.cloudinary.com https://*.cloudinary.com https://*.netlify.app https://*.firebaseapp.com https://cdn.jsdelivr.net; media-src 'self' blob: data:; frame-src 'self' blob: https://res.cloudinary.com; object-src 'self' blob:; worker-src 'self' blob:"
```

---

### Fix #2: Add worker-src Directive to _headers

**Current _headers Line 7:**
```
Content-Security-Policy: default-src 'self'; ... object-src 'self' blob:
```

**Should Include:**
```
worker-src 'self' blob:
```

**Also Update to Match netlify.toml:**
- Add `https://*.googleapis.com` to script-src
- Expand connect-src to include all Firebase endpoints

---

### Fix #3: Fix Firebase Auth Function Import in index.html

**Current Code (Line 147):**
```javascript
const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = auth.constructor;
```

**Should Be:**
```javascript
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
```

**Location:** Add to imports at top of `<script type="module">` block after line ~35

---

## Why worker-src is Needed

### Sentry Session Replay Uses Web Workers

```
1. Sentry initializes
2. Session replay integration loads
3. Attempts to create a worker from blob: URL
4. CSP blocks blob-based worker creation
5. Sentry fails with worker-src error
6. Session replay disabled
```

### Web Worker CSP Rule

```
worker-src 'self' blob:
  ↓
'self': Allows workers from same origin
blob: : Allows blob: URLs (dynamically created workers)
```

---

## Firebase Auth Function Error Explanation

### What's Happening Wrong Now

```javascript
const auth = getAuth(app);  // Gets Auth instance
auth.constructor              // Gets Auth CLASS constructor
auth.constructor.createUserWithEmailAndPassword  // Doesn't exist!
                              // Functions are on the module, not the constructor
```

### What Should Happen

```javascript
// Import functions from Firebase module
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Use them directly
await createUserWithEmailAndPassword(auth, email, password);
```

### Current Code Flow

```
1. Auth form submitted
2. Handler calls: authFunctions.signInWithEmailAndPassword()
3. authFunctions.signInWithEmailAndPassword = undefined
4. TypeError: not a function
5. Login fails silently
```

---

## Files Requiring Changes

### Priority 1 (CRITICAL - Blocking Features)

| File | Changes | Lines | Impact |
|------|---------|-------|--------|
| `netlify.toml` | Add `worker-src 'self' blob:` | 48 | Enables Sentry replay |
| `index.html` | Add Firebase auth imports | ~36 | Fixes login/signup |

### Priority 2 (Important - Consistency)

| File | Changes | Lines | Impact |
|------|---------|-------|--------|
| `_headers` | Update to match netlify.toml | 7 | Backup consistency |

---

## Complete Fixed CSP

### netlify.toml (netlify.toml Line 48)

```toml
Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://res.cloudinary.com; connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://api.cloudinary.com https://*.cloudinary.com https://*.netlify.app https://*.firebaseapp.com https://cdn.jsdelivr.net; media-src 'self' blob: data:; frame-src 'self' blob: https://res.cloudinary.com; object-src 'self' blob:; worker-src 'self' blob:"
```

### _headers (Line 7)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://res.cloudinary.com; connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://api.cloudinary.com https://*.cloudinary.com https://*.netlify.app https://*.firebaseapp.com https://cdn.jsdelivr.net; media-src 'self' blob: data:; frame-src 'self' blob: https://res.cloudinary.com; object-src 'self' blob:; worker-src 'self' blob:
```

### index.html Firebase Import (Add after line ~35)

```javascript
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
```

---

## Summary of Issues

| # | Issue | Type | Severity | Impact | Status |
|---|-------|------|----------|--------|--------|
| 1 | Missing `worker-src` CSP | CSP | High | Sentry replay blocked | IDENTIFIED |
| 2 | Firebase auth destructuring | Code | Critical | Login broken | IDENTIFIED |
| 3 | CSP file inconsistency | Configuration | Medium | Future issues | IDENTIFIED |

---

## Recommendation

**Apply all three fixes immediately:**
1. Add `worker-src 'self' blob:` to netlify.toml CSP
2. Add `worker-src 'self' blob:` to _headers CSP  
3. Import Firebase auth functions properly in index.html
4. Remove the incorrect destructuring from auth.constructor

**Expected Outcome:**
- ✅ Sentry session replay works
- ✅ Login/signup functional
- ✅ No CSP errors
- ✅ Both CSP files consistent

---

**Audit Status:** ✅ COMPLETE
**Issues Found:** 3
**Ready for Fixes:** YES

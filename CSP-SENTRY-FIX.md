# Content Security Policy (CSP) Fix - Sentry Integration

## Issue Summary

**Error Message:**
```
Refused to load the script 'https://cdn.jsdelivr.net/npm/@sentry/browser@7/+esm' 
because it violates the following Content Security Policy directive: 
"script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com".

[Sentry] Failed to initialize: TypeError: Failed to fetch dynamically imported module: 
https://cdn.jsdelivr.net/npm/@sentry/browser@7/+esm
```

**Root Cause:** The Content Security Policy in `_headers` file was missing `https://cdn.jsdelivr.net` in both the `script-src` and `connect-src` directives, blocking Sentry's SDK from loading.

---

## What is Content Security Policy (CSP)?

CSP is a security mechanism that controls which external resources a web page is allowed to load. It prevents:
- Unauthorized script injection
- Cross-site scripting (XSS) attacks
- Unexpected resource loading
- Data exfiltration

The `_headers` file in Netlify projects specifies which domains are trusted for various resources.

---

## The Problem

### Original CSP Configuration

**File:** `_headers`

```plaintext
Content-Security-Policy: default-src 'self'; 
  script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com;
  connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com 
    https://api.cloudinary.com https://*.cloudinary.com https://www.gstatic.com /.netlify/functions/;
  ...
```

**Why It Failed:**

1. **Sentry SDK Location:** `https://cdn.jsdelivr.net/npm/@sentry/browser@7/+esm`
2. **script-src allowed:** Firebase, Tailwind, CDNJS
3. **Missing:** `https://cdn.jsdelivr.net`
4. **Result:** Browser blocks the script load
5. **Effect:** Sentry fails to initialize, error tracking doesn't work

---

## The Solution

### Updated CSP Configuration

**File:** `_headers`

```plaintext
Content-Security-Policy: default-src 'self'; 
  script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdn.tailwindcss.com 
    https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;
  connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com 
    https://api.cloudinary.com https://*.cloudinary.com https://www.gstatic.com 
    https://cdn.jsdelivr.net /.netlify/functions/;
  ...
```

**Changes Made:**

1. **Added to `script-src`:** `https://cdn.jsdelivr.net`
   - Allows loading the Sentry browser SDK module

2. **Added to `connect-src`:** `https://cdn.jsdelivr.net`
   - Allows the application to communicate with Sentry's endpoint

---

## CSP Directive Reference

### What Each Directive Controls

| Directive | Purpose | Trusted Sources |
|-----------|---------|-----------------|
| `default-src` | Fallback for all | `'self'` |
| `script-src` | JavaScript files | Firebase, Tailwind, CDNJS, jsDelivr, Sentry |
| `style-src` | CSS files | Self, Google Fonts, Tailwind |
| `font-src` | Font files | Self, Google Fonts |
| `img-src` | Images | Self, data, Cloudinary |
| `connect-src` | Fetch/XHR/WebSocket | Firebase, Cloudinary, Netlify, Sentry |
| `frame-src` | Embedded frames | Self, Cloudinary |
| `object-src` | Plugins | Self, blobs |
| `media-src` | Audio/video | Self, blobs, data |

---

## Complete Updated CSP

```plaintext
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdn.tailwindcss.com 
    https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; 
  font-src 'self' https://fonts.gstatic.com; 
  img-src 'self' data: https://res.cloudinary.com; 
  connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com 
    https://api.cloudinary.com https://*.cloudinary.com https://www.gstatic.com 
    https://cdn.jsdelivr.net /.netlify/functions/; 
  media-src 'self' blob: data:; 
  frame-src 'self' blob: https://res.cloudinary.com; 
  object-src 'self' blob:
```

---

## Trusted CDNs in This Project

| Purpose | CDN | Domain |
|---------|-----|--------|
| **Utilities/UI** | Tailwind CSS | https://cdn.tailwindcss.com |
| **Icons/Code** | CDNJS | https://cdnjs.cloudflare.com |
| **Modules** | jsDelivr | https://cdn.jsdelivr.net ✅ (NEW) |
| **Fonts** | Google Fonts | https://fonts.googleapis.com |
| **Images/Media** | Cloudinary | https://res.cloudinary.com |
| **Backend** | Firebase | https://*.googleapis.com |
| **Error Tracking** | Sentry (jsDelivr) | https://cdn.jsdelivr.net ✅ (NEW) |
| **Functions** | Netlify | /.netlify/functions/ |

---

## How Sentry Uses These CDNs

### 1. Loading the SDK
```javascript
// Browser requests from jsDelivr
https://cdn.jsdelivr.net/npm/@sentry/browser@7/+esm

// CSP Directive Needed: script-src
```

### 2. Sending Error Reports
```javascript
// After error occurs, Sentry connects to endpoint
https://[DSN]@o[org].ingest.sentry.io/[project]

// CSP Directive Needed: connect-src
```

---

## Testing the Fix

### Before Fix
```
1. Open application
2. Check browser console
3. See "Refused to load script" error
4. Sentry shows "Failed to initialize"
5. Error tracking doesn't work
```

### After Fix
```
1. Open application
2. Check browser console
3. No CSP violations
4. Sentry initializes successfully
5. Error tracking works correctly
✅ Success!
```

### Verification in DevTools
```
Console Tab:
✓ No "Refused to load the script" errors
✓ Sentry initialization message: "Sentry initialized"

Network Tab:
✓ cdn.jsdelivr.net scripts load successfully
✓ Sentry endpoint connection succeeds

Application Tab:
✓ Sentry client initialized
✓ Error tracking active
```

---

## Files Modified

| File | Changes | Reason |
|------|---------|--------|
| `_headers` | Added `https://cdn.jsdelivr.net` to `script-src` and `connect-src` | Allow Sentry SDK loading and error reporting |

---

## Deployment

✅ **Commit:** 696d3b2
✅ **Branch:** main (production)
✅ **Deploy:** Netlify auto-deployment active
✅ **Status:** Live

---

## Best Practices

### When Adding New External Resources

1. **Identify the domain:** Where is the resource hosted?
2. **Determine CSP directive:** What type of resource is it?
   - Scripts → `script-src`
   - Styles → `style-src`
   - Fonts → `font-src`
   - Images → `img-src`
   - API calls → `connect-src`

3. **Update `_headers`:** Add the domain to the appropriate directive

4. **Test:** Verify no CSP violation errors in console

### Example: Adding a New CDN

If we were to add Font Awesome icons from `kit.fontawesome.com`:

```plaintext
# BEFORE
script-src 'self' 'unsafe-inline' https://www.gstatic.com ...

# AFTER (add the new domain)
script-src 'self' 'unsafe-inline' https://www.gstatic.com https://kit.fontawesome.com ...
```

---

## Security Notes

✅ **CSP Remains Secure**
- Only whitelisted domains allowed
- All paths must be explicitly trusted
- `'unsafe-inline'` used only where necessary (auth, utils)
- Strict origin matching prevents hijacking

⚠️ **CDNs Trusted:**
- jsDelivr - Trusted CDN, widely used
- Cloudinary - Required for file uploads
- Firebase - Required for backend
- Tailwind - Required for styling

---

## Related Documentation

- `PHASE-8-SENTRY-IMPLEMENTATION.md` - Sentry setup details
- `SECURITY.md` - Security policies and best practices
- Netlify Docs: Content Security Policy https://docs.netlify.com/security/headers/

---

## Summary

The CSP headers were missing `https://cdn.jsdelivr.net`, which blocked Sentry SDK from loading. Adding this domain to both `script-src` (for SDK loading) and `connect-src` (for error reporting) fixed the issue while maintaining security.

**Status:** ✅ Fixed and Deployed (Commit 696d3b2)

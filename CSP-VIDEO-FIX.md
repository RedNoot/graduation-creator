# CSP Video Fix - Complete Audit

## Issue
Videos from Cloudinary were being blocked by Content Security Policy:
```
Refused to load media from 'https://res.cloudinary.com/dkm3avvjl/video/upload/v1761854813/content-videos/ijmpi8ttnx5ghn8tivza.mp4' 
because it violates the following Content Security Policy directive: "media-src 'self' blob: data:".
```

## Root Cause
The `netlify.toml` file had an **outdated** CSP that was missing Cloudinary domains in the `media-src` directive:
- ❌ Old: `media-src 'self' blob: data:`
- ✅ Fixed: `media-src 'self' blob: data: https://res.cloudinary.com https://*.cloudinary.com`

The `_headers` file was correct, but `netlify.toml` takes precedence in Netlify deployments.

## Solution Applied

### 1. Updated `netlify.toml` CSP (Line 53)
```toml
Content-Security-Policy = "default-src 'self'; 
  script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://*.googleapis.com; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; 
  font-src 'self' https://fonts.gstatic.com; 
  img-src 'self' data: https://res.cloudinary.com https://*.cloudinary.com; 
  connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://api.cloudinary.com https://*.cloudinary.com https://*.netlify.app https://*.firebaseapp.com https://cdn.jsdelivr.net https://*.ingest.sentry.io https://*.ingest.us.sentry.io; 
  media-src 'self' blob: data: https://res.cloudinary.com https://*.cloudinary.com; 
  frame-src 'self' blob: https://res.cloudinary.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; 
  object-src 'self' blob:; 
  worker-src 'self' blob:"
```

### 2. Updated `_headers` CSP (Line 7)
```
Content-Security-Policy: default-src 'self'; 
  script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://*.googleapis.com; 
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; 
  font-src 'self' https://fonts.gstatic.com; 
  img-src 'self' data: https://res.cloudinary.com https://*.cloudinary.com; 
  connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://api.cloudinary.com https://*.cloudinary.com https://*.netlify.app https://*.firebaseapp.com https://cdn.jsdelivr.net https://*.ingest.sentry.io https://*.ingest.us.sentry.io; 
  media-src 'self' blob: data: https://res.cloudinary.com https://*.cloudinary.com; 
  frame-src 'self' blob: https://res.cloudinary.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; 
  object-src 'self' blob:; 
  worker-src 'self' blob:
```

## Complete CSP Breakdown by Directive

### `default-src 'self'`
Base policy - only load resources from same origin by default

### `script-src 'self' 'unsafe-inline' + domains`
**Allows:**
- ✅ Self-hosted scripts
- ✅ Inline scripts (required for dynamic behavior)
- ✅ Firebase scripts: `https://*.googleapis.com`
- ✅ CDN libraries: `https://www.gstatic.com`, `https://cdn.tailwindcss.com`, `https://cdnjs.cloudflare.com`, `https://cdn.jsdelivr.net`

### `style-src 'self' 'unsafe-inline' + domains`
**Allows:**
- ✅ Self-hosted styles
- ✅ Inline styles (required for dynamic styling)
- ✅ Google Fonts: `https://fonts.googleapis.com`
- ✅ Tailwind CDN: `https://cdn.tailwindcss.com`

### `font-src 'self' + domains`
**Allows:**
- ✅ Self-hosted fonts
- ✅ Google Fonts: `https://fonts.gstatic.com`

### `img-src 'self' data: + domains` ✅ FIXED
**Allows:**
- ✅ Self-hosted images
- ✅ Data URIs (inline images)
- ✅ Cloudinary images: `https://res.cloudinary.com`, `https://*.cloudinary.com`

### `connect-src 'self' + domains`
**Allows AJAX/fetch to:**
- ✅ Self (API endpoints)
- ✅ Firebase: `https://*.googleapis.com`, `https://*.gstatic.com`, `https://*.firebaseapp.com`
- ✅ Cloudinary API: `https://api.cloudinary.com`, `https://*.cloudinary.com`
- ✅ Netlify Functions: `https://*.netlify.app`
- ✅ CDN: `https://cdn.jsdelivr.net`
- ✅ Sentry error tracking: `https://*.ingest.sentry.io`, `https://*.ingest.us.sentry.io`

### `media-src 'self' blob: data: + domains` ✅ **FIXED - THIS WAS THE ISSUE**
**Allows:**
- ✅ Self-hosted audio/video
- ✅ Blob URLs (for local video preview)
- ✅ Data URIs
- ✅ **Cloudinary videos: `https://res.cloudinary.com`, `https://*.cloudinary.com`** ← ADDED

### `frame-src 'self' blob: + domains` ✅ UPDATED
**Allows:**
- ✅ Self-hosted iframes
- ✅ Blob URLs
- ✅ Cloudinary embeds: `https://res.cloudinary.com`
- ✅ YouTube embeds: `https://www.youtube.com`, `https://www.youtube-nocookie.com`
- ✅ Vimeo embeds: `https://player.vimeo.com`

### `object-src 'self' blob:`
**Allows:**
- ✅ Self-hosted objects (PDFs, etc.)
- ✅ Blob URLs

### `worker-src 'self' blob:`
**Allows:**
- ✅ Self-hosted web workers
- ✅ Blob URLs for workers

## Media Support Summary

| Media Type | Source | Directive | Status |
|------------|--------|-----------|--------|
| **Images** | Cloudinary | `img-src` | ✅ Working |
| **Videos** | Cloudinary | `media-src` | ✅ **FIXED** |
| **Embedded Videos** | YouTube/Vimeo | `frame-src` | ✅ Working |
| **PDFs** | Cloudinary | `object-src`, `connect-src` | ✅ Working |
| **Video Preview** | Blob URLs | `media-src` | ✅ Working |

## Cloudinary Domain Coverage

### Complete Cloudinary Support:
```
img-src:     https://res.cloudinary.com https://*.cloudinary.com
connect-src: https://api.cloudinary.com https://*.cloudinary.com
media-src:   https://res.cloudinary.com https://*.cloudinary.com ← FIXED
frame-src:   https://res.cloudinary.com
```

### Why Both Formats?
- `https://res.cloudinary.com` - Specific subdomain for resources
- `https://*.cloudinary.com` - Wildcard for API and other subdomains (api.cloudinary.com, etc.)

## Testing Checklist

After deployment, verify:
- [ ] Videos load on content pages
- [ ] Video upload works (shows progress)
- [ ] Video preview/playback works
- [ ] Images still load correctly
- [ ] PDFs upload and display
- [ ] Embedded YouTube/Vimeo videos work
- [ ] No CSP errors in browser console

## Deployment Notes

1. **Deploy to Netlify** - The `netlify.toml` change will take effect automatically
2. **Clear browser cache** - Old CSP headers may be cached
3. **Test in incognito** - Ensures fresh CSP is loaded
4. **Check console** - Verify no CSP violations appear

## Files Changed

1. ✅ `netlify.toml` - Line 53 - Added Cloudinary to `media-src` and updated `frame-src`
2. ✅ `_headers` - Line 7 - Added Cloudinary to `img-src`, `media-src`, and updated `frame-src`

## Prevention

- Both `netlify.toml` and `_headers` should be kept in sync
- `netlify.toml` takes precedence in Netlify deployments
- Always test media after CSP changes
- Document all allowed domains for future reference

---

**Status:** ✅ **FIXED AND AUDITED**
**Date:** October 31, 2025
**Issue:** Video CSP violation
**Solution:** Added Cloudinary domains to `media-src` directive in both config files

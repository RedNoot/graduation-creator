# CRITICAL FIX: PDFs Must Use /raw/upload Endpoint

## The REAL Problem

PDFs were being uploaded to Cloudinary's `/image/upload` endpoint, which treats them as "image" resource types. This causes authentication issues because:

1. **Wrong endpoint**: `/image/upload` is for images, not PDFs
2. **Wrong resource type**: PDFs stored as "image" type can't be accessed directly
3. **Wrong delivery URL**: Results in `/image/upload/...pdf` URLs that return 401

## The Solution

Use Cloudinary's `/raw/upload` endpoint for PDFs, which:
- Stores files as "raw" resource type
- Creates publicly accessible delivery URLs
- Works with the unsigned upload preset
- No signatures or authentication needed

## What Changed

### index.html - uploadFile() function
```javascript
// OLD (BROKEN):
const response = await fetch(CLOUDINARY_URL, { // Always used /upload (image endpoint)
    method: 'POST',
    body: formData,
});

// NEW (FIXED):
const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
const uploadUrl = isPdf 
    ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`  // PDFs go here
    : CLOUDINARY_URL; // Images use default endpoint

const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
});
```

### Teacher Upload Function
Simplified to use the same `uploadFile()` function as students, ensuring consistency.

## URL Format Comparison

### BEFORE (Wrong - Returns 401):
```
https://res.cloudinary.com/dkm3avvjl/image/upload/v1760845901/graduation-pdfs/[id]/[file].pdf
                                      ^^^^^
                                      WRONG ENDPOINT!
```

### AFTER (Correct - Works):
```
https://res.cloudinary.com/dkm3avvjl/raw/upload/v1760845901/graduation-pdfs/[id]/[file].pdf
                                      ^^^
                                      CORRECT ENDPOINT!
```

## Why This Matters

Cloudinary has different resource types:
- **image**: For JPG, PNG, GIF, etc. - Has transformation/optimization features
- **raw**: For PDFs, documents, archives - Served as-is without processing
- **video**: For MP4, etc.

Using the wrong endpoint causes:
- Files stored with wrong resource type
- Authentication issues
- 401 Unauthorized errors
- Can't be accessed even if "public"

## Testing

### 1. Upload a New PDF
After deploying this fix:
- Upload a student PDF (teacher or student method)
- Check the URL in Firestore
- Should see: `/raw/upload/` NOT `/image/upload/`

### 2. Verify Direct Access
Copy the PDF URL and paste in browser:
- Should download/display immediately
- No 401 errors
- No authentication required

### 3. Generate Booklet
- Should successfully download all PDFs
- Logs show: "Successfully processed PDF for [student]"
- No 401 errors

## Cloudinary Upload Preset

With this fix, your preset settings are simpler:

```
Upload Preset: Graduation-Uploads
Signing Mode: Unsigned
Folder: (leave empty or set to graduation-pdfs)

Note: No need to configure "Type" or "Resource Type" 
      The endpoint (/raw/upload) determines the type automatically
```

## Migration

Existing PDFs with `/image/upload/` URLs need to be re-uploaded:
1. Delete the old PDF from student record
2. Upload fresh copy
3. New URL will use `/raw/upload/`
4. Will work correctly

## Why Previous Fix Didn't Work

Our previous fix tried to use `type=upload` parameter with signed uploads, but:
- Still used wrong endpoint (`/image/upload`)
- Signed uploads were unnecessary complexity
- Resource type wasn't the issue - endpoint was!

## Simple Rule

**For PDFs: Always use `/raw/upload` endpoint**
**For Images: Use `/image/upload` endpoint**

That's it. No signatures, no authentication, just the right endpoint.

---

**Deploy this fix immediately to resolve all 401 errors.**

# Multi-Editor Migration Guide

## Overview
This guide explains how to migrate existing graduation projects from the old single-owner model (`ownerUid`) to the new multi-editor collaboration model (`editors` array + `createdBy` field).

## What Changed?

### Old Model (Single Owner)
```javascript
{
  schoolName: "ABC Elementary",
  graduationYear: 2025,
  ownerUid: "uid123",  // Single owner
  // ... other fields
}
```

### New Model (Multi-Editor)
```javascript
{
  schoolName: "ABC Elementary",
  graduationYear: 2025,
  editors: ["uid123", "uid456"],  // Multiple editors
  createdBy: "uid123",            // Original creator (immutable)
  // ... other fields
}
```

## Migration Script

### Prerequisites
- You must be logged in to the application
- You need access to the browser developer console
- You should have admin/owner access to the graduations

### Step 1: Load the Migration Script

Open your browser console (F12) and run:

```javascript
import('./js/utils/migrate-editors.js').then(m => {
    window.migrate = m;
    console.log('Migration script loaded!');
});
```

### Step 2: Dry Run (No Changes)

Test the migration without making any changes:

```javascript
const summary = await window.migrate.migrateAllGraduations(true);
console.log(summary);
```

Review the output carefully. It will show:
- How many graduations need migration
- What changes will be made to each
- Any errors that would occur

### Step 3: Run Migration

If the dry run looks good, run the actual migration:

```javascript
const summary = await window.migrate.migrateAllGraduations(false);
console.log(summary);
```

### Step 4: Verify

Check a few graduations to ensure they were migrated correctly:

```javascript
const status = await window.migrate.checkGraduationNeedsMigration('YOUR_GRAD_ID');
console.log(status);
```

Expected output for migrated graduation:
```javascript
{
  exists: true,
  hasOwnerUid: true,
  hasEditors: true,
  hasCreatedBy: true,
  needsMigration: false
}
```

## What the Migration Does

1. **Creates `editors` array**: Converts the single `ownerUid` into an array with one element
2. **Sets `createdBy` field**: Copies `ownerUid` to `createdBy` (immutable)
3. **Preserves `ownerUid`**: Keeps the old field for backward compatibility (optional)

## Edge Cases Handled

### Graduation Already Has Editors Array
- If `editors` exists but doesn't include `ownerUid`, adds `ownerUid` to the array
- If `editors` exists and includes `ownerUid`, no change needed

### Multiple Editors Already Added Manually
- Preserves existing editors array
- Only adds `createdBy` if missing

### Missing ownerUid
- Uses first editor in `editors` array as `createdBy`
- Logs warning if neither field exists

## Rollback Plan

If you need to rollback the migration:

### Option 1: Restore from Backup
If you have Firestore backups enabled, restore from before the migration.

### Option 2: Manual Rollback
The migration preserves `ownerUid` by default, so the old code should still work. To fully rollback:

1. Update Firestore rules to accept `ownerUid` again
2. Update code to check both `ownerUid` and `editors` array
3. Remove `editors` and `createdBy` fields if needed (not recommended)

## Testing Checklist

After migration, verify:

- [ ] Teachers can log in and see their projects
- [ ] Projects show up in dashboard
- [ ] Teachers can edit their projects
- [ ] Collaboration UI works (Settings → Collaboration tab)
- [ ] Inviting new editors works
- [ ] Removing editors works
- [ ] Real-time removal detection works
- [ ] Creator badge shows correctly

## Migration Output Example

```
============================================================
MIGRATION: ownerUid → editors + createdBy
Mode: DRY RUN (no changes)
============================================================

Found 5 graduation documents

[grad1] DRY RUN - Would apply: { editors: ["uid123"], createdBy: "uid123" }
[grad2] Already migrated (has editors and createdBy)
[grad3] DRY RUN - Would apply: { editors: ["uid456"], createdBy: "uid456" }
[grad4] DRY RUN - Would apply: { editors: ["uid789"], createdBy: "uid789" }
[grad5] Already migrated (has editors and createdBy)

============================================================
MIGRATION SUMMARY
============================================================
Total graduations: 5
Already migrated: 2
Needed migration: 3

⚠️  This was a DRY RUN - no changes were made
To apply changes, run: await migrateAllGraduations(false)
============================================================
```

## Troubleshooting

### Error: "No ownerUid or editors field found"
**Cause**: Graduation document is corrupted or was manually created without proper fields.  
**Solution**: Manually add an `editors` array with the correct UID.

### Error: "Update failed: Missing or insufficient permissions"
**Cause**: Your user doesn't have permission to update the graduation document.  
**Solution**: Ensure you're logged in as the owner or have editor access.

### Error: "Cannot determine creator UID"
**Cause**: Both `ownerUid` and `editors` fields are missing or empty.  
**Solution**: Manually set `createdBy` and `editors` fields in Firestore console.

## Alternative: Server-Side Migration

For large databases or production systems, you can run the migration server-side:

1. Create a Netlify function or Firebase Cloud Function
2. Use Firebase Admin SDK with elevated privileges
3. Run the migration in batches to avoid timeouts
4. Implement retry logic for failed migrations

Example Firebase Admin SDK code:

```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

async function migrateServerSide() {
  const snapshot = await db.collection('graduations').get();
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.ownerUid && !data.editors) {
      batch.update(doc.ref, {
        editors: [data.ownerUid],
        createdBy: data.ownerUid
      });
      count++;
    }
    
    // Commit every 500 operations
    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  });
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`Migrated ${count} graduations`);
}
```

## Support

If you encounter issues during migration:
1. Check the browser console for detailed error messages
2. Verify Firestore security rules allow the operation
3. Ensure you have the latest code deployed
4. Contact support with the migration summary output

---

**Important**: Always run a dry run first and test on a staging environment if available!

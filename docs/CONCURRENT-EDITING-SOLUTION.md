# Concurrent Editing Solution

## Problem Analysis

### Current Issues

When two editors work on the same graduation simultaneously, the application has several problems:

#### 1. **Last Write Wins (Data Loss)**
```
10:00:00 - Editor A changes primary color to blue
10:00:01 - Editor B changes school logo
10:00:02 - Editor A saves (writes full config with blue color)
10:00:03 - Editor B saves (writes full config with old color)
Result: Editor A's color change is LOST
```

#### 2. **Form State Desynchronization**
- Real-time listener fires when other editor saves
- Current editor's form gets re-rendered with new data
- User loses:
  - Text they're currently typing
  - Form focus position
  - Unsaved changes
  - Modal states

#### 3. **No Awareness**
- Editors don't know others are working on same project
- No warning before overwrites happen
- No indication of conflicts

#### 4. **No Conflict Resolution**
- System doesn't detect conflicting changes
- No merge strategy
- Silent data loss

---

## Implemented Solution

### Architecture: Multi-Layered Conflict Prevention

The solution uses **4 layers** of protection:

```
Layer 1: Awareness → Show active editors
Layer 2: Detection → Track changes and conflicts
Layer 3: Prevention → Warn before overwrites
Layer 4: Preservation → Smart re-rendering
```

---

## Layer 1: Presence & Awareness

### Active Editors Tracking (`collaborative-editing.js`)

**How it works:**
```javascript
// Each editor updates presence every 60 seconds
graduations/{gradId} {
  activeEditors: {
    "uid123": Timestamp(10:00:00),
    "uid456": Timestamp(10:00:15)
  }
}
```

**Features:**
- Real-time presence updates via Firestore
- Automatic cleanup of stale presence (5 minutes)
- Heartbeat mechanism (updates every 60 seconds)
- Clean removal when editor leaves

**UI Component (`collaborative-ui.js`):**
```html
<!-- Banner shown at top of edit page -->
<div class="bg-blue-50 border-l-4 border-blue-400">
  <p>Sarah Johnson is also viewing this project</p>
  <span class="pulse">Live</span>
</div>
```

---

## Layer 2: Conflict Detection

### Change Tracking

**Timestamps:**
```javascript
// Track when user last saved
lastSaveTimestamp: Map {
  "grad123" => 1699000000000
}

// Compare against Firestore updatedAt
if (firestoreUpdatedAt > lastSaveTimestamp) {
  // Conflict detected!
}
```

**Pending Changes:**
```javascript
// Track if user has unsaved changes
pendingChanges: Map {
  "grad123" => true  // User has unsaved edits
}

// Show warning if trying to navigate away
if (pendingChanges.get(gradId)) {
  showUnsavedChangesWarning();
}
```

---

## Layer 3: Conflict Warning

### Pre-Save Conflict Check

**Flow:**
```javascript
User clicks "Save" →
  Check: Has document been updated since I started editing? →
    Yes → Show conflict warning modal →
      User choice:
        "Reload Latest" → Discard changes, reload fresh data
        "Save Anyway" → Proceed with save (overwrites)
    No → Save normally
```

**Modal Options:**
```
⚠️ Editing Conflict Detected

Another editor has made changes since you started editing.
Your changes may overwrite theirs.

What would you like to do?

[Reload Latest]  [Save Anyway]
```

**Code Integration:**
```javascript
// In save handler
const result = await collaborativeEditingManager.safeUpdate(
  gradId,
  updates,
  GraduationRepository.update
);

if (result.conflict) {
  // Conflict was detected and user chose to reload
  return;
}

if (result.success) {
  showSaveIndicator('saved', container);
}
```

---

## Layer 4: Smart Re-rendering

### Problem with Current Approach
```javascript
// Current: Re-renders entire form on every update
onUpdate(gradId, (gradData) => {
  renderEditor(gradData, gradId);  // ❌ Loses form state!
});
```

### Solution: Selective Updates

**Strategy:**
1. Don't re-render if user has pending changes
2. Only update non-form elements (display data)
3. Show notification that new data is available
4. Let user choose when to reload

**Implementation:**
```javascript
onUpdate(gradId, (gradData) => {
  // Check if user is actively editing
  if (collaborativeEditingManager.hasPendingChanges(gradId)) {
    // Don't re-render form
    // Show notification instead
    showUpdateAvailableNotification(gradData);
    return;
  }
  
  // Safe to re-render (no pending changes)
  renderEditor(gradData, gradId);
});
```

**Update Available Notification:**
```html
<div class="bg-yellow-50 border border-yellow-200">
  <p>New changes are available from another editor.</p>
  <button>Reload to see latest</button>
  <button>Dismiss</button>
</div>
```

---

## Implementation Guide

### Step 1: Integration in Router

```javascript
// In router.js - EDIT_GRADUATION case

import collaborativeEditingManager from '../utils/collaborative-editing.js';
import { showActiveEditorsBanner } from '../components/collaborative-ui.js';

// Start presence tracking
collaborativeEditingManager.startTracking(
  gradId,
  currentUser.uid,
  async (otherEditors) => {
    // Fetch editor emails
    const editors = await Promise.all(
      otherEditors.map(async (uid) => {
        const email = await getEditorEmail(uid);
        return { uid, email };
      })
    );
    
    // Show banner
    const container = document.querySelector('#tab-content');
    showActiveEditorsBanner(editors, container);
  }
);

// Set up conflict detection
collaborativeEditingManager.onConflictDetected(
  gradId,
  () => {
    return new Promise((resolve) => {
      showConflictWarning(
        showModal,
        () => resolve(true),   // Save anyway
        () => {                // Reload
          window.location.reload();
          resolve(false);
        }
      );
    });
  }
);

// Cleanup on navigation
window.addEventListener('beforeunload', () => {
  collaborativeEditingManager.stopTracking(gradId, currentUser.uid);
});
```

### Step 2: Update Save Handlers

```javascript
// In settings form submit handler

// Track that user has pending changes
collaborativeEditingManager.setPendingChanges(gradId, true);

// Save with conflict detection
const result = await collaborativeEditingManager.safeUpdate(
  gradId,
  { config: newConfig },
  GraduationRepository.update
);

if (result.conflict) {
  // User chose to reload instead of save
  return;
}

if (result.success) {
  showSaveIndicator('saved', document.body);
  collaborativeEditingManager.setPendingChanges(gradId, false);
} else {
  showSaveIndicator('error', document.body);
  showModal('Error', result.error || 'Failed to save changes');
}
```

### Step 3: Track Form Changes

```javascript
// Detect when user starts editing
document.getElementById('settings-form').addEventListener('input', () => {
  collaborativeEditingManager.setPendingChanges(gradId, true);
});

// Same for student form
document.getElementById('add-student-form').addEventListener('input', () => {
  collaborativeEditingManager.setPendingChanges(gradId, true);
});

// Same for content form
document.getElementById('add-content-form').addEventListener('input', () => {
  collaborativeEditingManager.setPendingChanges(gradId, true);
});
```

### Step 4: Prevent Navigation Loss

```javascript
// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', (e) => {
  if (collaborativeEditingManager.hasPendingChanges(gradId)) {
    e.preventDefault();
    e.returnValue = ''; // Required for Chrome
    return ''; // For other browsers
  }
});

// Warn before internal navigation
const originalGoToDashboard = goToDashboard;
goToDashboard = function() {
  if (collaborativeEditingManager.hasPendingChanges(gradId)) {
    showUnsavedChangesWarning(
      showModal,
      () => originalGoToDashboard(),
      () => {}
    );
  } else {
    originalGoToDashboard();
  }
};
```

---

## Usage Examples

### Example 1: Two Editors, Different Sections
```
Timeline:
10:00:00 - Editor A opens settings tab
10:00:05 - Editor B opens content tab
         → Both see banner: "Another editor is viewing this project"
10:00:30 - Editor A changes primary color, saves
         → Editor B's page doesn't refresh (working on different data)
10:01:00 - Editor B adds content page, saves
         → Success (no conflict)
```

### Example 2: Two Editors, Same Section
```
Timeline:
10:00:00 - Editor A opens settings tab
10:00:10 - Editor B opens settings tab
         → Both see banner with each other's email
10:00:30 - Editor A changes color to blue, saves
         → Editor B sees: "New changes available"
10:00:45 - Editor B changes font to Arial, clicks save
         → Warning: "Conflict detected - reload or save anyway?"
         → Editor B clicks "Reload"
         → Form refreshes with blue color
         → Editor B changes font again, saves
         → Success
```

### Example 3: Rapid Concurrent Saves
```
Timeline:
10:00:00 - Editor A starts editing settings
10:00:05 - Editor B starts editing settings
10:00:30 - Editor A saves (success)
10:00:31 - Editor B saves (conflict warning shown)
         → Editor B reloads
         → Editor B makes changes again
         → Editor B saves (success)
```

---

## Benefits

### For Users
✅ **Awareness**: Always know who else is editing  
✅ **Safety**: Warned before overwriting others' work  
✅ **Control**: Choose to reload or proceed with save  
✅ **No Data Loss**: Unsaved changes protected  
✅ **Clear Feedback**: Save indicators show status

### For System
✅ **No Breaking Changes**: Existing code still works  
✅ **Opt-in**: Can be gradually enabled  
✅ **Scalable**: Handles any number of editors  
✅ **Performant**: Minimal overhead (presence updates only)  
✅ **Resilient**: Automatic cleanup of stale data

---

## Limitations & Future Improvements

### Current Limitations

1. **Coarse-grained conflict detection**
   - Detects document-level changes only
   - Can't detect field-level conflicts
   - Example: If Editor A changes color and Editor B changes font, both changes could coexist, but system treats as conflict

2. **No automatic merging**
   - User must manually resolve conflicts
   - Could implement operational transformation (OT) or CRDTs for auto-merge

3. **Presence depends on active updates**
   - If tab is backgrounded, updates may be delayed
   - Could use Page Visibility API for more accurate presence

4. **No change history/undo**
   - Can't revert to previous version
   - Could implement version snapshots

### Future Enhancements

#### 1. Field-Level Locking
```javascript
// Lock specific form sections
collaborativeEditingManager.lockField(gradId, 'config.primaryColor', userUid);

// Others see:
"Sarah is editing the primary color"
[Color picker is disabled]
```

#### 2. Operational Transformation
```javascript
// Automatically merge non-conflicting changes
Editor A: color = blue
Editor B: font = Arial
Result: Both changes applied ✅
```

#### 3. Live Cursors
```javascript
// Show where others are editing (like Google Docs)
"Sarah is typing in the school name field"
```

#### 4. Change History
```javascript
// Version snapshots every save
graduations/{gradId}/versions/{timestamp} {
  config: {...},
  changedBy: "uid123",
  changedAt: Timestamp
}

// UI: "Restore to version from 2 hours ago"
```

#### 5. Commenting
```javascript
// Leave notes for other editors
"@Sarah - Should we use blue or green for primary color?"
```

---

## Testing Scenarios

### Test 1: Basic Awareness
1. User A opens graduation
2. User B opens same graduation
3. **Expected**: Both see each other in banner

### Test 2: Conflict Detection
1. User A opens settings
2. User B opens settings
3. User A changes color, saves
4. User B changes font, clicks save
5. **Expected**: Warning modal shown to User B

### Test 3: Unsaved Changes Protection
1. User A opens settings
2. User A types in school name field
3. User A tries to navigate to dashboard
4. **Expected**: Warning about unsaved changes

### Test 4: Save Indicators
1. User A changes settings
2. User A clicks save
3. **Expected**: 
   - "Saving..." indicator shows
   - Then "All changes saved" shows
   - Indicator auto-hides after 3 seconds

### Test 5: Presence Cleanup
1. User A opens graduation (presence recorded)
2. User A closes tab without cleanup
3. Wait 6 minutes
4. User B opens same graduation
5. **Expected**: User A not shown (stale presence cleaned up)

---

## Deployment Checklist

- [ ] Review collaborative-editing.js implementation
- [ ] Review collaborative-ui.js components
- [ ] Update Firestore rules to allow activeEditors field writes
- [ ] Test with 2+ users on same graduation
- [ ] Test conflict scenarios
- [ ] Test presence cleanup
- [ ] Test unsaved changes warnings
- [ ] Update user documentation
- [ ] Monitor performance impact
- [ ] Set up error tracking for conflicts

---

## Firestore Rules Update

Add to your `firestore.rules`:

```javascript
// Allow editors to update their presence
allow update: if request.auth != null && 
                 request.auth.uid in resource.data.editors &&
                 // Only allow updating own presence or general updates
                 (request.resource.data.diff(resource.data).affectedKeys()
                   .hasOnly(['activeEditors', 'updatedAt']) ||
                  request.auth.uid in resource.data.editors);
```

---

## Conclusion

This solution provides **comprehensive concurrent editing protection** without requiring major architectural changes. It's:

- **Non-invasive**: Works with existing code
- **User-friendly**: Clear warnings and indicators
- **Developer-friendly**: Easy to integrate
- **Scalable**: Handles multiple editors efficiently

The layered approach ensures that even if one layer fails, others provide protection against data loss.

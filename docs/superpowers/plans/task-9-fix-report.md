# Task 9 Fix Report

## What Was Fixed

### 1. Storage Key Mismatch
- **Problem**: Event handler saved `chrome.storage.local.set({ matchMode: mode })` as a top-level key. `getAllSettings()` reads from `chrome.storage.local.get('settings')` (nested object). Setting was never loaded on boot.
- **Fix**: Changed to save under the `settings` object: read existing settings, set `settings.matchMode = mode`, save `{ settings }`.
- **File**: `extension/src/ui/panel/events.js:204-215`

### 2. panelState.settings Not Updated on Change
- **Problem**: After saving to storage, `panelState.settings.matchMode` was not updated in-memory, so UI would show stale value.
- **Fix**: Added `panelState.settings.matchMode = mode` after storage save.
- **File**: `extension/src/ui/panel/events.js:213`

### 3. Version Bump (1.9.81.0 -> 1.9.82.0)
- **Files updated**:
  - `extension/manifest.json` -> `"version": "1.9.82.0"`
  - `extension/package.json` -> `"version": "1.9.82.0"`
  - `extension/src/lib/version.js` -> `VERSION = '1.9.82.0'`
  - `extension/popup/index.html` -> `v1.9.82.0`
  - `README.md` -> `Version: 1.9.82.0`

## What Was Tested

- **Lint**: Passed (no new errors; 1 pre-existing error in `ai-service.js` exceeding 250 lines)
- **Version consistency**: Verified all 5 files show 1.9.82.0 via manual grep
- **Commit**: Succeeded with all pre-commit hooks passing (worklog, verify-docs, anti-monolith, co-change)

## Files Changed

| File | Change |
|------|--------|
| `extension/src/ui/panel/events.js` | Added `panelState` import; fixed storage key to `settings` object; added in-memory state update |
| `extension/manifest.json` | Version 1.9.81.0 -> 1.9.82.0 |
| `extension/package.json` | Version 1.9.81.0 -> 1.9.82.0 |
| `extension/src/lib/version.js` | VERSION constant 1.9.81.0 -> 1.9.82.0 |
| `extension/popup/index.html` | Version display 1.9.81.0 -> 1.9.82.0 |
| `README.md` | Version reference 1.9.81.0 -> 1.9.82.0 |
| `worklog.md` | Added task-9-fix entry |

## Issues or Concerns

- Pre-commit hook reported `jq` not installed (non-blocking, verify-docs passed anyway)
- `cascade-state.json` sync-task-state reported issues (non-blocking, pre-existing)
- `ai-service.js` has a pre-existing hard error (288 lines > 250 limit) -- not part of this fix

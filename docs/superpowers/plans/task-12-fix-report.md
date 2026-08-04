# Task 12 Fix Report

## What Was Fixed

### 1. Analytics Never Renders (Critical)

**Root cause:** `updateVacancies()` in `extension/src/ui/panel/index.js:141-147` did NOT call `renderAnalytics()`. The only reference to `renderAnalytics` was in the `hh-ar-vacancies-updated` event listener (line 177), but this event was NEVER dispatched anywhere in the codebase. Result: analytics dashboard always showed empty state.

**Fix:** Added `renderAnalytics(vacancies, panelState.resume)` to `updateVacancies()` after `setVacancies()` and `renderVacancyList()`.

### 2. Initial Render Gap (Important)

**Root cause:** Even with the dispatch fix, analytics would not populate on first panel open if vacancies were already loaded. `toggleSidebar()` had no code to render analytics.

**Fix:** Added `renderAnalytics()` call in `toggleSidebar()` when panel opens with `panelState.vacancies.length > 0`.

### 3. No Tests (Important)

**Root cause:** `analytics-render.js` had zero unit tests.

**Fix:** Created `tests/analytics-render.test.js` with 10 tests.

## Test Results

- **660/661 tests pass** (1 pre-existing failure in `ai-service.test.js` timeout clamp test, unrelated)
- **10/10 new analytics-render tests pass**

## Files Changed

| File | Change |
|------|--------|
| `extension/src/ui/panel/index.js` | Added `renderAnalytics()` call in `updateVacancies()` and `toggleSidebar()` |
| `extension/tests/analytics-render.test.js` | New: 10 unit tests for `renderAnalytics()` |
| `extension/manifest.json` | Version 1.9.85.0 -> 1.9.86.0 |
| `extension/package.json` | Version 1.9.85.0 -> 1.9.86.0 |
| `extension/src/lib/version.js` | Version 1.9.85.0 -> 1.9.86.0 |
| `extension/popup/index.html` | Version 1.9.85.0 -> 1.9.86.0 |
| `README.md` | Version 1.9.85.0 -> 1.9.86.0 |
| `extension/CHANGELOG.md` | Added v1.9.86.0 entry |
| `worklog.md` | Added task-12-fix entry |

## Verification

- **Lint:** 0 new errors (1 pre-existing error in ai-service.js >250 lines)
- **Tests:** 660/661 pass
- **Build:** v1.9.86.0 OK, dist/content.js 805.8kb
- **Version sync:** All 5 files at 1.9.86.0

## Concerns

None. The fix is minimal and targeted. The `hh-ar-vacancies-updated` event listener remains in `createPanel()` for backward compatibility (any future code that dispatches this event will still work), but is no longer the primary rendering path.

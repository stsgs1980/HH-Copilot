# Task 8 Fix Report

## What Was Fixed

1. **Flexible profile key mismatch** (Critical)
   - `extension/src/lib/match-scorer.js:40` — `WEIGHT_PROFILES.flexible` had `semantic: 45` but code reads `profile.title`
   - Changed to `title: 45` to match the code's expectation (`profile.title / 30`)
   - Without this fix, flexible mode would compute `NaN` for the title dimension

2. **Missing trailing newline** (Important)
   - `extension/src/lib/match-scorer.js` — added trailing newline at end of file

3. **Version consistency** (Critical)
   - `extension/popup/index.html:44` — bumped `v1.9.80.0` → `v1.9.81.0` (was uncommitted)
   - All 5 version files now consistent at `1.9.81.0`:
     - `extension/manifest.json` → `1.9.81.0`
     - `extension/package.json` → `1.9.81.0`
     - `extension/src/lib/version.js` → `1.9.81.0`
     - `extension/popup/index.html` → `v1.9.81.0`
     - `README.md` → `1.9.81.0`

## What Was Tested

| Check | Result |
|-------|--------|
| ESLint (`npm run lint`) | PASSED (1 pre-existing error, 73 pre-existing warnings — none from changes) |
| Vitest (`npm test`) | 650/651 passed, 1 pre-existing failure (`ai-service.test.js` timeout clamp — unrelated) |
| Version sync (manual) | All 5 files at 1.9.81.0 |
| Trailing newline | Verified via `node -e` — file ends with `\n` |

## Files Changed

- `extension/src/lib/match-scorer.js` — fixed `semantic` → `title` key, added trailing newline
- `extension/popup/index.html` — version bumped to 1.9.81.0

## Commit

- `8cc7198` — `fix: correct flexible profile key and bump version`

## Concerns

- `version-sync.sh` script has Windows line endings (`$'\r'`) — cannot run on Windows. Manual verification was used instead.
- The pre-existing `ai-service.js` file exceeds the 250-line hard limit (288 lines) — lint error `AHG Rule 12 [C]`. This is not introduced by this task.
- The pre-existing test failure in `ai-service.test.js` (timeout clamp assertion) is unrelated to these changes.

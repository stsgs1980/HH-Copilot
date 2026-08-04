# Task 2 Report: Add location dimension to match score UI

## What was implemented

Added the location dimension (0-15 points) to the vacancy match score UI:

1. **HTML column** (`extension/src/ui/html/tabs/vacancies.js:100-103`): Added `vac-match-loc` div with sky-blue color (#0EA5E9) after the experience column
2. **HTML bar segment** (`extension/src/ui/html/tabs/vacancies.js:110`): Added `vac-match-bar-loc` div with gradient (#0EA5E9 to #38BDF8) after the experience bar
3. **JS score display** (`extension/src/ui/tabs/vacancies-match.js:68`): Added `set('vac-match-loc', (b.location || 0) + '/15')` to show location score
4. **JS bar calculation** (`extension/src/ui/tabs/vacancies-match.js:71`): Updated total to include `(b.location || 0)` for proportional bar width
5. **JS bar width** (`extension/src/ui/tabs/vacancies-match.js:79`): Added `barLoc` element getter and width calculation

## Version bump

Bumped from 1.9.79.0 to 1.9.80.0 in all 5 required files:
- `extension/manifest.json`
- `extension/package.json`
- `extension/src/lib/version.js`
- `extension/popup/index.html`
- `README.md`

## Testing

- **Lint**: Passed (npm run lint). 1 pre-existing error (ai-service.js >250 lines), 73 pre-existing warnings. No new issues.
- **Tests**: 650 passed, 1 failed (pre-existing ai-service timeout clamp test unrelated to this change)
- **Version sync**: Verified all 5 files match at 1.9.80.0

## Files changed

- `extension/src/ui/html/tabs/vacancies.js` - Added location column and bar segment
- `extension/src/ui/tabs/vacancies-match.js` - Added location score display and bar calculation
- `extension/manifest.json` - Version 1.9.79.0 -> 1.9.80.0
- `extension/package.json` - Version 1.9.79.0 -> 1.9.80.0
- `extension/src/lib/version.js` - VERSION 1.9.79.0 -> 1.9.80.0
- `extension/popup/index.html` - subtitle v1.9.79.0 -> v1.9.80.0
- `README.md` - Version header 1.9.79.0 -> 1.9.80.0

## Self-review findings

No issues found. Implementation follows the task brief exactly. The `b.location || 0` fallback ensures backward compatibility with older breakdown objects that may not have the location field.

## Commit

- SHA: cfb91fa
- Message: feat: add location dimension to match score UI

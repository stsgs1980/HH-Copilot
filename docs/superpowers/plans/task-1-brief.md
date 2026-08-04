# Task 1: Fix incorrect maximums in vacancies-match.js

## Files
- Modify: `extension/src/ui/tabs/vacancies-match.js:64-67`

## Interfaces
- Consumes: `breakdown` object from `computeMatchScore()`
- Produces: Updated UI labels with correct maximums

## Steps

1. Read current file `extension/src/ui/tabs/vacancies-match.js` to understand context
2. Fix maximums on lines 64-67:
```javascript
set('vac-match-skills', b.skills + '/35');
set('vac-match-title', b.title + '/25');
set('vac-match-salary', b.salary + '/15');
set('vac-match-exp', b.experience + '/10');
```
3. Run lint: `cd extension && npm run lint` (Expected: PASS)
4. Commit with message: `fix: correct match score maximums in UI (40→35, 30→25, 15→10)`

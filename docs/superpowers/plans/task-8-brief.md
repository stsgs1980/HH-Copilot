# Task 8: Add weight profiles to match-scorer.js

## Files
- Modify: `extension/src/lib/match-scorer.js:38-44`

## Interfaces
- Consumes: `matchMode` from storage
- Produces: `WEIGHT_PROFILES` object

## Steps

1. Add weight profiles constant after line 44:
```javascript
const WEIGHT_PROFILES = {
  precise: { skills: 35, title: 25, salary: 15, experience: 10, location: 15 },
  flexible: { semantic: 45, experience: 20, salary: 15, skills: 15, location: 5 }
};
```

2. Update `computeMatchScore` function signature from:
```javascript
export function computeMatchScore(resume, vacancy) {
```
To:
```javascript
export function computeMatchScore(resume, vacancy, mode = 'precise') {
```

3. Replace lines 38-44 with:
```javascript
const profile = WEIGHT_PROFILES[mode] || WEIGHT_PROFILES.precise;
const W_SKILLS = profile.skills / 40;
const W_TITLE = profile.title / 30;
const W_SALARY = profile.salary / 15;
const W_EXP = profile.experience / 15;
```

4. Run lint: `cd extension && npm run lint` (Expected: PASS)
5. Commit with message: `feat: add weight profiles for precise/flexible matching modes`

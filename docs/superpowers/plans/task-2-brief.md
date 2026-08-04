# Task 2: Add location dimension to match score UI

## Files
- Modify: `extension/src/ui/html/tabs/vacancies.js:83-100`
- Modify: `extension/src/ui/tabs/vacancies-match.js:60-78`

## Interfaces
- Consumes: `breakdown.location` from `computeMatchScore()`
- Produces: New UI column and bar segment for location

## Steps

1. In `extension/src/ui/html/tabs/vacancies.js`, add location column after experience column (around line 99):
```javascript
<div style="flex:1;text-align:center;">
  <div id="vac-match-loc" style="font-size:16px;font-weight:700;color:#0EA5E9;">0</div>
  <div style="font-size:12px;color:#52525b;margin-top:1px;">Локация</div>
</div>
```

2. Add location bar segment after experience bar (around line 105):
```javascript
<div id="vac-match-bar-loc" style="width:0%;background:linear-gradient(90deg,#0EA5E9,#38BDF8);border-radius:0 4px 4px 0;"></div>
```

3. In `extension/src/ui/tabs/vacancies-match.js`, add after line 67:
```javascript
set('vac-match-loc', (b.location || 0) + '/15');
```

4. Update bar calculation (around line 70-78) to include location:
```javascript
const total = Math.max(1, b.skills + b.title + b.salary + b.experience + (b.location || 0));
```

5. Add after line 78:
```javascript
const barLoc = el('vac-match-bar-loc');
if (barLoc) barLoc.style.width = (((b.location || 0) / total) * 100).toFixed(1) + '%';
```

6. Run lint: `cd extension && npm run lint` (Expected: PASS)
7. Commit with message: `feat: add location dimension to match score UI`
8. Bump version to 1.9.80.0
